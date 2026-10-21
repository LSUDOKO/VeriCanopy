from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Holding, Notification, Project, Retirement, Submission, Vintage

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/{address}")
def portfolio(address: str, db: Session = Depends(get_db)):
    addr = address.lower()
    holdings = db.execute(select(Holding).where(Holding.holder == addr, Holding.amount > 0)).scalars().all()
    rets = (
        db.execute(select(Retirement).where(Retirement.holder == addr).order_by(Retirement.id.desc()))
        .scalars()
        .all()
    )
    notes = (
        db.execute(select(Notification).where(Notification.address == addr).order_by(Notification.id.desc()))
        .scalars()
        .all()
    )
    projects = {p.id: p for p in db.execute(select(Project)).scalars().all()}
    vintages = {v.token_id: v for v in db.execute(select(Vintage)).scalars().all()}

    def score_now(pid: int) -> int | None:
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

    def pid_of(token_id: str) -> int:
        return int(token_id) >> 16

    return {
        "address": addr,
        "holdings": [
            {
                "token_id": h.token_id,
                "amount": h.amount,
                "project_id": pid_of(h.token_id),
                "project_name": projects.get(pid_of(h.token_id)).name
                if pid_of(h.token_id) in projects
                else None,
                "project_status": projects.get(pid_of(h.token_id)).status
                if pid_of(h.token_id) in projects
                else None,
                "vintage": vintages[h.token_id].vintage
                if h.token_id in vintages
                else int(h.token_id) & 0xFFFF,
                "score_now": score_now(pid_of(h.token_id)),
            }
            for h in holdings
        ],
        "retirements": [
            {
                "id": r.id,
                "token_id": r.token_id,
                "project_id": pid_of(r.token_id),
                "project_name": projects.get(pid_of(r.token_id)).name
                if pid_of(r.token_id) in projects
                else None,
                "amount": r.amount,
                "beneficiary": r.beneficiary,
                "score_at_retirement": r.score_at_retirement,
                "score_now": score_now(pid_of(r.token_id)),
                "ts": r.ts,
                "tx_hash": r.tx_hash,
            }
            for r in rets
        ],
        "notifications": [
            {
                "id": n.id,
                "kind": n.kind,
                "payload": n.payload,
                "created_at": n.created_at.isoformat() if n.created_at else None,
                "read": n.read_at is not None,
            }
            for n in notes
        ],
    }
