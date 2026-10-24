"""Before/after Sentinel-2 tiles for a project (F3 evidence viewer). Computed once with Earth Engine, then served
from the shared content store as `tile/<pid>/<year>`."""

from __future__ import annotations

import threading

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import ipfs
from app.db import SessionLocal, get_db
from app.models import NamedBlob, Project

router = APIRouter(prefix="/projects", tags=["tiles"])
_inflight: set[str] = set()


def _render(pid: int, year: int, geometry: dict) -> None:
    key = f"tile/{pid}/{year}"
    try:
        from vericanopy_ai.tiles import s2_thumbnail

        ipfs.put_named(key, s2_thumbnail(geometry, year))
    finally:
        _inflight.discard(key)


@router.get("/{pid}/tiles")
def tiles(pid: int, period: int | None = None, db: Session = Depends(get_db)):
    """Returns {before, after} with image URLs when ready; `pending: true` while Earth Engine renders them."""
    p = db.get(Project, pid)
    if not p or not p.geometry:
        raise HTTPException(status_code=404, detail="project not found")
    start = int((p.start_date or "2019")[:4])
    after = period or 2024
    out: dict = {
        "before": {"year": start},
        "after": {"year": after},
        "pending": False,
        "source": "Copernicus Sentinel-2 L2A via Google Earth Engine",
    }
    import os

    have_ee = bool(os.environ.get("EE_SERVICE_ACCOUNT_JSON") or os.environ.get("EE_SERVICE_ACCOUNT_JSON_B64"))
    for slot, year in (("before", start), ("after", after)):
        key = f"tile/{pid}/{year}"
        row = db.get(NamedBlob, key)
        if row:
            out[slot]["url"] = f"/api/v1/ipfs/{row.cid}"
        elif have_ee:
            out["pending"] = True
            if key not in _inflight:
                _inflight.add(key)
                threading.Thread(target=_render, args=(pid, year, p.geometry), daemon=True).start()
        else:
            out[slot]["unavailable"] = "Earth Engine credentials not configured"
    return out


def precompute(pid: int, years: list[int]) -> None:
    db = SessionLocal()
    try:
        p = db.get(Project, pid)
        for y in years:
            if db.get(NamedBlob, f"tile/{pid}/{y}") is None:
                _render(pid, y, p.geometry)
    finally:
        db.close()
