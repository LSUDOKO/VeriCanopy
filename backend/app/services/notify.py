"""Buyer notifications (F5): holders and retirees of a project get in-app notices on reversal/impairment."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Challenge, Holding, Notification, Project, Retirement, Submission
from app.services.webhooks import deliver


def _of_project(token_id: str, project_id: int) -> bool:
    return (int(token_id) >> 16) == project_id  # token ids are stored as decimal strings; compare numerically


def _audience(db: Session, project_id: int) -> set[str]:
    holders = [
        h.holder
        for h in db.execute(select(Holding).where(Holding.amount > 0)).scalars().all()
        if _of_project(h.token_id, project_id)
    ]
    retirees = [
        r.holder
        for r in db.execute(select(Retirement)).scalars().all()
        if _of_project(r.token_id, project_id)
    ]
    return set(holders) | set(retirees)


def _impacted_retirements(db: Session, project_id: int, holder: str) -> list[int]:
    return [
        r.id
        for r in db.execute(select(Retirement).where(Retirement.holder == holder)).scalars().all()
        if _of_project(r.token_id, project_id)
    ]


def _name(db: Session, project_id: int) -> str:
    p = db.get(Project, project_id)
    return p.name if p and p.name else f"Project #{project_id}"


def on_reversal(
    db: Session, project_id: int, period: int, tonnes: int, covered: int, shortfall: int, tx: str
) -> int:
    deliver(
        db,
        "project.reversal",
        project_id,
        {"period": period, "tonnes": tonnes, "covered": covered, "shortfall": shortfall, "tx_hash": tx},
    )
    n = 0
    for addr in _audience(db, project_id):
        db.add(
            Notification(
                address=addr,
                kind="reversal",
                payload={
                    "project_id": project_id,
                    "project_name": _name(db, project_id),
                    "period": period,
                    "tonnes": tonnes,
                    "covered": covered,
                    "shortfall": shortfall,
                    "impacted_retirements": _impacted_retirements(db, project_id, addr),
                    "tx_hash": tx,
                    "message": f"{_name(db, project_id)} lost {tonnes:,} tCO2e in period {period}. "
                    + (
                        f"{covered:,} t burned from the buffer pool; shortfall {shortfall:,} t — project frozen."
                        if shortfall
                        else f"{covered:,} t burned from the buffer pool."
                    ),
                },
            )
        )
        n += 1
    return n


def on_score_finalized(db: Session, project_id: int, period: int, score_bps: int, tx: str) -> None:
    # in-app impairment notices are sent from IntegrityUpdated (status transition); webhooks get every finalisation
    deliver(db, "score.finalized", project_id, {"period": period, "score_bps": score_bps, "tx_hash": tx})


def on_integrity_status(db: Session, project_id: int, status: str, score_bps: int, tx: str) -> int:
    deliver(db, "project.status", project_id, {"status": status, "score_bps": score_bps, "tx_hash": tx})
    n = 0
    for addr in _audience(db, project_id):
        db.add(
            Notification(
                address=addr,
                kind="status",
                payload={
                    "project_id": project_id,
                    "project_name": _name(db, project_id),
                    "status": status,
                    "score_bps": score_bps,
                    "impacted_retirements": _impacted_retirements(db, project_id, addr),
                    "tx_hash": tx,
                    "message": f"{_name(db, project_id)} is now {status} (integrity {score_bps / 100:.1f}).",
                },
            )
        )
        n += 1
    return n


def on_challenge_resolved(db: Session, c: Challenge) -> None:
    s = db.get(Submission, c.submission_id)
    if not s:
        return
    deliver(
        db,
        "challenge.resolved",
        s.project_id,
        {"challenge_id": c.id, "submission_id": c.submission_id, "outcome": c.outcome},
    )
    for addr in {c.challenger, s.oracle or ""} - {""}:
        db.add(
            Notification(
                address=addr,
                kind="challenge",
                payload={
                    "challenge_id": c.id,
                    "submission_id": c.submission_id,
                    "project_id": s.project_id,
                    "outcome": c.outcome,
                    "message": f"Challenge #{c.id} on submission #{c.submission_id} was {c.outcome.lower()}.",
                },
            )
        )
