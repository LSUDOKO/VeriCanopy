"""Marketplace read API: open listings, trades, and per-address activity (indexed from the Marketplace contract)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Listing, Project, Submission, Trade

router = APIRouter(prefix="/market", tags=["market"])


def _score(db: Session, pid: int) -> int | None:
    s = (
        db.execute(
            select(Submission)
            .where(Submission.project_id == pid, Submission.status == "Finalized")
            .order_by(Submission.period.desc())
        )
        .scalars()
        .first()
    )
    return s.score_bps if s else None


def _row(db: Session, li: Listing, projects: dict[int, Project]) -> dict:
    p = projects.get(li.project_id)
    return {
        "id": li.id,
        "seller": li.seller,
        "token_id": li.token_id,
        "project_id": li.project_id,
        "project_name": p.name if p else None,
        "country": p.country if p else None,
        "project_status": p.status if p else None,
        "integrity_status": p.integrity_status if p else None,
        "score_bps": _score(db, li.project_id),
        "vintage": li.vintage,
        "amount_listed": li.amount_listed,
        "amount_left": li.amount_left,
        "price_per_unit_wei": li.price_per_unit_wei,
        "active": li.active,
        "tx_hash": li.tx_hash,
    }


@router.get("/listings")
def listings(active: bool = True, project_id: int | None = None, db: Session = Depends(get_db)):
    q = select(Listing).order_by(Listing.id.desc())
    if active:
        q = q.where(Listing.active.is_(True))
    if project_id is not None:
        q = q.where(Listing.project_id == project_id)
    rows = db.execute(q).scalars().all()
    projects = {p.id: p for p in db.execute(select(Project)).scalars().all()}
    return {"listings": [_row(db, li, projects) for li in rows]}


@router.get("/trades")
def trades(limit: int = 50, db: Session = Depends(get_db)):
    rows = db.execute(select(Trade).order_by(Trade.id.desc()).limit(min(limit, 200))).scalars().all()
    return {
        "trades": [
            {
                "id": t.id,
                "listing_id": t.listing_id,
                "buyer": t.buyer,
                "token_id": t.token_id,
                "amount": t.amount,
                "paid_wei": t.paid_wei,
                "fee_wei": t.fee_wei,
                "tx_hash": t.tx_hash,
                "ts": t.ts,
            }
            for t in rows
        ]
    }


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    open_units = (
        db.scalar(select(func.coalesce(func.sum(Listing.amount_left), 0)).where(Listing.active.is_(True)))
        or 0
    )
    traded = db.scalar(select(func.coalesce(func.sum(Trade.amount), 0))) or 0
    volume = sum(int(t.paid_wei) for t in db.execute(select(Trade)).scalars().all())
    return {
        "open_units": int(open_units),
        "units_traded": int(traded),
        "volume_wei": str(volume),
        "listings": db.scalar(select(func.count(Listing.id)).where(Listing.active.is_(True))) or 0,
    }


@router.get("/activity/{address}")
def activity(address: str, db: Session = Depends(get_db)):
    addr = address.lower()
    projects = {p.id: p for p in db.execute(select(Project)).scalars().all()}
    sells = (
        db.execute(select(Listing).where(Listing.seller == addr).order_by(Listing.id.desc())).scalars().all()
    )
    buys = db.execute(select(Trade).where(Trade.buyer == addr).order_by(Trade.id.desc())).scalars().all()
    return {
        "listings": [_row(db, li, projects) for li in sells],
        "purchases": [
            {
                "id": t.id,
                "listing_id": t.listing_id,
                "token_id": t.token_id,
                "amount": t.amount,
                "paid_wei": t.paid_wei,
                "tx_hash": t.tx_hash,
                "ts": t.ts,
            }
            for t in buys
        ],
    }
