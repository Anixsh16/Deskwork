"""Live smoke test: generated plans, bank collection and a synthetic student's question check."""
import json,time,sys
from pathlib import Path
import httpx
from tools.session import access_token
ROOT=Path(__file__).resolve().parents[2]; report=[]
def check(name,ok,detail=''):
 report.append(dict(check=name,passed=bool(ok),detail=detail));print(('PASS ' if ok else 'FAIL ')+name,detail,flush=True)
def main():
 c=httpx.Client(base_url='http://localhost:8000/api',headers={'Authorization':'Bearer '+access_token()},timeout=120)
 def get(p):r=c.get(p);r.raise_for_status();return r.json()
 def post(p,b={}):r=c.post(p,json=b);r.raise_for_status();return r.json()
 def wait(p,pred):
  end=time.monotonic()+900
  while time.monotonic()<end:
   d=get(p)
   if pred(d):return d
   time.sleep(3)
  raise RuntimeError('Timed out: '+p)
 courses=get('/courses');course=next(x for x in courses if x['name']=='CN IOT')
 d=get('/analytics');check('analytics includes labelled samples',d['sample_count']>=28,str(d['sample_count']))
 check('sample filter works',get('/analytics?include_samples=false')['sample_count']==0)
 plans=get('/lesson-plans?course_id='+course['id']);plan=next((p for p in plans if p['title']=='Final review: TCP lecture sequence'),None)
 if not plan:plan=post('/courses/'+course['id']+'/lesson-plans',dict(title='Final review: TCP lecture sequence',lectures=3,minutes=50,topics='TCP flow control, congestion control and retransmission',examples=1,practice=1,priorities='Prerequisite recap and numerical examples'))
 if plan['status']=='failed':post('/lesson-plans/'+plan['id']+'/retry')
 plan=wait('/lesson-plans/'+plan['id'],lambda p:p['status'] in ('ready','failed'))
 check('plan generated from actual slides',plan['status']=='ready',plan.get('error') or '')
 if plan['status']=='ready':
  check('all lectures fit 50 minutes',all(sum(a['minutes'] for a in l['activities'])==50 for l in plan['content']['lectures']))
  check('plan has slide references',bool(plan['sources']))
  r=c.get('/lesson-plans/'+plan['id']+'/docx');check('lesson Word export',r.status_code==200 and r.content[:2]==b'PK')
 result=post('/question-bank/collect');check('historical bank collection starts',result['queued']>=0,str(result))
 bank=wait('/question-bank',lambda b:not any(i['status'] in ('queued','processing') for i in b['imports']))
 check('bank contains collected questions',bank['total']>8,str(bank['total']))
 ids=[q['id'] for q in bank['questions'] if q['course_id']==course['id'] and not q['has_figure']][:2]
 if ids:
  e=post('/question-bank/assemble',dict(ids=ids,title='Final review: reused question paper'));check('reused questions create a real exam',len(get('/exams/'+e['id'])['questions'])==len(ids))
  (ROOT/'.work/final-evaluation/bank-exam-id').write_text(e['id'])
 sample=next(x for x in courses if x['name']=='Computer Networks - Sample Class');eid=get('/courses/'+sample['id'])['exams'][0]['id'];ex=get('/exams/'+eid)
 (ROOT/'.work/final-evaluation/sample-exam-id').write_text(eid)
 pid=next(p['id'] for p in ex['papers'] if p['student_name']=='Sample Student 13');p=get('/papers/'+pid)
 if not any(m['question_number']==1 and m['final_marks'] is not None for m in p['marks']):post('/exams/'+eid+'/question-checks',dict(question_number=1,paper_ids=[pid]))
 wait('/exams/'+eid+'/question-checks?question_number=1',lambda d:not any(b['status'] in ('queued','processing') for b in d['batches']))
 p=get('/papers/'+pid);marks=[m for m in p['marks'] if m['question_number']==1]
 check('question-wise dual check writes Q1 marks',bool(marks) and all(m['marks_a'] is not None and m['marks_b'] is not None for m in marks))
 check('other questions untouched',all(m['question_number']==1 for m in p['marks']))
 check('partial total stays empty',p['status']=='ready' and p['total_marks'] is None)
 r=c.post('/exams/'+eid+'/question-checks',json=dict(question_number=1,paper_ids=[pid]));check('repeat check preserves finished marks',r.status_code==409)
 c.close()
try:main()
except Exception as e:check('live flow completed',False,str(e))
finally:
 (ROOT/'.work/final-evaluation/live-test-results.json').write_text(json.dumps(report,indent=2))
 print(f'{sum(r["passed"] for r in report)}/{len(report)} passed',flush=True)
 if not all(r['passed'] for r in report):sys.exit(1)
