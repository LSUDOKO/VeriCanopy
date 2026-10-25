<p align="center">
  <a href="https://vericanopy.vercel.app"><img src="https://vericanopy.vercel.app/media/banner.jpg" alt="VeriCanopy — forest carbon credits that prove themselves" width="100%" /></a>
</p>

<p align="center">
  <a href="https://vericanopy.vercel.app"><img alt="Live app" src="https://img.shields.io/badge/app-vericanopy.vercel.app-050806?style=for-the-badge&labelColor=b6fe00" /></a>
  <a href="https://vericanopy-api.onrender.com/api/v1/status"><img alt="API status" src="https://img.shields.io/badge/api-live-050806?style=for-the-badge&labelColor=b6fe00" /></a>
  <a href="https://sepolia.basescan.org/address/0xa3a203519f86DdeeCA51771F43ca0840e51387b6"><img alt="Base Sepolia" src="https://img.shields.io/badge/chain-Base%20Sepolia%2084532-050806?style=for-the-badge&labelColor=b6fe00" /></a>
  <a href="https://github.com/users/LSUDOKO/packages/npm/package/vericanopy-mcp"><img alt="MCP package" src="https://img.shields.io/badge/MCP-%40lsudoko%2Fvericanopy--mcp-050806?style=for-the-badge&labelColor=b6fe00" /></a>
  <br/>
  <a href="https://github.com/LSUDOKO/VeriCanopy/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/LSUDOKO/VeriCanopy/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/LSUDOKO/VeriCanopy/releases"><img alt="Release" src="https://img.shields.io/github/v/release/LSUDOKO/VeriCanopy?style=flat-square&color=b6fe00&labelColor=050806" /></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-b6fe00?style=flat-square&labelColor=050806" /></a>
</p>

<p align="center">
  <a href="https://vericanopy.vercel.app"><b>Live app</b></a> ·
  <a href="https://vericanopy-api.onrender.com/docs">API docs</a> ·
  <a href="docs/MCP.md">MCP server</a> ·
  <a href="docs/ARCHITECTURE.md">Architecture</a> ·
  <a href="docs/BENCHMARKS.md">Benchmarks</a> ·
  <a href="docs/LIMITATIONS.md">Limitations</a> ·
  <a href="docs/video/v2/STORYBOARD.md">Launch film</a>
</p>

> **Forest carbon credits that prove themselves.** Satellite AI scores every forest against a matched twin, a zero-knowledge proof puts the score on-chain, every record is signed post-quantum, and the credit keeps watching the forest after it is sold.

<p align="center"><img src="https://vericanopy.vercel.app/media/whole-picture.gif" alt="The whole VeriCanopy system drawn as one diagram" width="100%" /></p>

---

## 1 · The problem

Today a forest credit is verified **once**, by someone you have to trust, against a baseline the developer wrote. Then nobody looks at the forest again.

<p align="center"><img src="https://vericanopy.vercel.app/media/problem-baseline.gif" alt="How a credit is made today: developer-chosen baseline, never re-derived from pixels" width="100%" /></p>

| | What happens today | What it costs |
|---|---|---|
| **① Baseline** | The developer picks the reference region and the deforestation rate. That one number decides how many credits exist. Nobody re-derives it from pixels. | Independent investigations found more than 90 % of some rainforest offsets to be phantom reductions (West et al., *Science* 2023; Guardian / SourceMaterial 2023). |
| **② Time** | The credit is issued, sold and resold. Nothing re-scores the forest after issuance. | On our Manavgat pilot area a single fire year removed **1.2 MtCO₂e**. The registry would never notice. |
| **③ Score** | Ratings come from a private model and a letter grade. | No proof the model ran, no proof which data it saw. |

<p align="center"><img src="https://vericanopy.vercel.app/media/problem-fire.gif" alt="Manavgat: Sentinel-2 2019 vs 2021 fire scar" width="49%" /> <img src="https://vericanopy.vercel.app/media/problem-blackbox.jpg" alt="Private model, letter grade, no proof" width="49%" /></p>

