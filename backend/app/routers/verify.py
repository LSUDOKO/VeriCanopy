from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import VerifyPQIn
from app.services.verify import verify_pq

router = APIRouter(prefix="/verify", tags=["verify"])


@router.post("/pq")
def pq(body: VerifyPQIn, db: Session = Depends(get_db)):
    return verify_pq(db, manifest=body.manifest, manifest_cid=body.manifest_cid)
