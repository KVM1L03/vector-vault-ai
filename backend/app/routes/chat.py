import json
from typing import AsyncGenerator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.schemas.chat import QuestionRequest, SourceItem
from app.services.rag import get_relevant_chunks, stream_llm_response
from app.core.cache import make_cache_key, get_cached_response, set_cached_response

router = APIRouter(prefix="/api/v1", tags=["chat"])

CHUNK_SIZE_FOR_CACHE_STREAM = 80


def _build_sources(chunks: list, include_full_content: bool) -> list[dict]:
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


async def generate_chat_stream(req: QuestionRequest, request: Request) -> AsyncGenerator[str, None]:
    try:
        cache_key = make_cache_key(
            req.query, req.filename, req.top_k, req.include_full_content
        )
        cached = await get_cached_response(cache_key)
        if cached:
            yield f'2:{json.dumps([{"sources": cached["sources"]}])}\n'
            answer = cached["answer"]
            for i in range(0, len(answer), CHUNK_SIZE_FOR_CACHE_STREAM):
                if await request.is_disconnected():
                    return
                yield f'0:{json.dumps(answer[i:i + CHUNK_SIZE_FOR_CACHE_STREAM])}\n'
            return

        chunks = await get_relevant_chunks(req.query, top_k=req.top_k, filename=req.filename)
        sources = _build_sources(chunks, req.include_full_content)
        yield f'2:{json.dumps([{"sources": sources}])}\n'

        answer_parts: list[str] = []
        async for token in stream_llm_response(req.query, chunks):
            if await request.is_disconnected():
                return
            answer_parts.append(token)
            yield f'0:{json.dumps(token)}\n'

        full_answer = "".join(answer_parts)
        if full_answer:
            await set_cached_response(cache_key, full_answer, sources)

    except Exception as e:
        yield f'3:{json.dumps(str(e))}\n'


@router.post("/ask")
async def ask_question(req: QuestionRequest, request: Request):
    return StreamingResponse(
        generate_chat_stream(req, request),
        media_type="text/plain"
    )