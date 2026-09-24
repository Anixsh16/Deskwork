from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .. import access, db, storage, tasks, uploads
from ..auth import Teacher, current_teacher
from ..services import exams as exam_service

router = APIRouter()


class PaperPatch(BaseModel):
    student_name: str | None = Field(default=None, max_length=120)
    enrollment_no: str | None = Field(default=None, max_length=60)


class MarkIn(BaseModel):
    question_number: int
    part_label: str = ""
    marks: float | None = Field(default=None, ge=0)
    note: str | None = Field(default=None, max_length=1000)


def _ready_for_papers(exam: dict) -> None:
    if exam["paper_status"] != "ready" or exam["key_status"] != "ready":
        raise HTTPException(409, "Upload the question paper and the answer key first.")


@router.post("/exams/{exam_id}/papers", status_code=201)
async def upload_paper(exam_id: str, files: list[UploadFile] = File(...), teacher: Teacher = Depends(current_teacher)):
    exam = await access.exam(teacher, exam_id)
    _ready_for_papers(exam)
    name, original, pages = await uploads.store_as_pages(
        f"{teacher.id}/{exam['course_id']}/exams/{exam_id}/student-papers", files
    )
    row = await db.fetch_one(
        """insert into student_papers (exam_id, filename, file_path, pages, status)
           values (%s, %s, %s, %s, 'reading') returning id""",
        exam_id, name, original, db.jsonb(pages),
    )
    paper_id = str(row["id"])
    tasks.run_in_background(f"identity-{paper_id}", lambda: exam_service.read_identity(paper_id))
    return {"id": paper_id}


@router.get("/papers/{paper_id}")
async def get_paper(paper_id: str, teacher: Teacher = Depends(current_teacher)):
    paper = await access.paper(teacher, paper_id)
    exam = await access.exam(teacher, str(paper["exam_id"]))
    urls = await storage.signed_urls(paper["pages"])
    paper["page_urls"] = [urls.get(p, "") for p in paper["pages"]]
    paper["marks"] = await db.fetch_all(
        """select question_number, part_label, max_marks, attempted, marks_a, marks_b, final_marks, source, flagged,
             flag_reason, student_answer, reasoning, reasoning_b, mistakes, confidence, pages, teacher_note, updated_at
           from paper_marks where paper_id = %s order by question_number, part_label""",
        paper_id,
    )
    paper["exam"] = {
        "id": exam["id"], "title": exam["title"], "total_marks": exam["total_marks"],
        "course_id": exam["course_id"], "course_name": exam["course_name"],
    }
    paper["questions"] = await db.fetch_all(
        "select number, text, marks, parts from exam_questions where exam_id = %s order by number", paper["exam_id"]
    )
    paper["key_items"] = await db.fetch_all(
        """select question_number, part_label, answer, final_answer, marking_points from answer_key_items
           where exam_id = %s order by question_number, part_label""",
        paper["exam_id"],
    )
    paper["edits"] = await db.fetch_all(
        """select question_number, part_label, old_marks, new_marks, note, created_at from mark_edits
           where paper_id = %s order by created_at desc""",
        paper_id,
    )
    siblings = await db.fetch_all(
        "select id from student_papers where exam_id = %s order by created_at", paper["exam_id"]
    )
    ids = [str(s["id"]) for s in siblings]
    i = ids.index(str(paper["id"]))
    paper["prev_id"] = ids[i - 1] if i > 0 else None
    paper["next_id"] = ids[i + 1] if i + 1 < len(ids) else None
    return paper


@router.patch("/papers/{paper_id}")
async def update_paper(paper_id: str, body: PaperPatch, teacher: Teacher = Depends(current_teacher)):
    await access.paper(teacher, paper_id)
    await db.execute(
        "update student_papers set student_name = %s, enrollment_no = %s where id = %s",
        (body.student_name or "").strip() or None, (body.enrollment_no or "").strip() or None, paper_id,
    )
    return {"ok": True}


@router.delete("/papers/{paper_id}", status_code=204)
async def delete_paper(paper_id: str, teacher: Teacher = Depends(current_teacher)):
    paper = await access.paper(teacher, paper_id)
    if paper["status"] == "checking":
        raise HTTPException(409, "Wait for the check to finish before deleting this paper.")
    await storage.delete_paths([paper["file_path"], *paper["pages"]])
    await db.execute("delete from student_papers where id = %s", paper_id)


async def _start_check(paper: dict) -> bool:
    started = await db.fetch_one(
        """update student_papers set status = 'checking', error = null
           where id = %s and status in ('ready', 'checked', 'failed') returning id""",
        paper["id"],
    )
    if started:
        pid = str(paper["id"])
        tasks.run_in_background(f"grade-{pid}", lambda: exam_service.grade_paper(pid))
    return bool(started)


@router.post("/papers/{paper_id}/check")
async def check_paper(paper_id: str, teacher: Teacher = Depends(current_teacher)):
    paper = await access.paper(teacher, paper_id)
    exam = await access.exam(teacher, str(paper["exam_id"]))
    _ready_for_papers(exam)
    if paper["checked_by"] == "teacher":
        raise HTTPException(409, "You checked this paper manually. Clear your marks first to let the AI check it.")
    if not await _start_check(paper):
        raise HTTPException(409, "This paper is already being checked or is still being read.")
    return {"ok": True}


