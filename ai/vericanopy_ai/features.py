"""Build the fv1 feature vector (04 §6) from samples. 16 floats, fixed order, rounded to 6 dp."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from vericanopy_ai.config import FEATURE_NAMES, PipelineConfig
from vericanopy_ai.extract import Project, Samples
from vericanopy_ai.matching import balance, bootstrap_support, effect, match
from vericanopy_ai.measure import (
    biomass_trend,
    clip,
    fire_fraction,
    leakage_delta,
    log_claim_ratio,
    loss_rate,
    reversal_fraction,
    sar_optical_agreement,
    support_ratio,
    tco2e,
)


@dataclass
class FeatureResult:
    vector: list[float]
    diagnostics: dict[str, Any]
    reversal_tco2e: int
    provisional: bool


def build_features(samples: Samples, project: Project, period: int, cfg: PipelineConfig) -> FeatureResult:
    treat, ctrl = samples.treat, samples.ctrl
    start = project.start_year
    res = match(treat, ctrl, cfg)
    bal = balance(treat, ctrl, res.pairs, cfg.covariates)
    lt, lc = effect(treat, ctrl, res.pairs, start, period)
    delta_l = lc - lt
    delta_claim = project.claimed_baseline_rate - lt
    r, flag = support_ratio(delta_l, delta_claim)
    ci_lo, ci_hi = bootstrap_support(treat, ctrl, cfg, start, period, project.claimed_baseline_rate)

    # leakage: inner ring (closest third of controls by distance proxy) vs outer, before vs after start
    d = np.hypot(ctrl["lat"] - treat["lat"].mean(), ctrl["lon"] - treat["lon"].mean())
    inner = ctrl[d <= np.quantile(d, 0.33)]
    outer = ctrl[d > np.quantile(d, 0.33)]
    pre0, pre1 = max(start - cfg.pre_years, 2001), start - 1
    leak = leakage_delta(
        loss_rate(inner, start, period),
        loss_rate(inner, pre0, pre1),
        loss_rate(outer, start, period),
        loss_rate(outer, pre0, pre1),
    )
    rev_frac = reversal_fraction(treat, period)
    fire = fire_fraction(treat, period)
    cloud = float(treat["cloud_free"].mean()) if len(treat) else 0.0
    agree = sar_optical_agreement(treat)
    btrend = biomass_trend(treat)
    years_since = period - start + 1
    freshness = float(samples.meta.get("data_freshness_days", 0)) / 365.0
    agb = float(treat["agb"].mean()) if len(treat) else 0.0
    forest_area = project.area_ha * float(((treat["loss_year"] == 0) | (treat["loss_year"] >= period)).mean())
    reversal = int(np.floor(tco2e(forest_area * rev_frac, agb, cfg.carbon_fraction)))

    vec = [
        clip(r, 0, 1.5),
        clip(ci_lo, 0, 1.5),
        clip(ci_hi, 0, 1.5),
        clip(bal["max_smd"], 0, 1),
        clip(res.matched_fraction, 0, 1),
        clip(lt * 100, 0, 10),
        clip(lc * 100, 0, 10),
        clip(leak, -1, 1),
        clip(rev_frac, 0, 1),
        clip(fire, 0, 1),
        clip(cloud, 0, 1),
        clip(agree, 0, 1),
        clip(btrend, -1, 1),
        clip(years_since / 30.0, 0, 1),
        log_claim_ratio(project.claimed_baseline_rate, delta_l),
        clip(freshness, 0, 2),
    ]
    vec = [float(round(v, 6)) for v in vec]
    diagnostics = {
        "feature_names": FEATURE_NAMES,
        "n_treat": len(treat),
        "n_ctrl": len(ctrl),
        "n_pairs": len(res.pairs),
        "balance": bal,
        "project_loss_rate": lt,
        "control_loss_rate": lc,
        "observed_avoided_loss_rate": delta_l,
        "claimed_avoided_loss_rate": delta_claim,
        "claim_flag_no_claimable_effect": flag,
        "support_ci": [ci_lo, ci_hi],
        "years_since_start": years_since,
        "forest_area_ha_estimate": forest_area,
        "agb_mg_per_ha": agb,
        "observed_avoided_tco2e_per_year": tco2e(forest_area * delta_l, agb, cfg.carbon_fraction),
        "claimed_avoided_tco2e_per_year": tco2e(forest_area * max(delta_claim, 0), agb, cfg.carbon_fraction),
        "fire_fraction": fire,
        "reversal_fraction": rev_frac,
    }
    provisional = bool(samples.meta.get("provisional", False))
    # provisional (current-year) detections never finalise burns alone (04 §5)
    if provisional and reversal > 0:
        reversal = 0
    return FeatureResult(vec, diagnostics, reversal, provisional)
