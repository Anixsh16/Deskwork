"""End-to-end check of every Deskwork flow against the running API, with the real CN & IoT material.

Needs the backend running on :8000 and the files in ../testdata. Uses real Gemini calls.
    uv run python -m tests.e2e_flow            full run
    uv run python -m tests.e2e_flow --course <id> --skip-slides   reuse an already-indexed course
Prints a report and writes it to ../.work/e2e-report.json.
"""

import argparse
import json
import sys
import time
from pathlib import Path

import httpx

from tools.session import access_token

API = "http://localhost:8000/api"
ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "testdata"
REPORT: dict = {"checks": []}


class Client:
    def __init__(self) -> None:
        self.http = httpx.Client(base_url=API, timeout=600, headers={"Authorization": f"Bearer {access_token()}"})

    def call(self, method: str, path: str, **kw) -> httpx.Response:
        r = self.http.request(method, path, **kw)
        if r.status_code >= 400:
            raise AssertionError(f"{method} {path} -> {r.status_code}: {r.text[:400]}")
        return r

    def json(self, method: str, path: str, **kw):
        return self.call(method, path, **kw).json()

    def chat(self, chat_id: str, content: str, attachment_ids: list[str] | None = None) -> dict:
        text, sources, meta, error = "", [], {}, None
        with self.http.stream("POST", f"/chats/{chat_id}/messages",
                              json={"content": content, "attachment_ids": attachment_ids or []}) as r:
            if r.status_code >= 400:
                raise AssertionError(f"chat -> {r.status_code}: {r.read()[:300]}")
            event = None
            for line in r.iter_lines():
                if line.startswith("event:"):
                    event = line[6:].strip()
                elif line.startswith("data:"):
                    data = json.loads(line[5:])
                    if event == "delta":
                        text += data
                    elif event == "sources":
                        sources = data
                    elif event == "meta":
                        meta = data
                    elif event == "error":
                        error = data
        return {"text": text, "sources": sources, "meta": meta, "error": error}


def check(name: str, ok: bool, detail: str = "") -> None:
    REPORT["checks"].append({"name": name, "ok": bool(ok), "detail": detail})
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}{f' :: {detail}' if detail else ''}", flush=True)


def poll(fn, done, timeout: int = 600, every: float = 3):
    start = time.time()
    while True:
        value = fn()
        if done(value):
            return value
        if time.time() - start > timeout:
            raise AssertionError("Timed out waiting")
        time.sleep(every)


def files(*paths: Path) -> list:
    return [("files", (p.name, p.read_bytes())) for p in paths]


