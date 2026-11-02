"""Regression tests against a disposable LOCAL PostgreSQL, never the application database."""

import os, uuid
from types import SimpleNamespace
import pytest, pytest_asyncio
import httpx
from app import db
from app.main import app
from app.auth import Teacher, current_teacher
from app.services import exams


@pytest_asyncio.fixture
async def database(monkeypatch):
    url = os.getenv("TEST_DATABASE_URL", "")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable local PostgreSQL.")
    from psycopg.conninfo import conninfo_to_dict

    host = conninfo_to_dict(url).get("host", "")
    if host not in ("localhost", "127.0.0.1", "::1") and not host.startswith(
        ("/tmp/deskwork-final-postgres", "/private/tmp/deskwork-final-postgres")
    ):
        raise RuntimeError("Tests require the disposable local database")
    monkeypatch.setattr(db, "get_settings", lambda: SimpleNamespace(database_url=url))
    await db.open_pool()
    uid = str(uuid.uuid4())
    cid = str(uuid.uuid4())
    eid = str(uuid.uuid4())
    pid = str(uuid.uuid4())
    await db.execute(
        "insert into auth.users(id,email) values(%s,%s)", uid, "test@example.com"
    )
    await db.execute(
        "insert into teachers(id,email) values(%s,%s)", uid, "test@example.com"
    )
    await db.execute(
        "insert into courses(id,owner_id,name) values(%s,%s,'Test')", cid, uid
    )
    await db.execute(
        "insert into exams(id,course_id,title,total_marks,paper_status,key_status) values(%s,%s,'Test',10,'ready','ready')",
        eid,
        cid,
    )
    for n in (1, 2):
        await db.execute(
            "insert into exam_questions(exam_id,number,text,marks,topic) values(%s,%s,'Question',5,'Topic')",
            eid,
            n,
        )
    await db.execute(
        "insert into student_papers(id,exam_id,filename,file_path,status,checked_by) values(%s,%s,'sample.pdf','local','ready','ai')",
        pid,
        eid,
    )

    async def teacher():
        return Teacher(uid, "test@example.com", None, None)

    app.dependency_overrides[current_teacher] = teacher
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield uid, cid, eid, pid, client
    app.dependency_overrides.clear()
    await db.execute("delete from auth.users where id=%s", uid)
    await db.close_pool()


@pytest.mark.asyncio
async def test_manual_preserves_partial_marks_and_requires_completion(database):
    uid, cid, eid, pid, c = database
    await db.execute(
        "insert into paper_marks(paper_id,question_number,max_marks,final_marks,source,teacher_note) values(%s,1,5,3,'teacher','Preserve')",
        pid,
    )
    r = await c.post(f"/api/papers/{pid}/manual")
    assert r.status_code == 200
    rows = await db.fetch_all(
        "select * from paper_marks where paper_id=%s order by question_number", pid
    )
    assert (
        rows[0]["final_marks"] == 3
        and rows[0]["teacher_note"] == "Preserve"
        and rows[1]["final_marks"] is None
    )
    r = await c.patch(
        f"/api/papers/{pid}/marks",
        json=[dict(question_number=1, part_label="", marks=4, note="Corrected")],
    )
    assert r.status_code == 200
    p = await db.fetch_one("select * from student_papers where id=%s", pid)
    assert p["total_marks"] is None
    r = await c.patch(
        f"/api/papers/{pid}/marks",
        json=[dict(question_number=2, part_label="", marks=5)],
    )
    assert r.status_code == 200
    p = await db.fetch_one("select * from student_papers where id=%s", pid)
    assert p["total_marks"] == 9 and p["status"] == "checked"


