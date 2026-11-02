from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from .. import access, db, tasks
from ..auth import Teacher, current_teacher
from ..services.exams import grade_paper, grading_items

router = APIRouter()


class BatchIn(BaseModel):
    question_number: int = Field(ge=1)
    paper_ids: list[str] = Field(default=[], max_length=200)


def has_missing(question, marks):
    expected = {i.key for i in grading_items([question])}
    present = {
        (m["question_number"], m["part_label"])
        for m in marks
        if m["final_marks"] is not None
    }
    return bool(expected - present)


async def batch_work(bid, exam_id, qnum, papers):
    await db.execute("update question_batches set status='processing' where id=%s", bid)
    try:
        question = await db.fetch_one(
            "select * from exam_questions where exam_id=%s and number=%s", exam_id, qnum
        )
        for pid in papers:
            async with db.transaction() as c:
                paper = await (
                    await c.execute(
                        "select * from student_papers where id=%s for update", (pid,)
                    )
                ).fetchone()
                marks = await (
                    await c.execute(
                        "select * from paper_marks where paper_id=%s and question_number=%s",
                        (pid, qnum),
                    )
                ).fetchall()
                started = (
                    paper
                    and paper["status"] in ("ready", "checked", "failed")
                    and has_missing(question, marks)
                )
                if started:
                    await c.execute(
                        "update student_papers set status='checking',error=null where id=%s",
                        (pid,),
                    )
            if not started:
                await db.execute(
                    "update question_batches set skipped=skipped+1,updated_at=now() where id=%s",
                    bid,
                )
                continue
            ok = await grade_paper(str(pid), qnum)
            await db.execute(
                "update question_batches set completed=completed+%s,failed=failed+%s,updated_at=now() where id=%s",
                int(ok),
                int(not ok),
                bid,
            )
        await db.execute(
            "update question_batches set status='ready',updated_at=now() where id=%s",
            bid,
        )
    except Exception:
        await db.execute(
            "update question_batches set status='failed',error='Batch interrupted. Completed marks were saved; retry remaining papers.',updated_at=now() where id=%s",
            bid,
        )


@router.get("/exams/{exam_id}/question-checks")
async def view(
    exam_id: str, question_number: int, teacher: Teacher = Depends(current_teacher)
):
    ex = await access.exam(teacher, exam_id)
    q = await db.fetch_one(
        "select * from exam_questions where exam_id=%s and number=%s",
        exam_id,
        question_number,
    )
    if not q:
        raise HTTPException(404, "Question not found.")
    papers = await db.fetch_all(
        "select id,student_name,enrollment_no,status,is_sample,error from student_papers where exam_id=%s order by created_at",
        exam_id,
    )
    marks = await db.fetch_all(
        """select m.* from paper_marks m join student_papers p on p.id=m.paper_id
       where p.exam_id=%s and m.question_number=%s""",
        exam_id,
        question_number,
    )
    for p in papers:
        p["marks"] = [m for m in marks if m["paper_id"] == p["id"]]
    batches = await db.fetch_all(
        "select * from question_batches where exam_id=%s order by created_at desc limit 5",
        exam_id,
    )
    return {"question": q, "papers": papers, "batches": batches}


@router.post("/exams/{exam_id}/question-checks", status_code=202)
async def start(
    exam_id: str, body: BatchIn, teacher: Teacher = Depends(current_teacher)
):
    ex = await access.exam(teacher, exam_id)
    if ex["paper_status"] != "ready" or ex["key_status"] != "ready":
        raise HTTPException(409, "Add the question paper and key first.")
    question = await db.fetch_one(
        "select * from exam_questions where exam_id=%s and number=%s",
        exam_id,
        body.question_number,
    )
    if not question:
        raise HTTPException(404, "Question not found.")
    async with db.transaction() as c:
        locked = await (
            await c.execute("select * from exams where id=%s for update", (exam_id,))
        ).fetchone()
        if locked["paper_status"] != "ready" or locked["key_status"] != "ready":
            raise HTTPException(409, "Wait for the paper and key to finish.")
        if await (
            await c.execute(
                "select 1 from question_batches where exam_id=%s and status in ('queued','processing')",
                (exam_id,),
            )
        ).fetchone():
            raise HTTPException(
                409, "A question batch is already running for this exam."
            )
        rows = await (
            await c.execute(
                """select p.id from student_papers p where p.exam_id=%s and p.status in ('ready','checked','failed')
          and (%s or p.id=any(%s::uuid[]))""",
                (exam_id, not body.paper_ids, body.paper_ids),
            )
        ).fetchall()
        all_marks = await (
            await c.execute(
                "select m.* from paper_marks m join student_papers p on p.id=m.paper_id where p.exam_id=%s and m.question_number=%s",
                (exam_id, body.question_number),
            )
        ).fetchall()
        rows = [
            r
            for r in rows
            if has_missing(question, [m for m in all_marks if m["paper_id"] == r["id"]])
        ]
        if not rows:
            raise HTTPException(
                409,
                "No unchecked answers remain for this question in the selected papers.",
            )
        b = await (
            await c.execute(
                "insert into question_batches(exam_id,question_number,total) values(%s,%s,%s) returning *",
                (exam_id, body.question_number, len(rows)),
            )
        ).fetchone()
    tasks.run_in_background(
        f"question-batch-{b['id']}",
        lambda: batch_work(
            str(b["id"]), exam_id, body.question_number, [r["id"] for r in rows]
        ),
    )
    return b
