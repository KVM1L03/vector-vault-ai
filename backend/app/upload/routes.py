import asyncio

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.upload.schemas import UploadResponse
from app.upload.services import process_document
from app.core.rate_limit import rate_limit_upload

router = APIRouter(prefix="/api/v1", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    _: None = Depends(rate_limit_upload),
) -> UploadResponse:
    """Accept PDF file, process and store in vector database."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are allowed")

    contents = await file.read()

    try:
        result = await asyncio.to_thread(process_document, contents, file.filename)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e

    return result
