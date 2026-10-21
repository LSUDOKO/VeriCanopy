# VeriCanopy

> **Carbon credits that prove themselves.**

Satellite AI scores every forest carbon credit against matched "twin" forest, a zkML proof verified **on-chain** shows the registered model produced the score, an H3 geospatial registry blocks double-registration of land, credits update themselves and burn their buffer when forests are lost, anyone can challenge the inputs with a stake, and every manifest attestation is signed with a NIST post-quantum signature (ML-DSA-65) so those records stay verifiable for decades (the zk proofs and Ethereum signatures themselves are not post-quantum; see the honesty table).

**Track:** Carbon Markets & Emissions Transparency (IEEE ClimateChain Global Hackathon 2026) — blockchain-based credit verification, double-counting prevention, continuous impact tracking.

## Three trust gaps, one system

| Gap | Question | Mechanism |
|---|---|---|
| **Computation** | Did the AI really run the registered model? | EZKL/Halo2 proof verified on-chain by `Halo2Verifier`; score decoded from the proof's public instances, never trusted from the oracle |
| **Input** | Was the right land and data used? Is this land sold twice? | Reproducible manifest (datasets, dates, seeds, geometry hash, code commit), open staked challenge game, H3 cell exclusivity in `ProjectRegistry` |
| **Time** | Is the credit still true today, and will the record survive decades? | Living integrity score per project, automatic buffer burns, holder/retiree notifications, ML-DSA-65 signed manifests anchored on-chain |

## What works today (all measured, all tested)

- **Contracts** (Solidity 0.8.26, OpenZeppelin v5, Foundry): `ProjectRegistry` (H3 lock + Merkle sliver fraud proof), `ModelRegistry`, `PQKeyRegistry`, `IntegrityOracle`, `ChallengeManager`, `VeriCredit` (ERC-1155 living credits), `BufferPool`, `RetirementRegistry`. 43 tests including a **real EZKL proof fixture verified by the generated `Halo2Verifier`** (19.8 KB deployed, under the EIP-170 limit) and fuzz/invariant tests for supply accounting and frozen-token immobility.
- **AI pipeline** (Python 3.11): Earth Engine extraction (needs credentials) or deterministic labelled fixture samples → Mahalanobis/caliper matching with bootstrap CI → 16-feature `fv1` vector → distilled MLP (417 params, MAE 0.0125 vs the transparent expert rule) → `vc-manifest/1`.
- **zkML**: EZKL circuit (hashed inputs, fixed params, public output, log-rows 16), ≈6 s proofs, 4,416-byte proofs, on-chain verification ≈1.08 M gas including the submission.
- **Post-quantum**: ML-DSA-65 (FIPS 204) signing of every manifest, on-chain key registry, Verify page that re-checks hash ↔ chain, key ↔ registry, signature, proof mode.
- **Backend** (FastAPI): REST API, chain indexer with reorg re-scan, oracle worker (pipeline → prove → sign → store → `submitScore`), finalizer, resolver CLI, buyer notifications.
- **Web** (Next.js 16, wagmi/viem, RainbowKit, MapLibre): Explore map, project detail (evidence twin chart, integrity history, claim vs reality, credits, proofs & signatures, challenges), Register wizard with live overlap pre-check and decoded `OverlapDetected` revert, Portfolio with retirement certificates and impact inbox, Challenges, Verify, Security, guided Demo with time slider and scripted 2021 fire.
- **End-to-end**: `make e2e` runs the whole story on a local Anvil chain and asserts every step (seed + rejected overlap → score/prove/sign/submit → finalise → mint → retire → covered reversal + notice → fire-year shortfall → Frozen → upheld challenge + slashing).

## Quick start

```bash
# prerequisites: foundry, uv, node 22 + pnpm, python 3.11 (uv downloads it)
make setup                      # venv + forge deps + pnpm install
make zk-setup                   # build the EZKL circuit, keys, SRS, Solidity verifier (one-off, ~1 min + SRS download)
make chain                      # terminal 1: anvil
make deploy                     # terminal 2: Halo2Verifier + full stack → contracts/deployments/31337.json
make seed                       # register Demo Projects A, B, C (D is rejected on purpose)
make demo-data                  # precompute 2018–2025 pipeline outputs for Demo Mode
cd backend && ../.venv/bin/uvicorn app.main:app --reload &        # API on :8000
cd backend && ../.venv/bin/python -m app.indexer.run &            # indexer
cd backend && ../.venv/bin/python -m app.workers.scheduler &      # finalizer loop
cd web && pnpm dev                                                # http://localhost:3000
make submit P=1 Y=2023          # oracle: pipeline → proof → ML-DSA sign → submitScore for project 1, period 2023
make e2e                        # or: run the entire scripted scenario (starts its own anvil)
make test                       # forge test + pytest (ai, backend) + vitest/lint/build (web)
```

