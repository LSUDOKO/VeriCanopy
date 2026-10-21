"""Verify page checks (F7): manifest hash vs chain, PQ key registered, ML-DSA signature, zk proof mode."""

from __future__ import annotations

import hashlib
from typing import Any

from pq.sign_verify import ALG, verify_manifest
from sqlalchemy import select
from sqlalchemy.orm import Session
from vericanopy_ai.manifest import manifest_sha256

from app import ipfs
from app.models import PQKey, Submission


def verify_pq(db: Session, manifest: dict[str, Any] | None = None, manifest_cid: str | None = None) -> dict:
    details: dict[str, Any] = {}
    if manifest is None and manifest_cid:
        manifest = ipfs.get_json(manifest_cid)
        if manifest is None:
            return {"ok": False, "error": f"manifest {manifest_cid} not found", "details": details}
    if manifest is None:
        return {"ok": False, "error": "no manifest given", "details": details}
    mh = manifest_sha256(manifest)
    details["manifest_sha256"] = mh
    sigs = manifest.get("signatures") or {}
    key_id = sigs.get("pq_key_id")
    details["pq_key_id"] = key_id
    details["algorithm"] = sigs.get("algorithm")

    sub = None
    if manifest_cid:
        sub = db.execute(
            select(Submission).where(Submission.manifest_cid == manifest_cid)
        ).scalar_one_or_none()
    if sub is None:
        sub = db.execute(select(Submission).where(Submission.manifest_hash == mh)).scalar_one_or_none()
    chain_match = bool(sub and sub.manifest_hash and sub.manifest_hash.lower() == mh.lower())
    details["submission_id"] = sub.id if sub else None
    details["chain_manifest_hash"] = sub.manifest_hash if sub else None

    key = db.get(PQKey, key_id) if key_id else None
    key_registered = bool(key and key.algorithm == ALG)
    details["key_active"] = bool(key and key.active)
    details["key_owner"] = key.owner if key else None
    pk = None
    if key and key.pubkey_uri:
        pk = ipfs.get_bytes(key.pubkey_uri)
        if pk is not None:
            details["pubkey_sha256_matches"] = "0x" + hashlib.sha256(pk).hexdigest() == key.pubkey_hash
            key_registered = key_registered and details["pubkey_sha256_matches"]
    sig_valid = bool(pk is not None and verify_manifest(manifest, pk))
    proof_mode = sub.proof_mode if sub else None
    zk_verified = (
        bool(sub and sub.tx_hash) if proof_mode == "onchain" else bool(sub and sub.status != "Rejected")
    )
    details["tx_hash"] = sub.tx_hash if sub else None
    return {
        "ok": chain_match and key_registered and sig_valid,
        "manifest_hash_matches_chain": chain_match,
        "key_registered": key_registered,
        "signature_valid": sig_valid,
        "zk_proof_verified": zk_verified,
        "proof_mode": proof_mode,
        "details": details,
    }
