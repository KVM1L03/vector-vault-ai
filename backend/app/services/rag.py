from app.core.clients import get_embeddings, get_llm, get_supabase

RAG_SYSTEM_PROMPT = """You are an intelligent document Q&A assistant.
Your task is to answer questions based on the provided context from uploaded documents.

INTERPRETATION RULES:
1. If the question asks about "checking" a parameter but the context describes "calculating" or "adjusting" it -> PROVIDE THAT INFORMATION.
2. Correct obvious OCR errors in numbers and formulas (e.g., change "0f3)" to "0.3", "Pg=CH" to "Pg = H").
3. Base your answer strictly on the provided context.

FORMATTING (IMPORTANT):
1. Mathematical formulas and equations ALWAYS use LaTeX:
   - Inline formulas: single dollar signs: $E = mc^2$
   - Block formulas on a new line: double dollar signs.
   Example: $$P_g = \\frac{{H}}{{10}} + 0.3$$
2. Use Markdown for bold key values.

RESPONSE REQUIREMENTS:
- Be specific and concise.
- Cite each piece of information with a reference (source: Fragment X).
- If nothing in the context matches the question, reply: "I did not find this information in the available documentation."

CONTEXT:
{context}
"""


def retrieve_chunks(query: str, top_k: int = 5, filename: str | None = None) -> list[dict]:
    """Embed query and fetch similar chunks from Supabase. Optionally filter by filename."""
    embeddings = get_embeddings()
    supabase = get_supabase()
    query_vector = embeddings.embed_query(query)
    params: dict = {
        "query_embedding": query_vector,
        "match_count": top_k,
    }
    if filename is not None:
        params["filter_filename"] = filename
    result = supabase.rpc("match_documents", params).execute()
    return result.data or []


def build_context(chunks: list[dict]) -> str:
    """Format retrieved chunks as context string."""
    parts = []
    for i, row in enumerate(chunks, 1):
        content = row.get("content", "")
        metadata = row.get("metadata", {}) or {}
        filename = metadata.get("filename", "unknown")
        parts.append(f"[Fragment {i}] (from {filename})\n{content}")
    return "\n\n---\n\n".join(parts)


def ask(query: str, top_k: int = 5, filename: str | None = None) -> tuple[str, list[dict]]:
    """
    RAG pipeline: retrieve similar chunks, then generate answer with LLM.
    If filename is provided, only chunks from that document are used.
    Returns (answer_text, chunks) for sources.
    """
    chunks = retrieve_chunks(query, top_k, filename=filename)
    if not chunks:
        return "No relevant documents found. Please upload documents first.", []

    context = build_context(chunks)
    prompt = RAG_SYSTEM_PROMPT.format(context=context)
    llm = get_llm()
    response = llm.invoke([
        {"role": "system", "content": prompt},
        {"role": "user", "content": query},
    ])
    return response.content, chunks
