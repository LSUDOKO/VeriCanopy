"""Counterfactual twin matching (04 §4): standardise → propensity → Mahalanobis NN with caliper."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import NearestNeighbors

from vericanopy_ai.config import PipelineConfig
from vericanopy_ai.measure import loss_rate, support_ratio


@dataclass
class MatchResult:
    pairs: np.ndarray  # (n, 2) [treat_idx, ctrl_idx]
    matched_fraction: float
    propensity_t: np.ndarray
    propensity_c: np.ndarray


def _whiten(t: np.ndarray, c: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    allx = np.vstack([t, c])
    mu = allx.mean(0)
    cov = np.cov(allx, rowvar=False) + np.eye(allx.shape[1]) * 1e-6
    # Mahalanobis distance == Euclidean distance in the whitened space
    evals, evecs = np.linalg.eigh(cov)
    w = evecs @ np.diag(1.0 / np.sqrt(np.maximum(evals, 1e-9))) @ evecs.T
    return (t - mu) @ w, (c - mu) @ w


def match(
    treat: pd.DataFrame, ctrl: pd.DataFrame, cfg: PipelineConfig, rng: np.random.Generator | None = None
) -> MatchResult:
    cov = cfg.covariates
    t = treat[cov].to_numpy(dtype=float)
    c = ctrl[cov].to_numpy(dtype=float)
    tw, cw = _whiten(t, c)
    X = np.vstack([tw, cw])
    y = np.r_[np.ones(len(tw)), np.zeros(len(cw))]
    lr = LogisticRegression(max_iter=200, C=1.0).fit(X, y)
    ps = lr.decision_function(X)  # logit scale
    ps_t, ps_c = ps[: len(tw)], ps[len(tw) :]
    caliper = cfg.caliper_sd * ps.std() if ps.std() > 0 else np.inf
    nn = NearestNeighbors(n_neighbors=min(10, len(cw))).fit(cw)
    _dist, idx = nn.kneighbors(tw)
    pairs = []
    for i in range(len(tw)):
        for j in idx[i]:
            if abs(ps_t[i] - ps_c[j]) <= caliper:
                pairs.append((i, int(j)))
                break
    pairs_arr = np.array(pairs, dtype=int).reshape(-1, 2)
    return MatchResult(pairs_arr, len(pairs_arr) / max(len(tw), 1), ps_t, ps_c)


def balance(
    treat: pd.DataFrame, ctrl: pd.DataFrame, pairs: np.ndarray, covariates: list[str]
) -> dict[str, float]:
    """Standardised mean difference per covariate on the matched sample, plus max_smd."""
    out: dict[str, float] = {}
    if len(pairs) == 0:
        for k in covariates:
            out[k] = 1.0
        out["max_smd"] = 1.0
        return out
    t = treat.iloc[pairs[:, 0]]
    c = ctrl.iloc[pairs[:, 1]]
    for k in covariates:
        a, b = t[k].to_numpy(dtype=float), c[k].to_numpy(dtype=float)
        sd = np.sqrt((a.var() + b.var()) / 2)
        out[k] = float(abs(a.mean() - b.mean()) / sd) if sd > 0 else 0.0
    out["max_smd"] = float(max(out[k] for k in covariates))
    return out


def effect(
    treat: pd.DataFrame, ctrl: pd.DataFrame, pairs: np.ndarray, start_year: int, period: int
) -> tuple[float, float]:
    """(L_T, L_C): annual loss rates of matched treatment pixels and their matched controls."""
    if len(pairs) == 0:
        return 0.0, 0.0
    lt = loss_rate(treat.iloc[pairs[:, 0]], start_year, period)
    lc = loss_rate(ctrl.iloc[pairs[:, 1]], start_year, period)
    return lt, lc


def bootstrap_support(
    treat: pd.DataFrame,
    ctrl: pd.DataFrame,
    cfg: PipelineConfig,
    start_year: int,
    period: int,
    claimed_rate: float,
) -> tuple[float, float]:
    """Percentile 95% CI of the support ratio over B resamples of matched pairs (fixed seed)."""
    res = match(treat, ctrl, cfg)
    if len(res.pairs) == 0:
        return 0.0, 0.0
    rng = np.random.default_rng(cfg.seed)
    vals = []
    for _ in range(cfg.bootstrap):
        sel = rng.integers(0, len(res.pairs), len(res.pairs))
        p = res.pairs[sel]
        lt, lc = effect(treat, ctrl, p, start_year, period)
        r, _ = support_ratio(lc - lt, claimed_rate - lt)
        vals.append(r)
    lo, hi = np.percentile(vals, [2.5, 97.5])
    return float(round(lo, 6)), float(round(hi, 6))
