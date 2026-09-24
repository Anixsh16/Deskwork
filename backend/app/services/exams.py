"""Question paper and answer key parsing, student identity reading, and dual-model grading."""

import asyncio
import logging
import re
import time
from dataclasses import dataclass

from .. import db, gemini, prompts, storage
from ..config import get_settings
from ..schemas import GradedPaper, ParsedKey, ParsedPaper, ParsedQuestion, StudentIdentity

log = logging.getLogger("deskwork.exams")


@dataclass
class Item:
    question_number: int
    part_label: str
    max_marks: float
    text: str

    @property
    def key(self) -> tuple[int, str]:
        return (self.question_number, self.part_label)

    @property
    def name(self) -> str:
        part = f"({self.part_label})" if self.part_label else ""
        return f"Q{self.question_number}{part}"


def half(x: float) -> float:
    return round(float(x) * 2) / 2


def norm_label(label: str | None) -> str:
    """'(a)', 'A.', ' a ' all become 'a', so labels from the paper, the key and the checkers always match."""
    return re.sub(r"[\s()\[\].:]", "", label or "").lower()


def grading_items(questions: list[dict]) -> list[Item]:
    """Each sub-part is graded separately; a question without sub-parts is one item."""
    items = []
    for q in sorted(questions, key=lambda q: q["number"]):
        parts = q["parts"] or []
        if parts:
            for p in parts:
                items.append(Item(q["number"], p["label"], float(p["marks"]), p["text"]))
        else:
            items.append(Item(q["number"], "", float(q["marks"]), ""))
    return items


def _items_block(questions: list[dict], items: list[Item]) -> str:
    lines = ["EXAM QUESTIONS:"]
    for q in sorted(questions, key=lambda q: q["number"]):
        lines.append(f"Q{q['number']} [{q['marks']} marks]: {q['text']}")
        for p in q["parts"] or []:
            lines.append(f"  ({p['label']}) [{p['marks']} marks]: {p['text']}")
    lines.append("\nGRADING ITEMS (return exactly these, with these maximum marks):")
    for it in items:
        lines.append(f"- question_number={it.question_number}, part_label=\"{it.part_label}\", max_marks={it.max_marks}")
    return "\n".join(lines)


async def _source_parts(pages: list[str], text: str | None, label: str) -> list[dict]:
    """The uploaded file as page images, or text generated in Deskwork chat."""
    if pages:
        return await _page_parts(pages)
    return [gemini.text_part(f"{label} (text):\n{text or ''}")]


async def _page_parts(paths: list[str]) -> list[dict]:
    images = await asyncio.gather(*(storage.download(p) for p in paths))
    parts: list[dict] = []
    for i, img in enumerate(images, start=1):
        parts.append(gemini.text_part(f"PAGE {i}"))
        parts.append(gemini.image_part(img))
    return parts


def _friendly(e: Exception) -> str:
    if isinstance(e, gemini.GeminiError):
        return "The AI could not read this file right now. Please try again."
    return "Something went wrong. Please try again."


async def _with_fallback(parts, schema, system, thinking, high_res=True):
    s = get_settings()
    try:
        return await gemini.generate_json(parts, schema, system=system, thinking=thinking, high_res=high_res)
    except gemini.GeminiError:
        log.warning("Primary model failed, falling back to %s", s.second_model)
        return await gemini.generate_json(
            parts, schema, system=system, model=s.second_model, thinking=thinking, high_res=high_res
        )


