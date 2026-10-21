"""Pipeline configuration. Every parameter here is written into the score manifest (04 §8)."""

from __future__ import annotations

import os
from dataclasses import asdict, dataclass, field
from pathlib import Path

FEATURE_VERSION = "fv1"
FEATURE_NAMES: list[str] = [
    "support_ratio",
    "support_ci_low",
    "support_ci_high",
    "max_smd",
    "matched_fraction",
    "project_loss_rate",
    "control_loss_rate",
    "leakage_delta",
    "reversal_fraction",
    "fire_fraction",
    "cloud_free_fraction",
    "sar_optical_agreement",
    "biomass_trend",
    "years_since_start",
    "log_claim_ratio",
    "data_freshness",
]

DEFAULT_COVARIATES = ["treecover2000", "elevation", "slope", "travel_time", "pre_loss_pressure", "agb"]

# Earth Engine dataset ids (04 §2). [VERIFY] against the catalog before a live run.
DATASETS = {
    "hansen": {
        "id": "UMD/hansen/global_forest_change_2023_v1_11",
        "bands": ["treecover2000", "lossyear", "gain"],
    },
    "dynamic_world": {"id": "GOOGLE/DYNAMICWORLD/V1", "bands": ["trees"]},
    "s2": {"id": "COPERNICUS/S2_SR_HARMONIZED", "bands": ["B4", "B8", "B12", "SCL"]},
    "s1": {"id": "COPERNICUS/S1_GRD", "bands": ["VV", "VH"]},
    "gedi": {"id": "LARSE/GEDI/GEDI04_B_002", "bands": ["MU"]},
    "fire": {"id": "MODIS/061/MCD64A1", "bands": ["BurnDate"]},
    "srtm": {"id": "USGS/SRTMGL1_003", "bands": ["elevation"]},
    "access": {"id": "Oxford/MAP/accessibility_to_cities_2015_v1_0", "bands": ["accessibility"]},
    "worldcover": {"id": "ESA/WorldCover/v200", "bands": ["Map"]},
}

REPO_ROOT = Path(__file__).resolve().parents[2]
DEMO_DIR = REPO_ROOT / "data" / "demo"
OUTPUT_DIR = REPO_ROOT / "data" / "outputs"
CACHE_DIR = REPO_ROOT / "data" / "cache"


@dataclass
class PipelineConfig:
    ring_km: tuple[float, float] = (10.0, 50.0)
    n_t: int = 2000
    n_c: int = 20000
    seed: int = 42
    caliper_sd: float = 0.25
    bootstrap: int = 100
    covariates: list[str] = field(default_factory=lambda: list(DEFAULT_COVARIATES))
    forest_threshold: int = 30
    carbon_fraction: float = 0.47
    pre_years: int = 5
    h3_resolution: int = 8
    # fixture provider sizes (kept small so tests and demo runs are fast)
    fixture_n_t: int = 1500
    fixture_n_c: int = 9000
    provider: str = field(default_factory=lambda: os.environ.get("VC_PROVIDER", "auto"))

    def to_manifest(self) -> dict:
        d = asdict(self)
        d.pop("provider", None)
        d["ring_km"] = list(self.ring_km)
        return d
