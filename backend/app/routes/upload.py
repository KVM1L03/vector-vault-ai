import asyncio

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.upload import UploadResponse
from app.services.document_processor import process_document

router = APIRouter(prefix="/api/v1", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)) -> UploadResponse:
    """Accept PDF file, process and store in vector database."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are allowed")

    contents = await file.read()

    try:
        result = await asyncio.to_thread(process_document, contents, file.filename)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e

    return result
