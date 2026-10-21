from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import ipfs
from app.db import get_db
from app.models import Submission
from app.routers.projects import _sub

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.get("/{sid}")
def get_submission(sid: int, db: Session = Depends(get_db)):
    s = db.get(Submission, sid)
    if not s:
        raise HTTPException(status_code=404, detail="submission not found")
    out = _sub(s)
    out["manifest"] = ipfs.get_json(s.manifest_cid) if s.manifest_cid else None
    out["manifest_url"] = ipfs.gateway_url(s.manifest_cid) if s.manifest_cid else None
    return out
