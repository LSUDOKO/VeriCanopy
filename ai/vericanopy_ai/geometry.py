"""Canonical GeoJSON serialisation and hashing (determinism rule, AGENT_INSTRUCTIONS §1.5)."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from shapely.geometry import shape

Geometry = dict[str, Any]


def canonical_geojson(geom: Geometry) -> bytes:
    """Sorted keys, no whitespace, UTF-8, coordinates rounded to 7 decimals (~1 cm)."""
    g = _round(geom)
    return json.dumps(g, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def geometry_sha256(geom: Geometry) -> str:
    return "0x" + hashlib.sha256(canonical_geojson(geom)).hexdigest()


def area_ha(geom: Geometry) -> float:
    """Approximate geodesic area in hectares using an equal-area scaling at the centroid latitude."""
    import math

    s = shape(geom)
    lat = math.radians(s.centroid.y)
    m_per_deg_lat = 111_320.0
    m_per_deg_lon = 111_320.0 * math.cos(lat)
    return s.area * m_per_deg_lat * m_per_deg_lon / 10_000.0


def _round(x: Any) -> Any:
    if isinstance(x, float):
        return round(x, 7)
    if isinstance(x, list):
        return [_round(v) for v in x]
    if isinstance(x, dict):
        return {k: _round(v) for k, v in x.items()}
    return x
