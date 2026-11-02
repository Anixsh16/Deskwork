"""Fresh production checks for final features, scoped to the named regression course."""
import io,json,time,sys
from pathlib import Path
from docx import Document
from tests import e2e_flow as core
core.API='https://deskwork-api.onrender.com/api'
ROOT=Path(__file__).resolve().parents[2];WORK=ROOT/'.work/production-regression';checks=[];state={}
def check(name,ok,detail=''):
 checks.append(dict(name=name,ok=bool(ok),detail=detail));print(('PASS ' if ok else 'FAIL ')+name,detail,flush=True);save()
def save():
 (WORK/'followup-results.json').write_text(json.dumps(dict(checks=checks,**state),indent=2,default=str))
def main():
 c=core.Client();report=json.loads((WORK/'core-results.json').read_text());cid=report['course_id'];eid=report['exam_id'];state.update(course_id=cid,exam_id=eid)
 ex=c.json('GET',f'/exams/{eid}');snapshot={p['id']:p['question_marks'] for p in ex['papers']}
 pid=c.json('POST',f'/exams/{eid}/papers',files=core.files(core.DATA/'t2_student_parth.pdf'))['id'];state['question_paper_id']=pid;save()
 core.poll(lambda:c.json('GET',f'/papers/{pid}'),lambda p:p['status'] in ('ready','failed'))
 c.call('PATCH',f'/papers/{pid}',json={'student_name':'Production question-wise test','enrollment_no':'QA-QWISE'})
 c.call('POST',f'/exams/{eid}/question-checks',json={'question_number':1,'paper_ids':[pid]})
 core.poll(lambda:c.json('GET',f'/exams/{eid}/question-checks?question_number=1'),lambda r:not any(b['status'] in ('queued','processing') for b in r['batches']),timeout=600)
 p=c.json('GET',f'/papers/{pid}');check('question-wise result contains only Q1 subparts',len(p['marks'])==2 and all(m['question_number']==1 and m['final_marks'] is not None for m in p['marks']))
 check('partial paper has no full-paper total',p['total_marks'] is None and p['status']=='ready')
 after=c.json('GET',f'/exams/{eid}');check('other students remain unchanged',all(x['question_marks']==snapshot[x['id']] for x in after['papers'] if x['id'] in snapshot))
 preserved={(m['question_number'],m['part_label']):m['final_marks'] for m in p['marks']}
 c.call('POST',f'/papers/{pid}/manual');m=c.json('GET',f'/papers/{pid}')
 check('switch to manual preserves partial AI marks',all(x['final_marks']==preserved[(x['question_number'],x['part_label'])] for x in m['marks'] if x['question_number']==1))
 count_after=c.json('GET',f'/exams/{eid}')
 check('incomplete manual paper is not counted as checked',sum(x['status']=='checked' for x in count_after['papers'])==sum(x['status']=='checked' for x in after['papers']))
 early=c.http.post(f'/papers/{pid}/review');check('incomplete manual paper cannot be reviewed',early.status_code==409)
 c.call('PATCH',f'/papers/{pid}/marks',json=[dict(question_number=x['question_number'],part_label=x['part_label'],marks=0,note='Production regression manual entry') for x in m['marks'] if x['final_marks'] is None])
 c.call('POST',f'/papers/{pid}/review');m=c.json('GET',f'/papers/{pid}');check('manual completion and review work',m['status']=='checked' and m['reviewed_at'] is not None)
 d=c.json('GET','/analytics',params={'course_id':cid});es=c.json('GET','/courses/'+cid)['exams'];allpapers=[]
 for e in es:
  for p in c.json('GET',f"/exams/{e['id']}/papers"):
   if p['status']=='checked' and p['total_marks'] is not None and e['total_marks']:allpapers.append(100*float(p['total_marks'])/float(e['total_marks']))
 check('analytics equals independently calculated paper average',d['checked_count']==len(allpapers) and abs(d['average_pct']-round(sum(allpapers)/len(allpapers),1))<.01)
 check('per-question analytics contains scored answers',bool(d['questions']) and all(q['count']>0 for q in d['questions']))
 plan=c.json('POST',f'/courses/{cid}/lesson-plans',json=dict(title='Production verified: Transport lectures',lectures=2,minutes=45,topics='TCP flow control and congestion control',examples=1,practice=1,priorities='Include numerical worked examples'))
 state['plan_id']=plan['id'];save();plan=core.poll(lambda:c.json('GET','/lesson-plans/'+plan['id']),lambda p:p['status'] in ('ready','failed'),timeout=600)
 check('fresh production lesson plan generated',plan['status']=='ready',plan.get('error') or '')
 if plan['status']=='ready':
  check('lesson counts and time budgets match',len(plan['content']['lectures'])==2 and all(sum(a['minutes'] for a in l['activities'])==45 for l in plan['content']['lectures']))
  check('lesson plan sources reference this course',bool(plan['sources']))
  invalid=json.loads(json.dumps(plan['content']));invalid['lectures'][0]['activities'][0]['minutes']+=1
  r=c.http.put('/lesson-plans/'+plan['id'],json=invalid);check('invalid time edit rejected',r.status_code==400)
  c.call('PUT','/lesson-plans/'+plan['id'],json=plan['content']);check('valid lesson edit saved',True)
  word=c.call('GET','/lesson-plans/'+plan['id']+'/docx');check('lesson Word opens as a document',len(Document(io.BytesIO(word.content)).paragraphs)>4)
 bank=core.poll(lambda:c.json('GET','/question-bank',params={'course_id':cid,'limit':100}),lambda b:not any(i['status'] in ('queued','processing') for i in b['imports']),timeout=600)
 check('new generator messages automatically reach bank',any(q['source_message_id']==report['assignment_message_id'] for q in bank['questions']))
 selectable=[q for q in bank['questions'] if not q['has_figure']][:3]
 if len(selectable)<3:raise AssertionError('Need three reusable questions for the bank tests')
 q=selectable[0];topic=q['topic'];body={**q,'topic':'Verified topic filter'}
 c.call('PUT','/question-bank/'+q['id'],json=body)
 filtered=c.json('GET','/question-bank',params={'course_id':cid,'topic':'Verified topic filter','difficulty':q['difficulty'],'kind':q['kind']})
 check('bank edit and combined filters work',any(x['id']==q['id'] for x in filtered['questions']))
 c.call('PUT','/question-bank/'+q['id'],json=q)
 new=c.json('POST','/question-bank/assemble',json={'ids':[x['id'] for x in selectable[:2]],'title':'Production verified: question-bank paper'});state['bank_exam_id']=new['id'];save()
 c.call('POST','/question-bank/assemble',json={'ids':[selectable[2]['id']],'exam_id':new['id'],'title':'Add third question'})
 assembled=c.json('GET','/exams/'+new['id']);check('bank creates and appends to a draft exam',len(assembled['questions'])==3 and abs(float(assembled['total_marks'])-sum(float(x['marks']) for x in selectable))<.01)
 word=c.call('POST','/question-bank/export',json={'ids':[x['id'] for x in selectable[:2]],'title':'Production export'})
 check('question bank Word export opens',len(Document(io.BytesIO(word.content)).paragraphs)>2)
 check('anonymous production access rejected',__import__('httpx').get(core.API+'/analytics').status_code==401)
 c.http.close()
try:main()
except Exception as e:check('followup completed',False,str(e))
finally:
 save();print(f"{sum(x['ok'] for x in checks)}/{len(checks)} passed",flush=True)
 if not all(x['ok'] for x in checks):sys.exit(1)
