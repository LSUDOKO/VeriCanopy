"""NASA FIRMS active-fire detections over a project polygon (MODIS 1 km via Earth Engine), cached 6 h."""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime, timedelta

from app import ipfs

CACHE_SECONDS = 6 * 3600


def ee_available() -> bool:
    return bool(os.environ.get("EE_SERVICE_ACCOUNT_JSON") or os.environ.get("EE_SERVICE_ACCOUNT_JSON_B64"))


def _query(geometry: dict, days: int) -> dict:  # pragma: no cover - needs EE
    from vericanopy_ai.tiles import _init

    ee = _init()
    geom = ee.Geometry(geometry)
    end = datetime.now(UTC).date()
    start = end - timedelta(days=days)
    col = ee.ImageCollection("FIRMS").filterDate(str(start), str(end + timedelta(days=1))).filterBounds(geom)
    pts = (
        col.select(["T21", "confidence"])
        .map(lambda img: img.updateMask(img.select("T21").gt(0)).sample(region=geom, scale=1000, geometries=True)
             .map(lambda f: f.set("date", img.date().format("YYYY-MM-dd"))))
        .flatten()
    )
    fc = pts.getInfo()
    feats = fc.get("features", [])
    out_feats = []
    for f in feats:
        p = f.get("properties", {})
        out_feats.append(
            {
                "type": "Feature",
                "geometry": f["geometry"],
                "properties": {"brightness_k": p.get("T21"), "confidence": p.get("confidence"), "date": p.get("date")},
            }
        )
    dates = sorted(d for d in (f["properties"]["date"] for f in out_feats) if d)
    return {
        "count": len(out_feats),
        "max_brightness_k": max((f["properties"]["brightness_k"] or 0) for f in out_feats) if out_feats else None,
        "last_detection": dates[-1] if dates else None,
        "points": {"type": "FeatureCollection", "features": out_feats},
    }


def fires_for(pid: int, geometry: dict, days: int = 30) -> dict:
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    key = f"fires/{pid}/{today}/{days}"
    cached = ipfs.get_named_json(key)
    if cached and (datetime.now(UTC).timestamp() - cached.get("computed_at", 0)) < CACHE_SECONDS:
        return cached
    base = {"project_id": pid, "days": days, "source": "NASA FIRMS (MODIS C6.1 1 km) via Google Earth Engine"}
    if not ee_available():
        return {**base, "available": False, "reason": "Earth Engine credentials not configured"}
    try:
        res = _query(geometry, days)
    except Exception as e:  # pragma: no cover
        return {**base, "available": False, "reason": f"Earth Engine query failed: {e}"[:200]}
    out = {**base, "available": True, "computed_at": datetime.now(UTC).timestamp(), **res}
    ipfs.put_named(key, json.dumps(out).encode())
    return out
