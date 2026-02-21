from fastapi import APIRouter
from app.schemas.chat import QuestionRequest, QuestionResponse, SourceItem

from app.services.rag import ask

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post("/ask", response_model=QuestionResponse)
async def ask_question(req: QuestionRequest) -> QuestionResponse:
    answer, chunks = ask(req.query, top_k=req.top_k)

    sources = []
    for row in chunks:
        meta = row.get("metadata") or {}
        sources.append(SourceItem(
            id=row.get("id", ""),
            content=row.get("content", ""),
            filename=meta.get("filename", "unknown"),
            chunk_index=meta.get("chunk_index", 0),
        ))

    return QuestionResponse(answer=answer, sources=sources)