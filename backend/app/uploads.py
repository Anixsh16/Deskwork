"""Shared upload handling: size limits, type detection, storing originals and rendered pages."""

import asyncio
import re
import uuid

from fastapi import HTTPException, UploadFile

from . import documents, storage

MAX_BYTES = 60 * 1024 * 1024
MAX_PAGES = 40


def safe_name(filename: str) -> str:
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", filename or "file").strip("_")
    return name[-120:] or "file"


async def read(file: UploadFile) -> tuple[bytes, str]:
    data = await file.read()
    if not data:
        raise HTTPException(400, f"{file.filename} is empty.")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, f"{file.filename} is larger than 60 MB.")
    try:
        mime = documents.detect_mime(file.filename or "", data)
    except documents.UnsupportedFile as e:
        raise HTTPException(415, str(e))
    return data, mime


async def store_as_pages(prefix: str, files: list[UploadFile]) -> tuple[str, str, list[str]]:
    """Stores the original upload(s) and one JPEG per page. Returns (display name, original path, page paths)."""
    loaded = [await read(f) for f in files]
    for (_, mime), f in zip(loaded, files):
        if mime not in (documents.PDF, *documents.IMAGE_TYPES):
            raise HTTPException(415, f"{f.filename}: upload a PDF or photos (JPG, PNG).")
    try:
        pages = await asyncio.to_thread(documents.render_pages, loaded)
    except documents.UnsupportedFile as e:
        raise HTTPException(415, str(e))
    except Exception:
        raise HTTPException(422, "This file could not be opened. Is it a valid PDF or image?")
    if len(pages) > MAX_PAGES:
        raise HTTPException(413, f"This file has {len(pages)} pages. Upload at most {MAX_PAGES} pages at a time.")

    batch = uuid.uuid4().hex[:8]
    first_data, first_mime = loaded[0]
    ext = "pdf" if first_mime == documents.PDF else first_mime.split("/")[1]
    original = f"{prefix}/{batch}/original-{safe_name(files[0].filename or 'upload')}"
    if not original.endswith(f".{ext}"):
        original += f".{ext}"
    await storage.upload(original, first_data, first_mime)
    page_paths = [f"{prefix}/{batch}/page-{i:03d}.jpg" for i in range(1, len(pages) + 1)]
    await asyncio.gather(*(storage.upload(p, img, "image/jpeg") for p, img in zip(page_paths, pages)))
    name = files[0].filename or "upload"
    if len(files) > 1:
        name = f"{name} + {len(files) - 1} more"
    return name, original, page_paths
