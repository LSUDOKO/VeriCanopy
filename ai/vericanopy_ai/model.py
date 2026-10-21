"""Scoring model (04 §7): transparent expert rule + distilled numpy MLP (16→16→8→1) exported to ONNX.

No PyTorch: training is plain numpy (Adam, MSE) and the ONNX graph is built with onnx.helper so the
artifact is tiny and the EZKL circuit stays small.
"""

from __future__ import annotations

import hashlib
import json
import platform
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

from vericanopy_ai.config import FEATURE_NAMES, FEATURE_VERSION

ARTIFACT_DIR = Path(__file__).resolve().parents[1] / "zk" / "artifacts"


def _clip(x, lo, hi):
    return np.clip(x, lo, hi)


def expert_score(x: np.ndarray) -> float:
    """Transparent scoring rule f*(x) from 04 §7.2 (vectorised over rows when x is 2-D)."""
    x = np.asarray(x, dtype=float)
    r, lo, hi, smd, mf = x[..., 0], x[..., 1], x[..., 2], x[..., 3], x[..., 4]
    leak, rev, fire, cloud, sar = x[..., 7], x[..., 8], x[..., 9], x[..., 10], x[..., 11]
    base = np.minimum(r, 1.0)
    certainty = 1 - _clip((hi - lo) / 1.0, 0, 1) * 0.5
    balance = 1 - _clip((smd - 0.1) / 0.4, 0, 1) * 0.4
    coverage = 0.6 + 0.4 * np.minimum(np.minimum(mf, cloud), sar)
    leakf = 1 - _clip(leak, 0, 1) * 0.5
    reversal = 1 - _clip(rev * 5, 0, 1) * 0.6 - fire * 0.3
    s = _clip(base * certainty * balance * coverage * leakf * reversal, 0, 1)
    return float(s) if s.ndim == 0 else s


def sample_features(n: int, rng: np.random.Generator) -> np.ndarray:
    """Synthetic feature vectors spanning the realistic ranges of 04 §6."""
    r = rng.uniform(0, 1.5, n)
    width = rng.beta(1.5, 4, n) * 1.0
    lo = _clip(r - width * rng.uniform(0, 1, n), 0, 1.5)
    hi = _clip(lo + width, 0, 1.5)
    X = np.column_stack(
        [
            r,
            lo,
            hi,
            rng.beta(1.2, 6, n),  # max_smd
            rng.beta(6, 1.5, n),  # matched_fraction
            rng.uniform(0, 10, n) * rng.beta(1, 4, n),  # project loss ×100
            rng.uniform(0, 10, n) * rng.beta(1, 4, n),  # control loss ×100
            rng.uniform(-1, 1, n) * rng.beta(1, 3, n),  # leakage
            rng.beta(1, 8, n),  # reversal fraction
            rng.beta(1, 8, n),  # fire fraction
            rng.beta(6, 1.5, n),  # cloud free
            rng.beta(6, 1.5, n),  # sar agreement
            rng.uniform(-1, 1, n) * rng.beta(1, 4, n),  # biomass trend
            rng.uniform(0, 1, n),  # years/30
            rng.uniform(-3, 3, n),  # log claim ratio
            rng.uniform(0, 2, n) * rng.beta(1, 4, n),  # freshness
        ]
    )
    return X


@dataclass
class MLP:
    W1: np.ndarray
    b1: np.ndarray
    W2: np.ndarray
    b2: np.ndarray
    W3: np.ndarray
    b3: np.ndarray

    @classmethod
    def random(cls, seed: int = 0, h1: int = 16, h2: int = 8) -> MLP:
        rng = np.random.default_rng(seed)
        s = lambda i, o: rng.normal(0, np.sqrt(2 / i), (i, o))
        return cls(s(16, h1), np.zeros(h1), s(h1, h2), np.zeros(h2), s(h2, 1), np.zeros(1))

    def forward(self, X: np.ndarray):
        z1 = X @ self.W1 + self.b1
        a1 = np.maximum(z1, 0)
        z2 = a1 @ self.W2 + self.b2
        a2 = np.maximum(z2, 0)
        z3 = a2 @ self.W3 + self.b3
        y = 1 / (1 + np.exp(-z3))
        return (z1, a1, z2, a2, z3, y)

    def predict(self, X: np.ndarray) -> np.ndarray:
        X = np.atleast_2d(np.asarray(X, dtype=float))
        return self.forward(X)[-1][:, 0]

    def params(self):
        return [self.W1, self.b1, self.W2, self.b2, self.W3, self.b3]

    def n_params(self) -> int:
        return int(sum(p.size for p in self.params()))


