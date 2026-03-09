# 🧠 Vector Vault AI

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com/)

> **An intelligent, Enterprise-grade document assistant.** Upload any PDF and start a conversation with your data instantly using an advanced, asynchronous RAG (Retrieval-Augmented Generation) pipeline.

🔴 **Live Demo:** [vector-vault-ai.vercel.app](https://vector-vault-ai.vercel.app/)

![vector-vault](https://github.com/user-attachments/assets/d8380b6d-92eb-40ab-8bd1-8df553e88aab)

---

## 🚀 Key Features

* **Real-time Streaming (Vercel AI SDK):** Experience ChatGPT-like typing speeds. The FastAPI backend streams NDJSON directly to the Next.js client, ensuring a blazing-fast Time-To-First-Token (TTFT).
* **Semantic Caching:** Integrates an asynchronous Redis cache layer to store frequent exact-match queries, bypassing the LLM entirely to reduce API costs and latency.
* **Contextual Chat & Traceability:** Ask questions and get precise answers based *only* on the document's content.
* **Interactive PDF Viewer:** Built-in side-by-side PDF rendering with "Go to source" badges that instantly jump to the exact document fragment referenced by the AI.
* **Microservices Architecture (BFF):** Clean separation of concerns. Next.js acts as a Backend-For-Frontend proxying secure requests to an isolated, serverless Python engine.

---

## 🏗️ System Architecture (RAG Pipeline)

The application is deployed as a distributed system: Next.js on **Vercel** and FastAPI on **Google Cloud Run**.



1.  **Ingestion:** User uploads a PDF. The file is parsed, OCR'd if necessary, and split into overlapping logical chunks using LangChain.
2.  **Embedding:** Chunks pass through `text-embedding-3-small` to generate high-dimensional vectors.
3.  **Vector Database:** Vectors and metadata are stored in Supabase (`pgvector`).
4.  **Retrieval (Hybrid):** User queries are embedded, and the system computes nearest neighbors using cosine similarity:
    $$\text{similarity} = \cos(\theta) = \frac{A \cdot B}{\|A\| \|B\|}$$
5.  **Generation & Streaming:** The retrieved context + prompt are sent to GPT-4o-mini. The response is streamed asynchronously via Server-Sent Events (SSE) back to the UI.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS, `ai/react` (Vercel SDK)
* **Backend:** Python 3.12, FastAPI, Pydantic V2, LangChain, OpenAI Async API
* **Database & Cache:** Supabase (PostgreSQL + `pgvector`), Redis (Upstash / Local Docker)
* **Infrastructure:** Docker, Google Cloud Run (Serverless), Vercel

---

## 💻 Getting Started (Local Development)

The project is structured as a monorepo. We use Docker Compose to simplify the backend environment setup.

### Prerequisites
* **Node.js (v18+)**
* **Docker & Docker Compose**
* **API Keys:** OpenAI API key and Supabase credentials.

---

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