async def parse_question_paper(exam_id: str) -> None:
    try:
        exam = await db.fetch_one("select * from exams where id = %s", exam_id)
        parts = await _source_parts(exam["paper_pages"], exam["paper_text"], "QUESTION PAPER")
        parts.append(gemini.text_part("Extract the complete question paper from the material above."))
        paper, _ = await _with_fallback(parts, ParsedPaper, prompts.PARSE_PAPER, "medium")
        if not paper.questions:
            raise ValueError("No questions were found in this file.")
        notice = clean_paper(paper)
        total = sum(q.marks for q in paper.questions)
        async with db.transaction() as conn:
            await conn.execute("delete from exam_questions where exam_id = %s", (exam_id,))
            await conn.execute("delete from answer_key_items where exam_id = %s", (exam_id,))
            await reset_checked_papers(conn, exam_id)
            for q in paper.questions:
                await conn.execute(
                    """insert into exam_questions (exam_id, number, text, marks, co, has_figure, parts)
                       values (%s, %s, %s, %s, %s, %s, %s)""",
                    (exam_id, q.number, q.text, q.marks, q.co, q.has_figure,
                     db.jsonb([p.model_dump() for p in q.parts])),
                )
            await conn.execute(
                """update exams set paper_status = 'ready', paper_error = null, paper_notice = %s, total_marks = %s,
                   duration = coalesce(duration, %s),
                   key_status = case when key_status = 'ready' then 'none' else key_status end,
                   updated_at = now() where id = %s""",
                (notice, total, paper.duration, exam_id),
            )
        # A new paper invalidates any previously parsed key, so re-read it if one was uploaded.
        if exam["key_pages"] or exam["key_text"]:
            await db.execute("update exams set key_status = 'processing' where id = %s", exam_id)
            await parse_answer_key(exam_id)
    except Exception as e:
        log.exception("Paper parse failed for %s", exam_id)
        msg = str(e) if isinstance(e, ValueError) else _friendly(e)
        await db.execute("update exams set paper_status = 'failed', paper_error = %s where id = %s", msg, exam_id)


DEFAULT_QUESTION_MARKS = 5.0


def clean_paper(paper: ParsedPaper) -> str | None:
    """Makes a parsed paper safe to grade. Returns a note for the teacher when something was adjusted."""
    notes: list[str] = []

    # Internal choice ("Q3 ... OR Q3 ...") comes back as two questions with one number: check it as one question.
    merged: dict[int, ParsedQuestion] = {}
    for q in paper.questions:
        if q.number in merged:
            first = merged[q.number]
            first.text = f"{first.text}\n\nOR\n\n{q.text}"
            first.parts = []
            notes.append(f"Q{q.number} has a choice (OR), so it is checked as one question.")
        else:
            merged[q.number] = q
    paper.questions = sorted(merged.values(), key=lambda q: q.number)

    unmarked = False
    for q in paper.questions:
        seen: set[str] = set()
        for i, p in enumerate(q.parts):
            label = norm_label(p.label) or chr(97 + i)
            while label in seen:
                label = f"{label}{i + 1}"
            seen.add(label)
            p.label = label
        part_total = sum(p.marks for p in q.parts)
        blank = [p for p in q.parts if p.marks <= 0]
        if blank and part_total > 0 and q.marks > part_total:
            # Some parts print marks and some do not: the rest of the question's marks go to the blank parts.
            share = half((q.marks - part_total) / len(blank)) or 0.5
            for p in blank:
                p.marks = share
            blank[-1].marks = max(0.5, q.marks - part_total - share * (len(blank) - 1))
            part_total = sum(p.marks for p in q.parts)
        if q.parts and part_total > 0 and abs(part_total - q.marks) > 1e-6:
            if q.marks > 0:
                notes.append(f"Q{q.number}'s parts add up to {part_total:g} marks, so the question is counted as {part_total:g}.")
            q.marks = part_total
        defaulted = q.marks <= 0
        if defaulted:
            q.marks = DEFAULT_QUESTION_MARKS
            unmarked = True
        if q.parts and part_total <= 0:
            share = half(q.marks / len(q.parts)) or 0.5
            for p in q.parts:
                p.marks = share
            q.parts[-1].marks = max(0.5, q.marks - share * (len(q.parts) - 1))
            if not defaulted:
                notes.append(f"Q{q.number}'s parts had no marks, so its {q.marks:g} marks were split across them.")
            q.marks = sum(p.marks for p in q.parts)
    if unmarked:
        notes.insert(0, f"This paper does not print marks, so each question was given {DEFAULT_QUESTION_MARKS:g} marks. "
                        "Use Edit questions to change them.")
    return " ".join(notes) or None


