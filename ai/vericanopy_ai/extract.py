"""Pixel sample extraction.

Two providers share one output contract (`Samples`):
- `EarthEngineProvider`: real Hansen / Dynamic World / Sentinel-1/2 / GEDI / MODIS data via earthengine-api.
  Requires `EE_SERVICE_ACCOUNT_JSON` (+ `EE_PROJECT`).
- `FixtureProvider`: deterministic synthetic samples generated from committed per-project parameters
  (`data/demo/samples/params.json`). Used when no credentials exist; outputs are labelled `provider: fixture`
  and must never be presented as real satellite measurements (docs/LIMITATIONS.md).

Columns (both providers):
  lat, lon, treecover2000, elevation, slope, travel_time, pre_loss_pressure, agb,
  loss_year (0 or year), burned_year (0 or year), ndvi_drop (0/1), sar_change (0/1),
  cloud_free (0-1), dw_trees_start, dw_trees_end
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

import numpy as np
import pandas as pd
from shapely.geometry import shape

from vericanopy_ai.config import DATASETS, DEMO_DIR, PipelineConfig
from vericanopy_ai.geometry import area_ha, geometry_sha256

COLUMNS = [
    "lat",
    "lon",
    "treecover2000",
    "elevation",
    "slope",
    "travel_time",
    "pre_loss_pressure",
    "agb",
    "loss_year",
    "burned_year",
    "ndvi_drop",
    "sar_change",
    "cloud_free",
    "dw_trees_start",
    "dw_trees_end",
]


@dataclass
class Project:
    id: str | int
    name: str
    geometry: dict[str, Any]
    start_date: str
    claimed_baseline_rate: float
    properties: dict[str, Any] = field(default_factory=dict)

    @property
    def start_year(self) -> int:
        return int(self.start_date[:4])

    @property
    def area_ha(self) -> float:
        return area_ha(self.geometry)

    @property
    def geometry_hash(self) -> str:
        return geometry_sha256(self.geometry)


@dataclass
class Samples:
    treat: pd.DataFrame
    ctrl: pd.DataFrame
    meta: dict[str, Any]


class Provider(Protocol):
    name: str

    def sample(self, project: Project, period: int, cfg: PipelineConfig) -> Samples: ...


def load_demo_project(name: str) -> Project:
    """Load `data/demo/project_<name>.geojson` (A, B, C, D_overlap)."""
    f = json.loads((DEMO_DIR / f"project_{name}.geojson").read_text())
    p = f["properties"]
    return Project(
        id=name,
        name=p["name"],
        geometry=f["geometry"],
        start_date=p["start_date"],
        claimed_baseline_rate=float(p["claimed_baseline_rate"]),
        properties=p,
    )


def get_provider(cfg: PipelineConfig) -> Provider:
    """`VC_PROVIDER=fixture|earthengine|auto`; auto picks Earth Engine only when credentials are configured."""
    mode = cfg.provider
    creds = os.environ.get("EE_SERVICE_ACCOUNT_JSON", "").strip()
    if mode == "fixture" or (mode == "auto" and not creds):
        return FixtureProvider()
    if not creds or not Path(creds).exists():
        raise RuntimeError(
            "Earth Engine provider requested but EE_SERVICE_ACCOUNT_JSON is missing or does not exist; "
            "set VC_PROVIDER=fixture to use fixture samples"
        )
    return EarthEngineProvider(creds, os.environ.get("EE_PROJECT") or None)


# ----------------------------------------------------------------- fixture


class FixtureProvider:
    """Deterministic synthetic pixel samples from committed parameters (seeded, no network)."""

    name = "fixture"

    def __init__(self, params_path: Path | None = None):
        self.params_path = params_path or DEMO_DIR / "samples" / "params.json"
        self.params = json.loads(self.params_path.read_text())

    def sample(self, project: Project, period: int, cfg: PipelineConfig) -> Samples:
        key = str(project.properties.get("demo_id") or project.id)
        if key not in self.params:
            raise RuntimeError(
                f"no fixture params for project {key}; set EE_SERVICE_ACCOUNT_JSON for real extraction"
            )
        p = self.params[key]
        seed = int(cfg.seed) * 1000 + int(p["seed"])
        rng = np.random.default_rng(seed)
        geom = shape(project.geometry)
        minx, miny, maxx, maxy = geom.bounds
        start = project.start_year
        years = list(range(2001, period + 1))

        def pixels(n: int, inside: bool) -> pd.DataFrame:
            if inside:
                pts = []
                while len(pts) < n:
                    xs = rng.uniform(minx, maxx, n)
                    ys = rng.uniform(miny, maxy, n)
                    for x, y in zip(xs, ys):
                        if geom.contains(_pt(x, y)):
                            pts.append((y, x))
                        if len(pts) == n:
                            break
                lat = np.array([a for a, _ in pts])
                lon = np.array([b for _, b in pts])
            else:
                # ring 10-50 km around the centroid (≈0.09-0.45 degrees)
                r = rng.uniform(0.09, 0.45, n)
                th = rng.uniform(0, 2 * np.pi, n)
                lat = geom.centroid.y + r * np.sin(th)
                lon = geom.centroid.x + r * np.cos(th) / np.cos(np.radians(geom.centroid.y))
            df = pd.DataFrame({"lat": lat, "lon": lon})
            df["treecover2000"] = np.clip(rng.normal(p["cover_mean"], 8, n), 30, 100)
            df["elevation"] = np.clip(rng.normal(p["elev_mean"], 60, n), 0, 3000)
            df["slope"] = np.clip(rng.gamma(2.0, 3.0, n), 0, 45)
            df["travel_time"] = np.clip(
                rng.normal(p["travel_mean"] * (1.0 if inside else 0.9), 90, n), 10, 2000
            )
            df["pre_loss_pressure"] = np.clip(rng.beta(2, 20, n) * p["pressure_scale"], 0, 1)
            df["agb"] = np.clip(rng.normal(p["agb_mean"], 25, n), 20, 400)
            df["cloud_free"] = np.clip(rng.beta(12, 2, n), 0, 1)
            df["dw_trees_start"] = np.clip(rng.beta(9, 1.5, n), 0, 1)
            return df

        treat = pixels(cfg.fixture_n_t, True)
        ctrl = pixels(cfg.fixture_n_c, False)

        def outcomes(df: pd.DataFrame, inside: bool) -> pd.DataFrame:
            n = len(df)
            # pixel-level hazard: control base rate scaled by pressure proxies
            pressure = (1.0 + df["pre_loss_pressure"] * 6.0) * (
                1.0 + np.clip(500 - df["travel_time"], 0, 500) / 500
            )
            pressure = pressure / pressure.mean()
            base = p["ctrl_loss_rate"] * pressure.to_numpy()
            loss_year = np.zeros(n, dtype=int)
            burned = np.zeros(n, dtype=int)
            alive = np.ones(n, dtype=bool)
            for y in years:
                h = base.copy()
                if inside and y >= start:
                    h = h * (1.0 - p["effect"])
                if not inside and y >= start:
                    h = h * (1.0 + p.get("leakage", 0.0))
                u = rng.random(n)
                lost = alive & (u < h)
                loss_year[lost] = y
                alive &= ~lost
                fy = p.get("fire_year")
                if fy and y == fy:
                    frac = p["fire_fraction_inside"] if inside else p.get("fire_fraction_outside", 0.0)
                    f = alive & (rng.random(n) < frac)
                    burned[f] = y
                    loss_year[f] = y
                    alive &= ~f
            df["loss_year"] = loss_year
            df["burned_year"] = burned
            lost_in_period = loss_year == period
            df["ndvi_drop"] = (lost_in_period & (rng.random(n) < 0.93)) | (
                ~lost_in_period & (rng.random(n) < 0.04)
            )
            df["sar_change"] = (lost_in_period & (rng.random(n) < 0.90)) | (
                ~lost_in_period & (rng.random(n) < 0.05)
            )
            df["ndvi_drop"] = df["ndvi_drop"].astype(int)
            df["sar_change"] = df["sar_change"].astype(int)
            df["dw_trees_end"] = np.where(
                loss_year > 0, rng.beta(1.5, 9, n), df["dw_trees_start"] * rng.uniform(0.97, 1.0, n)
            )
            return df[COLUMNS]

        treat = outcomes(treat, True)
        ctrl = outcomes(ctrl, False)
        meta = {
            "provider": self.name,
            "provenance": "fixture-synthetic",
            "params_sha256": _sha(self.params_path),
            "datasets": [
                {
                    "id": "fixture:" + str(self.params_path.relative_to(DEMO_DIR.parent.parent)),
                    "bands": COLUMNS,
                }
            ],
            "date_ranges": {
                "pre": [f"{start - cfg.pre_years}-01-01", f"{start - 1}-12-31"],
                "eval": [f"{start}-01-01", f"{period}-12-31"],
            },
            "provisional": False,
            "data_freshness_days": 0,
        }
        return Samples(treat=treat, ctrl=ctrl, meta=meta)


def _pt(x: float, y: float):
    from shapely.geometry import Point

    return Point(x, y)


def _sha(path: Path) -> str:
    import hashlib

    return "0x" + hashlib.sha256(path.read_bytes()).hexdigest()


# ------------------------------------------------------------ earth engine


class EarthEngineProvider:
    """Real extraction. Datasets per 04 §2; forest mask per 04 §3; ring sampling per 04 §4."""

    name = "earthengine"

    def __init__(self, service_account_json: str, project: str | None):
        try:
            import ee  # type: ignore
        except ImportError as e:  # pragma: no cover
            raise RuntimeError("earthengine-api not installed: pip install -e './ai[ee]'") from e
        info = json.loads(Path(service_account_json).read_text())
        creds = ee.ServiceAccountCredentials(info["client_email"], service_account_json)
        ee.Initialize(creds, project=project)
        self.ee = ee

    def sample(self, project: Project, period: int, cfg: PipelineConfig) -> Samples:  # pragma: no cover
        ee = self.ee
        start = project.start_year
        geom = ee.Geometry(project.geometry)
        hansen = ee.Image(DATASETS["hansen"]["id"])
        cover = hansen.select("treecover2000")
        lossyear = hansen.select("lossyear")  # 0 = no loss, 1..23 => 2001..2023
        forest_at_start = cover.gte(cfg.forest_threshold).And(lossyear.eq(0).Or(lossyear.gte(start - 2000)))
        srtm = ee.Image(DATASETS["srtm"]["id"])
        slope = ee.Terrain.slope(srtm)
        access = ee.Image(DATASETS["access"]["id"]).select("accessibility")
        agb = ee.ImageCollection(DATASETS["gedi"]["id"]).mosaic().select("MU")
        worldcover = ee.Image(DATASETS["worldcover"]["id"]).select("Map")
        valid = worldcover.neq(80).And(worldcover.neq(50))  # not water / built-up
        pre_loss = (
            lossyear.gte(start - 2000 - cfg.pre_years)
            .And(lossyear.lt(start - 2000))
            .focalMean(1000, "circle", "meters")
        )
        fire = (
            ee.ImageCollection(DATASETS["fire"]["id"])
            .filterDate(f"{start}-01-01", f"{period}-12-31")
            .select("BurnDate")
            .map(lambda img: img.gt(0).multiply(ee.Number(img.date().get("year"))))
            .max()
            .rename("burned_year")
        )
        dw = ee.ImageCollection(DATASETS["dynamic_world"]["id"]).select("trees")
        dw_start = dw.filterDate(f"{start}-01-01", f"{start}-12-31").mean().rename("dw_trees_start")
        dw_end = dw.filterDate(f"{period}-01-01", f"{period}-12-31").mean().rename("dw_trees_end")
        s2 = ee.ImageCollection(DATASETS["s2"]["id"]).filterBounds(geom)
        s2_prev = s2.filterDate(f"{period - 1}-01-01", f"{period - 1}-12-31").map(_s2_mask)
        s2_cur = s2.filterDate(f"{period}-01-01", f"{period}-12-31").map(_s2_mask)
        ndvi_prev = s2_prev.map(_ndvi).median()
        ndvi_cur = s2_cur.map(_ndvi).median()
        ndvi_drop = ndvi_prev.subtract(ndvi_cur).gt(0.25).rename("ndvi_drop")
        cloud_free = s2_cur.map(lambda i: i.select("B4").mask()).mean().rename("cloud_free")
        s1 = ee.ImageCollection(DATASETS["s1"]["id"]).filterBounds(geom).select("VV")
        s1_prev = s1.filterDate(f"{period - 1}-01-01", f"{period - 1}-12-31").median()
        s1_cur = s1.filterDate(f"{period}-01-01", f"{period}-12-31").median()
        sar_change = s1_prev.subtract(s1_cur).gt(2.0).rename("sar_change")
        loss_year_img = lossyear.add(2000).multiply(lossyear.gt(0)).rename("loss_year")
        stack = (
            ee.Image.cat(
                cover.rename("treecover2000"),
                srtm.rename("elevation"),
                slope.rename("slope"),
                access.rename("travel_time"),
                pre_loss.rename("pre_loss_pressure"),
                agb.rename("agb"),
                loss_year_img,
                fire.unmask(0),
                ndvi_drop.unmask(0),
                sar_change.unmask(0),
                cloud_free.unmask(0),
                dw_start.unmask(0),
                dw_end.unmask(0),
            )
            .updateMask(forest_at_start)
            .updateMask(valid)
        )
        inner_km, outer_km = cfg.ring_km
        ring = geom.buffer(outer_km * 1000).difference(geom.buffer(inner_km * 1000))
        treat = _to_df(stack.sample(region=geom, scale=30, numPixels=cfg.n_t, seed=cfg.seed, geometries=True))
        ctrl = _to_df(
            stack.sample(region=ring, scale=30, numPixels=cfg.n_c, seed=cfg.seed + 1, geometries=True)
        )
        meta = {
            "provider": self.name,
            "provenance": "earth-engine",
            "datasets": [{"id": v["id"], "bands": v["bands"]} for v in DATASETS.values()],
            "date_ranges": {
                "pre": [f"{start - cfg.pre_years}-01-01", f"{start - 1}-12-31"],
                "eval": [f"{start}-01-01", f"{period}-12-31"],
            },
            "provisional": period >= 2024,
            "data_freshness_days": 0,
        }
        return Samples(treat=treat[COLUMNS], ctrl=ctrl[COLUMNS], meta=meta)


def _s2_mask(img):  # pragma: no cover
    scl = img.select("SCL")
    good = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
    return img.updateMask(good)


def _ndvi(img):  # pragma: no cover
    return img.normalizedDifference(["B8", "B4"]).rename("ndvi")


def _to_df(fc) -> pd.DataFrame:  # pragma: no cover
    feats = fc.getInfo()["features"]
    rows = []
    for f in feats:
        props = dict(f["properties"])
        lon, lat = f["geometry"]["coordinates"]
        props["lat"], props["lon"] = lat, lon
        rows.append(props)
    return pd.DataFrame(rows)
