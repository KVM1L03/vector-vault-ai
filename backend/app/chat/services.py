import json
from typing import AsyncGenerator

from fastapi import Request

from app.chat.schemas import QuestionRequest, SourceItem
from app.core.cache import (
    CACHE_TTL,
    get_exact_cached_response,
    make_cache_key,
    set_exact_cached_response,
)
from app.core.clients import get_embeddings
from app.core.config import SEMANTIC_CACHE_ENABLED, SEMANTIC_CACHE_TTL_SECONDS
from app.core.semantic_cache import (
    find_similar_cached_response,
    store_semantic_cached_response,
)
from app.services.rag import get_relevant_chunks, stream_llm_response

CHUNK_SIZE_FOR_CACHE_STREAM = 80


def build_sources(chunks: list, include_full_content: bool) -> list[dict]:
    sources = []
    for row in chunks[:3]:
        meta = row.get("metadata") or {}
        raw_content = row.get("content", "")
        content = raw_content if include_full_content else (
            raw_content[:200] + "..." if len(raw_content) > 200 else raw_content
        )
        sources.append(SourceItem(
            id=str(row.get("id", "")),
            content=content,
            filename=meta.get("filename", "unknown"),
            chunk_index=meta.get("chunk_index", 0),
        ).model_dump())
    return sources


async def _stream_cached_payload(
    cached: dict,
    request: Request,
) -> AsyncGenerator[str, None]:
    yield f'2:{json.dumps([{"sources": cached["sources"]}])}\n'
    answer = cached["answer"]
    for i in range(0, len(answer), CHUNK_SIZE_FOR_CACHE_STREAM):
        if await request.is_disconnected():
            return
        yield f'0:{json.dumps(answer[i:i + CHUNK_SIZE_FOR_CACHE_STREAM])}\n'


async def stream_chat_response(req: QuestionRequest, request: Request) -> AsyncGenerator[str, None]:
    try:
        cache_key = make_cache_key(
            req.query, req.filename, req.top_k, req.include_full_content
        )

        exact_cached = await get_exact_cached_response(cache_key)
        if exact_cached:
            async for frame in _stream_cached_payload(exact_cached, request):
                yield frame
            return

        query_vector = await get_embeddings().aembed_query(req.query)

        if SEMANTIC_CACHE_ENABLED:
            semantic_cached = await find_similar_cached_response(
                query_vector,
                req.filename,
                req.top_k,
                req.include_full_content,
            )
            if semantic_cached:
                async for frame in _stream_cached_payload(semantic_cached, request):
                    yield frame
                return

        chunks = await get_relevant_chunks(
            req.query,
            top_k=req.top_k,
            filename=req.filename,
            query_vector=query_vector,
        )
        sources = build_sources(chunks, req.include_full_content)
        yield f'2:{json.dumps([{"sources": sources}])}\n'

        answer_parts: list[str] = []
        async for token in stream_llm_response(req.query, chunks):
            if await request.is_disconnected():
                return
            answer_parts.append(token)
            yield f'0:{json.dumps(token)}\n'

        full_answer = "".join(answer_parts)
        if full_answer:
            await store_semantic_cached_response(
                req.query,
                query_vector,
                full_answer,
                sources,
                req.filename,
                req.top_k,
                req.include_full_content,
                ttl_seconds=SEMANTIC_CACHE_TTL_SECONDS,
            )
            await set_exact_cached_response(
                cache_key, full_answer, sources, ttl=CACHE_TTL
            )

    except Exception as e:
        yield f'3:{json.dumps(str(e))}\n'
