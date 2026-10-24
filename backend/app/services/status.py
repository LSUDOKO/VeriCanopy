"""Operational status: DB, RPC + indexer lag, Earth Engine, PQ key, keeper balance, content store."""

from __future__ import annotations

import os
import time
from pathlib import Path

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.chain import load_deployments, w3
from app.config import settings
from app.models import Blob, Challenge, IndexerState, Job, Submission
from app.services.fires import ee_available


def _timed(fn):
    t = time.perf_counter()
    try:
        return fn(), None, round((time.perf_counter() - t) * 1000)
    except Exception as e:  # report, never raise: a status page must render on a bad day
        return None, str(e)[:160], round((time.perf_counter() - t) * 1000)


def status(db: Session) -> dict:
    checks: dict[str, dict] = {}

    _, err, ms = _timed(lambda: db.execute(text("select 1")).scalar())
    checks["database"] = {"ok": err is None, "latency_ms": ms, "error": err}

    head, err, ms = _timed(lambda: w3().eth.block_number)
    cid, _, _ = _timed(lambda: w3().eth.chain_id)
    st = db.execute(select(IndexerState)).scalars().first()
    indexed = st.last_block if st else None
    lag = (head - indexed) if (head is not None and indexed is not None) else None
    checks["rpc"] = {"ok": err is None and (cid is None or cid == settings.chain_id), "latency_ms": ms, "error": err,
                     "chain_id": cid, "expected_chain_id": settings.chain_id, "head_block": head}
    checks["indexer"] = {"ok": indexed is not None and (lag is None or lag < 2000), "indexed_block": indexed,
                         "lag_blocks": lag, "warn": lag is not None and lag >= 200}

    checks["earth_engine"] = {"ok": ee_available(), "configured": ee_available(),
                              "project": os.environ.get("EE_PROJECT") or None}

    pq = bool(os.environ.get("PQ_SECRET_KEY_B64")) or Path(settings.pq_secret_key_path).exists()
    checks["pq_signer"] = {"ok": pq, "algorithm": "ML-DSA-65"}

    keeper = None
    key = settings.keeper_private_key or settings.oracle_private_key
    if key:
        try:
            keeper = w3().eth.account.from_key(key).address
        except Exception:
            keeper = None
    bal, berr, _ = _timed(lambda: w3().eth.get_balance(keeper)) if keeper else (None, None, 0)
    eth = bal / 1e18 if bal is not None else None
    checks["keeper"] = {"ok": eth is not None and eth > 0.001, "address": keeper, "balance_eth": eth, "error": berr}

    blobs = db.scalar(select(func.count(Blob.cid))) or 0
    size = db.scalar(select(func.coalesce(func.sum(Blob.size), 0))) or 0
    checks["content_store"] = {"ok": True, "blobs": int(blobs), "bytes": int(size)}

    last_job = db.execute(select(Job).order_by(Job.created_at.desc())).scalars().first()
    last_fin = db.execute(select(Submission).where(Submission.status == "Finalized").order_by(Submission.id.desc())).scalars().first()
    last_ch = db.execute(select(Challenge).order_by(Challenge.id.desc())).scalars().first()
    workers = {
        "last_oracle_job": {"id": last_job.id, "kind": last_job.kind, "status": last_job.status,
                            "at": last_job.created_at.isoformat()} if last_job else None,
        "last_finalized_submission": {"id": last_fin.id, "project_id": last_fin.project_id, "period": last_fin.period,
                                      "tx": last_fin.finalized_tx} if last_fin else None,
        "last_challenge": {"id": last_ch.id, "outcome": last_ch.outcome} if last_ch else None,
    }
    try:
        dep = load_deployments()
        contracts = dep.get("contracts", {})
    except Exception:
        contracts = {}
    core = ["database", "rpc", "indexer", "pq_signer"]
    overall = "operational" if all(checks[c]["ok"] for c in core) else "degraded"
    if not checks["database"]["ok"]:
        overall = "outage"
    return {"status": overall, "checked_at": int(time.time()), "chain_id": settings.chain_id,
            "explorer_url": settings.explorer_url, "checks": checks, "workers": workers, "contracts": contracts}
