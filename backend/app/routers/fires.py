from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project
from app.services.fires import fires_for

router = APIRouter(prefix="/projects", tags=["fires"])


@router.get("/{pid}/fires")
def fires(pid: int, days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    p = db.get(Project, pid)
    if not p or not p.geometry:
        raise HTTPException(status_code=404, detail="project not found")
    return fires_for(pid, p.geometry, days)
