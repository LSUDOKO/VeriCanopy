"""Measured ECDSA (secp256k1) vs ML-DSA-65 comparison for the Security page (07 §6)."""

from __future__ import annotations

import json
import platform
import time
from pathlib import Path

from eth_account import Account
from eth_account.messages import encode_defunct

from pq.keys import keygen
from pq.sign_verify import BACKEND, pubkey_hash, sign, verify

OUT = Path(__file__).resolve().parents[1] / "zk" / "artifacts" / "pq_benchmarks.json"


def run(n: int = 20) -> dict:
    msg = {"schema": "vc-manifest/1", "project_id": "A", "score_bps": 7093, "features": [0.1] * 16}
    t0 = time.perf_counter()
    pk, sk = keygen()
    t_keygen = time.perf_counter() - t0
    t0 = time.perf_counter()
    for _ in range(n):
        sig = sign(msg, sk)
    t_sign = (time.perf_counter() - t0) / n
    t0 = time.perf_counter()
    for _ in range(n):
        assert verify(msg, sig, pk)
    t_verify = (time.perf_counter() - t0) / n
    import base64

    sig_len = len(base64.b64decode(sig))
    # ECDSA via eth_account (secp256k1)
    acct = Account.create()
    m = encode_defunct(text=json.dumps(msg))
    t0 = time.perf_counter()
    for _ in range(n):
        es = Account.sign_message(m, acct.key)
    t_esign = (time.perf_counter() - t0) / n
    t0 = time.perf_counter()
    for _ in range(n):
        Account.recover_message(m, signature=es.signature)
    t_everify = (time.perf_counter() - t0) / n
    out = {
        "machine": platform.platform(),
        "iterations": n,
        "ml_dsa_65": {
            "backend": BACKEND,
            "public_key_bytes": len(pk),
            "secret_key_bytes": len(sk),
            "signature_bytes": sig_len,
            "keygen_ms": round(t_keygen * 1000, 2),
            "sign_ms": round(t_sign * 1000, 2),
            "verify_ms": round(t_verify * 1000, 2),
            "pubkey_hash_example": pubkey_hash(pk),
        },
        "ecdsa_secp256k1": {
            "backend": "eth-account",
            "public_key_bytes": 64,
            "signature_bytes": 65,
            "sign_ms": round(t_esign * 1000, 3),
            "verify_ms": round(t_everify * 1000, 3),
        },
    }
    OUT.write_text(json.dumps(out, indent=1))
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=1))
