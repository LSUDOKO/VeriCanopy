from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.explain import explain

router = APIRouter(prefix="/projects", tags=["explain"])


@router.get("/{pid}/periods/{period}/explain")
def explain_period(pid: int, period: int, db: Session = Depends(get_db)):
    """Deterministic, model-faithful explanation of a period's integrity score (no LLM)."""
    out = explain(db, pid, period)
    if out is None:
        raise HTTPException(status_code=404, detail="project not found")
    return out
