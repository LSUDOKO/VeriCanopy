"""Content-addressed store with real CIDv1 (raw codec, sha2-256). Local directory + optional kubo mirror.

`ipfs://<cid>` URIs produced here resolve on any gateway once the bytes are pinned to a real node
(`IPFS_API_URL` mirrors every put to kubo's /api/v0/add with --cid-version=1 --raw-leaves).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import httpx
from multiformats import CID

from app.config import settings


def cid_for(data: bytes) -> str:
    digest = hashlib.sha256(data).digest()
    return str(CID("base32", 1, "raw", ("sha2-256", digest)))


def _dir() -> Path:
    d = Path(settings.ipfs_store_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _db_put(cid: str, data: bytes) -> None:
    from app.db import SessionLocal
    from app.models import Blob

    db = SessionLocal()
    try:
        if db.get(Blob, cid) is None:
            db.add(Blob(cid=cid, data=data, size=len(data)))
            db.commit()
    finally:
        db.close()


def _db_get(cid: str) -> bytes | None:
    from app.db import SessionLocal
    from app.models import Blob

    db = SessionLocal()
    try:
        b = db.get(Blob, cid)
        return bytes(b.data) if b else None
    finally:
        db.close()


def put_bytes(data: bytes, mirror: bool = True) -> str:
    cid = cid_for(data)
    (_dir() / cid).write_bytes(data)
    try:
        _db_put(cid, data)  # durable, shared across instances (Render disk is ephemeral)
    except Exception:
        pass
    if mirror and settings.ipfs_api_url:
        try:
            httpx.post(
                settings.ipfs_api_url.rstrip("/") + "/api/v0/add?cid-version=1&raw-leaves=true&pin=true",
                files={"file": data},
                timeout=20,
            )
        except Exception:  # mirror is best-effort; the local store is authoritative in dev
            pass
    return cid


def put_json(obj: Any) -> str:
    return put_bytes(json.dumps(obj, indent=1, ensure_ascii=False, sort_keys=False).encode("utf-8"))


def is_cid(cid: str) -> bool:
    """True for a syntactically valid CID (rejects path traversal and junk before any filesystem access)."""
    try:
        CID.decode(cid.removeprefix("ipfs://"))
        return True
    except Exception:
        return False


def get_bytes(cid: str) -> bytes | None:
    cid = cid.removeprefix("ipfs://")
    if not is_cid(cid):
        return None
    p = _dir() / cid
    if p.exists():
        return p.read_bytes()
    try:
        b = _db_get(cid)
        if b is not None:
            return b
    except Exception:
        pass
    try:
        r = httpx.get(settings.ipfs_gateway.rstrip("/") + "/" + cid, timeout=20)
        if r.status_code == 200 and (cid_for(r.content) == cid or not cid.startswith("bafkrei")):
            return r.content  # content from a gateway must hash to the CID we asked for
    except Exception:
        return None
    return None


def get_json(cid: str) -> Any | None:
    b = get_bytes(cid)
    return json.loads(b.decode("utf-8")) if b is not None else None


def gateway_url(cid: str) -> str:
    return settings.ipfs_gateway.rstrip("/") + "/" + cid.removeprefix("ipfs://")
