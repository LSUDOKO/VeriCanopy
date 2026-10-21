from __future__ import annotations

from fastapi import Header, HTTPException

from app.config import settings


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if settings.admin_api_key == "change-me" and settings.chain_id != 31337:
        raise HTTPException(status_code=503, detail="ADMIN_API_KEY not configured")
    if not x_api_key or x_api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="invalid or missing X-API-Key")
