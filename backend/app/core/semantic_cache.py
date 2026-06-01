import asyncio
from datetime import datetime, timedelta, timezone

from app.core.clients import get_supabase
from app.core.config import (
    SEMANTIC_CACHE_ENABLED,
    SEMANTIC_CACHE_THRESHOLD,
    SEMANTIC_CACHE_TTL_SECONDS,
)


def normalize_filename_scope(filename: str | None) -> str | None:
    """Map API filename scope to DB column value (NULL = all documents)."""
    return filename


def is_similarity_hit(similarity: float, threshold: float) -> bool:
    return similarity >= threshold


async def find_similar_cached_response(
    query_vector: list[float],
    filename: str | None,
    top_k: int,
    include_full_content: bool,
    threshold: float = SEMANTIC_CACHE_THRESHOLD,
) -> dict | None:
    if not SEMANTIC_CACHE_ENABLED:
        return None

    supabase = get_supabase()
    params = {
        "query_embedding": query_vector,
        "filter_filename": normalize_filename_scope(filename),
        "filter_top_k": top_k,
        "filter_include_full_content": include_full_content,
        "match_threshold": threshold,
        "match_count": 1,
    }

    def fetch_match():
        return supabase.rpc("match_chat_cache", params).execute()

    result = await asyncio.to_thread(fetch_match)
    rows = result.data or []
    if not rows:
        return None

    row = rows[0]
    similarity = float(row.get("similarity", 0))
    if not is_similarity_hit(similarity, threshold):
        return None

    return {
        "answer": row["answer"],
        "sources": row.get("sources") or [],
        "similarity": similarity,
        "query_text": row.get("query_text"),
    }


async def store_semantic_cached_response(
    query_text: str,
    query_vector: list[float],
    answer: str,
    sources: list[dict],
    filename: str | None,
    top_k: int,
    include_full_content: bool,
    ttl_seconds: int = SEMANTIC_CACHE_TTL_SECONDS,
) -> None:
    if not SEMANTIC_CACHE_ENABLED or not answer:
        return

    supabase = get_supabase()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    row = {
        "query_text": query_text,
        "query_embedding": query_vector,
        "answer": answer,
        "sources": sources,
        "filename": normalize_filename_scope(filename),
        "top_k": top_k,
        "include_full_content": include_full_content,
        "expires_at": expires_at.isoformat(),
    }

    def insert_row():
        return supabase.table("chat_response_cache").insert(row).execute()

    await asyncio.to_thread(insert_row)


async def invalidate_semantic_cache_for_filename(filename: str) -> None:
    supabase = get_supabase()

    def invalidate():
        return supabase.rpc("invalidate_chat_cache", {"filter_filename": filename}).execute()

    await asyncio.to_thread(invalidate)
