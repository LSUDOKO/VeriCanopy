"""Oracle job (09 §4): pipeline → zk proof → manifest → ML-DSA sign → IPFS → submitScore tx."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections.abc import Callable
from pathlib import Path

from eth_account import Account
from pq.keys import load_or_create
from pq.sign_verify import ALG, pubkey_hash, sign_manifest
from vericanopy_ai.config import PipelineConfig
from vericanopy_ai.extract import Project
from vericanopy_ai.manifest import manifest_sha256
from vericanopy_ai.score import run as score_run
from web3 import Web3

from app import ipfs
from app.chain import contracts, load_deployments
from app.chain import w3 as _w3
from app.config import REPO_ROOT, settings
from app.db import SessionLocal
from app.models import Project as ProjectRow
from app.txn import ANVIL_KEYS, send

ZK_ART = REPO_ROOT / "ai" / "zk" / "artifacts"


def oracle_key() -> str:
    return settings.oracle_private_key or ANVIL_KEYS["oracle"]


def project_from_row(row: ProjectRow, demo_id: str | None = None) -> Project:
    return Project(
        id=row.id,
        name=row.name or f"Project #{row.id}",
        geometry=row.geometry,
        start_date=row.start_date or "2019-01-01",
        claimed_baseline_rate=(row.claimed_baseline_bps or 0) / 10_000,
        properties={"demo_id": demo_id or row.demo_id},
    )


def ensure_pq_key(
    web3: Web3, cs: dict, key: str, log: Callable[[str], None] = print
) -> tuple[str, bytes, bytes]:
    """Register the oracle's ML-DSA-65 public key on-chain if needed. Returns (keyId, pk, sk)."""
    pk, sk = load_or_create(Path(settings.pq_public_key_path), Path(settings.pq_secret_key_path))
    owner = Account.from_key(key).address
    ph = pubkey_hash(pk)
    key_id = Web3.solidity_keccak(["address", "bytes32"], [owner, bytes.fromhex(ph[2:])]).hex()
    key_id = "0x" + key_id.removeprefix("0x")
    rec = cs["PQKeyRegistry"].functions.getKey(bytes.fromhex(key_id[2:])).call()
    if int(rec[0], 16) == 0:
        cid = ipfs.put_bytes(pk)
        log(f"registering ML-DSA-65 key {ph[:18]}… (pk {len(pk)} B) → ipfs://{cid}")
        send(web3, cs["PQKeyRegistry"].functions.registerKey(ALG, bytes.fromhex(ph[2:]), cid), key)
    return key_id, pk, sk


def zk_prove_or_fallback(
    out_dir: Path, score: float, features: list[float], output_scale: int, log
) -> tuple[bytes, list[int], dict]:
    """Return (proof, instances, zk_meta). On-chain mode needs the EZKL artifacts; otherwise documented fallback."""
    have = (ZK_ART / "pk.key").exists() and (ZK_ART / "model.compiled").exists()
    if settings.zk_mode == "onchain" and have:
        from zk.prove import evm_calldata, prove_run

        b = prove_run(out_dir)
        proof, instances = evm_calldata(b.proof_path)
        log(f"EZKL proof: {len(proof)} bytes in {b.prove_seconds}s; score instance → {b.score_bps} bps")
        return (
            proof,
            instances,
            {"mode": "onchain", "proof_bytes": len(proof), "prove_seconds": b.prove_seconds},
        )
    # fallback (05 §6): off-chain verification result + proof hash; instances mimic the circuit's public inputs
    canon = json.dumps(features, separators=(",", ":")).encode()
    commitment = int.from_bytes(hashlib.sha256(canon).digest(), "big") >> 4  # fits the BN254 scalar field
    score_fe = round(score * (1 << output_scale))
    proof = hashlib.sha256(canon + str(score_fe).encode()).digest()
    log("zk fallback: off-chain mode (no EZKL artifacts or ZK_MODE=offchain); storing proof hash only")
    m = json.loads((out_dir / "manifest.json").read_text())
    m["feature_commitment"] = "0x" + commitment.to_bytes(32, "big").hex()
    m["zk"] = {
        "mode": "offchain",
        "proof_sha256": "0x" + hashlib.sha256(proof).hexdigest(),
        "output_scale": output_scale,
        "instances": [str(commitment), str(score_fe)],
    }
    (out_dir / "manifest.json").write_text(json.dumps(m, indent=1, ensure_ascii=False))
    return proof, [commitment, score_fe], m["zk"]


