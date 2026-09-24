"""Ownership checks: every record is reached through a course owned by the signed-in teacher."""

from fastapi import HTTPException

from . import db
from .auth import Teacher


async def course(teacher: Teacher, course_id: str) -> dict:
    row = await db.fetch_one("select * from courses where id = %s and owner_id = %s", course_id, teacher.id)
    if not row:
        raise HTTPException(404, "Course not found.")
    return row


async def exam(teacher: Teacher, exam_id: str) -> dict:
    row = await db.fetch_one(
        """select e.*, c.name as course_name, c.code as course_code from exams e
           join courses c on c.id = e.course_id where e.id = %s and c.owner_id = %s""",
        exam_id, teacher.id,
    )
    if not row:
        raise HTTPException(404, "Exam not found.")
    return row


async def paper(teacher: Teacher, paper_id: str) -> dict:
    row = await db.fetch_one(
        """select p.* from student_papers p join exams e on e.id = p.exam_id
           join courses c on c.id = e.course_id where p.id = %s and c.owner_id = %s""",
        paper_id, teacher.id,
    )
    if not row:
        raise HTTPException(404, "Paper not found.")
    return row


async def chat(teacher: Teacher, chat_id: str) -> dict:
    row = await db.fetch_one(
        """select ch.* from chats ch join courses c on c.id = ch.course_id
           where ch.id = %s and c.owner_id = %s""",
        chat_id, teacher.id,
    )
    if not row:
        raise HTTPException(404, "Chat not found.")
    return row


async def course_file(teacher: Teacher, file_id: str) -> dict:
    row = await db.fetch_one(
        """select f.* from course_files f join courses c on c.id = f.course_id
           where f.id = %s and c.owner_id = %s""",
        file_id, teacher.id,
    )
    if not row:
        raise HTTPException(404, "File not found.")
    return row
