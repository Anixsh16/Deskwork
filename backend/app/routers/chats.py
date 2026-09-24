import asyncio
import json
import logging
import re
import uuid

import anyio

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from .. import access, db, documents, gemini, storage, uploads
from ..auth import Teacher, current_teacher
from ..services import chat as chat_service
from ..services.docx_export import markdown_to_docx

router = APIRouter()
log = logging.getLogger("deskwork.chats")
BOTS = {"assignment", "solution", "paper", "ask"}


class ChatIn(BaseModel):
    bot: str


class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=20000)
    attachment_ids: list[str] = []
    retry: bool = False


class ReadText(BaseModel):
    text: str


@router.get("/courses/{course_id}/chats")
async def list_chats(course_id: str, bot: str, teacher: Teacher = Depends(current_teacher)):
    await access.course(teacher, course_id)
    return await db.fetch_all(
        "select id, bot, title, updated_at from chats where course_id = %s and bot = %s order by updated_at desc",
        course_id, bot,
    )


@router.post("/courses/{course_id}/chats", status_code=201)
async def create_chat(course_id: str, body: ChatIn, teacher: Teacher = Depends(current_teacher)):
    await access.course(teacher, course_id)
    if body.bot not in BOTS:
        raise HTTPException(400, "Unknown chatbot.")
    return await db.fetch_one(
        "insert into chats (course_id, bot) values (%s, %s) returning id, bot, title, updated_at", course_id, body.bot
    )


@router.get("/chats/{chat_id}")
async def get_chat(chat_id: str, teacher: Teacher = Depends(current_teacher)):
    chat = await access.chat(teacher, chat_id)
    chat["messages"] = await db.fetch_all(
        """select id, role, content, sources, attachment_ids, status, created_at
           from chat_messages where chat_id = %s order by created_at""",
        chat_id,
    )
    ids = {a for m in chat["messages"] for a in m["attachment_ids"]}
    chat["attachments"] = await db.fetch_all(
        "select id, filename from chat_attachments where id = any(%s::uuid[])", list(ids)
    ) if ids else []
    return chat


@router.get("/courses/{course_id}/generated")
async def generated(course_id: str, teacher: Teacher = Depends(current_teacher)):
    """Finished answers from the generators, to reuse as an exam's question paper or answer key."""
    await access.course(teacher, course_id)
    return await db.fetch_all(
        """select m.id, ch.bot, ch.title, m.created_at, left(m.content, 280) as preview
           from chat_messages m join chats ch on ch.id = m.chat_id
           where ch.course_id = %s and m.role = 'assistant' and m.status = 'done' and length(m.content) > 0
             and ch.bot in ('assignment', 'solution', 'paper')
           order by m.created_at desc limit 40""",
        course_id,
    )


@router.delete("/chats/{chat_id}", status_code=204)
async def delete_chat(chat_id: str, teacher: Teacher = Depends(current_teacher)):
    await access.chat(teacher, chat_id)
    await db.execute("delete from chats where id = %s", chat_id)


@router.post("/courses/{course_id}/attachments", status_code=201)
async def upload_attachment(course_id: str, file: UploadFile = File(...), teacher: Teacher = Depends(current_teacher)):
    await access.course(teacher, course_id)
    name = file.filename or "file"
    if name.lower().endswith((".txt", ".md")):
        data = await file.read()
        if len(data) > 2 * 1024 * 1024:
            raise HTTPException(413, "Text files must be under 2 MB.")
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(415, "Text files must be UTF-8.")
        path = f"{teacher.id}/{course_id}/attachments/{uuid.uuid4().hex[:8]}-{uploads.safe_name(name)}"
        await storage.upload(path, data, "text/plain")
        return await db.fetch_one(
            """insert into chat_attachments (course_id, filename, storage_path, mime, pages, text_content)
               values (%s, %s, %s, 'text/plain', '[]', %s) returning id, filename""",
            course_id, name, path, text[:60000],
        )

    await file.seek(0)
    data, mime = await uploads.read(file)
    await file.seek(0)
    display, original, pages = await uploads.store_as_pages(f"{teacher.id}/{course_id}/attachments", [file])
    text = await asyncio.to_thread(documents.pdf_text, data) if mime == documents.PDF else ""
    if len(text.strip()) < 80:
        # Scanned or handwritten file: read it with vision so retrieval has text to work with.
        images = [await storage.download(p) for p in pages[:12]]
        parts = []
        for i, img in enumerate(images, start=1):
            parts += [gemini.text_part(f"PAGE {i}"), gemini.image_part(img)]
        parts.append(gemini.text_part("Transcribe all the text on these pages, in order."))
        try:
            read, _ = await gemini.generate_json(
                parts, ReadText, system="You transcribe documents faithfully.", thinking="minimal", high_res=True
            )
            text = read.text
        except gemini.GeminiError:
            text = ""
    return await db.fetch_one(
        """insert into chat_attachments (course_id, filename, storage_path, mime, pages, text_content)
           values (%s, %s, %s, %s, %s, %s) returning id, filename""",
        course_id, display, original, mime, db.jsonb(pages), text[:60000],
    )


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


