import pymupdf

from app.core.clients import get_embeddings, get_splitter, get_supabase
from app.upload.schemas import ChunkMetadata, UploadResponse


def extract_text_from_pdf(contents: bytes) -> str:
    """Extract text from PDF bytes using PyMuPDF."""
    doc = pymupdf.open(stream=contents, filetype="pdf")
    try:
        return "".join(page.get_text() for page in doc)
    finally:
        doc.close()


def chunk_text(text: str) -> list[str]:
    """Split text into chunks using RecursiveCharacterTextSplitter."""
    return get_splitter().split_text(text)


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    """Embed text chunks using OpenAI text-embedding-3-small."""
    return get_embeddings().embed_documents(chunks)


def store_chunks(
    chunks: list[str],
    vectors: list[list[float]],
    filename: str,
) -> None:
    """Store chunks with embeddings in Supabase documents table."""
    supabase = get_supabase()
    rows = [
        {
            "content": chunk,
            "embedding": vec,
            "metadata": ChunkMetadata(filename=filename, chunk_index=i).model_dump(),
        }
        for i, (chunk, vec) in enumerate(zip(chunks, vectors))
    ]
    supabase.table("documents").insert(rows).execute()


def process_document(contents: bytes, filename: str) -> UploadResponse:
    """
    Parse PDF, chunk text, create embeddings, and store in Supabase.
    Returns UploadResponse with processing result.
    """
    text = extract_text_from_pdf(contents)
    if not text.strip():
        raise ValueError("No text extracted from PDF")

    chunks = chunk_text(text)
    vectors = embed_chunks(chunks)
    store_chunks(chunks, vectors, filename)

    return UploadResponse(
        filename=filename,
        chunks_count=len(chunks),
        message="Document processed and stored",
    )
