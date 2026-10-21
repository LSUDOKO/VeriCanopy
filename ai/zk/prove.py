"""Per-score proving (05 §3 step 5, §4). `python -m zk.prove --project A --period 2024`.

Reads <out_dir>/features.json, writes witness.json, proof.json, calldata.json and rewrites manifest.json with
`feature_commitment` (Poseidon hash instance), `score_bps` derived from the public output instance exactly as
IntegrityOracle does (floor(scoreFe * 10000 / 2^outputScale)), and a `zk` block.
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from pathlib import Path

import ezkl
from eth_abi import decode

from vericanopy_ai.config import OUTPUT_DIR
from vericanopy_ai.manifest import manifest_sha256
from zk.build_circuit import COMPILED, PK, SETTINGS, SRS, VK


@dataclass
class ProofBundle:
    proof_path: Path
    proof_hex: str
    instances: list[int]
    feature_commitment: str
    score_fe: int
    output_scale: int
    score_bps: int
    prove_seconds: float


def felt_to_int(h: str) -> int:
    """EZKL serialises field elements as little-endian 32-byte hex strings."""
    return int.from_bytes(bytes.fromhex(h.removeprefix("0x")), "little")


def int_to_felt(i: int) -> str:
    return i.to_bytes(32, "little").hex()


def decode_score_bps(score_fe: int, output_scale: int) -> int:
    denom = 1 << output_scale
    if score_fe > denom:
        raise ValueError("score instance out of range")
    return (score_fe * 10_000) // denom


def prove(features: list[float], out_dir: Path) -> ProofBundle:
    out_dir.mkdir(parents=True, exist_ok=True)
    inp = out_dir / "input.json"
    wit = out_dir / "witness.json"
    proof = out_dir / "proof.json"
    inp.write_text(json.dumps({"input_data": [list(map(float, features))]}))
    ezkl.gen_witness(str(inp), str(COMPILED), str(wit), vk_path=str(VK), srs_path=str(SRS))
    t0 = time.time()
    ezkl.prove(str(wit), str(COMPILED), str(PK), str(proof), srs_path=str(SRS))
    dt = time.time() - t0
    assert ezkl.verify(str(proof), str(SETTINGS), str(VK), srs_path=str(SRS))
    settings = json.loads(SETTINGS.read_text())
    output_scale = int(settings["model_output_scales"][0])
    pj = json.loads(proof.read_text())
    instances = [felt_to_int(x) for x in pj["instances"][0]]
    score_fe = instances[-1]
    bundle = ProofBundle(
        proof_path=proof,
        proof_hex=_proof_hex(pj),
        instances=instances,
        feature_commitment="0x" + instances[0].to_bytes(32, "big").hex(),
        score_fe=score_fe,
        output_scale=output_scale,
        score_bps=decode_score_bps(score_fe, output_scale),
        prove_seconds=round(dt, 3),
    )
    (out_dir / "calldata.json").write_text(
        json.dumps({"proof": bundle.proof_hex, "instances": [str(i) for i in instances]}, indent=1)
    )
    return bundle


def _proof_hex(pj: dict) -> str:
    p = pj["proof"]
    if isinstance(p, str):
        return p if p.startswith("0x") else "0x" + p
    return "0x" + bytes(p).hex()


def evm_calldata(proof_path: Path) -> tuple[bytes, list[int]]:
    """ABI-decoded (proof, instances) from EZKL's encoded calldata, for IntegrityOracle.submitScore."""
    cd = proof_path.with_suffix(".calldata")
    data = bytes(ezkl.encode_evm_calldata(str(proof_path), str(cd)))
    proof, instances = decode(["bytes", "uint256[]"], data[4:])
    return proof, list(instances)


def verify_local(proof_path: Path) -> bool:
    return bool(ezkl.verify(str(proof_path), str(SETTINGS), str(VK), srs_path=str(SRS)))


def prove_run(out_dir: Path) -> ProofBundle:
    """Prove the features of a finished `score.run` and update its manifest."""
    features = json.loads((out_dir / "features.json").read_text())["features"]
    b = prove(features, out_dir)
    proof_bytes, instances = evm_calldata(b.proof_path)
    b.proof_hex = "0x" + proof_bytes.hex()
    assert instances == b.instances
    mpath = out_dir / "manifest.json"
    m = json.loads(mpath.read_text())
    m["feature_commitment"] = b.feature_commitment
    m["score_bps_onnx"] = m["score_bps"]
    m["score_bps"] = b.score_bps
    m["zk"] = {
        "proof_system": "halo2-kzg (EZKL)",
        "output_scale": b.output_scale,
        "instances": [str(i) for i in b.instances],
        "proof_sha256": _sha(proof_bytes),
        "proof_bytes": len(proof_bytes),
        "prove_seconds": b.prove_seconds,
    }
    m["manifest_hash_preimage_note"] = "sha256 over canonical JSON without `signatures`"
    mpath.write_text(json.dumps(m, indent=1, ensure_ascii=False))
    (out_dir / "calldata.json").write_text(
        json.dumps(
            {
                "proof": b.proof_hex,
                "instances": [str(i) for i in b.instances],
                "manifest_hash": manifest_sha256(m),
            },
            indent=1,
        )
    )
    return b


def _sha(b: bytes) -> str:
    import hashlib

    return "0x" + hashlib.sha256(b).hexdigest()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--period", type=int, required=True)
    ap.add_argument("--out-dir")
    a = ap.parse_args()
    d = Path(a.out_dir) if a.out_dir else OUTPUT_DIR / a.project / str(a.period)
    b = prove_run(d)
    print(
        json.dumps(
            {
                "score_bps": b.score_bps,
                "feature_commitment": b.feature_commitment,
                "prove_seconds": b.prove_seconds,
            }
        )
    )
