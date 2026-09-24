"""Deletes ALL Deskwork data: every course, exam, paper, chat, stored file and the local slide index.

Teacher sign-in accounts are kept. Run with the backend stopped or idle:
    uv run python -m tools.reset --yes
"""

import asyncio
import shutil
import sys

import httpx

from app.config import get_settings

TABLES = [
    "mark_edits", "grading_runs", "paper_marks", "student_papers", "answer_key_items", "exam_questions", "exams",
    "chat_messages", "chat_attachments", "chats", "course_files", "courses", "teachers",
]


async def main() -> None:
    import psycopg

    s = get_settings()
    async with await psycopg.AsyncConnection.connect(s.database_url, autocommit=True) as conn:
        counts = {}
        for t in TABLES:
            cur = await conn.execute(f"delete from {t}")
            counts[t] = cur.rowcount
    print("Deleted rows:", {k: v for k, v in counts.items() if v})

    headers = {"Authorization": f"Bearer {s.supabase_secret_key}", "apikey": s.supabase_secret_key}
    async with httpx.AsyncClient(base_url=f"{s.supabase_url}/storage/v1", headers=headers, timeout=120) as http:
        r = await http.post(f"/bucket/{s.storage_bucket}/empty")
        print("Emptied storage bucket:", r.status_code, r.text[:120])

    for sub in ("chroma", "files"):
        shutil.rmtree(s.data_dir / sub, ignore_errors=True)
    print("Removed local slide index and file cache.")


if __name__ == "__main__":
    if "--yes" not in sys.argv:
        sys.exit("This deletes all Deskwork data. Re-run with --yes to confirm.")
    asyncio.run(main())
