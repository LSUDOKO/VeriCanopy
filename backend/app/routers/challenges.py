from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Challenge, Submission

router = APIRouter(prefix="/challenges", tags=["challenges"])


@router.get("")
def list_challenges(status: str | None = None, db: Session = Depends(get_db)):
    q = select(Challenge).order_by(Challenge.id.desc())
    if status:
        q = q.where(Challenge.outcome == status)
    rows = db.execute(q).scalars().all()
    subs = {s.id: s for s in db.execute(select(Submission)).scalars().all()}
    return {
        "challenges": [
            {
                "id": c.id,
                "submission_id": c.submission_id,
                "project_id": subs[c.submission_id].project_id if c.submission_id in subs else None,
                "period": subs[c.submission_id].period if c.submission_id in subs else None,
                "challenger": c.challenger,
                "bond": c.bond,
                "reason": c.reason,
                "evidence_cid": c.evidence_cid,
                "votes_uphold": c.votes_uphold,
                "votes_reject": c.votes_reject,
                "deadline": c.deadline,
                "outcome": c.outcome,
                "tx_hash": c.tx_hash,
            }
            for c in rows
        ]
    }
