"""Score manifest (04 §8, schema vc-manifest/1) and canonical hashing (07 §3)."""

from __future__ import annotations

import hashlib
import json
import subprocess
from datetime import UTC, datetime
from typing import Any

SCHEMA = "vc-manifest/1"


def canonical(manifest: dict[str, Any]) -> bytes:
    """Sorted keys, no whitespace, UTF-8, `signatures` removed."""
    m = {k: v for k, v in manifest.items() if k != "signatures"}
    return json.dumps(m, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def manifest_sha256(manifest: dict[str, Any]) -> str:
    return "0x" + hashlib.sha256(canonical(manifest)).hexdigest()


def code_commit() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL, text=True
        ).strip()
    except Exception:
        return "unknown"


def build_manifest(
    *,
    project_id: str | int,
    period: int,
    geometry_sha256: str,
    h3_resolution: int,
    meta: dict[str, Any],
    cfg: dict[str, Any],
    features: list[float],
    model_hash: str,
    score_bps: int,
    reversal_tco2e: int,
    provisional: bool,
    feature_commitment: str | None = None,
    diagnostics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "project_id": project_id,
        "period": str(period),
        "geometry_sha256": geometry_sha256,
        "h3_resolution": h3_resolution,
        "provider": meta.get("provider"),
        "provenance": meta.get("provenance"),
        "datasets": meta.get("datasets", []),
        "date_ranges": meta.get("date_ranges", {}),
        "matching": {
            "ring_km": cfg["ring_km"],
            "n_t": cfg["n_t"],
            "n_c": cfg["n_c"],
            "seed": cfg["seed"],
            "caliper_sd": cfg["caliper_sd"],
            "bootstrap": cfg["bootstrap"],
            "covariates": cfg["covariates"],
        },
        "constants": {"carbon_fraction": cfg["carbon_fraction"], "forest_threshold": cfg["forest_threshold"]},
        "code_commit": code_commit(),
        "feature_version": "fv1",
        "features": features,
        "feature_commitment": feature_commitment,
        "model_hash": model_hash,
        "score_bps": score_bps,
        "reversal_tco2e": reversal_tco2e,
        "provisional": provisional,
        "diagnostics": diagnostics or {},
        "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "signatures": {},
    }
