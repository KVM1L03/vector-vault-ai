# vector-vault-ai — backend

FastAPI backend with RAG: PDF upload, chunking, embedding (Supabase pgvector), LLM chat.

## 1. Supabase setup

In Supabase (SQL Editor), run the following code to create the `documents` table with pgvector and the RPC function for semantic search:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- documents table (embeddings: text-embedding-3-small = 1536 dimensions)
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata jsonb DEFAULT '{}'
);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING hnsw (embedding vector_cosine_ops);

-- RPC function for match_documents (used by backend)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_filename text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata
  FROM documents d
  WHERE (filter_filename IS NULL OR (d.metadata->>'filename') = filter_filename)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 2. How to run the backend

### Requirements

- Python 3.12+
- Supabase (`documents` table + `match_documents` function — see section 1)
- API keys: OpenAI, Supabase
- Redis (optional — rate limiting, cache; defaults to `redis://localhost:6379/0`)

### Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | yes | OpenAI API key |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | yes | Service role key (secret) |
| `REDIS_URL` | no | Defaults to `redis://localhost:6379/0` |

Run the server:

```bash
uvicorn main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

### Docker (dev)

```bash
docker compose up --build
```

Compose uses local Redis (`redis_cache`). API: http://localhost:8000

---

## 3. File structure (feature-based)

```
backend/
├── main.py
├── requirements.txt
├── compose.yaml
├── .env                    # (not in repo) environment variables
├── .gitignore
│
└── app/
    ├── core/
    │   ├── __init__.py
    │   ├── cache.py        # Redis cache for chat responses
    │   ├── clients.py      # embeddings, Supabase, LLM, text splitter, Redis
    │   └── rate_limit.py   # rate limiting (upload, ask)
    │
    ├── chat/
    │   ├── __init__.py
    │   ├── schemas.py      # QuestionRequest, SourceItem, QuestionResponse
    │   ├── services.py     # stream_chat_response, build_sources
    │   └── routes.py       # POST /api/v1/ask — RAG chat (streaming)
    │
    ├── upload/
    │   ├── __init__.py
    │   ├── schemas.py      # ChunkMetadata, UploadResponse
    │   ├── services.py     # process_document, PDF parsing, chunking → Supabase
    │   └── routes.py       # POST /api/v1/upload — PDF upload
    │
    └── services/
        └── rag.py         # get_relevant_chunks, stream_llm_response (shared)
```