**This is real satellite data, not a mock-up.** Both cards below are Sentinel-2 L2A composites rendered by Google Earth Engine for the exact polygons registered on Base Sepolia:

<p align="center"><img src="https://vericanopy.vercel.app/media/sat-manavgat.jpg" alt="Manavgat, Türkiye — 2019 vs 2021 fire, project frozen" width="100%" /></p>
<p align="center"><img src="https://vericanopy.vercel.app/media/sat-tapajos.jpg" alt="Tapajós, Brazil — 2019 vs 2024, score 71.9 to 3.9" width="100%" /></p>

## 2 · The solution: from pixels to proof

<p align="center"><img src="https://vericanopy.vercel.app/media/solution-overview.jpg" alt="VeriCanopy: from pixels to proof" width="100%" /></p>

| Gap | Question | VeriCanopy's mechanism |
|---|---|---|
| **Input** | Was the right land and data used? Is this land sold twice? | Earth Engine evidence for the project **and** a matched twin forest; reproducible ML-DSA-65-signed manifest (datasets, dates, geometry hash, code commit); H3 cell exclusivity in `ProjectRegistry`; staked challenge game |
| **Computation** | Did the AI really run the registered model? | EZKL/Halo2 proof verified on-chain by `Halo2Verifier`; the score is decoded from the proof's public instances, never trusted from the oracle |
| **Time** | Is the credit still true today? | Living integrity score per period, automatic buffer burns, freeze on shortfall, holder notifications |

### Step 1 · Evidence from pixels, against a twin forest
Every period the oracle pulls Sentinel-2, Sentinel-1, Hansen GFC 2025, GEDI L4B biomass, MODIS burned area and Dynamic World for the project polygon and a matched twin nearby: 776 project pixels against 2,396 twin pixels. The twin is the counterfactual, not the developer's spreadsheet.

<p align="center"><img src="https://vericanopy.vercel.app/media/solution-evidence.jpg" alt="Sentinel-2 tile with project and twin polygons and the six datasets" width="49%" /> <img src="https://vericanopy.vercel.app/media/solution-twin.gif" alt="Twin-forest chart from real evidence data" width="49%" /></p>

### Step 2 · An integrity score that follows the forest
Sixteen features feed a 417-parameter audited network (MAE 0.0125 against the transparent expert rule, zero monotonicity violations). Tapajós scored **71.9** in 2023; after 8,080 t of detected loss it scores **3.9**.

<p align="center"><img src="https://vericanopy.vercel.app/media/solution-score.jpg" alt="16 features, 417-parameter network, score 71.9 to 3.9" width="100%" /></p>

### Step 3 · A zero-knowledge proof the oracle cannot fake
Inference runs inside a Halo2 circuit (EZKL 23.0.5): about 6 s, a 4,416-byte proof. `Halo2Verifier` on Base Sepolia checks it inside `submitScore`; a wrong proof reverts. The manifest is signed with ML-DSA-65 (FIPS 204) and the key is registered on-chain.

<p align="center"><img src="https://vericanopy.vercel.app/media/solution-proof.gif" alt="zk circuit to proof.bin" width="49%" /> <img src="https://vericanopy.vercel.app/media/solution-mldsa.jpg" alt="ML-DSA-65 seal" width="49%" /></p>

