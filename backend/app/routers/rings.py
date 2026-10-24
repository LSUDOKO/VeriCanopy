from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project
from app.services.rings import ring_for

router = APIRouter(prefix="/projects", tags=["rings"])


@router.get("/{pid}/ring")
def ring(pid: int, km: float = Query(10.0, gt=0, le=100), db: Session = Depends(get_db)):
    p = db.get(Project, pid)
    if not p or not p.geometry:
        raise HTTPException(status_code=404, detail="project not found")
    return ring_for(pid, p.geometry, km)
