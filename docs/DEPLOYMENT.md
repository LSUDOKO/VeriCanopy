# Deployment (as built on 2026-10-21)

| Layer | Where | Identifier |
|---|---|---|
| Web (Next.js) | Vercel, project `vericanopy` (root dir `web/`) | https://vericanopy.vercel.app |
| API + indexer + finalizer | Render web service `vericanopy-api` (singapore, Docker, free plan — spins down after 15 min idle; upgrade to Starter for always-on indexing), built from `backend/Dockerfile`, auto-deploys from `main` | https://vericanopy-api.onrender.com |
| Standby | AWS App Runner `vericanopy-api` (ap-south-1), paused; image in ECR `vericanopy-backend` | https://mympbpgymg.ap-south-1.awsapprunner.com |
| Database | Neon Postgres 17, project `vericanopy` (aws-ap-southeast-1), schema managed by Alembic | `backend/alembic` |
| Marketplace | `Marketplace` 0x305a35aAf5347c98C02930d35854e9a9B1c2e481 on Base Sepolia (escrow, 1% fee to treasury = deployer) | listings indexed into `listings`/`trades` |
| Chain | Base Sepolia (84532) via `https://base-sepolia-rpc.publicnode.com` | `contracts/deployments/84532.json` once deployed |
| Secrets | `secrets/` (git-ignored) on the operator machine; App Runner / Vercel env for hosted services | never committed |

## Runbook

```bash
# 1. contracts + demo seed (needs a funded deployer; prints the address if unfunded)
scripts/deploy_testnet.sh

# 2. commit contracts/deployments/84532.json — Render rebuilds from main and the API picks it up by CHAIN_ID
git add contracts/deployments/84532.json && git commit -m "deploy: amoy" && git push

# 3. oracle run for a project/period (proves locally or on the App Runner instance once RUN_ZK_BOOTSTRAP=1)
cd backend && ../.venv/bin/python -m app.workers.oracle --project 1 --period 2023

# 4. backend: push to main; Render builds backend/Dockerfile automatically (render.yaml documents the service)

# 5. web
vercel --prod   # from the repo root (project root dir is web/)
```

## Environment variables (hosted API)
`DATABASE_URL`, `CHAIN_ID`, `RPC_URL`, `EXPLORER_URL`, `ADMIN_API_KEY`, `CORS_ORIGINS`, `ZK_MODE`, `DEPLOYMENTS_JSON`,
`ORACLE_PRIVATE_KEY` (only if the hosted instance submits scores), `PQ_PUBLIC_KEY_B64` / `PQ_SECRET_KEY_B64`,
`RUN_INDEXER`, `RUN_SCHEDULER`, `RUN_ZK_BOOTSTRAP`, `INDEXER_CONFIRMATIONS`, `IPFS_STORE_DIR`, `IPFS_API_URL` (optional kubo/pinning).

## Health & alerts
`GET /healthz` returns `indexer_lag` (latest − indexed block) and `zk_prover_ready`. Alert when lag > 50 blocks
or the oracle wallet balance drops below 0.1 MATIC (see `docs/spec/11_DEPLOYMENT.md` §7).

## Costs (approx.)
App Runner 2 vCPU/4 GB always-on ≈ US$50/month; Neon free tier; Vercel hobby; Sepolia gas is free testnet ETH.
