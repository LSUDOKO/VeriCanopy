from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.chain import explorer_tx
from app.db import get_db
from app.models import Project, Retirement, Vintage

router = APIRouter(prefix="/retirements", tags=["retirements"])


def _row(db: Session, r: Retirement) -> dict:
    v = db.get(Vintage, r.token_id)
    p = db.get(Project, v.project_id) if v else None
    return {
        "id": r.id,
        "serial": f"VC-{r.id:06d}",
        "holder": r.holder,
        "token_id": r.token_id,
        "amount": r.amount,
        "beneficiary": r.beneficiary,
        "score_at_retirement_bps": r.score_at_retirement,
        "ts": r.ts,
        "tx_hash": r.tx_hash,
        "tx_url": explorer_tx(r.tx_hash),
        "project_id": v.project_id if v else None,
        "project_name": p.name if p else None,
        "country": p.country if p else None,
        "vintage": v.vintage if v else None,
    }


@router.get("")
def list_retirements(holder: str | None = None, limit: int = 100, db: Session = Depends(get_db)):
    q = select(Retirement).order_by(Retirement.id.desc()).limit(min(limit, 500))
    if holder:
        q = q.where(Retirement.holder == holder.lower())
    return {"retirements": [_row(db, r) for r in db.execute(q).scalars().all()]}


@router.get("/{rid}")
def get_retirement(rid: int, db: Session = Depends(get_db)):
    r = db.get(Retirement, rid)
    if not r:
        raise HTTPException(status_code=404, detail="retirement not found")
    return _row(db, r)
