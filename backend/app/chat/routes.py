from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.chat.schemas import QuestionRequest
from app.chat.services import stream_chat_response
from app.core.rate_limit import rate_limit_ask

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post("/ask")
async def ask_question(
    req: QuestionRequest,
    request: Request,
    _: None = Depends(rate_limit_ask),
):
    return StreamingResponse(
        stream_chat_response(req, request),
        media_type="text/plain"
    )
