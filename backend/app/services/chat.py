"""Single-purpose course chatbots with retrieval over the course's slides."""

import asyncio
import logging
import re
from collections.abc import AsyncIterator

from .. import db, gemini, prompts, storage, vectorstore
from ..config import get_settings
from ..schemas import TopicPlan

log = logging.getLogger("deskwork.chat")

RETRIEVE = {"assignment": 12, "solution": 14, "paper": 22, "ask": 8}
THINKING = {"assignment": "low", "solution": "medium", "paper": "medium", "ask": "low"}
HISTORY = 12


async def course_outline(course_id: str) -> str:
    files = await db.fetch_all(
        "select filename, outline from course_files where course_id = %s and status = 'ready' order by filename",
        course_id,
    )
    lines = []
    for f in files:
        titles, seen = [], set()
        for o in f["outline"]:
            t = o["title"]
            if t.lower() not in seen:
                seen.add(t.lower())
                titles.append(t)
        lines.append(f"- {f['filename']}: " + "; ".join(titles[:80]))
    return "\n".join(lines)


def _queries(message: str, attachment_text: str) -> list[str]:
    queries = [message[:2000]]
    if attachment_text:
        blocks = [b.strip() for b in re.split(r"\n(?=\s*(?:Q\s*\d+|\d+[.)]|[A-Z][A-Za-z ]{3,40}:))", attachment_text)]
        queries += [b[:1500] for b in blocks if len(b) > 25][:14]
    return queries


async def _plan_topics(message: str, outline: str, attachment_text: str) -> list[str]:
    parts = [gemini.text_part(
        f"COURSE OUTLINE:\n{outline}\n\nSYLLABUS OR NOTES FROM TEACHER:\n{attachment_text[:6000]}\n\nREQUEST:\n{message}"
    )]
    try:
        plan, _ = await gemini.generate_json(parts, TopicPlan, system=prompts.PLAN_TOPICS, thinking="low")
        return plan.topics[:16]
    except gemini.GeminiError:
        return []


async def retrieve(course_id: str, bot: str, message: str, attachment_text: str) -> list[dict]:
    queries = _queries(message, attachment_text)
    if bot == "paper":
        outline = await course_outline(course_id)
        queries += await _plan_topics(message, outline, attachment_text)
    per_query = max(3, RETRIEVE[bot] // max(1, len(queries)) + 2)
    models = [r["embed_model"] for r in await db.fetch_all(
        """select distinct embed_model from course_files
           where course_id = %s and status = 'ready' and embed_model is not null""",
        course_id,
    )]
    hits: list[dict] = []
    for model in models:
        try:
            vectors = await gemini.embed(queries, query=True, model=model)
        except gemini.QuotaExhausted:
            if model == models[-1] and not hits:
                raise
            log.warning("Skipping slides indexed with %s: its daily quota is used up", model)
            continue
        hits += await vectorstore.query(course_id, vectors, per_query, model)
    hits = sorted(hits, key=lambda h: h["distance"])[: RETRIEVE[bot]]
    if bot == "paper":
        # A paper should follow the syllabus order, so present its material in teaching order.
        hits.sort(key=lambda h: (h["filename"], h["page_start"]))
    return hits


def _context(course: dict, hits: list[dict], outline: str) -> str:
    lines = [
        "COURSE DETAILS:",
        f"Name: {course['name']}",
        f"Code: {course.get('code') or 'not given'}",
        f"Semester: {course.get('semester') or 'not given'}",
        f"Institution: {course.get('institution') or 'not given'}",
    ]
    if course.get("description"):
        lines.append(f"About the course: {course['description']}")
    if course.get("outcomes"):
        lines.append(f"Course outcomes:\n{course['outcomes']}")
    if outline:
        lines.append(f"\nCOURSE OUTLINE (files in teaching order with slide titles):\n{outline}")
    lines.append("\nCOURSE MATERIAL:")
    for i, h in enumerate(hits, start=1):
        pages = f"p. {h['page_start']}" if h["page_start"] == h["page_end"] else f"pp. {h['page_start']}-{h['page_end']}"
        lines.append(f"\n[{i}] {h['filename']} ({pages})\n{h['text']}")
    return "\n".join(lines)


def source_list(hits: list[dict]) -> list[dict]:
    seen, out = set(), []
    for h in sorted(hits, key=lambda h: h["distance"]):
        k = (h["file_id"], h["page_start"], h["page_end"])
        if k not in seen:
            seen.add(k)
            out.append({
                "file_id": h["file_id"], "filename": h["filename"],
                "page_start": h["page_start"], "page_end": h["page_end"],
            })
    return out[:10]


def _plain_dashes(text: str) -> str:
    # House style: no em dashes in anything Deskwork writes.
    return text.replace("\u2014", "-")


async def answer(chat: dict, course: dict, message: str, attachments: list[dict]) -> AsyncIterator[dict]:
    """Yields {'sources': [...]} once, then {'delta': text} chunks."""
    bot = chat["bot"]
    attachment_text = "\n\n".join(a.get("text_content") or "" for a in attachments)
    hits = await retrieve(str(course["id"]), bot, message, attachment_text)
    yield {"sources": source_list(hits)}

    outline = await course_outline(str(course["id"])) if bot in ("paper", "assignment") else ""
    history = await db.fetch_all(
        """select role, content from chat_messages where chat_id = %s and status = 'done'
           order by created_at desc limit %s""",
        chat["id"], HISTORY + 1,
    )
    history = list(reversed(history))
    if history and history[-1]["role"] == "user" and history[-1]["content"] == message:
        history = history[:-1]

    contents = [
        {"role": "user" if h["role"] == "user" else "model", "parts": [{"text": h["content"]}]}
        for h in history if h["content"]
    ]
    parts: list[dict] = []
    for a in attachments:
        parts.append(gemini.text_part(f"ATTACHED FILE: {a['filename']}"))
        images = await asyncio.gather(*(storage.download(p) for p in a["pages"][:20]))
        for i, img in enumerate(images, start=1):
            parts.append(gemini.text_part(f"{a['filename']} PAGE {i}"))
            parts.append(gemini.image_part(img))
    parts.append(gemini.text_part(f"{_context(course, hits, outline)}\n\nTEACHER'S REQUEST:\n{message}"))
    contents.append({"role": "user", "parts": parts})

    system = prompts.BOTS[bot]
    model = get_settings().primary_model
    written = ""
    # A long answer occasionally stalls mid-stream. Resume it with the text so far, so the teacher still gets
    # one complete answer; after a failure with nothing written, try the second model.
    for attempt in range(3):
        request = contents
        if written:
            request = contents + [
                {"role": "model", "parts": [{"text": written}]},
                {"role": "user", "parts": [{"text": "Your answer was cut off. Continue exactly where it stopped, "
                                                     "without repeating anything already written."}]},
            ]
        try:
            async for text in gemini.stream_text(request, system=system, model=model, thinking=THINKING[bot]):
                text = _plain_dashes(text)
                written += text
                yield {"delta": text}
            return
        except gemini.GeminiError:
            if attempt == 2:
                raise
            log.warning("Chat stream failed after %d chars, resuming (attempt %d)", len(written), attempt + 1)
            if not written:
                model = get_settings().second_model
