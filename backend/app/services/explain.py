"""Deterministic score explanation: per-feature attribution of the ONNX scorer, no LLM involved.

Attribution is baseline-delta: for each fv1 feature, the stored vector is re-scored with that feature
replaced by its dataset mean (from the same synthetic distribution the model was distilled on). The
score drop/rise is the feature's contribution. Deterministic for a given manifest + model hash.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session
from vericanopy_ai.config import FEATURE_NAMES
from vericanopy_ai.model import ARTIFACT_DIR, model_hash, predict_onnx, sample_features

from app import ipfs
from app.chain import explorer_tx
from app.config import REPO_ROOT
from app.models import Challenge, Project, Submission

ONNX = ARTIFACT_DIR / "model.onnx"

# feature -> (label, unit formatter, "higher is better" sign)
_LABELS: dict[str, tuple[str, str]] = {
    "support_ratio": ("Observed vs claimed avoided loss", "ratio"),
    "support_ci_low": ("Support ratio, 5th percentile (bootstrap)", "ratio"),
    "support_ci_high": ("Support ratio, 95th percentile (bootstrap)", "ratio"),
    "max_smd": ("Covariate imbalance after matching (max SMD)", "smd"),
    "matched_fraction": ("Project pixels with a matched control twin", "pct"),
    "project_loss_rate": ("Annual canopy loss inside the parcel", "pct100"),
    "control_loss_rate": ("Annual canopy loss in matched controls", "pct100"),
    "leakage_delta": ("Leakage: loss shift into the surrounding ring", "signed"),
    "reversal_fraction": ("Forest lost since the last period (reversal)", "pct"),
    "fire_fraction": ("Parcel burned this period (MODIS MCD64A1)", "pct"),
    "cloud_free_fraction": ("Cloud-free Sentinel-2 observations", "pct"),
    "sar_optical_agreement": ("Sentinel-1 radar agrees with optical change", "pct"),
    "biomass_trend": ("GEDI biomass trend", "signed"),
    "years_since_start": ("Years since crediting start", "years30"),
    "log_claim_ratio": ("log(claimed / observed avoided loss)", "signed"),
    "data_freshness": ("Age of newest observation", "years"),
}

DATA_SOURCES = [
    {"id": "UMD/hansen/global_forest_change_2025_v1_13", "name": "Hansen Global Forest Change", "role": "annual canopy loss year"},
    {"id": "COPERNICUS/S2_SR_HARMONIZED", "name": "Sentinel-2 L2A", "role": "NDVI change, cloud-free fraction"},
    {"id": "COPERNICUS/S1_GRD", "name": "Sentinel-1 GRD", "role": "radar backscatter change (cloud-independent)"},
    {"id": "LARSE/GEDI/GEDI04_B_002", "name": "GEDI L4B", "role": "above-ground biomass"},
    {"id": "MODIS/061/MCD64A1", "name": "MODIS Burned Area", "role": "fire detection"},
    {"id": "GOOGLE/DYNAMICWORLD/V1", "name": "Dynamic World", "role": "tree-cover probability"},
    {"id": "ESA/WorldCover/v200", "name": "ESA WorldCover", "role": "land-cover mask"},
]


def _fmt(kind: str, v: float) -> str:
    if kind == "pct":
        return f"{v * 100:.1f}%"
    if kind == "pct100":
        return f"{v:.2f}%/yr"
    if kind == "ratio":
        return f"{v:.2f}×"
    if kind == "smd":
        return f"{v:.3f}"
    if kind == "years30":
        return f"{v * 30:.0f} yr"
    if kind == "years":
        return f"{v * 365:.0f} days"
    return f"{v:+.3f}"


@lru_cache(maxsize=1)
def baseline() -> list[float]:
    """Dataset mean of the distillation distribution (seeded, so identical on every machine)."""
    return [float(x) for x in sample_features(50_000, np.random.default_rng(0)).mean(axis=0)]


def attribute(features: list[float], onnx: Path = ONNX) -> dict[str, Any]:
    x = np.asarray(features, dtype=float)
    base = np.asarray(baseline())
    score = predict_onnx(onnx, x)
    rows = []
    for i, name in enumerate(FEATURE_NAMES):
        y = x.copy()
        y[i] = base[i]
        delta = score - predict_onnx(onnx, y)  # >0: this feature's actual value helps the score
        label, kind = _LABELS[name]
        rows.append(
            {
                "feature": name,
                "label": label,
                "value": float(x[i]),
                "display": _fmt(kind, float(x[i])),
                "baseline": float(base[i]),
                "baseline_display": _fmt(kind, float(base[i])),
                "contribution": round(float(delta), 5),
            }
        )
    rows.sort(key=lambda r: -abs(r["contribution"]))
    return {"score": float(score), "drivers": rows}


def _sentence(r: dict[str, Any], diag: dict[str, Any]) -> str:
    f = r["feature"]
    if f == "project_loss_rate":
        return f"Canopy loss inside the parcel: {r['display']} vs {diag.get('control_display', 'controls')} in matched twins."
    if f == "support_ratio":
        return f"Observed avoided loss is {r['display']} the developer's claim (1.00× = claim fully supported)."
    if f == "leakage_delta":
        d = r["value"]
        return ("No loss displacement into the surrounding ring." if abs(d) < 0.02 else f"Loss in the 10–50 km ring shifted by {d:+.2f} after crediting started (positive = leakage).")
    if f == "fire_fraction":
        return "No burned area detected this period." if r["value"] == 0 else f"{r['display']} of the parcel burned this period."
    if f == "reversal_fraction":
        return "No reversal: forest standing last period is still standing." if r["value"] < 0.001 else f"{r['display']} of previously credited forest was lost."
    if f == "max_smd":
        return f"Controls are {'well' if r['value'] < 0.1 else 'moderately' if r['value'] < 0.25 else 'poorly'} balanced (max SMD {r['display']})."
    if f == "data_freshness":
        return f"Newest observation is {r['display']} old."
    better = "raises" if r["contribution"] > 0 else "lowers"
    return f"{r['label']}: {r['display']} (dataset typical {r['baseline_display']}); this {better} the score by {abs(r['contribution']):.3f}."


def load_manifest(db: Session, project: Project, period: int) -> dict[str, Any] | None:
    f = REPO_ROOT / "data" / "outputs" / (project.demo_id or str(project.id)) / str(period) / "manifest.signed.json"
    if not f.exists():
        f = f.with_name("manifest.json")
    if f.exists():
        return json.loads(f.read_text())
    return ipfs.get_named_json(f"manifest/{project.id}/{period}")


def explain(db: Session, project_id: int, period: int) -> dict[str, Any] | None:
    p = db.get(Project, project_id)
    if not p:
        return None
    manifest = load_manifest(db, p, period)
    if not manifest or not manifest.get("features"):
        return {"available": False, "reason": f"no manifest for project {project_id} period {period}"}
    sub = (
        db.execute(
            select(Submission)
            .where(Submission.project_id == project_id, Submission.period == period)
            .order_by(Submission.id.desc())
        )
        .scalars()
        .first()
    )
    att = attribute(manifest["features"])
    diag = dict(manifest.get("diagnostics") or {})
    ctrl = next((r for r in att["drivers"] if r["feature"] == "control_loss_rate"), None)
    if ctrl:
        diag["control_display"] = ctrl["display"]
    for r in att["drivers"]:
        r["sentence"] = _sentence(r, diag)
    pos = [r for r in att["drivers"] if r["contribution"] > 0.002][:4]
    neg = [r for r in att["drivers"] if r["contribution"] < -0.002][:4]
    score_bps = int(manifest.get("score_bps") or round(att["score"] * 10_000))
    chal = (
        db.execute(select(Challenge).where(Challenge.submission_id == sub.id)).scalars().all() if sub else []
    )
    status = sub.status if sub else "not submitted"
    summary = (
        f"{p.name or f'Project {project_id}'} scored {score_bps / 100:.1f}/100 for {period}. "
        + (f"Strongest support: {pos[0]['sentence']} " if pos else "")
        + (f"Main drag: {neg[0]['sentence']} " if neg else "No material negative drivers. ")
        + f"Submission is {status.lower()}"
        + (", zk proof verified on-chain" if sub and sub.proof_mode == "onchain" and sub.tx_hash else "")
        + (f", {len(chal)} challenge(s) on record." if chal else ".")
    )
    return {
        "available": True,
        "project_id": project_id,
        "project_name": p.name,
        "period": period,
        "score": round(att["score"], 4),
        "score_bps": score_bps,
        "model_hash": manifest.get("model_hash"),
        "model_hash_matches_artifact": ONNX.exists() and model_hash(ONNX) == manifest.get("model_hash"),
        "feature_version": manifest.get("feature_version"),
        "method": "baseline-delta attribution over the distilled 16-16-8-1 MLP; baseline = seeded dataset mean",
        "summary": summary,
        "positive_drivers": pos,
        "negative_drivers": neg,
        "drivers": att["drivers"],
        "data_sources": DATA_SOURCES if manifest.get("provenance") == "earth-engine" else [
            {"id": d.get("id"), "name": "Labelled fixture samples", "role": "synthetic test data"} for d in manifest.get("datasets", [])
        ],
        "provenance": manifest.get("provenance"),
        "date_ranges": manifest.get("date_ranges"),
        "created_at": manifest.get("created_at"),
        "proof": {
            "mode": sub.proof_mode if sub else None,
            "verified_onchain": bool(sub and sub.proof_mode == "onchain" and sub.tx_hash),
            "tx_hash": sub.tx_hash if sub else None,
            "tx_url": explorer_tx(sub.tx_hash) if sub else None,
            "status": status,
            "finalized_tx": sub.finalized_tx if sub else None,
        },
        "signature": {
            "algorithm": (manifest.get("signatures") or {}).get("algorithm"),
            "pq_key_id": (manifest.get("signatures") or {}).get("pq_key_id"),
            "manifest_sha256": (manifest.get("signatures") or {}).get("manifest_sha256"),
            "manifest_cid": sub.manifest_cid if sub else None,
        },
        "challenges": [{"id": c.id, "reason": c.reason, "outcome": c.outcome} for c in chal],
    }
