import asyncio
from typing import AsyncGenerator
from app.core.clients import get_embeddings, get_llm, get_supabase

RAG_SYSTEM_PROMPT = """You are an intelligent document Q&A assistant.
Your task is to answer questions based on the provided context from uploaded documents.

INTERPRETATION RULES:
1. If the question asks about "checking" a parameter but the context describes "calculating" or "adjusting" it -> PROVIDE THAT INFORMATION.
2. Correct obvious OCR errors in numbers and formulas (e.g., change "0f3)" to "0.3", "Pg=CH" to "Pg = H").
3. Base your answer strictly on the provided context.
4. ALWAYS answer in the same language as the user's question.
5. DO NOT include any source references, citations, or fragment numbers (e.g., "source: Fragment 1") in your response text. The system UI handles citations automatically.

FORMATTING (IMPORTANT):
1. Mathematical formulas and equations ALWAYS use LaTeX:
   - Inline formulas: single dollar signs: $E = mc^2$
   - Block formulas on a new line: double dollar signs.
   Example: $$P_g = \\frac{{H}}{{10}} + 0.3$$
2. Use Markdown for bold key values.

RESPONSE REQUIREMENTS:
- Be specific and concise.
- If nothing in the context matches the question, reply: "I did not find this information in the available documentation."

CONTEXT:
{context}
"""

async def get_relevant_chunks(query: str, top_k: int = 5, filename: str | None = None) -> list[dict]:
    """Fetch relevant chunks from pgvector asynchronously."""
    embeddings = get_embeddings()
    supabase = get_supabase()
    
    query_vector = await embeddings.aembed_query(query)
    
    params: dict = {
        "query_embedding": query_vector,
        "match_count": top_k,
    }
    if filename is not None:
        params["filter_filename"] = filename
        

    def fetch_from_supabase():
        return supabase.rpc("match_documents", params).execute()
        
    result = await asyncio.to_thread(fetch_from_supabase)
    return result.data or []


def build_context(chunks: list[dict]) -> str:
    """Format retrieved chunks as context string. (Synchronous - CPU-only operations)"""
    parts = []
    for i, row in enumerate(chunks, 1):
        content = row.get("content", "")
        metadata = row.get("metadata", {}) or {}
        filename_meta = metadata.get("filename", "unknown")
        parts.append(f"[Fragment {i}] (from {filename_meta})\n{content}")
    return "\n\n---\n\n".join(parts)


async def stream_llm_response(query: str, chunks: list[dict]) -> AsyncGenerator[str, None]:
    """Async generator streaming tokens from the LLM."""
    if not chunks:
        yield "No relevant documents found. Please upload documents first."
        return

    context = build_context(chunks)
    prompt = RAG_SYSTEM_PROMPT.format(context=context)
    llm = get_llm()
    
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": query},
    ]

    async for chunk in llm.astream(messages):
        if hasattr(chunk, "content") and chunk.content:
            yield chunk.content
        elif isinstance(chunk, str):
            yield chunk