async def parse_answer_key(exam_id: str) -> None:
    try:
        exam = await db.fetch_one("select * from exams where id = %s", exam_id)
        questions = await db.fetch_all("select * from exam_questions where exam_id = %s", exam_id)
        if not questions:
            raise ValueError("Upload the question paper first.")
        items = grading_items(questions)
        parts = await _source_parts(exam["key_pages"], exam["key_text"], "ANSWER KEY")
        parts.append(gemini.text_part(_items_block(questions, items)))
        key, _ = await _with_fallback(parts, ParsedKey, prompts.PARSE_KEY, "medium")
        by_key = {(k.question_number, norm_label(k.part_label)): k for k in key.items}
        async with db.transaction() as conn:
            await conn.execute("delete from answer_key_items where exam_id = %s", (exam_id,))
            for it in items:
                k = by_key.get((it.question_number, norm_label(it.part_label)))
                points = [p.model_dump() for p in k.marking_points] if k else []
                points = _fit_points(points, it.max_marks)
                await conn.execute(
                    """insert into answer_key_items (exam_id, question_number, part_label, answer, final_answer, marking_points)
                       values (%s, %s, %s, %s, %s, %s)""",
                    (exam_id, it.question_number, it.part_label, k.answer if k else "",
                     k.final_answer if k else None, db.jsonb(points)),
                )
            await conn.execute(
                "update exams set key_status = 'ready', key_error = null, updated_at = now() where id = %s", (exam_id,)
            )
    except Exception as e:
        log.exception("Key parse failed for %s", exam_id)
        msg = str(e) if isinstance(e, ValueError) else _friendly(e)
        await db.execute("update exams set key_status = 'failed', key_error = %s where id = %s", msg, exam_id)


def _fit_points(points: list[dict], max_marks: float) -> list[dict]:
    """Keeps the marking scheme consistent with the paper's marks for the item."""
    if not points:
        return [{"point": "Correct and complete answer", "marks": max_marks}]
    total = sum(float(p["marks"]) for p in points)
    if abs(total - max_marks) < 1e-6:
        return points
    if total <= 0:
        return [{"point": "; ".join(p["point"] for p in points) or "Correct and complete answer", "marks": max_marks}]
    scaled = [{"point": p["point"], "marks": half(float(p["marks"]) * max_marks / total)} for p in points]
    scaled[-1]["marks"] += max_marks - sum(p["marks"] for p in scaled)
    if scaled[-1]["marks"] < 0:
        # Rounding cannot fit these points into the marks available; keep one honest criterion instead.
        return [{"point": "; ".join(p["point"] for p in points), "marks": max_marks}]
    return scaled


async def read_identity(paper_id: str) -> None:
    try:
        paper = await db.fetch_one("select * from student_papers where id = %s", paper_id)
        parts = await _page_parts(paper["pages"][:1])
        ident, _ = await gemini.generate_json(
            parts, StudentIdentity, system=prompts.READ_IDENTITY, thinking="minimal", high_res=True
        )
        await db.execute(
            """update student_papers set student_name = coalesce(student_name, %s),
               enrollment_no = coalesce(enrollment_no, %s), batch = coalesce(batch, %s), status = 'ready'
               where id = %s and status = 'reading'""",
            ident.student_name, ident.enrollment_no, ident.batch, paper_id,
        )
    except Exception:
        log.exception("Identity read failed for %s", paper_id)
        await db.execute("update student_papers set status = 'ready' where id = %s and status = 'reading'", paper_id)


def _key_block(key_items: list[dict]) -> str:
    lines = ["OFFICIAL ANSWER KEY AND MARKING SCHEME:"]
    for k in sorted(key_items, key=lambda k: (k["question_number"], k["part_label"])):
        part = f"({k['part_label']})" if k["part_label"] else ""
        label = f"Q{k['question_number']}{part}"
        lines.append(f"\n### {label}\n{k['answer']}")
        if k["final_answer"]:
            lines.append(f"Final answer: {k['final_answer']}")
        lines.append("Marking points:")
        for p in k["marking_points"]:
            lines.append(f"- [{p['marks']}] {p['point']}")
    return "\n".join(lines)


