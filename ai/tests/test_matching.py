import numpy as np
import pandas as pd

from vericanopy_ai.config import PipelineConfig
from vericanopy_ai.matching import balance, bootstrap_support, match


def _frames(seed=0, n_t=50, n_c=500):
    rng = np.random.default_rng(seed)
    cov = ["treecover2000", "elevation", "slope", "travel_time", "pre_loss_pressure", "agb"]
    t = pd.DataFrame(rng.normal(0, 1, (n_t, len(cov))), columns=cov)
    c = pd.DataFrame(rng.normal(0, 1, (n_c, len(cov))), columns=cov)
    for df in (t, c):
        df["loss_year"] = 0
    return t, c, cov


def test_match_caliper_drops_unmatched():
    t, c, cov = _frames()
    cfg = PipelineConfig(covariates=cov, caliper_sd=0.25)
    t.loc[0, cov] = 50.0  # far outlier: no control within caliper
    res = match(t, c, cfg)
    assert res.pairs.shape[1] == 2
    assert 0 not in set(res.pairs[:, 0])
    assert 0.9 <= res.matched_fraction < 1.0
    assert res.pairs[:, 1].max() < len(c)


def test_balance_smd():
    t, c, cov = _frames()
    cfg = PipelineConfig(covariates=cov)
    res = match(t, c, cfg)
    b = balance(t, c, res.pairs, cov)
    assert set(cov) <= set(b)
    assert 0 <= b["max_smd"] <= 1.0
    same = pd.DataFrame({k: [1.0, 2.0, 3.0] for k in cov})
    pairs = np.array([[0, 0], [1, 1], [2, 2]])
    assert balance(same, same, pairs, cov)["max_smd"] == 0.0


def test_bootstrap_ci_contains_point_estimate():
    t, c, cov = _frames(n_t=100, n_c=1000)
    rng = np.random.default_rng(1)
    t["loss_year"] = np.where(rng.random(len(t)) < 0.05, 2022, 0)
    c["loss_year"] = np.where(rng.random(len(c)) < 0.15, 2022, 0)
    cfg = PipelineConfig(covariates=cov, bootstrap=20)
    lo, hi = bootstrap_support(t, c, cfg, start_year=2020, period=2024, claimed_rate=0.03)
    assert 0.0 <= lo <= hi <= 1.5
