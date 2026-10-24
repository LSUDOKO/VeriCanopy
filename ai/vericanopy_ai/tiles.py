"""Sentinel-2 true-colour thumbnails for the evidence viewer (before/after a project's start).

Uses the same Earth Engine credentials as extraction. Returns PNG bytes; callers cache them.
"""

from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path
from typing import Any


def _init():
    import ee  # type: ignore

    creds = os.environ.get("EE_SERVICE_ACCOUNT_JSON", "").strip()
    b64 = os.environ.get("EE_SERVICE_ACCOUNT_JSON_B64", "").strip()
    if not creds and b64:
        import base64
        import tempfile

        f = Path(tempfile.gettempdir()) / "vc-ee-service-account.json"
        if not f.exists():
            f.write_bytes(base64.b64decode(b64))
        creds = str(f)
    if not creds or not Path(creds).exists():
        raise RuntimeError("Earth Engine credentials not configured")
    info = json.loads(Path(creds).read_text())
    ee.Initialize(
        ee.ServiceAccountCredentials(info["client_email"], creds),
        project=os.environ.get("EE_PROJECT") or None,
    )
    return ee


def s2_thumbnail(geometry: dict[str, Any], year: int, buffer_m: int = 2500, dimensions: int = 800) -> bytes:
    """Cloud-masked Sentinel-2 median composite for `year` around the geometry, as PNG bytes."""
    ee = _init()
    geom = ee.Geometry(geometry)
    region = geom.buffer(buffer_m).bounds()
    col = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(region)
        .filterDate(f"{year}-01-01", f"{year}-12-31")
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
    )

    def mask(i):
        scl = i.select("SCL")
        return i.updateMask(scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)))

    img = col.map(mask).median().select(["B4", "B3", "B2"]).visualize(min=200, max=2500, gamma=1.3)
    outline = (
        ee.Image().byte().paint(ee.FeatureCollection([ee.Feature(geom)]), 1, 3).visualize(palette=["b6fe00"])
    )
    url = (
        ee.ImageCollection([img, outline])
        .mosaic()
        .getThumbURL({"region": region, "dimensions": dimensions, "format": "png"})
    )
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read()
