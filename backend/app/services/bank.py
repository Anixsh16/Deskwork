"""Extract reusable questions from generated messages. Exact text duplicates are idempotent."""
import hashlib
import json
import logging
import re
from pydantic import BaseModel, Field, model_validator
from typing import Literal
from .. import db, gemini
from ..schemas import ParsedPart
log=logging.getLogger(__name__)

class BankQuestion(BaseModel):
    text:str=Field(min_length=5,max_length=20000)
    topic:str=Field(min_length=1,max_length=120)
    difficulty:Literal['easy','medium','hard']='medium'
    kind:Literal['theory','numerical','code','diagram','mcq']='theory'
    marks:float=Field(gt=0,le=100)
    parts:list[ParsedPart]=[]
    answer:str|None=None
    has_figure:bool=False

    @model_validator(mode='after')
    def validate_parts(self):
        import math
        if not math.isfinite(self.marks): raise ValueError('Invalid question marks')
        labels=set()
        for p in self.parts:
            p.label=re.sub(r'[\s()\[\].:]','',p.label).lower()
            if not p.label or p.label in labels: raise ValueError('Subpart labels must be nonempty and unique')
            labels.add(p.label)
            if not math.isfinite(p.marks) or p.marks<=0: raise ValueError('Subpart marks must be positive')
        if self.parts and abs(sum(p.marks for p in self.parts)-self.marks)>1e-6:
            raise ValueError('Subpart marks must sum to the question maximum')
        return self

class ExtractedQuestions(BaseModel):
    questions:list[BankQuestion]=Field(max_length=100)


def fingerprint(q:BankQuestion):
    # Ignore mark allocations and whitespace, but keep all question text and sub-parts.
    text=q.text+' '+ ' '.join(p.text for p in q.parts)
    return hashlib.sha256(re.sub(r'\s+',' ',text).strip().lower().encode()).hexdigest()

async def save_question(course_id,q,conn,source_message_id=None,source_exam_id=None,number=None):
    if q.parts: q.marks=sum(p.marks for p in q.parts)
    if q.marks<=0: raise ValueError('Question marks must be positive.')
    await conn.execute('''insert into question_bank(course_id,source_message_id,source_exam_id,source_number,fingerprint,
      text,topic,difficulty,kind,marks,parts,answer,has_figure) values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
      on conflict(course_id,fingerprint) do nothing''',
      (course_id,source_message_id,source_exam_id,number,fingerprint(q),q.text,q.topic,q.difficulty,q.kind,q.marks,
       db.jsonb([p.model_dump() for p in q.parts]),q.answer,q.has_figure))

async def import_message(message_id):
    try:
        msg=await db.fetch_one('''select m.*,ch.course_id,ch.bot from chat_messages m join chats ch on ch.id=m.chat_id
          where m.id=%s and m.status='done' and m.role='assistant' and ch.bot in ('assignment','paper')''',message_id)
        if not msg: return
        await db.execute("update bank_imports set status='processing',error=null where message_id=%s",message_id)
        schema,_=await gemini.generate_json([gemini.text_part(msg['content'][:80000])],ExtractedQuestions,
          system=('Extract ONLY assessment questions from the supplied generated assignment or question paper. '
                  'If this is an answer key, explanation or conversation without an assessment, return an empty questions list. '
                  'Preserve complete stems, numeric data, options and subparts; do not rewrite or invent questions. '
                  'Tag topic, difficulty and kind. Use printed marks; if no marks use 5 per whole question and split across parts. '
                  'Never invent missing figures. Mark has_figure if a question needs a figure not described fully in words. '
                  'Include an answer only if explicitly supplied.'),thinking='low')
        async with db.transaction() as c:
            for i,q in enumerate(schema.questions,1): await save_question(msg['course_id'],q,c,message_id,number=i)
            await c.execute("update bank_imports set status='ready',question_count=%s,updated_at=now() where message_id=%s",(len(schema.questions),message_id))
    except Exception:
        log.exception('Bank import failed')
        await db.execute("update bank_imports set status='failed',error='Could not collect questions. Retry collection.',updated_at=now() where message_id=%s",message_id)

async def collect_pending(ids):
    for mid in ids: await import_message(str(mid))
