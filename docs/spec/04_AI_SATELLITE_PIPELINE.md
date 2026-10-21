# 04 · AI and Satellite Pipeline

Goal: for a project polygon and monitoring period, produce a reproducible feature vector and an integrity score, plus a reversal estimate in tCO2e.

Pipeline: **Extract → Match twins → Measure → Build features → Score (model) → Manifest**

---

## 1. Inputs
- `project.geojson` (polygon or multipolygon, EPSG:4326)
- `project_start` (date), `period` (e.g. calendar year 2024)
- `claimed_baseline_rate` (annual deforestation fraction claimed in the PDD, e.g. 0.012)
- `credited_area_ha`

## 2. Datasets (Earth Engine) `[VERIFY IDs/bands in the catalog]`

| Purpose | Dataset | Notes |
|---|---|---|
| Annual tree cover loss, baseline cover | `UMD/hansen/global_forest_change_*` (latest) | bands `treecover2000`, `lossyear`, `loss`, `gain` |
| Current-year provisional land cover | `GOOGLE/DYNAMICWORLD/V1` | probability of `trees` class, near-real-time |
| Cloud-free optical | `COPERNICUS/S2_SR_HARMONIZED` | NDVI/NBR, cloud mask via SCL band |
| Cloud-penetrating radar | `COPERNICUS/S1_GRD` | VV/VH backscatter change |
| Biomass density | `LARSE/GEDI/GEDI04_B_002` | Mg/ha above-ground biomass |
| Fire | `MODIS/061/MCD64A1` (+ `FIRMS`) | burned area per month |
| Terrain | `USGS/SRTMGL1_003` | elevation, slope |
| Access | `Oxford/MAP/accessibility_to_cities_2015_v1_0` | travel time (proxy for deforestation pressure) |
| Land cover context | `ESA/WorldCover/v200` | exclude water/urban |

Authenticate Earth Engine with a service account in production (`ee.Initialize(credentials, project=...)`).

## 3. Forest mask
A pixel is "forest at project start" if `treecover2000 ≥ 30` **and** not lost before `project_start` (Hansen `lossyear < start_year - 2000` means lost). Work at 30 m (Hansen native).

## 4. Counterfactual twins (matching)
Based on the logic of R1–R4, R7 (see research file).

1. **Treatment pixels (T):** forest pixels inside the project. Sample up to `n_t = 2000` (stratified random, fixed seed).
2. **Control pool (C):** forest pixels in a ring `10–50 km` outside the project boundary, excluding: other registered projects, WDPA protected areas (configurable), water/urban. Sample `n_c = 20000` (fixed seed).
3. **Covariates (pre-treatment):** `treecover2000`, elevation, slope, travel time to city, **pre-start loss pressure** (fraction of loss within 1 km in the 5 years before start), GEDI biomass, latitude/longitude (optional, for spatial balance).
4. **Matching:** standardise covariates; nearest-neighbour **Mahalanobis** matching with replacement, caliper 0.25 SD on the propensity score (logistic regression). Drop unmatched T pixels and record `matched_fraction`.
5. **Balance check:** standardised mean difference (SMD) per covariate; record `max_smd`. Target `max_smd < 0.1`; > 0.25 sets a data-quality flag.
6. **Bootstrap:** repeat matching on `B = 100` resamples (fixed seeds) to get confidence intervals.

All parameters (ring radii, sample sizes, seeds, caliper, covariates) go in the manifest because results depend on them (R7).

## 5. Measurements

Let `F` = forest area at start inside project (ha), `L_T` = annual loss rate of matched treatment pixels during the evaluation window, `L_C` = annual loss rate of their matched controls.

- **Observed avoided loss rate:** `ΔL = L_C − L_T`
- **Claimed avoided loss rate:** `ΔL_claim = claimed_baseline_rate − L_T`
- **Support ratio:** `r = clip(ΔL / ΔL_claim, 0, 1.5)` (if `ΔL_claim ≤ 0`, set `r = 0` and flag)
- **Carbon conversion:** `tCO2e = area_ha × AGB_Mg_per_ha × CF × 44/12`, with `CF = 0.47` (IPCC default carbon fraction) `[VERIFY]`. Below-ground biomass is excluded in v1 (conservative; documented).
- **Observed avoided emissions per year:** `ΔL × F × AGB × CF × 44/12`
- **Reversal this period:** gross forest loss inside the project during the period (Hansen; or Dynamic World + S1 provisional, flagged as provisional), converted to tCO2e.
- **Leakage indicator:** change in loss rate in the 0–10 km ring after start vs before start, relative to the outer ring.
- **Fire fraction:** burned area fraction inside the project this period.
- **SAR–optical agreement:** fraction of pixels where S2 NDVI-drop and S1 backscatter-change agree on loss / no-loss (robustness under clouds).

Provisional (current-year) detections never finalise burns on their own; they set status `UnderReview` until confirmed by the annual Hansen release or by two independent signals (Dynamic World + S1). This rule is in the manifest.

## 6. Feature vector (exactly 16 floats, fixed order; version `fv1`)

| # | Name | Range / normalisation |
|---|---|---|
| 0 | support_ratio `r` | 0–1.5 |
| 1 | support_ci_low | 0–1.5 |
| 2 | support_ci_high | 0–1.5 |
| 3 | max_smd | 0–1 (clip) |
| 4 | matched_fraction | 0–1 |
| 5 | project_loss_rate `L_T` | ×100, clip 0–10 |
| 6 | control_loss_rate `L_C` | ×100, clip 0–10 |
| 7 | leakage_delta | clip −1–1 |
| 8 | reversal_fraction | 0–1 |
| 9 | fire_fraction | 0–1 |
| 10 | cloud_free_fraction | 0–1 |
| 11 | sar_optical_agreement | 0–1 |
| 12 | biomass_trend | clip −1–1 |
| 13 | years_since_start / 30 | 0–1 |
| 14 | log10(claimed / observed + 1e-3) | clip −3–3 |
| 15 | data_freshness (days/365) | 0–2 |

