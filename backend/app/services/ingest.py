"""Slide ingestion: text extraction, chunking, embedding, ChromaDB."""

import asyncio
import logging

from .. import db, documents, gemini, storage, vectorstore

log = logging.getLogger("deskwork.ingest")


async def ingest_file(file_id: str) -> None:
    try:
        f = await db.fetch_one("select * from course_files where id = %s", file_id)
        if not f:
            return
        await db.execute("update course_files set status = 'processing', progress = 5, error = null where id = %s", file_id)
        data = await storage.download(f["storage_path"])
        pages = await asyncio.to_thread(documents.slide_pages, data, f["mime"])
        chunks = documents.chunk_pages(pages)
        if not chunks:
            raise ValueError("No readable text was found in this file. Scanned slides are not supported yet.")
        outline = [
            {"page": i, "title": t}
            for i, t in ((i, documents.page_title(p)) for i, p in enumerate(pages, start=1))
            if t
        ]
        await db.execute(
            "update course_files set page_count = %s, char_count = %s, outline = %s, progress = 15 where id = %s",
            len(pages), sum(map(len, pages)), db.jsonb(outline), file_id,
        )

        title = f["filename"].rsplit(".", 1)[0]
        for model in gemini.embed_models():
            if not gemini.daily_quota_left(model):
                continue
            try:
                await _embed_file(file_id, f, chunks, title, model)
                break
            except gemini.QuotaExhausted:
                log.warning("Embedding quota used up for %s, trying the next model", model)
        else:
            raise gemini.QuotaExhausted("No embedding model has quota left today")
        await db.execute(
            "update course_files set status = 'ready', progress = 100, chunk_count = %s where id = %s",
            len(chunks), file_id,
        )
    except Exception as e:
        log.exception("Ingest failed for %s", file_id)
        await db.execute(
            "update course_files set status = 'failed', error = %s where id = %s", _friendly(e), file_id
        )


async def _embed_file(file_id: str, f: dict, chunks: list, title: str, model: str) -> None:
    """Embeds every chunk of one file with one model, so the file is searched consistently."""
    await vectorstore.delete_where({"file_id": file_id})
    await db.execute("update course_files set embed_model = %s, progress = 15 where id = %s", model, file_id)
    done = 0
    step = 20
    for i in range(0, len(chunks), step):
        batch = chunks[i : i + step]
        texts = [f"title: {title} | text: {c.text}" for c in batch]
        vectors = await gemini.embed(texts, query=False, model=model)
        await vectorstore.add(
            ids=[f"{file_id}:{i + j}" for j in range(len(batch))],
            embeddings=vectors,
            texts=[c.text for c in batch],
            metas=[
                {
                    "course_id": str(f["course_id"]),
                    "file_id": file_id,
                    "filename": f["filename"],
                    "page_start": c.page_start,
                    "page_end": c.page_end,
                    "embed_model": model,
                }
                for c in batch
            ],
        )
        done += len(batch)
        if not await db.fetch_one("select 1 from course_files where id = %s", file_id):
            await vectorstore.delete_where({"file_id": file_id})
            return
        await db.execute(
            "update course_files set progress = %s where id = %s",
            15 + int(85 * done / len(chunks)), file_id,
        )


def _friendly(e: Exception) -> str:
    if isinstance(e, documents.UnsupportedFile) or isinstance(e, ValueError):
        return str(e)
    if isinstance(e, gemini.QuotaExhausted):
        return ("Today's free Gemini limit for reading slides is used up. It resets at 12:30 PM India time, "
                "or add another API key to GEMINI_API_KEY in backend/.env and click retry.")
    if isinstance(e, gemini.GeminiError):
        return "The AI service is busy or unavailable. Try again in a minute."
    return "Something went wrong while reading this file. Try uploading it again."
