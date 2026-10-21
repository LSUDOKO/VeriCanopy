import json
from pathlib import Path

import numpy as np
import pytest
from vericanopy_ai.model import (
    MLP,
    expert_score,
    export_onnx,
    model_hash,
    predict_onnx,
    sample_features,
    train,
)

from vericanopy_ai.config import FEATURE_NAMES

ART = Path(__file__).resolve().parents[1] / "zk" / "artifacts" / "model.onnx"


def test_expert_score_hand_example():
    x = np.zeros(16)
    x[0] = 1.0
    x[1], x[2] = 0.9, 1.1  # ci width 0.2 -> certainty 0.9
    x[3] = 0.1
    x[4] = 1.0
    x[10] = 1.0
    x[11] = 1.0
    assert abs(expert_score(x) - 0.9) < 1e-9
    x[8] = 0.1  # reversal_fraction*5=0.5 -> reversal 0.7
    x[9] = 0.5  # fire -> 0.7-0.15=0.55
    assert abs(expert_score(x) - 0.9 * 0.55) < 1e-9


def test_mlp_trains_and_is_monotone():
    mlp, rep = train(n=20_000, epochs=30, seed=0)
    assert rep["mae_holdout"] < 0.05
    rng = np.random.default_rng(3)
    X = sample_features(500, rng)
    base = mlp.predict(X)
    up = X.copy()
    up[:, 0] = np.minimum(up[:, 0] + 0.2, 1.5)
    assert (mlp.predict(up) >= base - 1e-3).mean() > 0.95
    rev = X.copy()
    rev[:, 8] = np.minimum(rev[:, 8] + 0.2, 1.0)
    assert (mlp.predict(rev) <= base + 1e-3).mean() > 0.95


def test_onnx_matches_numpy(tmp_path):
    mlp = MLP.random(seed=1)
    p = tmp_path / "m.onnx"
    export_onnx(mlp, p)
    X = sample_features(50, np.random.default_rng(0))
    a = mlp.predict(X)
    b = np.array([predict_onnx(p, x) for x in X])
    assert np.max(np.abs(a - b)) < 1e-5
    assert model_hash(p).startswith("0x") and len(model_hash(p)) == 66


@pytest.mark.skipif(not ART.exists(), reason="trained model artifact not committed yet")
def test_committed_model_report_exists():
    rep = json.loads((ART.parent / "training_report.json").read_text())
    assert rep["mae_holdout"] < 0.03
    assert rep["model_hash"] == model_hash(ART)
    assert rep["feature_names"] == FEATURE_NAMES