async def _grade_once(model: str, parts: list[dict]) -> tuple[GradedPaper | None, dict]:
    started = time.monotonic()
    try:
        graded, usage = await gemini.generate_json(
            parts, GradedPaper, system=prompts.GRADE_PAPER, model=model, thinking="medium", high_res=True
        )
        return graded, {"usage": usage, "ms": int((time.monotonic() - started) * 1000), "error": None}
    except Exception as e:
        log.exception("Grading with %s failed", model)
        return None, {"usage": {}, "ms": int((time.monotonic() - started) * 1000), "error": str(e)[:500]}


def merge_grades(items: list[Item], primary: GradedPaper | None, second: GradedPaper | None) -> list[dict]:
    """Final marks come from the primary grader; disagreements and doubts are flagged for the teacher."""
    def index(g: GradedPaper | None) -> dict:
        if not g:
            return {}
        return {(x.question_number, norm_label(x.part_label)): x for x in g.items}

    a_idx, b_idx = index(primary), index(second)
    rows = []
    for it in items:
        k = (it.question_number, norm_label(it.part_label))
        a, b = a_idx.get(k), b_idx.get(k)
        main = a or b
        ma = min(it.max_marks, max(0.0, half(a.marks_awarded))) if a else None
        mb = min(it.max_marks, max(0.0, half(b.marks_awarded))) if b else None
        if a and not a.attempted:
            ma = 0.0
        if b and not b.attempted:
            mb = 0.0
        reasons = []
        if ma is not None and mb is not None:
            gap = abs(ma - mb)
            if gap >= 1 or (it.max_marks <= 1 and gap > 0):
                reasons.append(f"The two AI checkers disagree ({ma:g} vs {mb:g}).")
        elif main:
            reasons.append("Only one AI checker could grade this answer.")
        if main and main.attempted and main.confidence < 0.6:
            reasons.append("The AI is not confident about this answer.")
        if not main:
            reasons.append("The AI could not find this answer. Please check it manually.")
        rows.append({
            "question_number": it.question_number,
            "part_label": it.part_label,
            "max_marks": it.max_marks,
            "attempted": bool(main.attempted) if main else False,
            "marks_a": ma,
            "marks_b": mb,
            "final_marks": ma if ma is not None else mb,
            "flagged": bool(reasons),
            "flag_reason": " ".join(reasons) or None,
            "student_answer": main.student_answer if main else None,
            "reasoning": a.reasoning if a else (b.reasoning if b else None),
            "reasoning_b": b.reasoning if (a and b) else None,
            "mistakes": (main.mistakes if main else []),
            "confidence": main.confidence if main else None,
            "pages": main.pages if main else [],
        })
    return rows


