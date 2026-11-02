"""Add labelled synthetic classes to Yug's account. Never resets or overwrites existing work."""
import asyncio,random,uuid
from pathlib import Path
import pymupdf
from app import db,storage
from app.services.bank import BankQuestion,save_question
from app.documents import render_pages
OWNER='yugjindal1234@gmail.com'
NAMESPACE=uuid.UUID('b1312c27-6fe2-4d40-a01d-fbc2cc3da40b')
DATA=[('Computer Networks - Sample Class','CN-SAMPLE',[
 ('TCP flow control','A TCP receiver has an 8000-byte buffer, 5000 bytes received and 2000 processed. Find rwnd and explain its role.',
 'Unprocessed bytes = 5000 - 2000 = 3000. Free space and rwnd = 8000 - 3000 = 5000 bytes. Flow control prevents overflowing the receiver buffer.',
 ['Unprocessed bytes are 3000.','rwnd is 5000 bytes.','Flow control protects the receiver buffer.']),
 ('IP fragmentation','An IPv4 datagram has 4000 data bytes and a 20-byte header. MTU is 1500. Give fragment data lengths, offsets and MF flags.',
 'Maximum payload is floor((1500-20)/8)*8 = 1480. Data lengths: 1480,1480,1040. Offsets: 0,185,370. MF flags: 1,1,0. Total lengths: 1500,1500,1060.',
 ['Payload capacity is 1480 bytes.','Data sizes and offsets are correct.','MF flags 1,1,0; no router reassembly.']),
 ('Congestion control','Explain TCP slow start and congestion avoidance, including the response to a timeout.',
 'Slow start increases cwnd exponentially per RTT until ssthresh. Congestion avoidance increases approximately one MSS per RTT. A timeout reduces ssthresh and resets cwnd to one MSS in the simplified Reno model.',
 ['Slow start is exponential.','Congestion avoidance is additive.','Timeout reduces threshold and resets cwnd.']),
 ('DNS','Describe recursive DNS lookup from a client through its local resolver to the authoritative server.',
 'The client asks its recursive resolver. If not cached, the resolver follows root, TLD and authoritative referrals, returns the address and caches the answer according to TTL.',
 ['Client contacts recursive resolver.','Root, TLD and authoritative path.','Caching and TTL explained.'])]),
 ('Database Systems - Sample Class','DB-SAMPLE',[
 ('Normalisation','Explain 1NF, 2NF and 3NF and the anomalies that normalisation addresses.',
 '1NF requires atomic values. 2NF removes partial dependencies on a composite candidate key. 3NF removes transitive dependencies of non-key attributes. This reduces insertion, update and deletion anomalies.',
 ['1NF atomic values.','2NF removes partial dependency.','3NF and anomalies explained.']),
 ('Transactions','Explain the ACID properties with a bank transfer example.',
 'Atomicity makes both debit and credit happen or neither. Consistency preserves constraints. Isolation separates concurrent transactions. Durability retains committed changes after failure.',
 ['Atomicity and consistency.','Isolation with concurrent transfers.','Durability after commit.']),
 ('SQL joins','Explain INNER JOIN versus LEFT JOIN. Which keeps customers with no orders?',
 'INNER JOIN returns matching rows only. LEFT JOIN preserves all rows from the left table and uses NULL for unmatched right-side columns. Customers LEFT JOIN Orders retains customers with no orders.',
 ['Inner joins match rows.','Left join preserves unmatched left rows.','Correct customer-order example.']),
 ('Indexing','Explain how a B+ tree index speeds range queries and one tradeoff of maintaining an index.',
 'Internal nodes direct search to sorted leaf nodes. Linked leaves permit efficient ordered range scans. Indexes use storage and require updates during inserts, updates and deletes.',
 ['Sorted B+ tree leaves.','Linked leaves support range scans.','Storage and write overhead.'])])]

def ident(s):return str(uuid.uuid5(NAMESPACE,s))

def pdf_bytes(title,lines,hand=False):
 d=pymupdf.open(); page=d.new_page();y=45
 font='/System/Library/Fonts/Supplemental/Comic Sans MS.ttf'
 name='hand' if hand and Path(font).exists() else 'helv'
 if name=='hand':page.insert_font(fontname=name,fontfile=font)
 page.insert_text((40,y),title,fontsize=16,fontname='hebo',color=(.1,.3,.65));y+=25
 page.insert_text((40,y),'SYNTHETIC SAMPLE | For workflow demonstration only',fontsize=9,color=(.6,.3,.1));y+=30
 for line in lines:
  box=pymupdf.Rect(40,y,555,y+100)
  used=page.insert_textbox(box,line,fontsize=11,fontname=name,color=(.12,.2,.35))
  if used<0:raise ValueError('Sample content overflow')
  y+=110
  if y>700:
   page=d.new_page();y=45
   if name=='hand':page.insert_font(fontname=name,fontfile=font)
 return d.tobytes()