def run_score_job(
    project_id: int,
    period: int,
    demo_id: str | None = None,
    submit: bool = True,
    log: Callable[[str], None] = print,
    cfg: PipelineConfig | None = None,
) -> dict:
    db = SessionLocal()
    try:
        row = db.get(ProjectRow, project_id)
        if row is None or not row.geometry:
            raise RuntimeError(f"project {project_id} not indexed yet (run the indexer after seeding)")
        proj = project_from_row(row, demo_id)
    finally:
        db.close()
    key_dir = proj.properties.get("demo_id") or str(project_id)
    out_dir = REPO_ROOT / "data" / "outputs" / key_dir / str(period)
    log(f"pipeline: project {project_id} ({proj.name}) period {period} → {out_dir}")
    r = score_run(proj, period, cfg=cfg, out_dir=out_dir)
    log(f"features: {r.features}")
    log(
        f"score {r.score:.4f} → {r.score_bps} bps; reversal {r.reversal_tco2e} tCO2e; provider {r.manifest['provider']}"
    )

    dep = load_deployments()
    web3 = _w3()
    cs = contracts(dep)
    output_scale = int(dep["params"]["outputScale"])
    proof, instances, zk_meta = zk_prove_or_fallback(out_dir, r.score, r.features, output_scale, log)

    key = oracle_key()
    key_id, pk, sk = ensure_pq_key(web3, cs, key, log)
    manifest = json.loads((out_dir / "manifest.json").read_text())
    signed = sign_manifest(manifest, sk, key_id)
    mh = manifest_sha256(signed)
    cid = ipfs.put_json(signed)
    (out_dir / "manifest.signed.json").write_text(json.dumps(signed, indent=1, ensure_ascii=False))
    log(f"manifest {mh[:18]}… signed (ML-DSA-65) → ipfs://{cid}")
    result = {
        "project_id": project_id,
        "period": period,
        "score_bps": signed["score_bps"],
        "reversal_tco2e": signed["reversal_tco2e"],
        "manifest_cid": cid,
        "manifest_hash": mh,
        "feature_commitment": signed.get("feature_commitment"),
        "pq_key_id": key_id,
        "zk": zk_meta,
        "out_dir": str(out_dir),
        "provider": signed.get("provider"),
    }
    if not submit:
        return result
    stake = cs["IntegrityOracle"].functions.minOracleStake().call()
    model_hash = bytes.fromhex(dep["params"]["modelHash"][2:])
    fn = cs["IntegrityOracle"].functions.submitScore(
        project_id,
        period,
        model_hash,
        int(signed["reversal_tco2e"]),
        bytes.fromhex(mh[2:]),
        cid,
        bytes.fromhex(key_id[2:]),
        proof,
        instances,
    )
    rcpt = send(web3, fn, key, value=stake)
    ev = cs["IntegrityOracle"].events.ScoreSubmitted().process_receipt(rcpt)
    sid = int(ev[0]["args"]["submissionId"]) if ev else None
    result.update(
        {
            "tx_hash": "0x" + rcpt["transactionHash"].hex().removeprefix("0x"),
            "submission_id": sid,
            "stake_wei": stake,
        }
    )
    log(f"submitScore tx {result['tx_hash']} → submission #{sid}")
    return result


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", type=int, required=True)
    ap.add_argument("--period", type=int, required=True)
    ap.add_argument("--demo-id")
    ap.add_argument("--no-submit", action="store_true")
    a = ap.parse_args()
    print(json.dumps(run_score_job(a.project, a.period, demo_id=a.demo_id, submit=not a.no_submit), indent=1))
