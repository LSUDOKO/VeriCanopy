"""VeriCanopy API (09 §3). `uvicorn app.main:app --reload`."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.db import init_db
from app.routers import (
    challenges,
    evidence,
    jobs,
    metadata,
    misc,
    portfolio,
    projects,
    stats,
    submissions,
    verify,
)

limiter = Limiter(key_func=get_remote_address, default_limits=["240/minute"])
app = FastAPI(title="VeriCanopy API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()] + ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (projects, submissions, challenges, portfolio, stats, metadata, verify, jobs, evidence):
    app.include_router(r.router, prefix="/api/v1")
app.include_router(misc.router, prefix="/api/v1")
app.include_router(misc.router)  # /healthz at root too


@app.middleware("http")
async def _rate_limit(request: Request, call_next):
    return await call_next(request)


@app.on_event("startup")
def _startup() -> None:
    init_db()
