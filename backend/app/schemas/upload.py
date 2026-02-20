from pydantic import BaseModel, Field


class ChunkMetadata(BaseModel):
    """Metadata stored with each document chunk."""

    filename: str
    chunk_index: int


class UploadResponse(BaseModel):
    """API response for successful document upload."""

    filename: str = Field(..., description="Original filename")
    chunks_count: int = Field(..., ge=0, description="Number of chunks created")
    message: str = Field(default="Document processed and stored")