async def grade_paper(paper_id: str) -> None:
    s = get_settings()
    try:
        paper = await db.fetch_one("select * from student_papers where id = %s", paper_id)
        questions = await db.fetch_all("select * from exam_questions where exam_id = %s", paper["exam_id"])
        key_items = await db.fetch_all("select * from answer_key_items where exam_id = %s", paper["exam_id"])
        items = grading_items(questions)
        parts = await _page_parts(paper["pages"])
        parts.append(gemini.text_part(_items_block(questions, items) + "\n\n" + _key_block(key_items)))

        (a, a_meta), (b, b_meta) = await asyncio.gather(
            _grade_once(s.primary_model, parts), _grade_once(s.second_model, parts)
        )
        for model, role, graded, meta in ((s.primary_model, "primary", a, a_meta), (s.second_model, "second", b, b_meta)):
            await db.execute(
                """insert into grading_runs (paper_id, model, role, raw, input_tokens, output_tokens, latency_ms, error)
                   values (%s, %s, %s, %s, %s, %s, %s, %s)""",
                paper_id, model, role, db.jsonb(graded.model_dump() if graded else None),
                meta["usage"].get("promptTokenCount"), meta["usage"].get("candidatesTokenCount"),
                meta["ms"], meta["error"],
            )
        if not a and not b:
            raise gemini.GeminiError("Both AI checkers failed")

        rows = merge_grades(items, a, b)
        main = a or b
        async with db.transaction() as conn:
            await conn.execute("delete from paper_marks where paper_id = %s", (paper_id,))
            for r in rows:
                await conn.execute(
                    """insert into paper_marks (paper_id, question_number, part_label, max_marks, attempted, marks_a,
                       marks_b, final_marks, flagged, flag_reason, student_answer, reasoning, reasoning_b, mistakes,
                       confidence, pages)
                       values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (paper_id, r["question_number"], r["part_label"], r["max_marks"], r["attempted"], r["marks_a"],
                     r["marks_b"], r["final_marks"], r["flagged"], r["flag_reason"], r["student_answer"],
                     r["reasoning"], r["reasoning_b"], db.jsonb(r["mistakes"]), r["confidence"], db.jsonb(r["pages"])),
                )
            await conn.execute(
                """update student_papers set status = 'checked', checked_by = 'ai', checked_at = now(), error = null,
                   reviewed_at = null, summary = %s, total_marks = %s, flagged_count = %s,
                   student_name = coalesce(student_name, %s), enrollment_no = coalesce(enrollment_no, %s)
                   where id = %s""",
                (main.overall_feedback, sum(r["final_marks"] or 0 for r in rows), sum(r["flagged"] for r in rows),
                 main.student_name, main.enrollment_no, paper_id),
            )
    except Exception as e:
        log.exception("Grading failed for %s", paper_id)
        await db.execute(
            "update student_papers set status = 'failed', error = %s where id = %s",
            "The AI could not check this paper right now. Please try again.", paper_id,
        )


async def reset_checked_papers(conn, exam_id: str) -> int:
    """After the questions change, old marks no longer fit the paper; checked papers go back to 'not checked'."""
    cur = await conn.execute(
        """update student_papers set status = 'ready', checked_by = null, checked_at = null, reviewed_at = null,
           total_marks = null, flagged_count = 0, summary = null, error = null
           where exam_id = %s and status in ('checked', 'failed') returning id""",
        (exam_id,),
    )
    ids = [r["id"] for r in await cur.fetchall()]
    if ids:
        await conn.execute("delete from paper_marks where paper_id = any(%s)", (ids,))
    return len(ids)


async def apply_new_maximums(conn, exam_id: str, maximums: dict[tuple[int, str], float]) -> None:
    """Marks-only edits keep existing checking: new maximums apply, marks above them are capped and flagged."""
    rows = await (await conn.execute(
        """select m.id, m.paper_id, m.question_number, m.part_label, m.final_marks from paper_marks m
           join student_papers p on p.id = m.paper_id where p.exam_id = %s""",
        (exam_id,),
    )).fetchall()
    papers = set()
    for r in rows:
        new_max = maximums.get((r["question_number"], r["part_label"]))
        if new_max is None:
            continue
        capped = r["final_marks"] is not None and float(r["final_marks"]) > new_max
        await conn.execute(
            """update paper_marks set max_marks = %s, final_marks = %s,
               flagged = flagged or %s, flag_reason = case when %s then 'The maximum marks changed. Please check this mark.'
               else flag_reason end where id = %s""",
            (new_max, new_max if capped else r["final_marks"], capped, capped, r["id"]),
        )
        papers.add(r["paper_id"])
    for pid in papers:
        await conn.execute(
            """update student_papers p set
                 total_marks = (select sum(final_marks) from paper_marks m where m.paper_id = p.id),
                 flagged_count = (select count(*) from paper_marks m where m.paper_id = p.id and m.flagged)
               where p.id = %s""",
            (pid,),
        )


async def recompute_totals(paper_id: str) -> None:
    await db.execute(
        """update student_papers p set
             total_marks = (select sum(final_marks) from paper_marks m where m.paper_id = p.id),
             flagged_count = (select count(*) from paper_marks m where m.paper_id = p.id and m.flagged)
           where p.id = %s""",
        paper_id,
    )
