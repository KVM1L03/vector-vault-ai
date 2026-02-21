from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
import uvicorn
from app.routes.upload import router as upload_router
from app.routes.chat import router as chat_router


app = FastAPI()

@app.get("/")
async def root():
    return {
        "message": "vector-vault-ai",
        "version": "1.0.0",
        "docs_url": "/docs",
    }

app.include_router(upload_router)
app.include_router(chat_router)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)