"""Local ChromaDB store for slide chunks. One collection, filtered by course."""

import asyncio
import logging
from functools import lru_cache

import chromadb
from chromadb.api.client import SharedSystemClient

from .config import get_settings

COLLECTION = "slides"
log = logging.getLogger("deskwork.vectorstore")


@lru_cache
def _collection():
    path = get_settings().data_dir / "chroma"
    path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(path))
    return client.get_or_create_collection(COLLECTION, metadata={"hnsw:space": "cosine"})


async def _run(method: str, **kwargs):
    """Runs a collection call; if the index files were removed underneath us (for example by a data reset),
    reopen the index once and retry."""
    for attempt in range(2):
        try:
            return await asyncio.to_thread(getattr(_collection(), method), **kwargs)
        except Exception:
            if attempt:
                raise
            log.warning("Slide index unavailable, reopening it")
            _collection.cache_clear()
            SharedSystemClient.clear_system_cache()


async def add(ids: list[str], embeddings: list[list[float]], texts: list[str], metas: list[dict]) -> None:
    if ids:
        await _run("upsert", ids=ids, embeddings=embeddings, documents=texts, metadatas=metas)


async def delete_where(where: dict) -> None:
    await _run("delete", where=where)


async def query(course_id: str, embeddings: list[list[float]], per_query: int, embed_model: str) -> list[dict]:
    """Best matches across several query vectors, de-duplicated, best first.
    Only chunks embedded with the same model are comparable, so the search is limited to that model."""
    if not embeddings:
        return []
    res = await _run(
        "query",
        query_embeddings=embeddings,
        n_results=per_query,
        where={"$and": [{"course_id": course_id}, {"embed_model": embed_model}]},
        include=["documents", "metadatas", "distances"],
    )
    best: dict[str, dict] = {}
    for ids, docs, metas, dists in zip(res["ids"], res["documents"], res["metadatas"], res["distances"]):
        for id_, doc, meta, dist in zip(ids, docs, metas, dists):
            if id_ not in best or dist < best[id_]["distance"]:
                best[id_] = {"id": id_, "text": doc, "distance": dist, **meta}
    return sorted(best.values(), key=lambda r: r["distance"])
