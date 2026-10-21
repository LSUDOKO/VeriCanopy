"""End-to-end scoring run: extract → match → features → ONNX score → manifest (04 §9 `score.run`)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from vericanopy_ai.config import OUTPUT_DIR, PipelineConfig
from vericanopy_ai.extract import Project, get_provider, load_demo_project
from vericanopy_ai.features import build_features
from vericanopy_ai.manifest import build_manifest
from vericanopy_ai.model import ARTIFACT_DIR, model_hash, predict_onnx


@dataclass
class ScoreResult:
    project_id: str | int
    period: int
    features: list[float]
    score: float
    score_bps: int
    reversal_tco2e: int
    manifest: dict[str, Any]
    out_dir: Path


def run(
    project: str | int | Project,
    period: int,
    cfg: PipelineConfig | None = None,
    out_dir: Path | None = None,
    onnx_path: Path | None = None,
) -> ScoreResult:
    cfg = cfg or PipelineConfig()
    proj = project if isinstance(project, Project) else load_demo_project(str(project))
    onnx_path = onnx_path or ARTIFACT_DIR / "model.onnx"
    out_dir = out_dir or OUTPUT_DIR / str(proj.id) / str(period)
    out_dir.mkdir(parents=True, exist_ok=True)

    samples = get_provider(cfg).sample(proj, period, cfg)
    fr = build_features(samples, proj, period, cfg)
    score = predict_onnx(onnx_path, fr.vector)
    score_bps = int(round(score * 10_000))
    manifest = build_manifest(
        project_id=proj.id,
        period=period,
        geometry_sha256=proj.geometry_hash,
        h3_resolution=cfg.h3_resolution,
        meta=samples.meta,
        cfg=cfg.to_manifest(),
        features=fr.vector,
        model_hash=model_hash(onnx_path),
        score_bps=score_bps,
        reversal_tco2e=fr.reversal_tco2e,
        provisional=fr.provisional,
        diagnostics=fr.diagnostics,
    )
    (out_dir / "features.json").write_text(
        json.dumps({"feature_version": "fv1", "features": fr.vector}, indent=1)
    )
    (out_dir / "score.json").write_text(
        json.dumps(
            {
                "project_id": proj.id,
                "period": period,
                "score": score,
                "score_bps": score_bps,
                "reversal_tco2e": fr.reversal_tco2e,
                "provisional": fr.provisional,
                "provider": samples.meta.get("provider"),
            },
            indent=1,
        )
    )
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
    # twin-chart series for the evidence viewer
    (out_dir / "evidence.json").write_text(json.dumps(_evidence(samples, proj, period), indent=1))
    return ScoreResult(proj.id, period, fr.vector, score, score_bps, fr.reversal_tco2e, manifest, out_dir)


def _evidence(samples, proj: Project, period: int) -> dict[str, Any]:
    """Forest-cover fraction per year (project vs controls) + fire fractions, for the TwinChart."""
    start = proj.start_year
    years = list(range(max(start - 5, 2001), period + 1))
    t, c = samples.treat, samples.ctrl

    def cover(df, y):
        ly = df["loss_year"].to_numpy()
        return float(((ly == 0) | (ly > y)).mean()) if len(df) else 0.0

    return {
        "years": years,
        "project_cover": [round(cover(t, y), 4) for y in years],
        "twin_cover": [round(cover(c, y), 4) for y in years],
        "fires": [{"year": y, "fraction": round(float((t["burned_year"] == y).mean()), 4)} for y in years],
        "n_treat": len(t),
        "n_ctrl": len(c),
        "provider": samples.meta.get("provider"),
    }
