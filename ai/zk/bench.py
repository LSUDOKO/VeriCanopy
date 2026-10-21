"""Measure zk benchmarks (05 §7): proving time, proof size, float-vs-proven error. `python -m zk.bench --n 50`."""

from __future__ import annotations

import argparse
import json
import platform
import resource
import tempfile
from pathlib import Path

import numpy as np

from vericanopy_ai.model import ARTIFACT_DIR, predict_onnx, sample_features
from zk.build_circuit import BENCH
from zk.prove import evm_calldata, prove


def run(n: int) -> dict:
    rng = np.random.default_rng(2026)
    X = sample_features(n, rng)
    errs, times, sizes = [], [], []
    with tempfile.TemporaryDirectory() as d:
        for i, x in enumerate(X):
            b = prove(x.tolist(), Path(d) / str(i))
            proof, _ = evm_calldata(b.proof_path)
            y = predict_onnx(ARTIFACT_DIR / "model.onnx", x)
            errs.append(abs(b.score_bps / 10_000 - y))
            times.append(b.prove_seconds)
            sizes.append(len(proof))
    out = json.loads(BENCH.read_text()) if BENCH.exists() else {}
    out.update(
        {
            "bench_vectors": n,
            "prove_seconds_mean": round(float(np.mean(times)), 3),
            "prove_seconds_max": round(float(np.max(times)), 3),
            "proof_bytes": int(sizes[0]),
            "float_vs_proven_max_abs_err": float(np.max(errs)),
            "float_vs_proven_mean_abs_err": float(np.mean(errs)),
            "peak_rss_mb_prove": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1),
            "machine": f"{platform.platform()} / {__import__('os').cpu_count()} cpus",
        }
    )
    BENCH.write_text(json.dumps(out, indent=1))
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=50)
    print(json.dumps(run(ap.parse_args().n), indent=1))
