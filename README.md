# 🧠 Vector Vault AI

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

> **An intelligent, context-aware document assistant.** Upload any PDF and start a conversation with your data instantly using advanced RAG (Retrieval-Augmented Generation) pipelines.

![RAG_DEMO(1)](https://github.com/user-attachments/assets/1205422d-0ef0-41ff-b9f9-57a04a3ae76e)

## 🚀 Features
* **Instant Document Processing:** Upload PDFs and automatically extract text chunks directly into vector storage via the backend (no files stored permanently).
* **Contextual Chat & Traceability:** Ask questions and get precise answers based *only* on the document's content.
* **Interactive PDF Viewer:** Built-in side-by-side PDF rendering with "Go to source" buttons that instantly jump to the exact document fragment referenced by the AI.
* **Low Latency Responses:** Optimized vector search using cosine similarity for lightning-fast context retrieval.
* **Microservices Architecture:** Clean separation of concerns with a blazing-fast Next.js UI and a robust FastAPI/Python AI engine.

## 🏗️ System Architecture (RAG Pipeline)

The application is split into two main services: a frontend client and an AI backend API.
1. **Ingestion:** User uploads a PDF via the frontend. The file is streamed to the backend where it is parsed and split into overlapping logical chunks.
2. **Embedding:** Each chunk is passed through an embedding model (e.g., `text-embedding-3-small`) to generate high-dimensional vector representations.
3. **Storage:** Vectors and metadata are stored in a Vector Database (Supabase `pgvector`).
4. **Retrieval:** User queries are embedded, and a similarity search computes the nearest neighbors using cosine similarity: 
   `similarity = cos(θ) = (A · B) / (||A|| * ||B||)`
5. **Generation & UI Mapping:** The retrieved context + the user's prompt are sent to the LLM (e.g., GPT-4o-mini) to generate a grounded response. The UI maps the retrieved chunks to the internal PDF viewer for easy verification.

## 🛠️ Tech Stack
* **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS
* **Backend & AI:** FastAPI, Python 3.12, LangChain, OpenAI API *(Details in `backend/README.md`)*
* **Database & Vector Store:** Supabase (PostgreSQL + `pgvector`)

## 💻 Getting Started

The project is divided into frontend and backend applications that need to be run separately.

### Prerequisites
* **Node.js (v18+)** for the frontend.
* **Python 3.12+** for the backend *(details in `backend/README.md`)*.
* **API Keys:** You will need an OpenAI API key and Supabase credentials (URL + Service Role Key).

### Installation

**1. Clone the repository:**
```bash
git clone https://github.com/KVM1L03/vector-vault-ai.git
cd vector-vault-ai
```

**2. Start the Backend (FastAPI):**
The backend handles the AI logic, PDF parsing, and database connection.
Please follow the detailed instructions in the Backend README to set up your Python environment and start the server.

**3. Start the Frontend (Next.js):**
Open a new terminal window and navigate to the frontend directory:
```bash
cd frontend
npm install
```

Set up your environment variables. Create a `.env` file in the frontend directory:
```env
API_BASE_URL=http://localhost:8000
```

Run the development server:
```bash
npm run dev
```

Open http://localhost:3000 with your browser to see the result.