@router.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, body: MessageIn, teacher: Teacher = Depends(current_teacher)):
    chat = await access.chat(teacher, chat_id)
    course = await access.course(teacher, str(chat["course_id"]))
    ready = await db.fetch_one(
        "select count(*) as n from course_files where course_id = %s and status = 'ready'", course["id"]
    )
    if not ready["n"]:
        raise HTTPException(409, "Upload this course's lecture slides first, so answers come from your material.")
    last = await db.fetch_all(
        "select * from chat_messages where chat_id = %s order by created_at desc limit 2", chat_id
    )
    retrying = (
        body.retry and len(last) == 2 and last[0]["role"] == "assistant" and last[0]["status"] == "failed"
        and last[1]["role"] == "user"
    )
    attachment_ids = list(last[1]["attachment_ids"]) if retrying else body.attachment_ids
    attachments = await db.fetch_all(
        "select * from chat_attachments where id = any(%s::uuid[]) and course_id = %s",
        attachment_ids or [], course["id"],
    ) if attachment_ids else []

    if retrying:
        # Answer the same question again: drop the interrupted answer and keep the original message.
        await db.execute("delete from chat_messages where id = %s", last[0]["id"])
        user_msg = {k: last[1][k] for k in ("id", "role", "content", "attachment_ids", "sources", "status", "created_at")}
        body.content = last[1]["content"]
    else:
        user_msg = await db.fetch_one(
            """insert into chat_messages (chat_id, role, content, attachment_ids) values (%s, 'user', %s, %s)
               returning id, role, content, attachment_ids, sources, status, created_at""",
            chat_id, body.content, db.jsonb([str(a["id"]) for a in attachments]),
        )
    bot_msg = await db.fetch_one(
        "insert into chat_messages (chat_id, role, status) values (%s, 'assistant', 'streaming') returning id", chat_id
    )
    if chat["title"] == "New chat":
        title = re.sub(r"\s+", " ", body.content).strip()[:70]
        await db.execute("update chats set title = %s where id = %s", title, chat_id)
    await db.execute("update chats set updated_at = now() where id = %s", chat_id)

    async def stream():
        content, sources, status = "", [], "done"
        yield _sse("meta", {"user_message": user_msg, "assistant_message_id": bot_msg["id"]})
        try:
            async for event in chat_service.answer(chat, course, body.content, attachments):
                if "sources" in event:
                    sources = event["sources"]
                    yield _sse("sources", sources)
                else:
                    content += event["delta"]
                    yield _sse("delta", event["delta"])
            yield _sse("done", {"id": bot_msg["id"]})
        except Exception:
            log.exception("Chat answer failed")
            status = "failed"
            yield _sse("error", {"message": "The AI could not answer right now. Please try again."})
        except BaseException:
            # The teacher closed or reloaded the page mid-answer: keep what was written, marked as interrupted.
            status = "failed"
            raise
        finally:
            with anyio.CancelScope(shield=True):
                await db.execute(
                    "update chat_messages set content = %s, sources = %s, status = %s where id = %s",
                    content, db.jsonb(sources), status if content else "failed", bot_msg["id"],
                )

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@router.get("/messages/{message_id}/docx")
async def message_docx(message_id: str, teacher: Teacher = Depends(current_teacher)):
    msg = await db.fetch_one(
        """select m.content, ch.title, ch.bot from chat_messages m join chats ch on ch.id = m.chat_id
           join courses c on c.id = ch.course_id where m.id = %s and c.owner_id = %s""",
        message_id, teacher.id,
    )
    if not msg or not msg["content"]:
        raise HTTPException(404, "Message not found.")
    data = markdown_to_docx(msg["content"], msg["title"])
    name = uploads.safe_name(f"{msg['bot']}-{msg['title'][:40]}") + ".docx"
    return Response(
        data,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )
