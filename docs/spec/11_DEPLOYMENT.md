# 11 · Deployment and DevOps

## 1. Environments
| Env | Chain | Hosting | Purpose |
|---|---|---|---|
| local | Anvil (Foundry) | docker-compose | development, e2e tests |
| staging/demo | Polygon Amoy (80002) `[VERIFY RPC + faucet]` | Vercel (web), Railway/Render/Fly (api, worker, indexer), managed Postgres with PostGIS, Redis | hackathon demo |
| prod (future) | to be decided after audit (L2 with low fees) | same pattern, multi-region, secrets manager | real launch |

## 2. docker-compose (dev)
Services: `postgres` (postgis/postgis:16), `redis`, `ipfs` (ipfs/kubo), `anvil` (ghcr foundry image), `api`, `worker`, `indexer`, `web`.

## 3. Make targets
```
make setup      # install deps (forge, uv/pip, pnpm)
make chain      # start anvil
make deploy     # forge script Deploy.s.sol → deployments/<chainId>.json
make seed       # register Demo Projects A, B, C; mint demo vintages
make pipeline P=1 Y=2024   # run AI pipeline for a project/period
make prove      # EZKL proof for last pipeline output
make submit     # oracle submits score
make e2e        # full scripted scenario
make test       # forge test + pytest + web tests
```

## 4. Contract deployment (testnet)
```bash
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $DEPLOYER_KEY --broadcast --verify
```
- Verify contracts on the block explorer (needs explorer API key).
- Publish all addresses in README and `/security` page.

## 5. CI (GitHub Actions)
- Jobs: `contracts` (forge fmt --check, forge build, forge test, slither), `ai` (ruff, pytest; Earth Engine tests mocked with cached parquet fixtures), `backend` (pytest with Postgres service), `web` (lint, typecheck, build, Playwright against preview).
- Secrets never printed; Earth Engine live tests only on manual workflow dispatch.

## 6. Demo data preparation
- `data/demo/project_A.geojson`: intact forest, honest project (expect high score).
- `data/demo/project_B.geojson`: area whose twins show low deforestation pressure, with an inflated claimed baseline (expect low score / large claim gap). Drawn by us, not a real project.
- `data/demo/project_C.geojson`: polygon in an area with a real, documented large wildfire (e.g. 2021 fires in Antalya/Muğla, Türkiye `[VERIFY location/dates via MODIS burned area]`) to demonstrate reversal.
- `data/demo/project_D_overlap.geojson`: overlaps A, used to show rejection.
- Precompute pipeline outputs for each period; store in `data/demo/outputs/` and IPFS; Demo Mode replays these with real on-chain submissions on testnet.

## 7. Observability
- Structured JSON logs; job logs viewable in admin UI.
- Health endpoints `/healthz`; uptime check on api and indexer lag (`latest block - indexed block`).
- Alert if indexer lag > 50 blocks or oracle balance below threshold.
