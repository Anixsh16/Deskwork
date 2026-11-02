from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel,Field
from .. import access,db,tasks
from ..auth import Teacher,current_teacher
from ..services import bank
from ..services.docx_export import markdown_to_docx
router=APIRouter()

@router.get('/question-bank')
async def list_questions(course_id:str|None=None,q:str='',topic:str='',difficulty:str='',kind:str='',
                         offset:int=Query(0,ge=0),limit:int=Query(30,ge=1,le=100),teacher:Teacher=Depends(current_teacher)):
    params=(teacher.id,course_id,course_id,'%'+q+'%',topic,topic,difficulty,difficulty,kind,kind)
    where='''from question_bank b join courses c on c.id=b.course_id where c.owner_id=%s
       and (%s::uuid is null or c.id=%s::uuid) and b.text ilike %s and (%s='' or b.topic=%s)
       and (%s='' or b.difficulty=%s) and (%s='' or b.kind=%s)'''
    rows=await db.fetch_all('select b.*,c.name as course_name '+where+' order by b.created_at desc,b.id limit %s offset %s',*params,limit,offset)
    count=await db.fetch_one('select count(*) as n '+where,*params)
    topics=await db.fetch_all('''select distinct b.topic from question_bank b join courses c on c.id=b.course_id
      where c.owner_id=%s and (%s::uuid is null or c.id=%s::uuid) order by b.topic''',teacher.id,course_id,course_id)
    imports=await db.fetch_all('''select i.status,count(*) n from bank_imports i join chat_messages m on m.id=i.message_id
      join chats ch on ch.id=m.chat_id join courses c on c.id=ch.course_id where c.owner_id=%s group by i.status''',teacher.id)
    return {'questions':rows,'total':count['n'],'topics':[x['topic'] for x in topics],'imports':imports}

@router.post('/question-bank/collect')
async def collect(teacher:Teacher=Depends(current_teacher)):
    async with db.transaction() as c:
        cur=await c.execute('''insert into bank_imports(message_id) select m.id from chat_messages m
          join chats ch on ch.id=m.chat_id join courses c on c.id=ch.course_id
          left join bank_imports i on i.message_id=m.id where c.owner_id=%s and ch.bot in ('paper','assignment')
          and m.role='assistant' and m.status='done' and length(m.content)>0 and (i.message_id is null or i.status='failed')
          order by m.created_at limit 50 on conflict(message_id) do update set status='queued',error=null
          where bank_imports.status='failed' returning message_id''',(teacher.id,))
        ids=[r['message_id'] for r in await cur.fetchall()]
    if ids: tasks.run_in_background('bank-collect',lambda:bank.collect_pending(ids))
    return {'queued':len(ids)}

async def owned_question(qid,teacher):
    row=await db.fetch_one('''select b.* from question_bank b join courses c on c.id=b.course_id where b.id=%s and c.owner_id=%s''',qid,teacher.id)
    if not row: raise HTTPException(404,'Question not found.')
    return row

@router.put('/question-bank/{question_id}')
async def edit_question(question_id:str,body:bank.BankQuestion,teacher:Teacher=Depends(current_teacher)):
    await owned_question(question_id,teacher)
    if body.parts and abs(sum(p.marks for p in body.parts)-body.marks)>1e-6: raise HTTPException(400,'Subpart marks must add up to question marks.')
    row=await owned_question(question_id,teacher)
    collision=await db.fetch_one('select id from question_bank where course_id=%s and fingerprint=%s and id<>%s',row['course_id'],bank.fingerprint(body),question_id)
    if collision: raise HTTPException(409,'This question already exists in the course bank.')
    await db.execute('''update question_bank set fingerprint=%s,text=%s,topic=%s,difficulty=%s,kind=%s,marks=%s,parts=%s,answer=%s,has_figure=%s where id=%s''',bank.fingerprint(body),body.text,body.topic,body.difficulty,body.kind,body.marks,db.jsonb([p.model_dump() for p in body.parts]),body.answer,body.has_figure,question_id)
    return {'ok':True}

class Selection(BaseModel):
    ids:list[str]=Field(min_length=1,max_length=50)
    title:str=Field(default='Question bank paper',min_length=2,max_length=160)
    exam_id:str|None=None

async def selected(body,teacher):
    if len(set(body.ids))!=len(body.ids): raise HTTPException(400,'Select each question only once.')
    rows=[await owned_question(qid,teacher) for qid in body.ids]
    if len({r['course_id'] for r in rows})!=1: raise HTTPException(400,'Choose questions from a single course.')
    return rows

@router.post('/question-bank/export')
async def export(body:Selection,teacher:Teacher=Depends(current_teacher)):
    rows=await selected(body,teacher)
    text='# '+body.title+'\n\n'+'\n\n'.join(f"## Q{i}. [{r['marks']} marks]\n{r['text']}\n"+'\n'.join(f"({p['label']}) {p['text']} [{p['marks']} marks]" for p in r['parts']) for i,r in enumerate(rows,1))
    return Response(markdown_to_docx(text,body.title),media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',headers={'Content-Disposition':'attachment; filename="question-bank-paper.docx"'})

@router.post('/question-bank/assemble',status_code=201)
async def assemble(body:Selection,teacher:Teacher=Depends(current_teacher)):
    rows=await selected(body,teacher)
    if any(r['has_figure'] for r in rows): raise HTTPException(400,'These questions need original figures. Attach or describe the figure in the question text before reusing.')
    async with db.transaction() as c:
        if body.exam_id:
            exam=await access.exam(teacher,body.exam_id)
            if exam['course_id']!=rows[0]['course_id']: raise HTTPException(400,'The exam must belong to the same course.')
            exam=await (await c.execute('select * from exams where id=%s for update',(body.exam_id,))).fetchone()
            if exam['paper_status']=='processing' or exam['key_status']=='processing' or exam['key_status']=='ready':
                raise HTTPException(409,'Use a draft exam without an answer key, or create a new exam.')
            existing=await (await c.execute('select 1 from student_papers where exam_id=%s limit 1',(body.exam_id,))).fetchone()
            if existing: raise HTTPException(409,'Cannot append questions after student papers are uploaded.')
            eid=body.exam_id
        else:
            row=await (await c.execute("insert into exams(course_id,title,kind,paper_status) values(%s,%s,'Other','ready') returning id",(rows[0]['course_id'],body.title))).fetchone(); eid=row['id']
        n=(await (await c.execute('select coalesce(max(number),0) n from exam_questions where exam_id=%s',(eid,))).fetchone())['n']
        for i,r in enumerate(rows,n+1):
            await c.execute('insert into exam_questions(exam_id,number,text,marks,parts,topic) values(%s,%s,%s,%s,%s,%s)',(eid,i,r['text'],r['marks'],db.jsonb(r['parts']),r['topic']))
        await c.execute("update exams set paper_status='ready',paper_filename='Assembled from question bank',total_marks=(select sum(marks) from exam_questions where exam_id=%s),updated_at=now() where id=%s",(eid,eid))
    return {'id':eid}
