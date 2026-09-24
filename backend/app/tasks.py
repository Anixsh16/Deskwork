import asyncio
import logging
from collections.abc import Awaitable, Callable

log = logging.getLogger("deskwork.tasks")
_running: set[asyncio.Task] = set()


def run_in_background(name: str, fn: Callable[[], Awaitable[None]]) -> None:
    """Starts work that outlives the request. Each job records its own failure state."""

    async def wrapper() -> None:
        try:
            await fn()
        except Exception:
            log.exception("Background job %s crashed", name)

    task = asyncio.create_task(wrapper(), name=name)
    _running.add(task)
    task.add_done_callback(_running.discard)


async def wait_all() -> None:
    while _running:
        await asyncio.gather(*list(_running), return_exceptions=True)
