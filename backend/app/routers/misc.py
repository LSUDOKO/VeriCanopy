from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import REPO_ROOT, settings
from app.db import get_db
from app.models import IndexerState
from app.schemas import WebhookIn

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


@router.post("/webhooks", status_code=201)
def register_webhook(body: WebhookIn, db: Session = Depends(get_db)):
    """Register a webhook (returns the HMAC secret once).
    Events: score.finalized, project.reversal, project.status, challenge.resolved."""
    import secrets as _secrets

    from app.models import Webhook

    if len(body.url) > 2000:
        raise HTTPException(status_code=400, detail="url too long")
    secret = _secrets.token_hex(32)
    w = Webhook(url=body.url, project_id=body.project_id, secret=secret, active=True)
    db.add(w)
    db.commit()
    return {
        "id": w.id,
        "url": w.url,
        "project_id": w.project_id,
        "secret": secret,
        "signature_header": "X-VeriCanopy-Signature",
        "events": ["score.finalized", "project.reversal", "project.status", "challenge.resolved"],
    }


@router.delete("/webhooks/{wid}")
def delete_webhook(wid: int, x_webhook_secret: str = Header(default=""), db: Session = Depends(get_db)):
    from app.models import Webhook

    w = db.get(Webhook, wid)
    if not w or w.secret != x_webhook_secret:
        raise HTTPException(status_code=404, detail="webhook not found")
    w.active = False
    db.commit()
    return {"ok": True}


@router.post("/projects/{pid}/pdd")
def pdd(pid: int):
    raise HTTPException(status_code=501, detail="Claim Gap Analyser (F8) is a P1 feature")
