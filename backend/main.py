import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.clients import close_redis, get_redis
from app.chat.routes import router as chat_router
from app.upload.routes import router as upload_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        r = get_redis()
        await r.ping()
        print("Successfully connected to Redis!")
    except Exception as e:
        print(f"Warning: Could not connect to Redis: {e}")

    yield

    await close_redis()
    print("Closed Redis connection.")

app = FastAPI(
    title="Vector Vault AI",
    version="1.0.0",
    lifespan=lifespan
)

ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "https://vector-vault-ai.vercel.app").split(",")
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "vector-vault-ai",
        "version": "1.0.0",
        "docs_url": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(upload_router)
app.include_router(chat_router)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)