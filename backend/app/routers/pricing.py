from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.pricing import price_guide

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/price-guide")
def guide(db: Session = Depends(get_db)):
    return price_guide(db)
