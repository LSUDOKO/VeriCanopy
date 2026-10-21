from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import REPO_ROOT, settings
from app.db import get_db
from app.models import IndexerState

router = APIRouter(tags=["misc"])


@router.get("/healthz")
def healthz(db: Session = Depends(get_db)):
    st = db.execute(IndexerState.__table__.select()).first()
    return {
        "ok": True,
        "chain_id": settings.chain_id,
        "indexed_block": st.last_block if st else None,
        "zk_mode": settings.zk_mode,
    }


@router.get("/deployments")
def deployments():
    try:
        return json.loads(
            Path(
                settings.deployments_file
                if Path(settings.deployments_file).is_absolute()
                else REPO_ROOT / settings.deployments_file
            ).read_text()
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail="no deployments file; run `make deploy`") from e


@router.get("/benchmarks")
def benchmarks():
    out = {}
    for name in ("zk_benchmarks", "pq_benchmarks", "training_report"):
        p = REPO_ROOT / "ai" / "zk" / "artifacts" / f"{name}.json"
        out[name] = json.loads(p.read_text()) if p.exists() else None
    gas = REPO_ROOT / "docs" / "gas-report.txt"
    out["gas_report"] = gas.read_text() if gas.exists() else None
    return out


@router.get("/demo/timeline")
def demo_timeline():
    """Precomputed per-year pipeline outputs for Demo Mode (`make demo-data`)."""
    p = REPO_ROOT / "data" / "demo" / "outputs" / "timeline.json"
    if not p.exists():
        return {"available": False, "reason": "run `make demo-data`"}
    return json.loads(p.read_text())


@router.post("/webhooks")
def webhooks():
    raise HTTPException(
        status_code=501, detail="webhooks are a P1 feature (see docs/spec/02_FEATURES_SPEC.md F12)"
    )


@router.post("/projects/{pid}/pdd")
def pdd(pid: int):
    raise HTTPException(status_code=501, detail="Claim Gap Analyser (F8) is a P1 feature")
