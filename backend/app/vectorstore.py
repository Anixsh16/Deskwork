"""Vector-store adapter. Queries are always scoped to course AND embedding model."""

import asyncio
import httpx
from .config import get_settings


async def pinecone_call(path, body):
    s = get_settings()
    if not s.pinecone_api_key or not s.pinecone_host:
        raise RuntimeError("Pinecone is selected but its API key or host is missing.")
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(4):
            r = await client.post(
                "https://"
                + s.pinecone_host.removeprefix("https://").rstrip("/")
                + path,
                headers={
                    "Api-Key": s.pinecone_api_key,
                    "X-Pinecone-API-Version": "2025-10",
                },
                json=body,
            )
            if r.status_code in (429, 500, 502, 503, 504) and attempt < 3:
                await asyncio.sleep(2**attempt)
                continue
            r.raise_for_status()
            return r.json() if r.content else {}


async def add(ids, embeddings, texts, metas):
    s = get_settings()
    if s.vector_provider == "chroma":
        from . import chroma_store

        return await chroma_store.add(ids, embeddings, texts, metas)
    for start in range(0, len(ids), 50):
        vectors = [
            {"id": i, "values": list(v), "metadata": {**m, "text": t}}
            for i, v, t, m in zip(
                ids[start : start + 50],
                embeddings[start : start + 50],
                texts[start : start + 50],
                metas[start : start + 50],
            )
        ]
        if vectors:
            await pinecone_call(
                "/vectors/upsert",
                {"namespace": s.pinecone_namespace, "vectors": vectors},
            )


async def delete_where(where):
    s = get_settings()
    if s.vector_provider == "chroma":
        from . import chroma_store

        return await chroma_store.delete_where(where)
    if not where:
        raise ValueError("A scoped deletion filter is required.")
    await pinecone_call(
        "/vectors/delete", {"namespace": s.pinecone_namespace, "filter": where}
    )


async def query(course_id, embeddings, per_query, embed_model):
    s = get_settings()
    if s.vector_provider == "chroma":
        from . import chroma_store

        return await chroma_store.query(course_id, embeddings, per_query, embed_model)
    best = {}
    for v in embeddings:
        result = await pinecone_call(
            "/query",
            {
                "namespace": s.pinecone_namespace,
                "vector": list(v),
                "topK": per_query,
                "includeMetadata": True,
                "filter": {
                    "$and": [
                        {"course_id": {"$eq": str(course_id)}},
                        {"embed_model": {"$eq": embed_model}},
                    ]
                },
            },
        )
        for hit in result.get("matches", []):
            row = {
                "id": hit["id"],
                **hit.get("metadata", {}),
                "distance": 1 - float(hit["score"]),
            }
            if row["id"] not in best or row["distance"] < best[row["id"]]["distance"]:
                best[row["id"]] = row
    return sorted(best.values(), key=lambda r: r["distance"])