**On-chain receipt.** The real 2025 Tapajós submission, verified by the deployed verifier: [`0xba0aaa…7ff4db`](https://sepolia.basescan.org/tx/0xba0aaa0f4ec04419e0768298a97976db7153df2ead755e553e975852977ff4db) (Base Sepolia, block 49,603,029, status Success). The event log carries period 7, project 1 and the oracle address as indexed topics.

<p align="center"><a href="https://sepolia.basescan.org/tx/0xba0aaa0f4ec04419e0768298a97976db7153df2ead755e553e975852977ff4db"><img src="https://vericanopy.vercel.app/media/basescan-tx.jpg" alt="Basescan: IntegrityOracle submitScore transaction" width="49%" /></a> <a href="https://sepolia.basescan.org/tx/0xba0aaa0f4ec04419e0768298a97976db7153df2ead755e553e975852977ff4db#eventlog"><img src="https://vericanopy.vercel.app/media/basescan-logs.jpg" alt="Basescan: ScoreSubmitted event log" width="49%" /></a></p>

### Step 4 · A living credit
Credits carry the live score. Detected loss burns buffer credits first; a shortfall freezes the project, blocks transfers and notifies every holder. Anyone can challenge a score with a bond; two of three independent resolvers recompute it.

<p align="center"><img src="https://vericanopy.vercel.app/media/solution-living-credit.gif" alt="Buffer burn, freeze, challenge with 2-of-3 resolvers" width="100%" /></p>

```mermaid
flowchart LR
  A[Sentinel-1/2 · Hansen GFC · GEDI L4B · MODIS · Dynamic World] --> B[Twin-forest matching<br/>776 vs 2,396 px]
  B --> C[16-feature vector fv1]
  C --> D[417-param MLP<br/>integrity score]
  D --> E[EZKL Halo2 proof<br/>4,416 B · ~6 s]
  E --> F[IntegrityOracle.submitScore<br/>Halo2Verifier · Base Sepolia]
  C --> G[Manifest signed ML-DSA-65]
  G --> F
  F --> H[VeriCredit ERC-1155<br/>buffer · freeze · challenges · market]
```

## 3 · Use it today (live on Base Sepolia)

Every clip below is a real recording of [vericanopy.vercel.app](https://vericanopy.vercel.app), driven click by click.

<p align="center"><img src="https://vericanopy.vercel.app/media/site-landing.gif" alt="Landing page" width="100%" /></p>

| | |
|---|---|
| <img src="https://vericanopy.vercel.app/media/site-registry.gif" width="440" /> | **Registry.** Every project on a map with its live integrity status, H3 cells, credits issued, loss detected and buffer coverage. |
| <img src="https://vericanopy.vercel.app/media/site-project.gif" width="440" /> | **Project page.** Real Sentinel-2 before/after, the twin-forest chart with the fire year, integrity history and claim vs reality. |
| <img src="https://vericanopy.vercel.app/media/site-project-tools.gif" width="440" /> | **Year slider, fire watch, leakage ring.** Scrub Sentinel-2 composites 2017–2025, NASA FIRMS detections for the last 30 days, and Hansen loss in a 10 km ring around the parcel. |
| <img src="https://vericanopy.vercel.app/media/site-proofs.gif" width="440" /> | **Proofs & signatures.** Model hash, feature commitment, manifest CID, the on-chain tx, ML-DSA-65 verification, and a signed auditor report (PDF + JSON). |
| <img src="https://vericanopy.vercel.app/media/site-register.gif" width="440" /> | **Register.** Draw or paste a polygon; H3 overlap is pre-checked and the contract refuses land that is already registered (`OverlapDetected`). |
| <img src="https://vericanopy.vercel.app/media/site-market.gif" width="440" /> | **Market.** Escrowed fixed-price listings with the integrity score on the price tag and a price guide by integrity band. Frozen projects cannot trade. |
| <img src="https://vericanopy.vercel.app/media/site-ask.gif" width="440" /> | **Ask.** Deterministic, model-faithful explanation of any score: per-feature attribution, data sources, proof and signature status. No language model in the loop. |
| <img src="https://vericanopy.vercel.app/media/site-status.gif" width="440" /> | **Status.** Database, RPC head, indexer lag, Earth Engine, signer, keeper balance and all ten contracts, refreshed every 30 s. |
| <img src="https://vericanopy.vercel.app/media/site-verify.gif" width="440" /> | **Verify.** Re-check hash ↔ chain, key ↔ registry, signature and proof mode for any manifest. |

Also: **Challenges** with bonds and 2-of-3 resolver votes · **Retirements** with printable certificates · **Alerts** as JSON and RSS · **Model registry** page that compares the on-chain model hash with the published ONNX artifact.

## 4 · For agents: the VeriCanopy MCP server, working in claude.ai

VeriCanopy is a Model Context Protocol server. Below is a real claude.ai session: the connector added under **Customize → Connectors**, then one prompt. Claude listed the projects, explained the 3.9 score feature by feature, found the cheapest listing and prepared an **unsigned** buy transaction for the user's wallet. The server holds no keys.

<p align="center"><img src="https://vericanopy.vercel.app/media/claude-mcp.gif" alt="claude.ai using the VeriCanopy MCP connector" width="100%" /></p>

<p align="center"><img src="https://vericanopy.vercel.app/media/claude-connector.jpg" alt="claude.ai connector settings: VeriCanopy, 10 tools" width="32%" /> <img src="https://vericanopy.vercel.app/media/claude-tools.jpg" alt="Claude calling list projects, explain score, list listings, prepare buy tx" width="32%" /> <img src="https://vericanopy.vercel.app/media/claude-tx.jpg" alt="Unsigned buy transaction returned by Claude" width="32%" /></p>

**Connect it**

```sh
# Claude Code, remote HTTP
claude mcp add --transport http vericanopy https://vericanopy-api.onrender.com/mcp/

# Any stdio client (Claude Desktop, Cursor) via the GitHub package
echo "@lsudoko:registry=https://npm.pkg.github.com" >> ~/.npmrc
npx -y @lsudoko/vericanopy-mcp
```

claude.ai: Customize → Connectors → Add custom connector → `https://vericanopy-api.onrender.com/mcp/`, no sign-in.

Tools: `list_projects` · `get_project` · `get_submissions` · `get_evidence` · `explain_score` · `list_listings` · `prepare_buy_tx` · `prepare_retire_tx` · `get_challenge` · `verify_manifest`. Package: [`@lsudoko/vericanopy-mcp`](https://github.com/users/LSUDOKO/packages/npm/package/vericanopy-mcp) ([source](packages/mcp)). Details: [`docs/MCP.md`](docs/MCP.md).

<p align="center"><img src="https://vericanopy.vercel.app/media/product-overview.jpg" alt="The live product as one wall of recordings" width="100%" /></p>

## Measured, not promised

Every number is produced by code in this repository (`scripts/write_benchmarks.py`, `forge test --gas-report`, `pytest`). Full table in [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md).

| Metric | Value |
|---|---|
| Contract tests (incl. a real EZKL proof verified by the deployed `Halo2Verifier`, fuzz + invariants) | 55 |
| Backend tests (indexer idempotency, verify binding, market, feeds, MCP, reports) | 31 |
| Web smoke tests against production | 11 |
| Proof size / proving time (mean of 20) | 4,416 B / 6.02 s |
| `Halo2Verifier` deployed bytecode | 19,817 B (limit 24,576) |
| On-chain verify inside `submitScore` | ≈1.08 M gas |
| Model | 16-16-8-1 MLP, 417 params, MAE 0.0125, 0 monotonicity violations |
| ML-DSA-65 sign / verify (pure Python) | ≈118 ms / ≈19 ms |
| Satellite datasets via Earth Engine | 10 |

## Pilot areas and data provenance

<p align="center"><img src="https://vericanopy.vercel.app/media/sat-loreto.jpg" alt="Loreto, Peru — Sentinel-2 before and after" width="100%" /></p>

Two kinds of results exist on purpose:

- **Live submissions on Base Sepolia** (`provider: earthengine` in the manifest): features extracted from real Hansen GFC 2025, Sentinel-1/2, GEDI L4B, MODIS burned-area and Dynamic World pixels for the pilot polygons, proven with EZKL and verified on-chain. The pilot polygons (Tapajós riverine block, Loreto Marañón floodplain, Manavgat pine forest) were drawn by us for monitoring; they are **not** issued carbon projects, so their real-data scores are low (Tapajós/2025 = 3.9, Manavgat/2021 = 0.2 with 1.2 MtCO2e of real 2021 loss). That is the system working as intended.
- The first three submissions (`provider: fixture`) were made before Earth Engine access existed and use deterministic labelled fixture samples; they remain on-chain, labelled as such.

## Deployed addresses

| Component | Where |
|---|---|
| Web app | https://vericanopy.vercel.app (Vercel) |
| API, indexer, workers, MCP | https://vericanopy-api.onrender.com (Render, Docker, `GET /api/v1/status`) |
| Database | Neon Postgres (Alembic-managed) |
| Contracts | Base Sepolia (84532), `contracts/deployments/84532.json` |

| Contract | Address |
|---|---|
| ProjectRegistry | [`0x40Fc737bc985f8f75689a4B4E95D625a1c701e4a`](https://sepolia.basescan.org/address/0x40Fc737bc985f8f75689a4B4E95D625a1c701e4a) |
| ModelRegistry | [`0x36691AdE60cEc5A02B32690B159AC92C4Ec5ac9d`](https://sepolia.basescan.org/address/0x36691AdE60cEc5A02B32690B159AC92C4Ec5ac9d) |
| PQKeyRegistry | [`0xd760B9004F5ACF3814Ea833E601a23b060B922c2`](https://sepolia.basescan.org/address/0xd760B9004F5ACF3814Ea833E601a23b060B922c2) |
| IntegrityOracle | [`0xa3a203519f86DdeeCA51771F43ca0840e51387b6`](https://sepolia.basescan.org/address/0xa3a203519f86DdeeCA51771F43ca0840e51387b6) |
| Halo2Verifier | [`0x333c45Cbbb7AB746244767c199551e69A4Fa4965`](https://sepolia.basescan.org/address/0x333c45Cbbb7AB746244767c199551e69A4Fa4965) |
| ChallengeManager | [`0x1AA138691E23a3d35FDfB09CA7ABf7065987a14d`](https://sepolia.basescan.org/address/0x1AA138691E23a3d35FDfB09CA7ABf7065987a14d) |
| VeriCredit (ERC-1155) | [`0x69DEfd5a594542D4d1e514d4CD9d8CE1a448cE3f`](https://sepolia.basescan.org/address/0x69DEfd5a594542D4d1e514d4CD9d8CE1a448cE3f) |
| BufferPool | [`0xa536e7C93c32179747d6eD83fA5138B2b7879700`](https://sepolia.basescan.org/address/0xa536e7C93c32179747d6eD83fA5138B2b7879700) |
| RetirementRegistry | [`0x1D042FddCA42542D51CA4c33aB55db1835b010a9`](https://sepolia.basescan.org/address/0x1D042FddCA42542D51CA4c33aB55db1835b010a9) |
| Marketplace | [`0x305a35aAf5347c98C02930d35854e9a9B1c2e481`](https://sepolia.basescan.org/address/0x305a35aAf5347c98C02930d35854e9a9B1c2e481) |

First zk-verified submissions: [#1](https://sepolia.basescan.org/tx/0xc4f70226e3e782ed347acdc48826fa73be081c44482da12d4ea1ac3876f53487), [#2](https://sepolia.basescan.org/tx/0xd94d61e5fbb9bdbf274bb6be88052d63141275a073e631b5f5e0f4e57b3f2028), [#3](https://sepolia.basescan.org/tx/0xa973096281ffd3681a0d02e2a7742a2a37d5cb422dd0cdf77beba13f4fbd1a52).

## Architecture

| Layer | Stack | Lives in |
|---|---|---|
| Contracts | Solidity 0.8.26, OpenZeppelin v5, Foundry; EZKL-generated `Halo2Verifier` | `contracts/` |
| AI pipeline | Python 3.11, Earth Engine, numpy, ONNX, EZKL 23.0.5, dilithium-py (ML-DSA-65) | `ai/` |
| Backend | FastAPI, SQLAlchemy + Alembic (Neon Postgres), web3.py indexer, oracle + finalizer workers, content-addressed blob store, webhooks, MCP (FastMCP) | `backend/` |
| Web | Next.js 16, wagmi/viem, RainbowKit, MapLibre, GSAP + Lenis | `web/` |
| Ops | Vercel, Render (Docker), Neon, GitHub Actions CI + release workflow, ghcr.io image | `.github/`, `render.yaml` |

Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · feeds, certificates and monitoring: [`docs/FEATURES.md`](docs/FEATURES.md) · runbook: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Quick start

```bash
# prerequisites: foundry, uv, node 22 + pnpm, python 3.11 (uv downloads it)
make setup          # venv + forge deps + pnpm install
make zk-setup       # EZKL circuit, keys, SRS, Solidity verifier (one-off, ~1 min + SRS download)
make chain          # terminal 1: anvil
make deploy         # terminal 2: Halo2Verifier + full stack → contracts/deployments/31337.json
make seed           # register the pilot areas (one overlapping parcel is rejected on purpose)
cd backend && ../.venv/bin/uvicorn app.main:app --reload &     # API + MCP on :8000
cd backend && ../.venv/bin/python -m app.indexer.run &         # indexer
cd backend && ../.venv/bin/python -m app.workers.scheduler &   # finalizer loop
cd web && pnpm dev                                             # http://localhost:3000
make submit P=1 Y=2025   # oracle: pipeline → proof → ML-DSA sign → submitScore
make e2e                 # the whole story on a local chain, every step asserted
make test                # forge test + pytest (ai, backend) + vitest/lint/build (web)
```

Copy `.env.example` to `.env`. With `EE_SERVICE_ACCOUNT_JSON` and `EE_PROJECT` the pipeline uses live Earth Engine data; without them it uses labelled fixture samples (see [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md)).

## Honesty: what is and is not proven

| Claim | Covered by |
|---|---|
| The registered model was used, unmodified | zk proof (fixed params; verifier bound to the circuit) + `ModelRegistry` |
| The score follows from the committed features | zk proof (Poseidon commitment of the 16 features is a public instance) |
| The features came from the stated satellite data | **not** the zk proof → reproducible manifest + challenge game |
| The scoring rule is scientifically right | **not** cryptography → open methodology + governance |

| Element | Quantum-safe? |
|---|---|
| Manifest attestations and auditor reports (ML-DSA-65) | ✅ |
| Hash commitments (SHA-256 / keccak256) | ✅ with sufficient output size |
| Ethereum transaction signatures (ECDSA) | ❌ ecosystem dependency (PQ account abstraction) |
| zk proofs (Halo2 + KZG) | ❌ pairing-based (hash-based STARK proofs on the roadmap) |

## Repository

```
ai/          Earth Engine extraction, matching, fv1 features, MLP, EZKL circuit, ML-DSA-65
backend/     FastAPI API, indexer, oracle/finalizer workers, MCP server, Alembic migrations
contracts/   Foundry project, tests, deployment scripts, generated Halo2Verifier
web/         Next.js app
scripts/     deploy, seed, e2e, benchmarks, media
docs/        architecture, benchmarks, limitations, MCP, features, submission kit, launch film
brand/       logo and brand guide
```

Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md) · security: [`SECURITY.md`](SECURITY.md) · changes: [`CHANGELOG.md`](CHANGELOG.md).

## References

- Tropical forest carbon offsets deliver partial gains amid persistent over-crediting — https://pubmed.ncbi.nlm.nih.gov/41066561/
- Unobserved confounders cannot explain over-crediting in avoided deforestation carbon projects — https://pmc.ncbi.nlm.nih.gov/articles/PMC13253331/
- Dynamic ex-post baselines for enhancing the credibility of IFM carbon offsets — https://pubmed.ncbi.nlm.nih.gov/41728826/
- Forest carbon protocols underestimate climate-driven carbon loss risks — https://pubmed.ncbi.nlm.nih.gov/42162435/
- Widespread increases in future wildfire risk to global forest carbon offset projects revealed by explainable AI — https://arxiv.org/abs/2305.02397
- Global, robust and comparable digital carbon assets (PACT) — https://arxiv.org/abs/2403.14581

## Data attributions

Hansen/UMD Global Forest Change, ESA Copernicus Sentinel-1/2, NASA GEDI L4B, NASA FIRMS and MODIS MCD64A1, SRTM, ESA WorldCover, Google Dynamic World (via Earth Engine). Basemap © OpenStreetMap contributors.

## Licence

MIT — see [`LICENSE`](LICENSE). Built for the IEEE ClimateChain Global Hackathon 2026, Carbon Markets & Emissions Transparency track. Testnet only; nothing here assesses any real carbon project.
