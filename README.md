# 🧠 Vector Vault AI

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

> **An intelligent, context-aware document assistant.** > Upload any PDF and start a conversation with your data instantly using advanced RAG (Retrieval-Augmented Generation) pipelines.


![RAG_DEMO(1)](https://github.com/user-attachments/assets/1205422d-0ef0-41ff-b9f9-57a04a3ae76e)


## 🚀 Features

* **Instant Document Processing:** Upload PDFs and automatically extract text chunks.
* **Contextual Chat:** Ask questions and get precise answers based *only* on the document's content.
* **Low Latency Responses:** Optimized vector search using cosine similarity for lightning-fast context retrieval.
* **Modern UI/UX:** Responsive, accessible, and clean interface built with React & Tailwind CSS.

## 🏗️ System Architecture (RAG Pipeline)

The core engine relies on a standard Retrieval-Augmented Generation flow:

1. **Ingestion:** User uploads a PDF. The document is parsed and split into overlapping logical chunks.
2. **Embedding:** Each chunk is passed through an embedding model (e.g., `text-embedding-3-small`) to generate high-dimensional vector representations.
3. **Storage:** Vectors and metadata are stored in a Vector Database (like Supabase `pgvector`).
4. **Retrieval:** User queries are embedded, and a similarity search computes the nearest neighbors using cosine similarity: 
   $$similarity = \cos(\theta) = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$
5. **Generation:** The retrieved context + the user's prompt are sent to the LLM (e.g., GPT-4o-mini) to generate a grounded, hallucination-free response.

## 🛠️ Tech Stack

* **Frontend & Framework:** Next.js (App Router), React, Tailwind CSS
* **Language:** TypeScript (Strict mode enabled)
* **AI & LLM:** OpenAI API / LangChain
* **Database & Vector Store:** Supabase (PostgreSQL + `pgvector`)
* **File Storage:** Supabase Storage

## 💻 Getting Started

Follow these steps to run the application locally.

### Prerequisites
* Node.js (v18+)
* API keys for OpenAI and your Vector Database provider.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/KVM1L03/vector-vault-ai.git
   cd vector-vault-ai
