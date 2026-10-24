"""Model registry card: on-chain ModelRegistry entry vs the artifacts shipped in ai/zk/artifacts."""

from __future__ import annotations

import hashlib
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.chain import contracts, load_deployments
from app.config import REPO_ROOT
from app.db import get_db
from app.models import ModelVersion

router = APIRouter(tags=["model"])
ART = REPO_ROOT / "ai" / "zk" / "artifacts"

DATASETS = [
    {"name": "Hansen Global Forest Change v1.13 (2000-2025)", "id": "UMD/hansen/global_forest_change_2025_v1_13", "use": "tree cover 2000, annual loss year"},
    {"name": "Copernicus Sentinel-2 SR Harmonized", "id": "COPERNICUS/S2_SR_HARMONIZED", "use": "NDVI, cloud-free fraction, tiles"},
    {"name": "Copernicus Sentinel-1 GRD", "id": "COPERNICUS/S1_GRD", "use": "SAR backscatter, SAR/optical agreement"},
    {"name": "GEDI L4B gridded biomass", "id": "LARSE/GEDI/GEDI04_B_002", "use": "above-ground biomass covariate + trend"},
    {"name": "MODIS MCD64A1 burned area", "id": "MODIS/061/MCD64A1", "use": "fire fraction per year"},
    {"name": "Google Dynamic World", "id": "GOOGLE/DYNAMICWORLD/V1", "use": "trees probability"},
    {"name": "ESA WorldCover v200", "id": "ESA/WorldCover/v200", "use": "mask water / built-up"},
    {"name": "SRTM 30 m", "id": "USGS/SRTMGL1_003", "use": "elevation, slope covariates"},
    {"name": "Malaria Atlas accessibility to cities", "id": "projects/malariaatlasproject/assets/accessibility/accessibility_to_cities/2015_v1_0", "use": "travel-time covariate"},
    {"name": "NASA FIRMS", "id": "FIRMS", "use": "active fire detections (alerts)"},
]


def _json(name: str) -> dict | None:
    p = ART / name
    return json.loads(p.read_text()) if p.exists() else None


@router.get("/model")
def model(db: Session = Depends(get_db)):
    dep = load_deployments()
    model_hash = dep.get("params", {}).get("modelHash")
    onnx = ART / "model.onnx"
    artifact_hash = ("0x" + hashlib.sha256(onnx.read_bytes()).hexdigest()) if onnx.exists() else None
    vk = (ART / "vk.sha256").read_text().strip() if (ART / "vk.sha256").exists() else None
    chain: dict = {"model_hash": model_hash, "verifier": dep.get("contracts", {}).get("Verifier"),
                   "registry": dep.get("contracts", {}).get("ModelRegistry")}
    try:
        m = contracts(dep)["ModelRegistry"].functions.getModel(bytes.fromhex(model_hash[2:])).call()
        chain.update({"verifier": m[0], "artifacts_uri": m[1], "active": m[2], "feature_version": m[3],
                      "output_scale": m[4], "read_from": "chain"})
    except Exception as e:
        row = db.get(ModelVersion, model_hash) if model_hash else None
        chain.update({"read_from": "indexer" if row else "deployments", "error": str(e)[:120]})
        if row:
            chain.update({"verifier": row.verifier, "artifacts_uri": row.artifacts_uri, "active": row.active,
                          "output_scale": row.output_scale})
    training = _json("training_report.json") or {}
    zk = _json("zk_benchmarks.json") or {}
    pq = _json("pq_benchmarks.json") or {}
    settings_ = _json("settings.json") or {}
    return {
        "chain": chain,
        "artifact": {"onnx_sha256": artifact_hash, "vk_sha256": vk,
                     "matches_chain": bool(artifact_hash and model_hash and artifact_hash.lower() == model_hash.lower())},
        "training": training,
        "features": training.get("feature_names", []),
        "zk": {**zk, "scheme": "Halo2 + KZG (EZKL)", "run_args": settings_.get("run_args")},
        "pq": pq,
        "datasets": DATASETS,
        "params": dep.get("params", {}),
    }
