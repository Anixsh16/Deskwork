import logging
from contextlib import asynccontextmanager

import psycopg
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import db
from .config import get_settings
from .routers import chats, courses, exams, papers, plans, bank, analytics, question_checks

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
    await db.execute("update lesson_plans set status='failed',error='Planning was interrupted. Retry to continue.' where status in ('queued','processing')")
    await db.execute("update bank_imports set status='failed',error='Collection interrupted. Retry collection.' where status in ('queued','processing')")
    await db.execute("update question_batches set status='failed',error='Checking interrupted. Completed marks are saved.' where status in ('queued','processing')")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.open_pool()
    # Local and deployed APIs may coexist. Never reset another live server's jobs on startup.
    lease = await psycopg.AsyncConnection.connect(get_settings().database_url, autocommit=True)
    try:
        acquired = (await (await lease.execute('select pg_try_advisory_lock(684173201)')).fetchone())[0]
        if acquired:
            await _recover_interrupted_work()
        await lease.execute('select pg_advisory_lock_shared(684173201)')
        if acquired: await lease.execute('select pg_advisory_unlock(684173201)')
        yield
    finally:
        await lease.close()
        await db.close_pool()


app = FastAPI(title="Deskwork API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.exception_handler(psycopg.errors.InvalidTextRepresentation)
async def bad_id(_: Request, __: Exception):
    return JSONResponse({"detail": "Not found."}, status_code=404)


for r in (courses.router, chats.router, exams.router, papers.router, plans.router, bank.router, analytics.router, question_checks.router):
    app.include_router(r, prefix="/api")


@app.get("/api/health")
async def health():
    await db.fetch_one("select 1")
    return {"ok": True}