Copy `.env.example` to `.env`. Without `EE_SERVICE_ACCOUNT_JSON` the pipeline uses labelled fixture samples (see `docs/LIMITATIONS.md`).

## Deployed addresses

| Component | Where | Status |
|---|---|---|
| Web app | https://vericanopy.vercel.app (Vercel) | live |
| API + indexer | https://vericanopy-api.onrender.com (Render, Docker, auto-deploy from `main`) | live — `GET /healthz` |
| Database | Neon Postgres (Alembic-managed schema) | live |
| Contracts — Local Anvil (31337) | `make deploy` → `contracts/deployments/31337.json` | works |
| Contracts — Polygon Amoy (80002) | `scripts/deploy_amoy.sh` | **pending deployer funding** (deployer `0x94A26d8B64dbF046428DE7D237cc0E527Bc6cC8a`) |

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the runbook.

## Measured numbers

See [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md) (generated from artifacts by `scripts/write_benchmarks.py`; nothing is hand-typed). Headline: proof ≈6 s / 4,416 B on a 16-core laptop, on-chain verify inside `submitScore` ≈1.08 M gas, ML-DSA-65 sign ≈118 ms / verify ≈19 ms (pure Python), model MAE 0.0125.

## Honesty: what is and is not proven

| Claim | Covered by |
|---|---|
| The registered model was used, unmodified | zk proof (fixed params; verifier bound to the circuit) + `ModelRegistry` |
| The score follows from the committed features | zk proof (Poseidon commitment of the 16 features is a public instance) |
| The features came from the stated satellite data | **not** the zk proof → reproducible manifest + challenge game |
| The scoring rule is scientifically right | **not** cryptography → open methodology (`docs/spec/04_AI_SATELLITE_PIPELINE.md` §7) + governance |

| Element | Quantum-safe? |
|---|---|
| Manifest attestations (ML-DSA-65) | ✅ |
| Hash commitments (SHA-256 / keccak256) | ✅ with sufficient output size |
| Ethereum transaction signatures (ECDSA) | ❌ (roadmap: PQ account abstraction) |
| zk proofs (Halo2 + KZG) | ❌ pairing-based (roadmap: hash-based STARK proofs) |

The v1 model is distilled from a published, transparent scoring rule; zkML guarantees the published model was used, not that the rule is perfect. Demo projects A–D were drawn by us and are **not** real registered projects; nothing here assesses any real project. Full list: [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md).

## Documentation
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — components, scoring lifecycle, repo layout
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — every deviation from the spec and why
- [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md) — measured numbers only
- [`docs/SUBMISSION.md`](docs/SUBMISSION.md) — Devpost text, demo script, judging map
- [`docs/spec/`](docs/spec/) — the full specification pack this build implements

## References (verified entries from `docs/spec/01_RESEARCH_FOUNDATION.md`)
- Tropical forest carbon offsets deliver partial gains amid persistent over-crediting — https://pubmed.ncbi.nlm.nih.gov/41066561/
- Unobserved confounders cannot explain over-crediting in avoided deforestation carbon projects — https://pmc.ncbi.nlm.nih.gov/articles/PMC13253331/
- Dynamic ex-post baselines for enhancing the credibility of IFM carbon offsets — https://pubmed.ncbi.nlm.nih.gov/41728826/
- Forest carbon protocols underestimate climate-driven carbon loss risks — https://pubmed.ncbi.nlm.nih.gov/42162435/
- Widespread increases in future wildfire risk to global forest carbon offset projects revealed by explainable AI — https://arxiv.org/abs/2305.02397
- Global, robust and comparable digital carbon assets (PACT) — https://arxiv.org/abs/2403.14581

## Data attributions
Hansen/UMD Global Forest Change, ESA Copernicus Sentinel-1/2, NASA GEDI L4B, MODIS MCD64A1, SRTM, Oxford MAP accessibility, ESA WorldCover, Google Dynamic World (used only with Earth Engine credentials). Basemap © OpenStreetMap contributors.

## Licence
MIT — see `LICENSE`.
