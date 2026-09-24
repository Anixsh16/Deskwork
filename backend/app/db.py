from contextlib import asynccontextmanager
from typing import Any

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import AsyncConnectionPool

from .config import get_settings

_pool: AsyncConnectionPool | None = None


async def open_pool() -> None:
    global _pool
    _pool = AsyncConnectionPool(
        get_settings().database_url,
        min_size=1,
        max_size=8,
        kwargs={"row_factory": dict_row, "autocommit": True},
        check=AsyncConnectionPool.check_connection,
        open=False,
    )
    await _pool.open(wait=True, timeout=30)


async def close_pool() -> None:
    if _pool is not None:
        await _pool.close()


def pool() -> AsyncConnectionPool:
    if _pool is None:
        raise RuntimeError("Database pool is not open")
    return _pool


async def fetch_all(sql: str, *params: Any) -> list[dict]:
    async with pool().connection() as conn:
        cur = await conn.execute(sql, params)
        return await cur.fetchall()


async def fetch_one(sql: str, *params: Any) -> dict | None:
    async with pool().connection() as conn:
        cur = await conn.execute(sql, params)
        return await cur.fetchone()


async def execute(sql: str, *params: Any) -> None:
    async with pool().connection() as conn:
        await conn.execute(sql, params)


@asynccontextmanager
async def transaction():
    async with pool().connection() as conn:
        async with conn.transaction():
            yield conn


def jsonb(value: Any) -> Jsonb:
    return Jsonb(value)
