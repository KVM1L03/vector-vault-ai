from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.chat.schemas import QuestionRequest
from app.chat.services import stream_chat_response

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post("/ask")
async def ask_question(req: QuestionRequest, request: Request):
    return StreamingResponse(
        stream_chat_response(req, request),
        media_type="text/plain"
    )
