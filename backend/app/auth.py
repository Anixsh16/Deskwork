import hashlib
import time
from dataclasses import dataclass

import httpx
from fastapi import Header, HTTPException

from . import db
from .config import get_settings


@dataclass
class Teacher:
    id: str
    email: str
    full_name: str | None
    avatar_url: str | None


_cache: dict[str, tuple[float, Teacher]] = {}
_CACHE_SECONDS = 60


async def _verify(token: str) -> dict:
    s = get_settings()
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{s.supabase_url}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": s.supabase_publishable_key},
        )
    if r.status_code != 200:
        raise HTTPException(401, "Your session has expired. Please sign in again.")
    return r.json()


async def current_teacher(authorization: str = Header(default="")) -> Teacher:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Please sign in.")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(401, "Please sign in.")
    key = hashlib.sha256(token.encode()).hexdigest()
    hit = _cache.get(key)
    if hit and hit[0] > time.monotonic():
        return hit[1]

    user = await _verify(token)
    email = (user.get("email") or "").lower()
    if email not in get_settings().allowed_emails:
        raise HTTPException(403, "This Google account is not enabled for Deskwork yet.")

    meta = user.get("user_metadata") or {}
    teacher = Teacher(
        id=user["id"],
        email=email,
        full_name=meta.get("full_name") or meta.get("name"),
        avatar_url=meta.get("avatar_url") or meta.get("picture"),
    )
    await db.execute(
        """
        insert into teachers (id, email, full_name, avatar_url) values (%s, %s, %s, %s)
        on conflict (id) do update set email = excluded.email,
          full_name = coalesce(excluded.full_name, teachers.full_name),
          avatar_url = coalesce(excluded.avatar_url, teachers.avatar_url)
        """,
        teacher.id, teacher.email, teacher.full_name, teacher.avatar_url,
    )
    _cache[key] = (time.monotonic() + _CACHE_SECONDS, teacher)
    return teacher
