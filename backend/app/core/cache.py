import hashlib
import json
from app.core.clients import get_redis

CACHE_TTL = 60 * 10 

def make_cache_key(
    query: str,
    filename: str | None,
    top_k: int = 5,
    include_full_content: bool = False,
) -> str:
    base = (query or "").strip()
    fn = filename or "all"
    parts = f"{base}|{fn}|{top_k}|{include_full_content}"
    h = hashlib.sha256(parts.encode("utf-8")).hexdigest()[:32]
    return f"chat:{fn}:{h}"

async def get_cached_response(key: str) -> dict | None:
    r = get_redis()
    raw = await r.get(key)
    if raw is None:
        return None
    return json.loads(raw)

async def set_cached_response(key: str, answer: str, sources: list[dict], ttl: int = CACHE_TTL) -> None:
    r = get_redis()
    payload = {"answer": answer, "sources": sources}
    await r.set(key, json.dumps(payload, ensure_ascii=False), ex=ttl)