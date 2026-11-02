from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from .. import access, db, tasks, uploads
from ..auth import Teacher, current_teacher
from ..services.planning import (
    PlanConfig,
    build_plan,
    PlanContent,
    validate_plan,
    plan_markdown,
)
from ..services.docx_export import markdown_to_docx

router = APIRouter()


async def owned(plan_id, teacher):
    row = await db.fetch_one(
        """select p.*,c.name as course_name from lesson_plans p join courses c on c.id=p.course_id
      where p.id=%s and c.owner_id=%s""",
        plan_id,
        teacher.id,
    )
    if not row:
        raise HTTPException(404, "Lesson plan not found.")
    return row


@router.get("/lesson-plans")
async def list_plans(
    course_id: str | None = None, teacher: Teacher = Depends(current_teacher)
):
    return await db.fetch_all(
        """select p.*,c.name as course_name from lesson_plans p join courses c on c.id=p.course_id
      where c.owner_id=%s and (%s::uuid is null or c.id=%s::uuid) order by p.created_at desc""",
        teacher.id,
        course_id,
        course_id,
    )


@router.post("/courses/{course_id}/lesson-plans", status_code=201)
async def create_plan(
    course_id: str, body: PlanConfig, teacher: Teacher = Depends(current_teacher)
):
    await access.course(teacher, course_id)
    if not await db.fetch_one(
        "select 1 from course_files where course_id=%s and status='ready'", course_id
    ):
        raise HTTPException(
            409, "Upload and index lecture slides for this course first."
        )
    row = await db.fetch_one(
        "insert into lesson_plans(course_id,title,config) values(%s,%s,%s) returning *",
        course_id,
        body.title,
        db.jsonb(body.model_dump()),
    )
    tasks.run_in_background(f"plan-{row['id']}", lambda: build_plan(str(row["id"])))
    return row


@router.get("/lesson-plans/{plan_id}")
async def get_plan(plan_id: str, teacher: Teacher = Depends(current_teacher)):
    return await owned(plan_id, teacher)


@router.post("/lesson-plans/{plan_id}/retry")
async def retry_plan(plan_id: str, teacher: Teacher = Depends(current_teacher)):
    await owned(plan_id, teacher)
    row = await db.fetch_one(
        "update lesson_plans set status='queued',error=null where id=%s and status='failed' returning id",
        plan_id,
    )
    if not row:
        raise HTTPException(409, "Only failed plans can be retried.")
    tasks.run_in_background(f"plan-{plan_id}", lambda: build_plan(plan_id))
    return {"ok": True}


@router.put("/lesson-plans/{plan_id}")
async def edit_plan(
    plan_id: str, body: PlanContent, teacher: Teacher = Depends(current_teacher)
):
    row = await owned(plan_id, teacher)
    if row["status"] != "ready":
        raise HTTPException(409, "Wait for this plan to finish.")
    try:
        validate_plan(
            body, PlanConfig.model_validate(row["config"]), len(row["sources"])
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    await db.execute(
        "update lesson_plans set content=%s,updated_at=now() where id=%s",
        db.jsonb(body.model_dump()),
        plan_id,
    )
    return {"ok": True}


@router.get("/lesson-plans/{plan_id}/docx")
async def export_plan(plan_id: str, teacher: Teacher = Depends(current_teacher)):
    row = await owned(plan_id, teacher)
    if row["status"] != "ready":
        raise HTTPException(409, "Wait for this plan to finish.")
    return Response(
        markdown_to_docx(plan_markdown(row), row["title"]),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{uploads.safe_name(row["title"])}.docx"'
        },
    )
