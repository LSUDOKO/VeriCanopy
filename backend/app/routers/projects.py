from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import REPO_ROOT
from app.db import get_db
from app.models import Challenge, Project, Reversal, Submission, Vintage
from app.schemas import OverlapCheckIn
from app.services.overlap import overlap_check

router = APIRouter(prefix="/projects", tags=["projects"])


def _integrity(db: Session, pid: int) -> dict:
    fin = (
        db.execute(
            select(Submission)
            .where(Submission.project_id == pid, Submission.status == "Finalized")
            .order_by(Submission.period.desc())
        )
        .scalars()
        .first()
    )
    latest = (
        db.execute(select(Submission).where(Submission.project_id == pid).order_by(Submission.id.desc()))
        .scalars()
        .first()
    )
    return {
        "score_bps": fin.score_bps if fin else None,
        "last_period": fin.period if fin else None,
        "latest_submission": _sub(latest) if latest else None,
    }


def _sub(s: Submission) -> dict:
    return {
        "id": s.id,
        "project_id": s.project_id,
        "period": s.period,
        "score_bps": s.score_bps,
        "reversal_tonnes": s.reversal_tonnes,
        "feature_commitment": s.feature_commitment,
        "model_hash": s.model_hash,
        "manifest_hash": s.manifest_hash,
        "manifest_cid": s.manifest_cid,
        "pq_key_id": s.pq_key_id,
        "oracle": s.oracle,
        "stake": s.stake,
        "status": s.status,
        "window_end": s.window_end,
        "tx_hash": s.tx_hash,
        "finalized_tx": s.finalized_tx,
        "proof_mode": s.proof_mode,
    }


def _proj(db: Session, p: Project) -> dict:
    vintages = db.execute(select(Vintage).where(Vintage.project_id == p.id)).scalars().all()
    return {
        "id": p.id,
        "developer": p.developer,
        "name": p.name,
        "country": p.country,
        "geometry": p.geometry,
        "geometry_hash": p.geometry_hash,
        "h3_res": p.h3_res,
        "start_date": p.start_date,
        "claimed_baseline_bps": p.claimed_baseline_bps,
        "status": p.status,
        "metadata_uri": p.metadata_uri,
        "demo_id": p.demo_id,
        "cell_count": p.cell_count,
        "created_tx": p.created_tx,
        "integrity": _integrity(db, p.id),
        "vintages": [
            {
                "token_id": v.token_id,
                "vintage": v.vintage,
                "issued": v.issued,
                "buffer": v.buffer,
                "retired": v.retired,
                "burned": v.burned,
            }
            for v in vintages
        ],
    }


@router.get("")
def list_projects(
    status: str | None = None,
    min_score: int | None = Query(default=None, alias="minScore"),
    db: Session = Depends(get_db),
):
    q = select(Project).order_by(Project.id)
    if status:
        q = q.where(Project.status == status)
    out = [_proj(db, p) for p in db.execute(q).scalars().all()]
    if min_score is not None:
        out = [o for o in out if (o["integrity"]["score_bps"] or 0) >= min_score]
    return {"projects": out}


@router.post("/overlap-check")
def overlap(body: OverlapCheckIn, db: Session = Depends(get_db)):
    try:
        return overlap_check(db, body.geometry, body.h3_res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{pid}")
def get_project(pid: int, db: Session = Depends(get_db)):
    p = db.get(Project, pid)
    if not p:
        raise HTTPException(status_code=404, detail="project not found")
    return _proj(db, p)


@router.get("/{pid}/cells")
def cells(pid: int, db: Session = Depends(get_db)):
    """H3 cells of a project as GeoJSON (for the map overlay)."""
    from vericanopy_ai.h3cells import cells_to_geojson

    from app.models import ProjectCell

    rows = db.execute(select(ProjectCell.cell).where(ProjectCell.project_id == pid)).scalars().all()
    return {"project_id": pid, "count": len(rows), "geojson": cells_to_geojson([int(c) for c in rows])}


@router.get("/{pid}/history")
def history(pid: int, db: Session = Depends(get_db)):
    subs = (
        db.execute(select(Submission).where(Submission.project_id == pid).order_by(Submission.id))
        .scalars()
        .all()
    )
    revs = (
        db.execute(select(Reversal).where(Reversal.project_id == pid).order_by(Reversal.id)).scalars().all()
    )
    ch = (
        db.execute(select(Challenge).where(Challenge.submission_id.in_([s.id for s in subs] or [0])))
        .scalars()
        .all()
    )
    return {
        "submissions": [_sub(s) for s in subs],
        "reversals": [
            {
                "period": r.period,
                "tonnes": r.tonnes,
                "covered": r.covered,
                "shortfall": r.shortfall,
                "tx_hash": r.tx_hash,
            }
            for r in revs
        ],
        "challenges": [
            {
                "id": c.id,
                "submission_id": c.submission_id,
                "challenger": c.challenger,
                "bond": c.bond,
                "reason": c.reason,
                "evidence_cid": c.evidence_cid,
                "votes_uphold": c.votes_uphold,
                "votes_reject": c.votes_reject,
                "deadline": c.deadline,
                "outcome": c.outcome,
            }
            for c in ch
        ],
    }


@router.get("/{pid}/evidence")
def evidence(pid: int, period: int | None = None, db: Session = Depends(get_db)):
    """Twin-chart series from the pipeline output of the latest (or given) period."""
    p = db.get(Project, pid)
    if not p:
        raise HTTPException(status_code=404, detail="project not found")
    key = p.demo_id or str(pid)
    base = REPO_ROOT / "data" / "outputs" / key
    if period is None:
        periods = (
            sorted(int(d.name) for d in base.glob("*") if d.is_dir() and d.name.isdigit())
            if base.exists()
            else []
        )
        if not periods:
            return {"available": False, "reason": "no pipeline output for this project yet"}
        period = periods[-1]
    d = base / str(period)
    ev = d / "evidence.json"
    if not ev.exists():
        return {"available": False, "reason": f"no pipeline output for period {period}"}
    data = json.loads(ev.read_text())
    manifest = json.loads((d / "manifest.json").read_text()) if (d / "manifest.json").exists() else None
    data.update(
        {
            "available": True,
            "period": period,
            "project_id": pid,
            "tiles": {"before": None, "after": None},
            "manifest": manifest,
            "provenance": (manifest or {}).get("provenance"),
        }
    )
    return data


@router.get("/{pid}/manifest/{period}")
def manifest(pid: int, period: int, db: Session = Depends(get_db)):
    p = db.get(Project, pid)
    if not p:
        raise HTTPException(status_code=404, detail="project not found")
    f = Path(REPO_ROOT / "data" / "outputs" / (p.demo_id or str(pid)) / str(period) / "manifest.json")
    if not f.exists():
        raise HTTPException(status_code=404, detail="manifest not found")
    return json.loads(f.read_text())
