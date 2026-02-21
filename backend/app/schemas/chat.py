from pydantic import BaseModel, Field

class QuestionRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)


class SourceItem(BaseModel):
    """Single source fragment used for the answer."""
    id: str
    content: str
    filename: str
    chunk_index: int


class QuestionResponse(BaseModel):
    answer: str
    sources: list[SourceItem] = Field(default_factory=list)