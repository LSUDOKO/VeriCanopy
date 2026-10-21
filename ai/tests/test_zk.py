import json
from pathlib import Path

import numpy as np
import pytest

from vericanopy_ai.model import ARTIFACT_DIR, predict_onnx, sample_features

pytestmark = pytest.mark.slow
HAVE = (ARTIFACT_DIR / "pk.key").exists() and (ARTIFACT_DIR / "model.compiled").exists()


@pytest.mark.skipif(not HAVE, reason="run `make zk-setup` first")
def test_prove_and_verify_roundtrip(tmp_path):
    from zk.prove import decode_score_bps, evm_calldata, prove, verify_local

    snap = json.loads((Path(__file__).parent / "snapshots" / "A_2024.json").read_text())
    b = prove(snap["features"], tmp_path)
    assert verify_local(b.proof_path)
    assert len(b.instances) == 2
    proof, instances = evm_calldata(b.proof_path)
    assert instances == b.instances and len(proof) > 1000
    assert b.score_bps == decode_score_bps(b.instances[-1], b.output_scale)
    onnx_bps = round(predict_onnx(ARTIFACT_DIR / "model.onnx", snap["features"]) * 10_000)
    assert abs(b.score_bps - onnx_bps) <= 100, "fixed-point error must stay within 1%"


@pytest.mark.skipif(not HAVE, reason="run `make zk-setup` first")
def test_tampered_instance_fails(tmp_path):
    import ezkl

    from zk.build_circuit import SETTINGS, SRS, VK
    from zk.prove import prove

    b = prove(sample_features(1, np.random.default_rng(0))[0].tolist(), tmp_path)
    pj = json.loads(b.proof_path.read_text())
    from zk.prove import felt_to_int, int_to_felt

    pj["instances"][0][-1] = int_to_felt(felt_to_int(pj["instances"][0][-1]) + 1)
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps(pj))
    ok = False
    try:
        ok = ezkl.verify(str(bad), str(SETTINGS), str(VK), srs_path=str(SRS))
    except Exception:
        ok = False
    assert not ok


@pytest.mark.skipif(not HAVE, reason="run `make zk-setup` first")
@pytest.mark.parametrize(
    "vec",
    [
        [0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, -3, 0],
        [1.5, 1.5, 1.5, 1, 1, 10, 10, 1, 1, 1, 1, 1, 1, 1, 3, 2],
        [
            0.0,
            0.0,
            0.0,
            0.022943,
            0.995,
            7.93182,
            3.055857,
            0.09129,
            0.549346,
            0.46,
            0.857347,
            0.8825,
            -0.521129,
            0.233333,
            3.0,
            0.0,
        ],
    ],
)
def test_prove_corner_vectors(tmp_path, vec):
    """Every vector inside the documented fv1 ranges must prove (a value outside the lookup range hangs EZKL)."""
    from zk.prove import prove, verify_local

    b = prove([float(v) for v in vec], tmp_path)
    assert verify_local(b.proof_path)
