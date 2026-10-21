"""ML-DSA-65 key management (07 §4). Secret keys live outside the repo (`secrets/`, gitignored)."""

from __future__ import annotations

import os
from pathlib import Path

from dilithium_py.ml_dsa import ML_DSA_65


def keygen(seed: bytes | None = None) -> tuple[bytes, bytes]:
    """Return (public_key, secret_key). FIPS 204 ML-DSA-65: pk 1952 B, sk 4032 B."""
    if seed is not None:
        return ML_DSA_65._keygen_internal(seed)
    return ML_DSA_65.keygen()


def save_keypair(pk_path: Path, sk_path: Path, pk: bytes, sk: bytes) -> None:
    pk_path.parent.mkdir(parents=True, exist_ok=True)
    pk_path.write_bytes(pk)
    sk_path.write_bytes(sk)
    os.chmod(sk_path, 0o600)


def load_keypair(pk_path: Path, sk_path: Path) -> tuple[bytes, bytes]:
    return pk_path.read_bytes(), sk_path.read_bytes()


def load_or_create(pk_path: Path, sk_path: Path) -> tuple[bytes, bytes]:
    """Hosted services keep the keypair in env (`PQ_PUBLIC_KEY_B64` / `PQ_SECRET_KEY_B64`); local runs use files."""
    import base64

    env_pk, env_sk = os.environ.get("PQ_PUBLIC_KEY_B64"), os.environ.get("PQ_SECRET_KEY_B64")
    if env_pk and env_sk:
        return base64.b64decode(env_pk), base64.b64decode(env_sk)
    if pk_path.exists() and sk_path.exists():
        return load_keypair(pk_path, sk_path)
    pk, sk = keygen()
    save_keypair(pk_path, sk_path, pk, sk)
    return pk, sk