async def put_document(prefix,name,data):
 original=f'{prefix}/{name}.pdf'; images=render_pages([(data,'application/pdf')])
 await storage.upload(original,data,'application/pdf')
 paths=[]
 for i,img in enumerate(images,1):
  path=f'{prefix}/{name}-{i}.jpg';await storage.upload(path,img,'image/jpeg');paths.append(path)
 return original,paths

async def main():
 await db.open_pool()
 try:
  owner=await db.fetch_one('select id from teachers where email=%s',OWNER)
  if not owner:raise RuntimeError('Main teacher account must sign in first.')
  root=Path('../.work/final-evaluation/sample-pdfs');root.mkdir(parents=True,exist_ok=True)
  for ci,(name,code,questions) in enumerate(DATA):
   cid=ident(str(owner['id'])+code);eid=ident(cid+'exam')
   await db.execute('''insert into courses(id,owner_id,name,code,semester,institution,description,is_sample)
    values(%s,%s,%s,%s,'Final evaluation','JIIT Noida','Synthetic sample class with simulated marks. Not real student records.',true) on conflict(id) do nothing''',cid,owner['id'],name,code)
   qtext='\n\n'.join(f'Q{i}. [5 marks] {q[1]}' for i,q in enumerate(questions,1))
   key='\n\n'.join(f'Q{i}. {q[2]}' for i,q in enumerate(questions,1))
   qp,qpages=await put_document(f'{owner["id"]}/{cid}/samples','question-paper',pdf_bytes(name,[f'Q{i}. [5 marks] {q[1]}' for i,q in enumerate(questions,1)]))
   kp,kpages=await put_document(f'{owner["id"]}/{cid}/samples','answer-key',pdf_bytes('Answer key',[q[2] for q in questions]))
   await db.execute('''insert into exams(id,course_id,title,kind,total_marks,paper_status,key_status,paper_path,paper_filename,paper_pages,key_path,key_filename,key_pages,paper_text,key_text)
     values(%s,%s,'Sample class assessment','Assignment',20,'ready','ready',%s,'Sample question paper.pdf',%s,%s,'Sample answer key.pdf',%s,%s,%s) on conflict(id) do nothing''',eid,cid,qp,db.jsonb(qpages),kp,db.jsonb(kpages),qtext,key)
   async with db.transaction() as c:
    for i,(topic,text,answer,points) in enumerate(questions,1):
     await c.execute('insert into exam_questions(exam_id,number,text,marks,topic) values(%s,%s,%s,5,%s) on conflict do nothing',(eid,i,text,topic))
     scheme=[{'point':p,'marks':m} for p,m in zip(points,[2,2,1])]
     await c.execute('''insert into answer_key_items(exam_id,question_number,answer,marking_points) values(%s,%s,%s,%s) on conflict do nothing''',(eid,i,answer,db.jsonb(scheme)))
     await save_question(cid,BankQuestion(text=text,topic=topic,marks=5,answer=answer,kind='numerical' if ci==0 and i<3 else 'theory'),c,source_exam_id=eid,number=i)
   for i in range(1,15):
    pid=ident(cid+str(i));enrollment=f'SAMPLE-{ci+1}-{i:02}'
    if await db.fetch_one('select 1 from student_papers where id=%s',pid):continue
    rng=random.Random(ci*100+i)
    marks=[max(0,min(5,round((rng.uniform(1.5,5)-(1 if j==1 else 0))*2)/2)) for j in range(4)]
    lines=[f'Name: Sample Student {i:02}   Enrollment: {enrollment}']
    answers=[]
    for j,q in enumerate(questions):
     answer=q[2] if marks[j]>=4 else q[3][0] if marks[j]>=2 else 'I am unsure of the method.'
     answers.append(answer);lines.append(f'Q{j+1}. {answer}')
    data=pdf_bytes(name+' | Answer sheet',lines,hand=True);(root/f'{enrollment}.pdf').write_bytes(data)
    path,pages=await put_document(f'{owner["id"]}/{cid}/exams/{eid}/student-papers',enrollment,data)
    checked=i<=12
    await db.execute('''insert into student_papers(id,exam_id,student_name,enrollment_no,filename,file_path,pages,status,is_sample,total_marks,checked_by,summary)
      values(%s,%s,%s,%s,%s,%s,%s,%s,true,%s,%s,%s)''',pid,eid,f'Sample Student {i:02}',enrollment,enrollment+'.pdf',path,db.jsonb(pages),'checked' if checked else 'ready',sum(marks) if checked else None,'teacher' if checked else None,'Synthetic sample: marks are simulated to illustrate analytics, not measured student performance.')
    if checked:
     for j,m in enumerate(marks,1):
      await db.execute('''insert into paper_marks(paper_id,question_number,max_marks,final_marks,source,reasoning,student_answer,teacher_note,pages)
        values(%s,%s,5,%s,'teacher',%s,%s,%s,'[1]')''',pid,j,m,'Simulated sample mark for demonstrating the analytics workflow.',answers[j-1],'Synthetic example; not an actual teacher assessment.')
   print(name,'ready (14 sample papers, 2 left unchecked)',flush=True)
 finally:await db.close_pool()
if __name__=='__main__':asyncio.run(main())
