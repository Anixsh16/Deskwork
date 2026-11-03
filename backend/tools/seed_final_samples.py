"""Add labelled synthetic classes to Yug's account. Never resets or overwrites existing work."""

import asyncio, uuid
from pathlib import Path
from app import db, storage
from app.services.bank import BankQuestion, save_question
from app.documents import render_pages

OWNER = "yugjindal1234@gmail.com"
NAMESPACE = uuid.UUID("b1312c27-6fe2-4d40-a01d-fbc2cc3da40b")
DATA = [
    (
        "Computer Networks - Sample Class",
        "CN-SAMPLE",
        [
            (
                "TCP flow control",
                "A TCP receiver has an 8000-byte buffer, 5000 bytes received and 2000 processed. Find rwnd and explain its role.",
                "Unprocessed bytes = 5000 - 2000 = 3000. Free space and rwnd = 8000 - 3000 = 5000 bytes. Flow control prevents overflowing the receiver buffer.",
                [
                    "Unprocessed bytes are 3000.",
                    "rwnd is 5000 bytes.",
                    "Flow control protects the receiver buffer.",
                ],
            ),
            (
                "IP fragmentation",
                "An IPv4 datagram has 4000 data bytes and a 20-byte header. MTU is 1500. Give fragment data lengths, offsets and MF flags.",
                "Maximum payload is floor((1500-20)/8)*8 = 1480. Data lengths: 1480,1480,1040. Offsets: 0,185,370. MF flags: 1,1,0. Total lengths: 1500,1500,1060.",
                [
                    "Payload capacity is 1480 bytes.",
                    "Data sizes and offsets are correct.",
                    "MF flags 1,1,0; no router reassembly.",
                ],
            ),
            (
                "Congestion control",
                "Explain TCP slow start and congestion avoidance, including the response to a timeout.",
                "Slow start increases cwnd exponentially per RTT until ssthresh. Congestion avoidance increases approximately one MSS per RTT. A timeout reduces ssthresh and resets cwnd to one MSS in the simplified Reno model.",
                [
                    "Slow start is exponential.",
                    "Congestion avoidance is additive.",
                    "Timeout reduces threshold and resets cwnd.",
                ],
            ),
            (
                "DNS",
                "Describe recursive DNS lookup from a client through its local resolver to the authoritative server.",
                "The client asks its recursive resolver. If not cached, the resolver follows root, TLD and authoritative referrals, returns the address and caches the answer according to TTL.",
                [
                    "Client contacts recursive resolver.",
                    "Root, TLD and authoritative path.",
                    "Caching and TTL explained.",
                ],
            ),
        ],
    ),
    (
        "Database Systems - Sample Class",
        "DB-SAMPLE",
        [
            (
                "Normalisation",
                "Explain 1NF, 2NF and 3NF and the anomalies that normalisation addresses.",
                "1NF requires atomic values. 2NF removes partial dependencies on a composite candidate key. 3NF removes transitive dependencies of non-key attributes. This reduces insertion, update and deletion anomalies.",
                [
                    "1NF atomic values.",
                    "2NF removes partial dependency.",
                    "3NF and anomalies explained.",
                ],
            ),
            (
                "Transactions",
                "Explain the ACID properties with a bank transfer example.",
                "Atomicity makes both debit and credit happen or neither. Consistency preserves constraints. Isolation separates concurrent transactions. Durability retains committed changes after failure.",
                [
                    "Atomicity and consistency.",
                    "Isolation with concurrent transfers.",
                    "Durability after commit.",
                ],
            ),
            (
                "SQL joins",
                "Explain INNER JOIN versus LEFT JOIN. Which keeps customers with no orders?",
                "INNER JOIN returns matching rows only. LEFT JOIN preserves all rows from the left table and uses NULL for unmatched right-side columns. Customers LEFT JOIN Orders retains customers with no orders.",
                [
                    "Inner joins match rows.",
                    "Left join preserves unmatched left rows.",
                    "Correct customer-order example.",
                ],
            ),
            (
                "Indexing",
                "Explain how a B+ tree index speeds range queries and one tradeoff of maintaining an index.",
                "Internal nodes direct search to sorted leaf nodes. Linked leaves permit efficient ordered range scans. Indexes use storage and require updates during inserts, updates and deletes.",
                [
                    "Sorted B+ tree leaves.",
                    "Linked leaves support range scans.",
                    "Storage and write overhead.",
                ],
            ),
        ],
    ),
]


def ident(s):
    return str(uuid.uuid5(NAMESPACE, s))


def bundle_file(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()) or not path.is_file():
        raise ValueError(f"Missing or invalid sample file: {relative}")
    return path


def load_bundle(root):
    """Validate every approved asset before opening the database or uploading anything."""
    import hashlib, json
    manifest = json.loads((root / "manifest.json").read_text())
    if manifest.get("version") != 2:
        raise ValueError("Use the approved handwritten sample bundle (version 2).")
    subjects = {s["code"]: s for s in manifest["subjects"]}
    if set(subjects) != {"CN-SAMPLE", "DB-SAMPLE"}:
        raise ValueError("The bundle must contain both sample subjects.")
    students = manifest["students"]
    if len(students) != 28:
        raise ValueError("The approved bundle must contain 28 answer sheets.")
    identities = {}
    for code in subjects:
        rows = [s for s in students if s["subject_code"] == code]
        if len(rows) != 14 or {s["index"] for s in rows} != set(range(1, 15)):
            raise ValueError(f"Expected 14 distinct student records in {code}.")
        if len({s["enrollment"] for s in rows}) != 14:
            raise ValueError("Duplicate enrollment in one subject.")
        for field in ("question_paper", "answer_key"):
            bundle_file(root, subjects[code][field])
    for student in students:
        if not student["name"].strip() or not student["enrollment"].strip():
            raise ValueError("Missing student identity.")
        previous = identities.setdefault(student["enrollment"], student["name"])
        if previous != student["name"]:
            raise ValueError("Student identity differs between subjects.")
        for field in ("image", "pdf"):
            data = bundle_file(root, student[field]).read_bytes()
            if hashlib.sha256(data).hexdigest() != student[field + "_sha256"]:
                raise ValueError(f"Sample checksum mismatch: {student[field]}")
    return manifest


