"""Shared infrastructure clients - single source of truth for embeddings, supabase, LLM, text splitter."""

import os

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from supabase import create_client
import redis.asyncio as redis


embeddings_cache: OpenAIEmbeddings | None = None
supabase_client = None
llm_client: ChatOpenAI | None = None
splitter_instance: RecursiveCharacterTextSplitter | None = None
redis_client = None


def get_embeddings() -> OpenAIEmbeddings:
    global embeddings_cache
    if embeddings_cache is None:
        embeddings_cache = OpenAIEmbeddings(model="text-embedding-3-small")
    return embeddings_cache


def get_supabase():
    global supabase_client
    if supabase_client is None:
        supabase_client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_KEY"),
        )
    return supabase_client


def get_llm() -> ChatOpenAI:
    global llm_client
    if llm_client is None:
        llm_client = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    return llm_client


def get_splitter() -> RecursiveCharacterTextSplitter:
    global splitter_instance
    if splitter_instance is None:
        splitter_instance = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    return splitter_instance


def get_redis():
    global redis_client
    if redis_client is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        redis_client = redis.from_url(url, decode_responses=True)
    return redis_client


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.aclose()
        redis_client = None