def run(course_id: str | None, skip_slides: bool) -> None:
    c = Client()
    t0 = time.time()

    print("1. Course", flush=True)
    if not course_id:
        course = c.json("POST", "/courses", json={
            "name": "Computer Networks & Internet of Things", "code": "18B11CS311", "semester": "Even 2026",
            "institution": "Jaypee Institute of Information Technology, Noida",
            "outcomes": (DATA / "course_outcomes.txt").read_text() if (DATA / "course_outcomes.txt").exists() else None,
        })
        course_id = course["id"]
    REPORT["course_id"] = course_id
    check("course created and listed", any(x["id"] == course_id for x in c.json("GET", "/courses")))

    if not skip_slides:
        print("2. Slides", flush=True)
        slides = sorted((DATA / "slides").iterdir())
        c.call("POST", f"/courses/{course_id}/files", files=files(*slides))
    fl = poll(lambda: c.json("GET", f"/courses/{course_id}/files"),
              lambda fs: fs and all(f["status"] in ("ready", "failed") for f in fs), timeout=1200)
    check("all slide files indexed", all(f["status"] == "ready" for f in fl),
          ", ".join(f"{f['filename'][:28]}={f['status']}/{f['chunk_count']}" for f in fl))

    print("3. Chatbots", flush=True)
    chats = {}
    for bot in ("assignment", "solution", "paper", "ask"):
        chats[bot] = c.json("POST", f"/courses/{course_id}/chats", json={"bot": bot})["id"]

    a = c.chat(chats["assignment"], "Create an assignment of 6 questions on TCP congestion control and flow control, "
                                    "mixing numericals and conceptual questions, 5 marks each.")
    check("assignment generated", len(a["text"]) > 800 and not a["error"], f"{len(a['text'])} chars")
    check("assignment grounded in slides", len(a["sources"]) > 0,
          "; ".join(f"{s['filename'][:30]} p{s['page_start']}" for s in a["sources"][:4]))
    REPORT["assignment_sample"] = a["text"][:1500]

    att = c.json("POST", f"/courses/{course_id}/attachments", files={"file": ("Assignment - 1_CN & IOT_2026.pdf",
                                                                         (DATA / "assignment1.pdf").read_bytes())})
    s = c.chat(chats["solution"], "Write complete step-by-step solutions for every question in this assignment.",
               [att["id"]])
    check("solutions generated for uploaded assignment", len(s["text"]) > 2000 and not s["error"],
          f"{len(s['text'])} chars")
    REPORT["solution_message_id"] = s["meta"].get("assistant_message_id")
    REPORT["solution_sample"] = s["text"][:1500]

    p = c.chat(chats["paper"], "Create a T2 question paper of 20 marks, 1 hour, covering the syllabus up to "
                               "Transport Layer part 2 (TCP flow and congestion control).")
    check("question paper generated", "Marks" in p["text"] and len(p["text"]) > 800, f"{len(p['text'])} chars")
    check("paper has no placeholders or em dashes", "[" not in p["text"].split("\n")[0] and "\u2014" not in p["text"]
          and "Institute Name" not in p["text"])
    pk = c.chat(chats["paper"], "Now write the complete answer key for this paper.")
    check("answer key generated in same chat", len(pk["text"]) > 800, f"{len(pk['text'])} chars")
    REPORT["paper_sample"] = p["text"][:1500]

    q = c.chat(chats["ask"], "Explain Nagle's algorithm briefly.")
    check("ask your slides answers", "Nagle" in q["text"] and q["sources"], f"{len(q['text'])} chars")

    docx = c.call("GET", f"/messages/{s['meta']['assistant_message_id']}/docx")
    check("Word download works", docx.content[:2] == b"PK" and len(docx.content) > 5000, f"{len(docx.content)} bytes")

    print("4. Exam: T2 paper", flush=True)
    exam_id = c.json("POST", "/exams", json={"course_id": course_id, "title": "T2 Examination, Even 2026", "kind": "T2"})["id"]
    REPORT["exam_id"] = exam_id
    c.call("POST", f"/exams/{exam_id}/paper", files=files(DATA / "t2_question_paper.pdf"))
    ex = poll(lambda: c.json("GET", f"/exams/{exam_id}"), lambda e: e["paper_status"] in ("ready", "failed"))
    qs = ex["questions"]
    check("question paper read from page images", ex["paper_status"] == "ready" and len(qs) == 5,
          f"{len(qs)} questions, total {ex['total_marks']}")
    check("marks match paper (2,4,3,5,6 = 20)", [float(x["marks"]) for x in qs] == [2, 4, 3, 5, 6])
    check("sub-parts read (Q1 a,b; Q5 a-e)", [p["label"] for p in qs[0]["parts"]] == ["a", "b"]
          and len(qs[4]["parts"]) == 5, str([len(x["parts"]) for x in qs]))

    c.call("POST", f"/exams/{exam_id}/key", files=files(DATA / "t2_answer_key.pdf"))
    ex = poll(lambda: c.json("GET", f"/exams/{exam_id}"), lambda e: e["key_status"] in ("ready", "failed"))
    check("answer key read and mapped", ex["key_status"] == "ready" and len(ex["key_items"]) == 13,
          f"{len(ex['key_items'])} key items")
    maxes = {}
    for q2 in qs:
        for pt in q2["parts"] or [{"label": "", "marks": q2["marks"]}]:
            maxes[(q2["number"], pt["label"])] = float(pt["marks"])
    check("key marking points add up to each part's marks", all(
        abs(sum(float(p["marks"]) for p in k["marking_points"]) - maxes[(k["question_number"], k["part_label"])]) < 1e-6
        for k in ex["key_items"]))

    print("5. Student papers", flush=True)
    ids = {}
    for who, f in (("ananya", "t2_student_ananya.pdf"), ("parth", "t2_student_parth.pdf")):
        ids[who] = c.json("POST", f"/exams/{exam_id}/papers", files=files(DATA / f))["id"]
    papers = poll(lambda: c.json("GET", f"/exams/{exam_id}/papers"), lambda ps: all(p["status"] == "ready" for p in ps))
    names = {p["id"]: (p["student_name"], p["enrollment_no"]) for p in papers}
    check("student names read from page 1", "Ananya" in (names[ids["ananya"]][0] or "") and
          "Parth" in (names[ids["parth"]][0] or ""), str(list(names.values())))
    check("marks columns empty before checking", all(not p["question_marks"] for p in papers))

    c.call("POST", f"/exams/{exam_id}/check-all")
    papers = poll(lambda: c.json("GET", f"/exams/{exam_id}/papers"),
                  lambda ps: all(p["status"] in ("checked", "failed") for p in ps), timeout=900)
    check("both papers checked by AI", all(p["status"] == "checked" for p in papers),
          ", ".join(f"{p['student_name']}={p['total_marks']}" for p in papers))

    detail = {who: c.json("GET", f"/papers/{pid}") for who, pid in ids.items()}
    REPORT["marks"] = {
        who: [{k: m[k] for k in ("question_number", "part_label", "max_marks", "marks_a", "marks_b", "final_marks",
                                  "flagged", "attempted")} for m in d["marks"]]
        for who, d in detail.items()
    }
    an = {(m["question_number"], m["part_label"]): m for m in detail["ananya"]["marks"]}
    pa = {(m["question_number"], m["part_label"]): m for m in detail["parth"]["marks"]}
    check("Ananya: Q5 unanswered gets 0", all(float(m["final_marks"]) == 0 for k, m in an.items() if k[0] == 5))
    check("Ananya: Q1 fully correct", float(an[(1, "a")]["final_marks"]) == 1 and float(an[(1, "b")]["final_marks"]) == 1)
    check("Parth: Q1(b) '63 routers' mistake caught", float(pa[(1, "b")]["final_marks"]) < 1,
          f"{pa[(1, 'b')]['final_marks']} / 1")
    check("Parth: Q4 wrong totals lose marks", float(pa[(4, "b")]["final_marks"]) < 2 or float(pa[(4, "c")]["final_marks"]) < 2,
          f"4b={pa[(4, 'b')]['final_marks']} 4c={pa[(4, 'c')]['final_marks']}")
    check("Parth: Q3 correct gets full marks", float(pa[(3, "a")]["final_marks"]) == 1 and float(pa[(3, "b")]["final_marks"]) == 2)
    check("every mark has reasoning", all(m["reasoning"] for d in detail.values() for m in d["marks"]))

    print("6. Teacher edits", flush=True)
    before = float(detail["parth"]["total_marks"])
    old = float(pa[(1, "b")]["final_marks"])
    new = 0.0 if old > 0 else 0.5
    c.call("PATCH", f"/papers/{ids['parth']}/marks", json=[{"question_number": 1, "part_label": "b", "marks": new,
                                                            "note": "Teacher decision after reviewing TTL answer"}])
    after = c.json("GET", f"/papers/{ids['parth']}")
    check("override recalculates total", abs(float(after["total_marks"]) - (before - old + new)) < 1e-6,
          f"{before} -> {after['total_marks']}")
    check("override is logged", bool(after["edits"]) and float(after["edits"][0]["new_marks"]) == new)
    bad = c.http.patch(f"/papers/{ids['parth']}/marks", json=[{"question_number": 1, "part_label": "b", "marks": 5}])
    check("marks above maximum rejected", bad.status_code == 400)

    print("6b. Manual checking", flush=True)
    c.call("POST", f"/papers/{ids['ananya']}/reset")
    c.call("POST", f"/papers/{ids['ananya']}/manual")
    man = c.json("GET", f"/papers/{ids['ananya']}")
    check("manual check starts with empty marks", man["checked_by"] == "teacher" and all(m["final_marks"] is None for m in man["marks"]),
          f"{len(man['marks'])} items")
    early = c.http.post(f"/papers/{ids['ananya']}/review")
    check("cannot mark reviewed with missing marks", early.status_code == 409)
    c.call("PATCH", f"/papers/{ids['ananya']}/marks", json=[
        {"question_number": m["question_number"], "part_label": m["part_label"], "marks": float(m["max_marks"]) if m["question_number"] < 4 else 0}
        for m in man["marks"]])
    c.call("POST", f"/papers/{ids['ananya']}/review")
    man = c.json("GET", f"/papers/{ids['ananya']}")
    expected = sum(float(m["max_marks"]) for m in man["marks"] if m["question_number"] < 4)
    check("manual marks total and review", float(man["total_marks"]) == expected and man["reviewed_at"] is not None,
          f"{man['total_marks']} / {expected}")
    blocked = c.http.post(f"/papers/{ids['ananya']}/check")
    check("AI check blocked on a manually checked paper", blocked.status_code == 409)

    xl = c.call("GET", f"/exams/{exam_id}/export.xlsx")
    check("Excel export", xl.content[:2] == b"PK", f"{len(xl.content)} bytes")

    print("7. Assignment checked against a generated solution", flush=True)
    ex2 = c.json("POST", "/exams", json={"course_id": course_id, "title": "Evaluative Assignment 1", "kind": "Assignment"})["id"]
    c.call("POST", f"/exams/{ex2}/paper", files=files(DATA / "assignment1.pdf"))
    e2 = poll(lambda: c.json("GET", f"/exams/{ex2}"), lambda e: e["paper_status"] in ("ready", "failed"))
    check("assignment read as question paper", e2["paper_status"] == "ready" and float(e2["total_marks"] or 0) > 0,
          f"{len(e2['questions'])} questions, {e2['total_marks']} marks, note: {e2.get('paper_notice')}")
    c.call("POST", f"/exams/{ex2}/key-from-message", json={"message_id": REPORT["solution_message_id"]})
    e2 = poll(lambda: c.json("GET", f"/exams/{ex2}"), lambda e: e["key_status"] in ("ready", "failed"))
    check("generated solution used as answer key", e2["key_status"] == "ready", f"{len(e2['key_items'])} items")
    sp = c.json("POST", f"/exams/{ex2}/papers", files=files(DATA / "assignment1_student_answers.pdf"))["id"]
    poll(lambda: c.json("GET", f"/papers/{sp}"), lambda p: p["status"] == "ready")
    c.call("POST", f"/papers/{sp}/check")
    d2 = poll(lambda: c.json("GET", f"/papers/{sp}"), lambda p: p["status"] in ("checked", "failed"), timeout=900)
    check("real handwritten assignment checked", d2["status"] == "checked" and float(d2["total_marks"] or 0) > 0,
          f"total {d2['total_marks']} / {e2['total_marks']}, flagged {d2['flagged_count']}")

    REPORT["seconds"] = round(time.time() - t0)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--course")
    ap.add_argument("--skip-slides", action="store_true")
    args = ap.parse_args()
    try:
        run(args.course, args.skip_slides)
    except AssertionError as e:
        check("run completed", False, str(e))
    failed = [c for c in REPORT["checks"] if not c["ok"]]
    out = ROOT / ".work" / "e2e-report.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(REPORT, indent=2, default=str))
    print(f"\n{len(REPORT['checks']) - len(failed)}/{len(REPORT['checks'])} checks passed. Report: {out}")
    sys.exit(1 if failed else 0)
