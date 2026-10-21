"""ML-DSA-65 signatures over canonical manifests (07 §3, §5).

Backend: `dilithium-py` (pure-Python FIPS 204). If `liboqs-python` is installed it is used instead; both
produce/verify standard ML-DSA-65 signatures.
"""

from __future__ import annotations

import base64
import hashlib
from typing import Any

from vericanopy_ai.manifest import canonical, manifest_sha256

ALG = "ML-DSA-65"

try:  # optional liboqs backend
    import oqs  # type: ignore

    def _sign(msg: bytes, sk: bytes) -> bytes:
        with oqs.Signature(ALG, secret_key=sk) as s:
            return s.sign(msg)

    def _verify(msg: bytes, sig: bytes, pk: bytes) -> bool:
        with oqs.Signature(ALG) as s:
            return bool(s.verify(msg, sig, pk))

    BACKEND = "liboqs"
except ImportError:
    from dilithium_py.ml_dsa import ML_DSA_65

    def _sign(msg: bytes, sk: bytes) -> bytes:
        return ML_DSA_65.sign(sk, msg)

    def _verify(msg: bytes, sig: bytes, pk: bytes) -> bool:
        try:
            return bool(ML_DSA_65.verify(pk, msg, sig))
        except Exception:
            return False

    BACKEND = "dilithium-py"


def sign(manifest: dict[str, Any], sk: bytes) -> str:
    return base64.b64encode(_sign(canonical(manifest), sk)).decode()


def verify(manifest: dict[str, Any], sig_b64: str, pk: bytes) -> bool:
    try:
        return _verify(canonical(manifest), base64.b64decode(sig_b64), pk)
    except Exception:
        return False


def pubkey_hash(pk: bytes) -> str:
    return "0x" + hashlib.sha256(pk).hexdigest()


def sign_manifest(manifest: dict[str, Any], sk: bytes, pq_key_id: str) -> dict[str, Any]:
    """Return a copy with `signatures` filled (the signature covers everything except `signatures`)."""
    m = {k: v for k, v in manifest.items() if k != "signatures"}
    sig = sign(m, sk)
    m["signatures"] = {
        "algorithm": ALG,
        "backend": BACKEND,
        "ml_dsa_65": sig,
        "pq_key_id": pq_key_id,
        "manifest_sha256": manifest_sha256(m),
    }
    return m


def verify_manifest(manifest: dict[str, Any], pk: bytes) -> bool:
    sig = (manifest.get("signatures") or {}).get("ml_dsa_65")
    if not sig:
        return False
    return verify(manifest, sig, pk)