@router.post("/exams/{exam_id}/check-all")
async def check_all(exam_id: str, teacher: Teacher = Depends(current_teacher)):
    exam = await access.exam(teacher, exam_id)
    _ready_for_papers(exam)
    papers = await db.fetch_all(
        "select * from student_papers where exam_id = %s and status in ('ready', 'failed')", exam_id
    )
    started = [str(p["id"]) for p in papers if await _start_check(p)]
    return {"started": started}


@router.post("/papers/{paper_id}/manual")
async def start_manual(paper_id: str, teacher: Teacher = Depends(current_teacher)):
    """Creates empty mark rows so the teacher can check the paper by hand."""
    paper = await access.paper(teacher, paper_id)
    if paper["status"] in ("checking", "reading"):
        raise HTTPException(409, "Wait for the paper to finish processing.")
    if paper["status"] == "checked":
        return {"ok": True}
    questions = await db.fetch_all("select * from exam_questions where exam_id = %s", paper["exam_id"])
    async with db.transaction() as conn:
        await conn.execute("delete from paper_marks where paper_id = %s", (paper_id,))
        for it in exam_service.grading_items(questions):
            await conn.execute(
                """insert into paper_marks (paper_id, question_number, part_label, max_marks, source, final_marks)
                   values (%s, %s, %s, %s, 'teacher', null)""",
                (paper_id, it.question_number, it.part_label, it.max_marks),
            )
        await conn.execute(
            "update student_papers set status = 'checked', checked_by = 'teacher', checked_at = now(), total_marks = null where id = %s",
            (paper_id,),
        )
    return {"ok": True}


@router.patch("/papers/{paper_id}/marks")
async def set_marks(paper_id: str, body: list[MarkIn], teacher: Teacher = Depends(current_teacher)):
    paper = await access.paper(teacher, paper_id)
    if paper["status"] != "checked":
        raise HTTPException(409, "Check the paper (with AI or manually) before editing marks.")
    rows = {
        (r["question_number"], r["part_label"]): r
        for r in await db.fetch_all("select * from paper_marks where paper_id = %s", paper_id)
    }
    for m in body:
        row = rows.get((m.question_number, m.part_label))
        if not row:
            raise HTTPException(400, f"Q{m.question_number}{m.part_label} is not part of this exam.")
        if m.marks is not None and (m.marks > float(row["max_marks"]) or m.marks * 2 != int(m.marks * 2)):
            raise HTTPException(400, f"Marks for Q{m.question_number}{m.part_label} must be 0 to {float(row['max_marks']):g}, in steps of 0.5.")
    async with db.transaction() as conn:
        for m in body:
            row = rows[(m.question_number, m.part_label)]
            old = row["final_marks"]
            await conn.execute(
                """update paper_marks set final_marks = %s, source = 'teacher', flagged = false,
                   teacher_note = case when %s::text is null then teacher_note else nullif(%s::text, '') end,
                   updated_at = now()
                   where paper_id = %s and question_number = %s and part_label = %s""",
                (m.marks, m.note, m.note, paper_id, m.question_number, m.part_label),
            )
            if old is None or m.marks is None or float(old) != m.marks:
                await conn.execute(
                    """insert into mark_edits (paper_id, question_number, part_label, old_marks, new_marks, note, actor)
                       values (%s, %s, %s, %s, %s, %s, %s)""",
                    (paper_id, m.question_number, m.part_label, old, m.marks, m.note, teacher.id),
                )
    await exam_service.recompute_totals(paper_id)
    return {"ok": True}


@router.post("/papers/{paper_id}/review")
async def mark_reviewed(paper_id: str, teacher: Teacher = Depends(current_teacher)):
    paper = await access.paper(teacher, paper_id)
    if paper["status"] != "checked":
        raise HTTPException(409, "Check the paper first.")
    missing = await db.fetch_one(
        "select count(*) as n from paper_marks where paper_id = %s and final_marks is null", paper_id
    )
    if missing["n"]:
        raise HTTPException(409, "Give marks for every question before marking the paper as reviewed.")
    await db.execute(
        "update student_papers set reviewed_at = now() where id = %s", paper_id
    )
    await db.execute("update paper_marks set flagged = false where paper_id = %s", paper_id)
    await exam_service.recompute_totals(paper_id)
    return {"ok": True}


@router.post("/papers/{paper_id}/reset")
async def reset_paper(paper_id: str, teacher: Teacher = Depends(current_teacher)):
    """Clears all marks so the paper can be checked again from scratch."""
    paper = await access.paper(teacher, paper_id)
    if paper["status"] in ("checking", "reading"):
        raise HTTPException(409, "Wait for the paper to finish processing.")
    await db.execute("delete from paper_marks where paper_id = %s", paper_id)
    await db.execute(
        """update student_papers set status = 'ready', checked_by = null, checked_at = null, reviewed_at = null,
           total_marks = null, flagged_count = 0, summary = null, error = null where id = %s""",
        paper_id,
    )
    return {"ok": True}
