from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.status import status

router = APIRouter(tags=["status"])


@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    return status(db)
