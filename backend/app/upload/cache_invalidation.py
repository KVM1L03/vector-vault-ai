import asyncio

from app.core.cache import invalidate_exact_cache_for_filename
from app.core.semantic_cache import invalidate_semantic_cache_for_filename


async def invalidate_caches_for_filename(filename: str) -> None:
    await asyncio.gather(
        invalidate_semantic_cache_for_filename(filename),
        invalidate_exact_cache_for_filename(filename),
    )
