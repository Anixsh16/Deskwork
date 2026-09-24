import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .. import access, db, documents, storage, tasks, uploads, vectorstore
from ..auth import Teacher, current_teacher
from ..services import ingest

router = APIRouter()


class CourseIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    code: str | None = Field(default=None, max_length=40)
    semester: str | None = Field(default=None, max_length=60)
    institution: str | None = Field(default=None, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    outcomes: str | None = Field(default=None, max_length=4000)


def _clean(body: CourseIn) -> dict:
    return {k: (v.strip() or None) if isinstance(v, str) else v for k, v in body.model_dump().items()}


@router.get("/me")
async def me(teacher: Teacher = Depends(current_teacher)):
    return teacher.__dict__


@router.get("/dashboard")
async def dashboard(teacher: Teacher = Depends(current_teacher)):
    courses = await db.fetch_all(
        """select c.id, c.name, c.code, c.semester, c.created_at,
             (select count(*) from course_files f where f.course_id = c.id) as file_count,
             (select count(*) from course_files f where f.course_id = c.id and f.status = 'ready') as ready_files,
             (select count(*) from exams e where e.course_id = c.id) as exam_count
           from courses c where c.owner_id = %s order by c.created_at desc""",
        teacher.id,
    )
    exams = await db.fetch_all(
        """select e.id, e.title, e.kind, e.total_marks, e.paper_status, e.key_status, e.created_at,
             c.name as course_name, c.code as course_code,
             (select count(*) from student_papers p where p.exam_id = e.id) as paper_count,
             (select count(*) from student_papers p where p.exam_id = e.id and p.status = 'checked') as checked_count,
             (select coalesce(sum(flagged_count), 0) from student_papers p where p.exam_id = e.id) as flagged_count
           from exams e join courses c on c.id = e.course_id
           where c.owner_id = %s order by e.created_at desc""",
        teacher.id,
    )
    return {"courses": courses, "exams": exams}


@router.get("/courses")
async def list_courses(teacher: Teacher = Depends(current_teacher)):
    return (await dashboard(teacher))["courses"]


@router.post("/courses", status_code=201)
async def create_course(body: CourseIn, teacher: Teacher = Depends(current_teacher)):
    v = _clean(body)
    return await db.fetch_one(
        """insert into courses (owner_id, name, code, semester, institution, description, outcomes)
           values (%s, %s, %s, %s, %s, %s, %s) returning *""",
        teacher.id, v["name"], v["code"], v["semester"], v["institution"], v["description"], v["outcomes"],
    )


@router.get("/courses/{course_id}")
async def get_course(course_id: str, teacher: Teacher = Depends(current_teacher)):
    course = await access.course(teacher, course_id)
    course["files"] = await _files(course_id)
    course["exams"] = await db.fetch_all(
        """select e.id, e.title, e.kind, e.total_marks, e.paper_status, e.key_status, e.created_at,
             (select count(*) from student_papers p where p.exam_id = e.id) as paper_count,
             (select count(*) from student_papers p where p.exam_id = e.id and p.status = 'checked') as checked_count
           from exams e where e.course_id = %s order by e.created_at desc""",
        course_id,
    )
    return course


@router.patch("/courses/{course_id}")
async def update_course(course_id: str, body: CourseIn, teacher: Teacher = Depends(current_teacher)):
    await access.course(teacher, course_id)
    v = _clean(body)
    return await db.fetch_one(
        """update courses set name = %s, code = %s, semester = %s, institution = %s, description = %s,
           outcomes = %s, updated_at = now() where id = %s returning *""",
        v["name"], v["code"], v["semester"], v["institution"], v["description"], v["outcomes"], course_id,
    )


@router.delete("/courses/{course_id}", status_code=204)
async def delete_course(course_id: str, teacher: Teacher = Depends(current_teacher)):
    await access.course(teacher, course_id)
    await vectorstore.delete_where({"course_id": course_id})
    await storage.delete_prefix(f"{teacher.id}/{course_id}")
    await db.execute("delete from courses where id = %s", course_id)


async def _files(course_id: str) -> list[dict]:
    return await db.fetch_all(
        """select id, filename, mime, size_bytes, page_count, chunk_count, status, progress, error, created_at
           from course_files where course_id = %s order by created_at""",
        course_id,
    )


@router.get("/courses/{course_id}/files")
async def list_files(course_id: str, teacher: Teacher = Depends(current_teacher)):
    await access.course(teacher, course_id)
    return await _files(course_id)


@router.post("/courses/{course_id}/files", status_code=201)
async def upload_files(
    course_id: str, files: list[UploadFile] = File(...), teacher: Teacher = Depends(current_teacher)
):
    await access.course(teacher, course_id)
    loaded = []
    for f in files:
        data, mime = await uploads.read(f)
        if mime not in (documents.PDF, documents.PPTX):
            raise HTTPException(415, f"{f.filename}: slides must be PDF or PowerPoint (.pptx).")
        loaded.append((f.filename or "slides", data, mime))
    created = []
    for name, data, mime in loaded:
        path = f"{teacher.id}/{course_id}/slides/{uuid.uuid4().hex[:8]}-{uploads.safe_name(name)}"
        await storage.upload(path, data, mime)
        row = await db.fetch_one(
            """insert into course_files (course_id, filename, storage_path, mime, size_bytes)
               values (%s, %s, %s, %s, %s) returning id""",
            course_id, name, path, mime, len(data),
        )
        file_id = str(row["id"])
        tasks.run_in_background(f"ingest-{file_id}", lambda fid=file_id: ingest.ingest_file(fid))
        created.append(file_id)
    return {"file_ids": created, "files": await _files(course_id)}


@router.post("/files/{file_id}/retry")
async def retry_file(file_id: str, teacher: Teacher = Depends(current_teacher)):
    f = await access.course_file(teacher, file_id)
    if f["status"] in ("queued", "processing"):
        raise HTTPException(409, "This file is already being processed.")
    await db.execute("update course_files set status = 'queued', progress = 0, error = null where id = %s", file_id)
    tasks.run_in_background(f"ingest-{file_id}", lambda: ingest.ingest_file(file_id))
    return {"ok": True}


@router.delete("/files/{file_id}", status_code=204)
async def delete_file(file_id: str, teacher: Teacher = Depends(current_teacher)):
    f = await access.course_file(teacher, file_id)
    if f["status"] in ("queued", "processing"):
        raise HTTPException(409, "Wait for this file to finish processing before removing it.")
    await vectorstore.delete_where({"file_id": file_id})
    await storage.delete_paths([f["storage_path"]])
    await db.execute("delete from course_files where id = %s", file_id)