def train(
    n: int = 200_000, epochs: int = 40, seed: int = 0, lr: float = 2e-3, batch: int = 256
) -> tuple[MLP, dict]:
    """Distil the expert rule into the MLP. Returns the model and a report with measured numbers only."""
    rng = np.random.default_rng(seed)
    X = sample_features(n, rng)
    y = expert_score(X)
    n_hold = n // 5
    Xtr, ytr, Xho, yho = X[n_hold:], y[n_hold:], X[:n_hold], y[:n_hold]
    m = MLP.random(seed)
    params = m.params()
    mom = [np.zeros_like(p) for p in params]
    vel = [np.zeros_like(p) for p in params]
    t0 = time.time()
    step = 0
    for ep in range(epochs):
        perm = rng.permutation(len(Xtr))
        for i in range(0, len(Xtr), batch):
            idx = perm[i : i + batch]
            xb, yb = Xtr[idx], ytr[idx][:, None]
            z1, a1, z2, a2, z3, out = m.forward(xb)
            g = 2 * (out - yb) / len(xb) * out * (1 - out)
            gW3, gb3 = a2.T @ g, g.sum(0)
            d2 = (g @ m.W3.T) * (z2 > 0)
            gW2, gb2 = a1.T @ d2, d2.sum(0)
            d1 = (d2 @ m.W2.T) * (z1 > 0)
            gW1, gb1 = xb.T @ d1, d1.sum(0)
            grads = [gW1, gb1, gW2, gb2, gW3, gb3]
            step += 1
            for p, gr, mo, ve in zip(params, grads, mom, vel):
                mo[:] = 0.9 * mo + 0.1 * gr
                ve[:] = 0.999 * ve + 0.001 * gr * gr
                mhat = mo / (1 - 0.9**step)
                vhat = ve / (1 - 0.999**step)
                p -= lr * mhat / (np.sqrt(vhat) + 1e-8)
        lr *= 0.95
    pred = m.predict(Xho)
    mae = float(np.mean(np.abs(pred - yho)))
    # monotonicity checks on 2,000 holdout vectors
    chk = Xho[Xho[:, 0] <= 0.9][
        :2000
    ]  # support rule is flat above r=1, so test the strictly increasing region
    base = m.predict(chk)
    up = chk.copy()
    up[:, 0] = np.minimum(up[:, 0] + 0.1, 1.5)
    rv = chk.copy()
    rv[:, 8] = np.minimum(rv[:, 8] + 0.1, 1.0)
    mono_r = float((m.predict(up) < base - 1e-3).mean())
    mono_rev = float((m.predict(rv) > base + 1e-3).mean())
    report = {
        "architecture": "16-16(ReLU)-8(ReLU)-1(Sigmoid)",
        "n_params": m.n_params(),
        "train_samples": n - n_hold,
        "holdout_samples": n_hold,
        "epochs": epochs,
        "seed": seed,
        "mae_holdout": mae,
        "max_abs_err_holdout": float(np.max(np.abs(pred - yho))),
        "monotonicity_violation_rate_support": mono_r,
        "monotonicity_violation_rate_reversal": mono_rev,
        "train_seconds": round(time.time() - t0, 2),
        "machine": platform.platform(),
        "feature_version": FEATURE_VERSION,
        "feature_names": FEATURE_NAMES,
    }
    return m, report


def export_onnx(m: MLP, path: Path) -> None:
    f32 = lambda a, n: numpy_helper.from_array(np.asarray(a, dtype=np.float32), n)
    inits = [
        f32(m.W1, "W1"),
        f32(m.b1, "b1"),
        f32(m.W2, "W2"),
        f32(m.b2, "b2"),
        f32(m.W3, "W3"),
        f32(m.b3, "b3"),
    ]
    nodes = [
        helper.make_node("Gemm", ["input", "W1", "b1"], ["z1"]),
        helper.make_node("Relu", ["z1"], ["a1"]),
        helper.make_node("Gemm", ["a1", "W2", "b2"], ["z2"]),
        helper.make_node("Relu", ["z2"], ["a2"]),
        helper.make_node("Gemm", ["a2", "W3", "b3"], ["z3"]),
        helper.make_node("Sigmoid", ["z3"], ["output"]),
    ]
    graph = helper.make_graph(
        nodes,
        "vericanopy_scorer_fv1",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 16])],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 1])],
        initializer=inits,
    )
    model = helper.make_model(graph, producer_name="vericanopy", opset_imports=[helper.make_opsetid("", 13)])
    model.ir_version = 8
    onnx.checker.check_model(model)
    path.parent.mkdir(parents=True, exist_ok=True)
    onnx.save(model, str(path))


def model_hash(path: Path) -> str:
    return "0x" + hashlib.sha256(Path(path).read_bytes()).hexdigest()


def predict_onnx(path: Path, x: np.ndarray) -> float:

    sess = _session(str(path))
    out = sess.run(None, {"input": np.asarray(x, dtype=np.float32).reshape(1, 16)})[0]
    return float(out[0, 0])


_SESSIONS: dict[str, object] = {}


def _session(path: str):
    import onnxruntime as ort

    if path not in _SESSIONS:
        _SESSIONS[path] = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
    return _SESSIONS[path]


def train_and_export(out: Path | None = None) -> dict:
    out = out or ARTIFACT_DIR / "model.onnx"
    m, rep = train()
    export_onnx(m, out)
    rep["model_hash"] = model_hash(out)
    rep["onnx_path"] = str(out)
    # ONNX vs numpy agreement on 1,000 vectors
    X = sample_features(1000, np.random.default_rng(123))
    diff = np.abs(m.predict(X) - np.array([predict_onnx(out, x) for x in X]))
    rep["onnx_vs_numpy_max_abs_err"] = float(diff.max())
    (out.parent / "training_report.json").write_text(json.dumps(rep, indent=1))
    return rep
