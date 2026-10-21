import json
from pathlib import Path

import pytest
from vericanopy_ai.score import run

from vericanopy_ai.config import PipelineConfig

ART = Path(__file__).resolve().parents[1] / "zk" / "artifacts" / "model.onnx"
SNAP = Path(__file__).resolve().parent / "snapshots"


@pytest.mark.skipif(not ART.exists(), reason="model artifact missing")
def test_run_is_deterministic(tmp_path):
    cfg = PipelineConfig(bootstrap=10)
    r1 = run("A", 2024, cfg=cfg, out_dir=tmp_path / "1")
    r2 = run("A", 2024, cfg=cfg, out_dir=tmp_path / "2")
    assert r1.features == r2.features and r1.score_bps == r2.score_bps
    m = json.loads((tmp_path / "1" / "manifest.json").read_text())
    assert m["schema"] == "vc-manifest/1" and m["feature_version"] == "fv1"
    assert m["score_bps"] == r1.score_bps and len(m["features"]) == 16
    assert m["provider"] == "fixture"
    assert (tmp_path / "1" / "features.json").exists() and (tmp_path / "1" / "score.json").exists()


@pytest.mark.skipif(not ART.exists() or not SNAP.exists(), reason="snapshots missing")
@pytest.mark.parametrize("name", ["A", "B", "C"])
def test_demo_snapshots(name, tmp_path):
    snap = json.loads((SNAP / f"{name}_2024.json").read_text())
    r = run(name, 2024, out_dir=tmp_path)
    assert r.features == snap["features"]
    assert r.score_bps == snap["score_bps"]
