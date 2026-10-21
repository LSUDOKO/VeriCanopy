#!/usr/bin/env bash
# Deploy the full stack to Polygon Amoy with the generated wallets in secrets/amoy-keys.json,
# then seed demo projects and push the addresses to the hosted API (App Runner) and web (Vercel).
# Prereq: fund the deployer address with ~2 MATIC (Amoy faucet) and the oracle with ~0.5 MATIC.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.config/.foundry/bin:$PATH"
KEYS=secrets/amoy-keys.json
export RPC_URL="${RPC_URL:-https://polygon-amoy-bor-rpc.publicnode.com}"
export DEPLOYER_KEY=$(python3 -c "import json;print(json.load(open('$KEYS'))['deployer']['private_key'])")
export ORACLE_ADDRESS=$(python3 -c "import json;print(json.load(open('$KEYS'))['oracle']['address'])")
export ORACLE_PRIVATE_KEY=$(python3 -c "import json;print(json.load(open('$KEYS'))['oracle']['private_key'])")
export RESOLVER_ADDRESSES=$(python3 -c "import json;d=json.load(open('$KEYS'));print(','.join(d[k]['address'] for k in ('resolver1','resolver2','resolver3')))")
export API_URL="${API_URL:-https://mympbpgymg.ap-south-1.awsapprunner.com}"
export CHAIN_ID=80002 DEPLOYMENTS_FILE=./contracts/deployments/80002.json
export PQ_PUBLIC_KEY_PATH=secrets/ml_dsa_65.pk PQ_SECRET_KEY_PATH=secrets/ml_dsa_65.sk
export DATABASE_URL="sqlite:///./data/amoy-local.db"  # local scratch DB for seeding/oracle runs; the hosted API has its own
BAL=$(cast balance --rpc-url "$RPC_URL" "$(cast wallet address --private-key "$DEPLOYER_KEY")")
echo "deployer balance: $BAL wei"
[ "$BAL" != "0" ] || { echo "fund the deployer first: $(cast wallet address --private-key "$DEPLOYER_KEY")"; exit 1; }
.venv/bin/python scripts/deploy_all.py
.venv/bin/python scripts/seed.py
echo "== deployments/80002.json written; now point the hosted API at it:"
echo "aws apprunner update-service ... DEPLOYMENTS_JSON=\$(cat contracts/deployments/80002.json | jq -c .)   (see docs/DEPLOYMENT.md)"
