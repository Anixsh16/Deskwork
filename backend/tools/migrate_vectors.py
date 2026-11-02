"""Copy existing local embeddings to Pinecone without generating new embeddings or deleting Chroma."""

import asyncio
from app import db, vectorstore, chroma_store
from app.config import get_settings


async def main():
    if get_settings().vector_provider != "pinecone":
        raise RuntimeError("Select Pinecone before migration.")
    await db.open_pool()
    try:
        files = await db.fetch_all(
            "select id,course_id,embed_model from course_files where status='ready'"
        )
        count = 0
        missing = []
        for f in files:
            data = await chroma_store._run(
                "get",
                where={"file_id": str(f["id"])},
                include=["embeddings", "documents", "metadatas"],
            )
            if not data["ids"]:
                missing.append(str(f["id"]))
                continue
            metas = [{**m, "embed_model": f["embed_model"]} for m in data["metadatas"]]
            await vectorstore.add(
                data["ids"], data["embeddings"], data["documents"], metas
            )
            count += len(data["ids"])
        print(
            f"Migrated {count} chunks. {len(missing)} files need reindexing from their original files."
        )
        return missing
    finally:
        await db.close_pool()


if __name__ == "__main__":
    asyncio.run(main())
