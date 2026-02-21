from fastapi import APIRouter
from app.schemas.chat import QuestionRequest, QuestionResponse, SourceItem

from app.services.rag import ask

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post("/ask", response_model=QuestionResponse)
async def ask_question(req: QuestionRequest) -> QuestionResponse:
    answer, chunks = ask(req.query, top_k=req.top_k, filename=req.filename)

    sources = []
    for row in chunks[:3]:
        meta = row.get("metadata") or {}
        raw_content = row.get("content", "")
        content = raw_content if req.include_full_content else (
            raw_content[:200] + "..." if len(raw_content) > 200 else raw_content
        )
        sources.append(SourceItem(
            id=row.get("id", ""),
            content=content,
            filename=meta.get("filename", "unknown"),
            chunk_index=meta.get("chunk_index", 0),
        ))

    return QuestionResponse(answer=answer, sources=sources)