# Feeds, monitoring and certificates

Read-only additions on top of the indexed chain state and the Earth Engine pipeline. All routes are under
`/api/v1`; nothing here writes to the chain.

## Endpoints

| Route | What it returns |
|---|---|
| `GET /projects/{id}/fires?days=30` | NASA FIRMS (MODIS 1 km) active-fire detections inside the parcel: `count`, `max_brightness_k`, `last_detection`, `points` (GeoJSON). `available:false` with a `reason` when Earth Engine is not configured. Cached 6 h as named blob `fires/{id}/{date}/{days}`. |
| `GET /alerts?project_id=&limit=` | Flat event feed from indexed tables: finalised/rejected submissions, challenges, buffer burns, freezes, listings, trades, retirements. Sorted newest first. |
| `GET /alerts.rss`, `GET /projects/{id}/alerts.rss` | Same feed as RSS 2.0 (stdlib XML), for feed readers and Slack/Zapier hooks. |
| `GET /market/price-guide` | Per integrity band (A ≥ 85, B 70–85, C 55–70, D < 55): open-listing median/min/max, trade median, reference low/high (trades, else listings), counts and a `methodology` string. |
| `GET /status` | Health board: database, RPC chain id + head, indexer lag, Earth Engine, ML-DSA signer, keeper balance, content store size, last oracle job / finalised submission / challenge, contract addresses. Overall `operational | degraded | outage`. |
| `GET /model` | Model card: on-chain `ModelRegistry` entry (verifier, active, scales) vs repo artifacts (ONNX sha256, verifying-key sha256, `matches_chain`), training report, zk circuit params and benchmarks, PQ benchmarks, feature list, satellite datasets, protocol params. |
| `GET /retirements?holder=`, `GET /retirements/{id}` | Retirement records with project, vintage, beneficiary, score at retirement, tx link and a `serial` (`VC-000123`). |
| `GET /projects/{id}/ring?km=10` | Leakage ring GeoJSON (buffer minus parcel) and, with Earth Engine, Hansen loss % per year 2018–2025 inside the parcel vs inside the ring. Cached as named blob `ring/{id}/{km}`. |

## Web

| Page / component | Purpose |
|---|---|
| `/status` | Apple-style status board, auto-refresh 30 s, contract table linking to Basescan. |
| `/model` | Model registry page: hash match check, circuit parameters, benchmarks, data sources. |
| `/retirements`, `/retirements/[id]` | Retirement list and a printable certificate (print CSS, "Verify on-chain"). |
| `FireBadge` | `{projectId}` → green "No fires · 30d" or red "N fire detections · 30d" pill with tooltip. |
| `PriceGuide` | Band cards for the market page. |
| `YearSlider` | `{projectId, years?, onYear?}` → scrub Sentinel-2 composites 2017–2025 with play and crossfade; tiles render on demand through `/projects/{id}/tiles?period=YEAR`. |
| `RingOverlay` | `useRing(projectId, km)` returns `{ layer: { id, data, paint: { fill, line } } }` for MapLibre; `RingLegend` draws the parcel-vs-ring loss bars. |

Types and fetchers live in `web/lib/feeds.ts`. Tests: `backend/tests/test_feeds.py`.
