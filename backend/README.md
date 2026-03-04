# vector-vault-ai — backend

FastAPI backend with RAG: PDF upload, chunking, embedding (Supabase pgvector), LLM chat.

## 1. How to run the backend

### Requirements

- Python 3.12+
- Supabase (table `documents` with pgvector)
- API keys: OpenAI, Supabase

### Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory with these variables:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `REDIS_URL` (optional, defaults to `redis://localhost:6379/0`)

Run the server:

```bash
uvicorn main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

---

## 2. File structure (feature-based)

```
backend/
├── main.py
├── requirements.txt
├── .env                    # (not in repo) environment variables
├── .gitignore
│
└── app/
    ├── core/
    │   ├── __init__.py
    │   ├── cache.py        # Redis cache for chat responses
    │   └── clients.py      # embeddings, Supabase, LLM, text splitter, Redis
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
