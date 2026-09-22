"""Deskwork Background Worker.

Polls the PostgreSQL jobs table using FOR UPDATE SKIP LOCKED.
Routes jobs to their respective handlers with progress reporting and exponential backoff retries.
"""

import json
import logging
import os
import signal
import sys
import time
from typing import Any
from dotenv import load_dotenv

from .jobs.extract_paper import run_extract_paper
from .jobs.build_rubric import run_build_rubric
from .jobs.future_stubs import (
    run_extract_material,
    run_ingest_scripts,
    run_grade_booklet,
    run_finalize_flags,
    run_generate_set,
    run_export_results,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("deskwork_worker")

HANDLERS = {
    "extract_paper": run_extract_paper,
    "build_rubric": run_build_rubric,
    "extract_material": run_extract_material,
    "ingest_scripts": run_ingest_scripts,
    "grade_booklet": run_grade_booklet,
    "finalize_flags": run_finalize_flags,
    "generate_set": run_generate_set,
    "export_results": run_export_results,
}

CLAIM_SQL = """
UPDATE jobs
SET status = 'running',
    locked_at = now(),
    attempts = attempts + 1
WHERE id = (
    SELECT id FROM jobs
    WHERE status = 'queued' AND run_after <= now()
    ORDER BY id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
)
RETURNING id, kind, payload, attempts;
"""

RUNNING = True


def signal_handler(signum, frame):
    global RUNNING
    logger.info("Shutdown signal received. Finishing active jobs...")
    RUNNING = False


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return None
    try:
        import psycopg
        return psycopg.connect(db_url, autocommit=True)
    except Exception as exc:
        logger.warning(f"Could not connect to database: {exc}")
        return None


def set_job_progress(conn, job_id: int, progress_data: dict):
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE jobs SET progress = %s WHERE id = %s",
                (json.dumps(progress_data), job_id),
            )
    except Exception as exc:
        logger.warning(f"Failed to update progress for job {job_id}: {exc}")


def mark_job_done(conn, job_id: int):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE jobs SET status = 'done', progress = '{\"pct\": 100, \"step\": \"done\"}' WHERE id = %s",
            (job_id,),
        )
    logger.info(f"Job {job_id} completed successfully.")


def fail_or_retry(conn, job_id: int, error: Exception, attempts: int, max_attempts: int = 3):
    err_msg = str(error)
    logger.error(f"Job {job_id} encountered an error: {err_msg}")
    with conn.cursor() as cur:
        if attempts >= max_attempts:
            cur.execute(
                "UPDATE jobs SET status = 'error', error = %s WHERE id = %s",
                (err_msg, job_id),
            )
            logger.error(f"Job {job_id} marked as permanent error after {attempts} attempts.")
        else:
            delay_seconds = 2 ** attempts * 5
            cur.execute(
                """
                UPDATE jobs
                SET status = 'queued',
                    error = %s,
                    run_after = now() + (interval '1 second' * %s)
                WHERE id = %s
                """,
                (err_msg, delay_seconds, job_id),
            )
            logger.info(f"Job {job_id} requeued for retry in {delay_seconds}s (attempt {attempts}/{max_attempts}).")


def start_worker():
    logger.info("Starting Deskwork background worker...")
    conn = get_db_connection()
    if not conn:
        logger.info("Running in offline development mode (DATABASE_URL not set). Waiting for configuration...")
        while RUNNING:
            time.sleep(2)
        return

    logger.info("Connected to PostgreSQL jobs queue. Listening for jobs...")
    while RUNNING:
        try:
            with conn.cursor() as cur:
                cur.execute(CLAIM_SQL)
                job = cur.fetchone()

            if not job:
                time.sleep(2)
                continue

            job_id, kind, payload, attempts = job
            logger.info(f"Claimed job {job_id} of kind '{kind}' (attempt {attempts}).")

            handler = HANDLERS.get(kind)
            if not handler:
                raise ValueError(f"No handler registered for job kind '{kind}'")

            progress_cb = lambda p: set_job_progress(conn, job_id, p)

            with conn.cursor() as cur:
                handler(payload, progress=progress_cb, db_cursor=cur)

            mark_job_done(conn, job_id)

        except Exception as exc:
            if "job_id" in locals():
                fail_or_retry(conn, job_id, exc, attempts)
            time.sleep(2)

    logger.info("Deskwork worker stopped cleanly.")


if __name__ == "__main__":
    start_worker()
