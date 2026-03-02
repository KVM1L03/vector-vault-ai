import json
import asyncio
from typing import AsyncGenerator
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.schemas.chat import QuestionRequest, SourceItem
from app.services.rag import get_relevant_chunks, stream_llm_response

router = APIRouter(prefix="/api/v1", tags=["chat"])

async def generate_chat_stream(req: QuestionRequest, request: Request) -> AsyncGenerator[str, None]:
    try:
        chunks = await get_relevant_chunks(req.query, top_k=req.top_k, filename=req.filename)

        sources = []
        for row in chunks[:3]:
            meta = row.get("metadata") or {}
            raw_content = row.get("content", "")
            content = raw_content if req.include_full_content else (
                raw_content[:200] + "..." if len(raw_content) > 200 else raw_content
            )
            source_item = SourceItem(
                id=str(row.get("id", "")),
                content=content,
                filename=meta.get("filename", "unknown"),
                chunk_index=meta.get("chunk_index", 0),
            )
            sources.append(source_item.model_dump())


        yield f'2:{json.dumps([{"sources": sources}])}\n'

        async for token in stream_llm_response(req.query, chunks):
            if await request.is_disconnected():
                break      
            yield f'0:{json.dumps(token)}\n'
            
    except Exception as e:
        yield f'3:{json.dumps(str(e))}\n'


@router.post("/ask")
async def ask_question(req: QuestionRequest, request: Request):
    return StreamingResponse(
        generate_chat_stream(req, request),
        media_type="text/plain"
    )