import asyncio
import shutil
import time
from pathlib import Path
from urllib.parse import quote

import httpx

from .config import get_settings

_client: httpx.AsyncClient | None = None
_signed: dict[str, tuple[float, str]] = {}
_SIGN_SECONDS = 3600


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None:
        s = get_settings()
        _client = httpx.AsyncClient(
            base_url=f"{s.supabase_url}/storage/v1",
            headers={"Authorization": f"Bearer {s.supabase_secret_key}", "apikey": s.supabase_secret_key},
            timeout=120,
        )
    return _client


def _bucket() -> str:
    return get_settings().storage_bucket


def _cache_path(path: str) -> Path:
    return get_settings().data_dir / "files" / path


async def upload(path: str, data: bytes, content_type: str) -> None:
    r = await _http().post(
        f"/object/{_bucket()}/{quote(path)}",
        content=data,
        headers={"Content-Type": content_type, "x-upsert": "true"},
    )
    if r.status_code >= 300:
        raise RuntimeError(f"Storage upload failed ({r.status_code}): {r.text[:200]}")
    local = _cache_path(path)
    local.parent.mkdir(parents=True, exist_ok=True)
    await asyncio.to_thread(local.write_bytes, data)


async def download(path: str) -> bytes:
    local = _cache_path(path)
    if local.exists():
        return await asyncio.to_thread(local.read_bytes)
    r = await _http().get(f"/object/{_bucket()}/{quote(path)}")
    if r.status_code >= 300:
        raise RuntimeError(f"Storage download failed ({r.status_code})")
    local.parent.mkdir(parents=True, exist_ok=True)
    await asyncio.to_thread(local.write_bytes, r.content)
    return r.content


async def signed_urls(paths: list[str]) -> dict[str, str]:
    """Signed URLs for private files, cached until shortly before they expire."""
    now = time.monotonic()
    out: dict[str, str] = {}
    missing = []
    for p in paths:
        hit = _signed.get(p)
        if hit and hit[0] > now:
            out[p] = hit[1]
        else:
            missing.append(p)
    if missing:
        s = get_settings()
        r = await _http().post(
            f"/object/sign/{_bucket()}", json={"expiresIn": _SIGN_SECONDS, "paths": missing}
        )
        r.raise_for_status()
        for item in r.json():
            if item.get("signedURL"):
                url = f"{s.supabase_url}/storage/v1{item['signedURL']}"
                _signed[item["path"]] = (now + _SIGN_SECONDS - 300, url)
                out[item["path"]] = url
    return out


async def delete_prefix(prefix: str) -> None:
    """Delete every object under a folder prefix (storage has no recursive delete)."""
    paths: list[str] = []

    async def walk(folder: str) -> None:
        offset = 0
        while True:
            r = await _http().post(
                f"/object/list/{_bucket()}",
                json={"prefix": folder, "limit": 1000, "offset": offset},
            )
            r.raise_for_status()
            items = r.json()
            for it in items:
                full = f"{folder}/{it['name']}" if folder else it["name"]
                if it.get("id") is None:
                    await walk(full)
                else:
                    paths.append(full)
            if len(items) < 1000:
                return
            offset += 1000

    await walk(prefix.rstrip("/"))
    await delete_paths(paths)
    local = _cache_path(prefix.rstrip("/"))
    if local.exists():
        await asyncio.to_thread(shutil.rmtree, local, True)


async def delete_paths(paths: list[str]) -> None:
    for i in range(0, len(paths), 500):
        r = await _http().request("DELETE", f"/object/{_bucket()}", json={"prefixes": paths[i : i + 500]})
        r.raise_for_status()
    for p in paths:
        _cache_path(p).unlink(missing_ok=True)
        _signed.pop(p, None)
