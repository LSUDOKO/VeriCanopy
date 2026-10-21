"""Measurement formulas (04 §5). Pure functions with hand-checked unit tests."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd

CARBON_FRACTION = 0.47  # IPCC default carbon fraction of dry biomass [VERIFY]
CO2_PER_C = 44.0 / 12.0


def loss_rate(df: pd.DataFrame, start_year: int, end_year: int) -> float:
    """Annual loss rate over [start_year, end_year] among pixels still forest at start_year."""
    ly = df["loss_year"].to_numpy()
    at_start = (ly == 0) | (ly >= start_year)
    n = int(at_start.sum())
    if n == 0:
        return 0.0
    lost = ((ly >= start_year) & (ly <= end_year) & at_start).sum()
    years = max(end_year - start_year + 1, 1)
    return float(lost) / n / years


def support_ratio(delta_l: float, delta_l_claim: float) -> tuple[float, bool]:
    """r = clip(ΔL / ΔL_claim, 0, 1.5); if ΔL_claim <= 0 → r = 0 and flag."""
    if delta_l_claim <= 0:
        return 0.0, True
    return float(min(max(delta_l / delta_l_claim, 0.0), 1.5)), False


def tco2e(area_ha: float, agb_mg_per_ha: float, cf: float = CARBON_FRACTION) -> float:
    return area_ha * agb_mg_per_ha * cf * CO2_PER_C


def reversal_fraction(df: pd.DataFrame, period: int) -> float:
    """Fraction of pixels (forest at period start) lost during `period`."""
    ly = df["loss_year"].to_numpy()
    at_start = (ly == 0) | (ly >= period)
    n = int(at_start.sum())
    return float((ly == period).sum()) / n if n else 0.0


def fire_fraction(df: pd.DataFrame, period: int) -> float:
    if len(df) == 0:
        return 0.0
    return float((df["burned_year"].to_numpy() == period).mean())


def sar_optical_agreement(df: pd.DataFrame) -> float:
    if len(df) == 0:
        return 0.0
    return float((df["ndvi_drop"].to_numpy() == df["sar_change"].to_numpy()).mean())


def leakage_delta(inner_after: float, inner_before: float, outer_after: float, outer_before: float) -> float:
    """Change in the 0–10 km ring loss rate after vs before start, relative to the outer ring; clipped to [-1, 1]."""
    inner = _rel(inner_after, inner_before)
    outer = _rel(outer_after, outer_before)
    return float(max(-1.0, min(1.0, inner - outer)))


def _rel(after: float, before: float) -> float:
    if before <= 0:
        return 0.0 if after <= 0 else 1.0
    return (after - before) / before


def biomass_trend(df: pd.DataFrame) -> float:
    """Relative change of Dynamic World tree probability start→end, clipped to [-1, 1]."""
    s = df["dw_trees_start"].to_numpy()
    e = df["dw_trees_end"].to_numpy()
    if len(s) == 0 or s.mean() <= 0:
        return 0.0
    return float(max(-1.0, min(1.0, (e.mean() - s.mean()) / s.mean())))


def log_claim_ratio(claimed_rate: float, observed_delta: float) -> float:
    v = math.log10(max(claimed_rate, 0.0) / max(observed_delta, 0.0) + 1e-3) if observed_delta > 0 else 3.0
    return float(max(-3.0, min(3.0, v)))


def clip(x: float, lo: float, hi: float) -> float:
    return float(np.clip(x, lo, hi))
