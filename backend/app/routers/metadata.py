from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project
from app.routers.projects import _integrity

router = APIRouter(tags=["metadata"])


@router.get("/metadata/{token_id}")
def metadata(token_id: str, db: Session = Depends(get_db)):
    """ERC-1155 metadata with live integrity. Accepts decimal or 64-hex (ERC-1155 {id} substitution)."""
    tid = int(token_id, 16) if len(token_id) == 64 else int(token_id)
    pid, vintage = tid >> 16, tid & 0xFFFF
    p = db.get(Project, pid)
    if not p:
        raise HTTPException(status_code=404, detail="unknown token")
    integ = _integrity(db, pid)
    return {
        "name": f"VeriCanopy credit · {p.name} · vintage {vintage}",
        "description": "Living forest carbon credit. Integrity score updates every monitoring period.",
        "image": "",
        "decimals": 0,
        "properties": {
            "project_id": pid,
            "vintage": vintage,
            "project_status": p.status,
            "integrity_score_bps": integ["score_bps"],
            "last_period": integ["last_period"],
            "geometry_hash": p.geometry_hash,
        },
        "attributes": [
            {"trait_type": "Integrity score", "value": (integ["score_bps"] or 0) / 100},
            {"trait_type": "Status", "value": p.status},
        ],
    }
