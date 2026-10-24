#!/usr/bin/env bash
# Deploy the full stack to a testnet (default Base Sepolia) with the generated wallets in secrets/amoy-keys.json,
# then seed demo projects and push the addresses to the hosted API (App Runner) and web (Vercel).
# Prereq: fund the deployer (~0.3 ETH on Sepolia) and the oracle (~0.05 ETH). Override CHAIN_ID/RPC_URL/EXPLORER_URL for another chain.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.config/.foundry/bin:$PATH"
KEYS=secrets/amoy-keys.json
export RPC_URL="${RPC_URL:-https://base-sepolia-rpc.publicnode.com}"
export CHAIN_ID="${CHAIN_ID:-84532}"
export DEPLOYER_KEY=$(python3 -c "import json;print(json.load(open('$KEYS'))['deployer']['private_key'])")
export ORACLE_ADDRESS=$(python3 -c "import json;print(json.load(open('$KEYS'))['oracle']['address'])")
export ORACLE_PRIVATE_KEY=$(python3 -c "import json;print(json.load(open('$KEYS'))['oracle']['private_key'])")
export RESOLVER_ADDRESSES=$(python3 -c "import json;d=json.load(open('$KEYS'));print(','.join(d[k]['address'] for k in ('resolver1','resolver2','resolver3')))")
export API_URL="${API_URL:-https://vericanopy-api.onrender.com}"
export DEPLOYMENTS_FILE=./contracts/deployments/${CHAIN_ID}.json
export PQ_PUBLIC_KEY_PATH=secrets/ml_dsa_65.pk PQ_SECRET_KEY_PATH=secrets/ml_dsa_65.sk
export DATABASE_URL="${DATABASE_URL:-sqlite:///./data/testnet-local.db}"
BAL=$(cast balance --rpc-url "$RPC_URL" "$(cast wallet address --private-key "$DEPLOYER_KEY")")
echo "deployer balance: $BAL wei"
[ "$BAL" != "0" ] || { echo "fund the deployer first: $(cast wallet address --private-key "$DEPLOYER_KEY")"; exit 1; }
.venv/bin/python scripts/deploy_all.py
.venv/bin/python scripts/seed.py
echo "== contracts/deployments/${CHAIN_ID}.json written; commit + push so Render/Vercel pick it up (docs/DEPLOYMENT.md)"
