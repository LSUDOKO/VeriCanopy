"""Build the EZKL circuit for the committed scorer (05 §3). Run once per model version: `make zk-setup`.

Produces in ai/zk/artifacts/: settings.json, calibration.json, model.compiled, vk.key, pk.key, kzg.srs
and benchmarks in docs/BENCHMARKS.md (measured on this machine).
"""

from __future__ import annotations

import asyncio
import inspect
import json
import os
import platform
import resource
import time
from pathlib import Path

import ezkl
import numpy as np

from vericanopy_ai.model import ARTIFACT_DIR, sample_features

SETTINGS = ARTIFACT_DIR / "settings.json"
CALIB = ARTIFACT_DIR / "calibration.json"
COMPILED = ARTIFACT_DIR / "model.compiled"
VK = ARTIFACT_DIR / "vk.key"
PK = ARTIFACT_DIR / "pk.key"
SRS = ARTIFACT_DIR / "kzg.srs"
BENCH = ARTIFACT_DIR / "zk_benchmarks.json"


def _run(fn, *a, **k):
    """ezkl functions are sync in some builds and coroutines in others; some need a running loop."""

    async def go():
        r = fn(*a, **k)
        return await r if inspect.isawaitable(r) else r

    return asyncio.run(go())


def build(
    onnx_path: Path | None = None,
    input_visibility: str = "hashed",
    param_visibility: str = "fixed",
    output_visibility: str = "public",
    scale: int = 9,
) -> dict:
    onnx_path = onnx_path or ARTIFACT_DIR / "model.onnx"
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    t = {}
    args = ezkl.PyRunArgs()
    args.input_visibility = input_visibility
    args.param_visibility = param_visibility
    args.output_visibility = output_visibility
    args.input_scale = scale
    args.param_scale = scale
    args.lookup_range = (
        -(12 << scale),
        4 << scale,
    )  # measured logit domain [-8.5, 2.1] with margin (see zk/README)
    t0 = time.time()
    assert ezkl.gen_settings(str(onnx_path), str(SETTINGS), py_run_args=args)
    # calibration set: synthetic vectors + the demo vectors
    rng = np.random.default_rng(7)
    X = sample_features(200, rng)
    # corner vectors spanning the documented fv1 ranges (04 §6) so lookup tables cover every valid input
    lo = np.array([0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, -3, 0], dtype=float)
    hi = np.array([1.5, 1.5, 1.5, 1, 1, 10, 10, 1, 1, 1, 1, 1, 1, 1, 3, 2], dtype=float)
    X = np.vstack(
        [
            X,
            lo,
            hi,
            (lo + hi) / 2,
            np.where(np.arange(16) % 2 == 0, lo, hi),
            np.where(np.arange(16) % 2 == 0, hi, lo),
        ]
    )
    snaps = sorted((Path(__file__).resolve().parents[1] / "tests" / "snapshots").glob("*.json"))
    for s in snaps:
        X = np.vstack([X, np.array(json.loads(s.read_text())["features"])])
    CALIB.write_text(json.dumps({"input_data": X.astype(float).tolist()}))
    _run(
        ezkl.calibrate_settings,
        str(CALIB),
        str(onnx_path),
        str(SETTINGS),
        "resources",
        scales=[scale],
        max_logrows=17,
    )
    # Calibration shrinks the lookup range to the calibration data; pin it to the full fv1 input domain instead so that
    # every valid feature vector proves (an out-of-range lookup makes the prover hang).
    st = json.loads(SETTINGS.read_text())
    out_scale = int(st["model_output_scales"][0])
    lo, hi = -(12 << out_scale), 4 << out_scale
    st["run_args"]["lookup_range"] = [lo, hi]
    st["run_args"]["logrows"] = max(int(st["run_args"]["logrows"]), (hi - lo).bit_length() + 2)
    SETTINGS.write_text(json.dumps(st))
    t["settings_s"] = round(time.time() - t0, 2)
    t0 = time.time()
    assert ezkl.compile_circuit(str(onnx_path), str(COMPILED), str(SETTINGS))
    t["compile_s"] = round(time.time() - t0, 2)
    t0 = time.time()
    need = json.loads(SETTINGS.read_text())["run_args"]["logrows"]
    if not SRS.exists() or SRS.stat().st_size < (1 << need) * 64:
        _run(ezkl.get_srs, str(SETTINGS), srs_path=str(SRS))
    t["srs_s"] = round(time.time() - t0, 2)
    t0 = time.time()
    assert ezkl.setup(str(COMPILED), str(VK), str(PK), srs_path=str(SRS))
    t["setup_s"] = round(time.time() - t0, 2)
    settings = json.loads(SETTINGS.read_text())
    bench = {
        "machine": f"{platform.platform()} / {os.cpu_count()} cpus",
        "ezkl_version": ezkl.__version__,
        "logrows": settings["run_args"]["logrows"],
        "input_scale": settings["run_args"]["input_scale"],
        "param_scale": settings["run_args"]["param_scale"],
        "output_scale": settings["model_output_scales"][0],
        "input_visibility": input_visibility,
        "param_visibility": param_visibility,
        "output_visibility": output_visibility,
        "pk_bytes": PK.stat().st_size,
        "vk_bytes": VK.stat().st_size,
        "srs_bytes": SRS.stat().st_size,
        "peak_rss_mb_build": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1),
        **t,
    }
    BENCH.write_text(json.dumps(bench, indent=1))
    return bench


if __name__ == "__main__":
    print(json.dumps(build(), indent=1))
