"""Leakage ring: a `km`-wide buffer around the parcel, plus Hansen loss per year inside parcel vs ring (EE)."""

from __future__ import annotations

import json
import math
from datetime import UTC, datetime

from shapely.geometry import mapping, shape
from shapely.ops import transform

from app import ipfs
from app.services.fires import ee_available

HANSEN = "UMD/hansen/global_forest_change_2025_v1_13"
YEARS = list(range(2018, 2026))


def ring_geojson(geometry: dict, km: float) -> dict:
    """Buffer in a local equirectangular metre frame (ponytail: fine for parcels < ~200 km; use pyproj UTM beyond)."""
    g = shape(geometry)
    lat0, lon0 = g.centroid.y, g.centroid.x
    kx, ky = 111_320.0 * math.cos(math.radians(lat0)), 111_320.0
    fwd = lambda x, y, z=None: ((x - lon0) * kx, (y - lat0) * ky)  # noqa: E731
    inv = lambda x, y, z=None: (x / kx + lon0, y / ky + lat0)  # noqa: E731
    local = transform(fwd, g)
    ring = transform(inv, local.buffer(km * 1000).difference(local))
    return mapping(ring)


def _loss_by_year(geometry: dict, ring: dict) -> dict:  # pragma: no cover - needs EE
    from vericanopy_ai.tiles import _init

    ee = _init()
    hansen = ee.Image(HANSEN)
    cover = hansen.select("treecover2000").gte(30)
    lossyear = hansen.select("lossyear").unmask(0)
    out = {"parcel": {}, "ring": {}}
    for name, geom in (("parcel", ee.Geometry(geometry)), ("ring", ee.Geometry(ring))):
        forest = cover.reduceRegion(ee.Reducer.sum(), geom, 30, maxPixels=1e10, bestEffort=True).get("treecover2000")
        bands = ee.Image.cat([lossyear.eq(y - 2000).And(cover).rename(f"y{y}") for y in YEARS])
        loss = bands.reduceRegion(ee.Reducer.sum(), geom, 30, maxPixels=1e10, bestEffort=True)
        info = ee.Dictionary({"forest": forest, "loss": loss}).getInfo()
        f = float(info["forest"] or 0) or 1.0
        out[name] = {str(y): round(100.0 * float(info["loss"].get(f"y{y}") or 0) / f, 4) for y in YEARS}
    return out


def ring_for(pid: int, geometry: dict, km: float = 10.0) -> dict:
    key = f"ring/{pid}/{km:g}"
    cached = ipfs.get_named_json(key)
    if cached and (cached.get("loss_pct") or not ee_available()):
        return cached
    ring = ring_geojson(geometry, km)
    out = {
        "project_id": pid,
        "km": km,
        "ring": {"type": "Feature", "geometry": ring, "properties": {"km": km}},
        "years": YEARS,
        "loss_pct": None,
        "source": f"{HANSEN} (tree cover >= 30 %, loss per year as % of year-2000 forest)",
        "computed_at": datetime.now(UTC).isoformat(),
    }
    if ee_available():
        try:
            out["loss_pct"] = _loss_by_year(geometry, ring)
        except Exception as e:  # pragma: no cover
            out["error"] = str(e)[:200]
    ipfs.put_named(key, json.dumps(out).encode())
    return out