async def put_document(prefix, name, data):
    original = f"{prefix}/{name}.pdf"
    images = render_pages([(data, "application/pdf")])
    await storage.upload(original, data, "application/pdf")
    paths = []
    for i, img in enumerate(images, 1):
        path = f"{prefix}/{name}-{i}.jpg"
        await storage.upload(path, img, "image/jpeg")
        paths.append(path)
    return original, paths


async def main(source, verify_only=False):
    # Never fall back to typeset handwriting or invented marks when assets are absent.
    bundle = load_bundle(source)
    if verify_only:
        print("Verified 28 approved PNG/PDF pairs. No database or storage writes.")
        return
    await db.open_pool()
    try:
        owner = await db.fetch_one("select id from teachers where email=%s", OWNER)
        if not owner:
            raise RuntimeError("Main teacher account must sign in first.")
        for subject in bundle["subjects"]:
            code = subject["code"]
            cid = ident(str(owner["id"]) + code)
            eid = ident(cid + "exam")
            students = [s for s in bundle["students"] if s["subject_code"] == code]
            existing = await db.fetch_all(
                "select id from student_papers where id=any(%s::uuid[])",
                [ident(cid + str(s["index"])) for s in students],
            )
            existing_ids = {str(p["id"]) for p in existing}
            missing = [s for s in students if ident(cid + str(s["index"])) not in existing_ids]
            if not missing:
                print(subject["name"], "already present; files and marks left unchanged.")
                continue
            await db.execute(
                """insert into courses(id,owner_id,name,code,semester,institution,description,is_sample)
                values(%s,%s,%s,%s,'Final evaluation','JIIT Noida',%s,true) on conflict(id) do nothing""",
                cid, owner["id"], subject["name"], code,
                "Fictional students with generated handwritten answers and intentional mistakes. Check their images to obtain AI marks.",
            )
            exam = await db.fetch_one("select id from exams where id=%s", eid)
            if not exam:
                prefix = f"{owner['id']}/{cid}/samples/approved-v2"
                qp, qpages = await put_document(prefix, "question-paper", bundle_file(source, subject["question_paper"]).read_bytes())
                kp, kpages = await put_document(prefix, "answer-key", bundle_file(source, subject["answer_key"]).read_bytes())
                async with db.transaction() as c:
                    await c.execute(
                        """insert into exams(id,course_id,title,kind,total_marks,paper_status,key_status,paper_path,paper_filename,paper_pages,key_path,key_filename,key_pages)
                        values(%s,%s,'Sample class assessment','Assignment',%s,'ready','ready',%s,'Question-Paper.pdf',%s,%s,'Answer-Key.pdf',%s)""",
                        (eid,cid,sum(float(q["marks"]) for q in subject["questions"]),qp,db.jsonb(qpages),kp,db.jsonb(kpages)),
                    )
                    for q in subject["questions"]:
                        await c.execute(
                            """insert into exam_questions(exam_id,number,text,marks,parts,topic,co,has_figure)
                            values(%s,%s,%s,%s,%s,%s,%s,%s)""",
                            (eid,q["number"],q["text"],q["marks"],db.jsonb(q.get("parts") or []),q.get("topic"),q.get("co"),q.get("has_figure",False)),
                        )
                    for k in subject["key_items"]:
                        await c.execute(
                            """insert into answer_key_items(exam_id,question_number,part_label,answer,final_answer,marking_points)
                            values(%s,%s,%s,%s,%s,%s)""",
                            (eid,k["question_number"],k.get("part_label") or "",k["answer"],k.get("final_answer"),db.jsonb(k["marking_points"])),
                        )
                    for q in subject.get("bank", []):
                        await save_question(cid, BankQuestion(**q), c, source_exam_id=eid)
            for student in missing:
                pid = ident(cid + str(student["index"]))
                prefix = f"{owner['id']}/{cid}/exams/{eid}/student-papers/handwritten-v2/{student['slug']}"
                await storage.upload(prefix + ".pdf", bundle_file(source, student["pdf"]).read_bytes(), "application/pdf")
                await storage.upload(prefix + ".png", bundle_file(source, student["image"]).read_bytes(), "image/png")
                await db.execute(
                    """insert into student_papers(id,exam_id,student_name,enrollment_no,batch,filename,file_path,pages,status,is_sample)
                    values(%s,%s,%s,%s,%s,%s,%s,%s,'ready',true) on conflict(id) do nothing""",
                    pid,eid,student["name"],student["enrollment"],student.get("batch"),student["slug"] + ".pdf",prefix + ".pdf",db.jsonb([prefix + ".png"]),
                )
            print(subject["name"], f"added {len(missing)} handwritten sheets. Check them in the app to calculate marks.")
    finally:
        await db.close_pool()


if __name__ == "__main__":
    import argparse, os
    default = Path(__file__).resolve().parents[3] / "Deskwork-docs" / "Handwritten-Sample-Sheets"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path(os.getenv("DESKWORK_SAMPLE_DIR", str(default))))
    parser.add_argument("--verify-only", action="store_true", help="Check the approved bundle locally without any remote writes")
    args = parser.parse_args()
    asyncio.run(main(args.source, args.verify_only))
