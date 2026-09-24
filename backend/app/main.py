import logging
from contextlib import asynccontextmanager

import psycopg
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import db
from .config import get_settings
from .routers import chats, courses, exams, papers

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def _recover_interrupted_work() -> None:
    """Work that was running when the server stopped cannot resume; mark it so the teacher can retry."""
    await db.execute(
        "update course_files set status = 'failed', error = 'Processing was interrupted. Click retry.' "
        "where status in ('queued', 'processing')"
    )
    await db.execute(
        "update exams set paper_status = 'failed', paper_error = 'Reading was interrupted. Try again.' "
        "where paper_status = 'processing'"
    )
    await db.execute(
        "update exams set key_status = 'failed', key_error = 'Reading was interrupted. Try again.' "
        "where key_status = 'processing'"
    )
    await db.execute("update student_papers set status = 'ready' where status = 'reading'")
    await db.execute(
        "update student_papers set status = 'failed', error = 'Checking was interrupted. Check again.' "
        "where status = 'checking'"
    )
    await db.execute("update chat_messages set status = 'failed' where status = 'streaming'")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.open_pool()
    await _recover_interrupted_work()
    yield
    await db.close_pool()


app = FastAPI(title="Deskwork API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.exception_handler(psycopg.errors.InvalidTextRepresentation)
async def bad_id(_: Request, __: Exception):
    return JSONResponse({"detail": "Not found."}, status_code=404)


for r in (courses.router, chats.router, exams.router, papers.router):
    app.include_router(r, prefix="/api")


@app.get("/api/health")
async def health():
    await db.fetch_one("select 1")
    return {"ok": True}
