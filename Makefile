SHELL := /bin/bash
export PATH := $(HOME)/.config/.foundry/bin:$(PATH)
PY := .venv/bin/python
CHAIN ?= local
RPC_URL ?= http://127.0.0.1:8545
ANVIL_KEY := 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
P ?= 1
Y ?= 2024

.PHONY: setup chain deploy seed pipeline prove submit e2e test test-contracts test-ai test-backend test-web zk-setup demo-data abis

setup:
	uv venv .venv --python 3.11
	VIRTUAL_ENV=$(PWD)/.venv uv pip install -e "./ai[dev]" -e "./backend[dev]"
	cd contracts && forge install
	cd web && pnpm install

chain:
	anvil --block-time 1 --chain-id 31337

deploy:
	RPC_URL=$(RPC_URL) $(PY) scripts/deploy_all.py

verifier:
	$(PY) -m zk.evm_verifier
	$(PY) scripts/compile_verifier.py

abis:
	$(PY) scripts/sync_abis.py

seed:
	$(PY) scripts/seed.py

pipeline:
	cd ai && ../$(PY) -m vericanopy_ai score --project $(P) --period $(Y)

prove:
	cd ai && ../$(PY) -m zk.prove --project $(P) --period $(Y)

submit:
	cd backend && ../$(PY) -m app.workers.oracle --project $(P) --period $(Y)

zk-setup:
	cd ai && ../$(PY) -m zk.build_circuit
	$(MAKE) verifier

demo-data:
	$(PY) scripts/make_demo_outputs.py

e2e:
	$(PY) scripts/e2e.py

test: test-contracts test-ai test-backend test-web

test-contracts:
	cd contracts && forge test

test-ai:
	cd ai && ../$(PY) -m pytest -q

test-backend:
	cd backend && ../$(PY) -m pytest -q

test-web:
	cd web && pnpm test && pnpm lint && pnpm build
