from fastapi import APIRouter, Depends
from .. import db,access
from ..auth import Teacher,current_teacher
from ..services.analytics import summarise
router=APIRouter()

@router.get('/analytics')
async def analytics(course_id:str|None=None,exam_id:str|None=None,include_samples:bool=True,teacher:Teacher=Depends(current_teacher)):
    if course_id: await access.course(teacher,course_id)
    if exam_id: await access.exam(teacher,exam_id)
    where='''from student_papers p join exams e on e.id=p.exam_id join courses c on c.id=e.course_id
      where c.owner_id=%s and (%s::uuid is null or c.id=%s::uuid) and (%s::uuid is null or e.id=%s::uuid)
      and (%s or not p.is_sample)'''
    args=(teacher.id,course_id,course_id,exam_id,exam_id,include_samples)
    papers=await db.fetch_all('select p.*,e.total_marks as max_marks,c.id as course_id '+where,*args)
    rows=await db.fetch_all('''select m.*,e.id as exam_id,e.title as exam_title,c.id as course_id,c.name as course_name,q.topic,q.text
      from paper_marks m join student_papers p on p.id=m.paper_id join exams e on e.id=p.exam_id
      join courses c on c.id=e.course_id join exam_questions q on q.exam_id=e.id and q.number=m.question_number
      where c.owner_id=%s and (%s::uuid is null or c.id=%s::uuid) and (%s::uuid is null or e.id=%s::uuid)
      and (%s or not p.is_sample)''',*args)
    courses=await db.fetch_all('select id,name from courses where owner_id=%s order by name',teacher.id)
    result=summarise(rows,papers,courses)
    result['exams']=await db.fetch_all('''select e.id,e.title,e.course_id from exams e join courses c on c.id=e.course_id
       where c.owner_id=%s order by e.created_at desc''',teacher.id)
    return result
