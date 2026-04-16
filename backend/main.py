import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.profile import router as profile_router
from routes.documents import router as documents_router
from routes.instructions import router as instructions_router
from routes.generate import router as generate_router
from routes.history import router as history_router

app = FastAPI(title="ResumeTailor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(profile_router, prefix="/profile", tags=["Profile"])
app.include_router(documents_router, prefix="/documents", tags=["Documents"])
app.include_router(instructions_router, prefix="/instructions", tags=["Instructions"])
app.include_router(generate_router, tags=["Generate"])
app.include_router(history_router, prefix="/generations", tags=["History"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