@pytest.mark.asyncio
async def test_partial_reset_and_tenant_isolation(database):
    uid, cid, eid, pid, c = database
    await db.execute(
        "insert into paper_marks(paper_id,question_number,max_marks,final_marks) values(%s,1,5,3)",
        pid,
    )
    async with db.transaction() as conn:
        await exams.reset_checked_papers(conn, eid)
    assert not await db.fetch_all("select * from paper_marks where paper_id=%s", pid)
    # Another owner cannot see a plan even if the UUID is known.
    other = str(uuid.uuid4())
    await db.execute("insert into auth.users(id) values(%s)", other)

    async def outsider():
        return Teacher(other, "other@example.com", None, None)

    app.dependency_overrides[current_teacher] = outsider
    r = await c.get(f"/api/exams/{eid}/question-checks?question_number=1")
    assert r.status_code == 404
    await db.execute("delete from auth.users where id=%s", other)


@pytest.mark.asyncio
async def test_mark_edit_rejected_during_check(database):
    uid, cid, eid, pid, c = database
    await db.execute("update student_papers set status='checking' where id=%s", pid)
    r = await c.patch(
        f"/api/papers/{pid}/marks",
        json=[dict(question_number=1, part_label="", marks=2)],
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_maximum_edit_keeps_incomplete_total_null(database):
    uid, cid, eid, pid, c = database
    await c.post(f"/api/papers/{pid}/manual")
    await c.patch(
        f"/api/papers/{pid}/marks",
        json=[dict(question_number=1, part_label="", marks=5)],
    )
    r = await c.put(
        f"/api/exams/{eid}/questions",
        json=[
            dict(number=1, text="Question", marks=6),
            dict(number=2, text="Question", marks=5),
        ],
    )
    assert r.status_code == 200
    p = await db.fetch_one("select * from student_papers where id=%s", pid)
    assert p["total_marks"] is None


@pytest.mark.asyncio
async def test_reparse_blocked_while_question_batch_runs(database):
    uid, cid, eid, pid, c = database
    await db.execute("update exams set paper_text='Question text' where id=%s", eid)
    await db.execute(
        "insert into question_batches(exam_id,question_number,status) values(%s,1,'processing')",
        eid,
    )
    r = await c.post(f"/api/exams/{eid}/reparse/paper")
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_failed_later_question_keeps_earlier_marks_in_analytics(database):
    uid, cid, eid, pid, c = database
    await db.execute(
        "insert into paper_marks(paper_id,question_number,max_marks,final_marks) values(%s,1,5,3)",
        pid,
    )
    await db.execute("update student_papers set status='failed' where id=%s", pid)
    r = await c.get("/api/analytics")
    assert (
        r.status_code == 200
        and len(r.json()["questions"]) == 1
        and r.json()["checked_count"] == 0
    )


@pytest.mark.asyncio
async def test_upload_claim_rechecks_after_waiting_for_exam_lock(database):
    from app.routers.exams import _claim
    from fastapi import HTTPException
    import asyncio

    uid, cid, eid, pid, c = database
    async with db.transaction() as conn:
        await conn.execute("select id from exams where id=%s for update", (eid,))
        pending = asyncio.create_task(_claim(eid, "paper_status"))
        await asyncio.sleep(0.05)
        assert not pending.done()
        await conn.execute(
            "update student_papers set status='checking' where id=%s", (pid,)
        )
    with pytest.raises(HTTPException) as exc:
        await pending
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_maximum_edit_preserves_concurrent_teacher_correction(database):
    import asyncio

    uid, cid, eid, pid, c = database
    await db.execute(
        "insert into paper_marks(paper_id,question_number,max_marks,final_marks) values(%s,1,5,3)",
        pid,
    )

    async def maxima():
        async with db.transaction() as conn:
            await exams.apply_new_maximums(conn, eid, {(1, ""): 6, (2, ""): 5})

    async with db.transaction() as conn:
        await conn.execute(
            "select id from student_papers where id=%s for update", (pid,)
        )
        await conn.execute(
            "update paper_marks set final_marks=4,source='teacher' where paper_id=%s",
            (pid,),
        )
        pending = asyncio.create_task(maxima())
        await asyncio.sleep(0.05)
        assert not pending.done()
    await asyncio.wait_for(pending, 2)
    row = await db.fetch_one(
        "select final_marks,max_marks from paper_marks where paper_id=%s", pid
    )
    assert row["final_marks"] == 4 and row["max_marks"] == 6
