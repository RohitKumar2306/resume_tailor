import os
import logging
import traceback

from dotenv import load_dotenv

load_dotenv()

# Startup env validation
REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FERNET_KEY"]
missing = [v for v in REQUIRED_ENV if not os.getenv(v)]
if missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

if not os.getenv("FRONTEND_URL"):
    logging.warning(
        "FRONTEND_URL is not set — CORS will default to http://localhost:5173. "
        "Set this to your Vercel URL in production."
    )

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routes.profile import router as profile_router
from routes.documents import router as documents_router
from routes.instructions import router as instructions_router
from routes.generate import router as generate_router
from routes.history import router as history_router

logger = logging.getLogger("resumetailor")

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ResumeTailor API")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Generation limit reached. Maximum 10 per hour."},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in err.get("loc", [])),
            "message": err.get("msg", ""),
        })
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request", "errors": errors},
    )


@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s\n%s", str(exc), traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred"},
    )


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
