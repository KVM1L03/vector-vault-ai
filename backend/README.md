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

Run the server:

```bash
uvicorn main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

---

## 2. File structure

```
backend/
├── main.py                 # FastAPI app, router setup
├── requirements.txt
├── .env                    # (not in repo) environment variables
├── .gitignore
│
└── app/
    ├── core/
    │   ├── __init__.py
    │   └── clients.py      # embeddings, Supabase, LLM, text splitter
    │
    ├── routes/
    │   ├── upload.py       # POST /api/v1/upload — PDF upload
    │   └── chat.py         # POST /api/v1/ask — RAG chat
    │
    ├── schemas/
    │   ├── upload.py       # ChunkMetadata, UploadResponse
    │   └── chat.py         # QuestionRequest, QuestionResponse
    │
    └── services/
        ├── document_processor.py   # PDF parsing, chunking, embedding → Supabase
        └── rag.py                  # retrieve, build context, LLM answer
```