Round each value to 6 decimals before hashing and proving (determinism).

## 7. Scoring model

### 7.1 Why a model (not only a formula)?
The score must weigh evidence strength, data quality, leakage and reversal risk jointly. We use a **small, transparent, monotone-friendly MLP** so it fits in a zk circuit:
- Architecture: `16 → 16 (ReLU) → 8 (ReLU) → 1 (Sigmoid)` (or hard-sigmoid if needed for EZKL efficiency). Under ~500 parameters.
- Export: ONNX opset supported by the installed EZKL version.

### 7.2 Training data (be honest about this)
v1 training uses **knowledge distillation from a transparent expert scoring function** plus any available labelled evaluations:

Expert target `f*(x)`:
```
base       = min(r, 1.0)
certainty  = 1 - clip((ci_high - ci_low) / 1.0, 0, 1) * 0.5
balance    = 1 - clip((max_smd - 0.1) / 0.4, 0, 1) * 0.4
coverage   = 0.6 + 0.4 * min(matched_fraction, cloud_free_fraction, sar_optical_agreement)
leak       = 1 - clip(leakage_delta, 0, 1) * 0.5
reversal   = 1 - clip(reversal_fraction * 5, 0, 1) * 0.6 - fire_fraction * 0.3
score*     = clip(base * certainty * balance * coverage * leak * reversal, 0, 1)
```
- Generate 200k synthetic feature vectors spanning realistic ranges + all real demo vectors; train MLP to match `score*` (MSE), then fine-tune on labelled cases if available (e.g. projects with published independent evaluations, label = published support ratio, clipped). Hold out 20%.
- Report: MAE vs expert function, monotonicity checks (increasing `r` never decreases score; increasing `reversal_fraction` never increases score), calibration plot. **Report only measured numbers.**
- State in the README: *"v1 model is distilled from a published, transparent scoring rule; zkML guarantees the published model was used, not that the rule is perfect. The rule is open to challenge and governance updates."*

### 7.3 Credit-relevant outputs
- `integrity_score` = model output (0–1), scaled to uint `score_bps` (0–10000) for on-chain use.
- `reversal_tCO2e` (integer tonnes, floor) is computed deterministically outside the model and committed in the manifest (the model proof covers the score; the reversal value is covered by the manifest signature + challenge game).

## 8. Manifest (`manifest.json`, schema `vc-manifest/1`)
```json
{
  "schema": "vc-manifest/1",
  "project_id": 3,
  "period": "2024",
  "geometry_sha256": "0x…",
  "h3_resolution": 9,
  "datasets": [{"id": "UMD/hansen/global_forest_change_2024_v1_12", "bands": ["lossyear","treecover2000"]}],
  "date_ranges": {"pre": ["2015-01-01","2019-12-31"], "eval": ["2020-01-01","2024-12-31"]},
  "matching": {"ring_km": [10,50], "n_t": 2000, "n_c": 20000, "seed": 42, "caliper_sd": 0.25, "bootstrap": 100, "covariates": ["…"]},
  "constants": {"carbon_fraction": 0.47, "forest_threshold": 30},
  "code_commit": "git sha",
  "feature_version": "fv1",
  "features": [0.41, 0.33, "…16 values…"],
  "feature_commitment": "0x… (Poseidon hash from EZKL, see 05)",
  "model_hash": "0x…",
  "score_bps": 4120,
  "reversal_tco2e": 0,
  "provisional": false,
  "created_at": "ISO-8601",
  "signatures": {"ml_dsa_65": "<base64>", "pq_key_id": "0x…"}
}
```

## 9. Code skeleton (`ai/vericanopy_ai/`)
```python
# extract.py
def forest_mask(geom, start_year) -> ee.Image: ...
def sample_pixels(geom, ring_km, n_t, n_c, seed) -> tuple[pd.DataFrame, pd.DataFrame]: ...
def covariates() -> ee.Image: ...           # stack of all covariate bands
def outcomes(start_year, eval_years) -> ee.Image: ...

# matching.py
def match(treat: pd.DataFrame, ctrl: pd.DataFrame, cfg) -> MatchResult: ...  # Mahalanobis + caliper
def balance(result) -> dict[str, float]: ...
def bootstrap(treat, ctrl, cfg, B=100) -> np.ndarray: ...

# features.py
def build_features(project, period, cfg) -> np.ndarray:  # shape (16,), rounded 6 dp

# model.py
def expert_score(x: np.ndarray) -> float: ...
def train(cfg) -> torch.nn.Module: ...
def export_onnx(model, path): ...

# score.py
def run(project_id: int, period: str) -> ScoreResult:  # features, score, reversal, manifest
```
Cache Earth Engine samples to `data/cache/{project}/{period}.parquet` so reruns and challenges are fast.

## 10. Validation checklist
- [ ] Re-running with the same manifest gives identical `features` (after rounding) and identical `score_bps`.
- [ ] On a polygon with a known large fire, `reversal_fraction` and `fire_fraction` rise in the fire year.
- [ ] Balance report shows `max_smd` for each run.
- [ ] Unit tests for every formula in §5 with hand-computed examples.
