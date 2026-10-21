# VeriCanopy MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full VeriCanopy MVP described in `docs/spec/` (slices 1–8 of `AGENT_INSTRUCTIONS.md`): contracts, AI pipeline, zkML, PQ attestations, backend, web app, demo mode, docs, CI, all runnable locally end-to-end and deployable to Polygon Amoy.

**Architecture:** Monorepo (`contracts/`, `ai/`, `backend/`, `web/`, `data/`, `docs/`). The AI pipeline produces a 16-feature vector + manifest; an MLP scores it; EZKL proves the inference; the manifest is ML-DSA-65 signed; an oracle submits score + proof on-chain; the registry/credit/buffer/challenge contracts update credit state; a backend indexes events and serves the web app.

**Tech Stack:** Solidity ^0.8.24 + Foundry + OpenZeppelin v5; Python 3.11 (uv) with numpy, onnx, onnxruntime, h3, shapely, ezkl, dilithium-py (ML-DSA-65, FIPS 204), FastAPI, SQLAlchemy, web3.py; Next.js 15 App Router + TypeScript + Tailwind + wagmi/viem/RainbowKit + MapLibre + h3-js + Recharts; GitHub Actions.

**Spec:** `docs/spec/` (read `AGENT_INSTRUCTIONS.md` first; file numbers below refer to that pack).

## Global Constraints

- Golden rules from `AGENT_INSTRUCTIONS.md` §1: never fabricate measured numbers (show `—` / "not measured"), never fabricate citations, never accuse a real project, honest PQ scope, deterministic manifests, testnet only, no private keys in repo.
- Solidity `^0.8.24`, OpenZeppelin Contracts v5, custom errors, NatSpec on every external function, events for every state change, pull payments.
- Demo parameters: `challengeWindow` 5 min, `resolutionPeriod` 10 min, `minOracleStake` 0.001, `minChallengeBond` 0.0005, `resolverQuorum` 2, `impairThresholdBps` 5000, `minIssueScoreBps` 7000, `bufferBps` 2000.
- `tokenId = (projectId << 16) | vintageYear`. H3 lock resolution default 8.
- Feature vector: exactly 16 floats, order per `04` §6, rounded to 6 dp before hashing/proving. Feature version `fv1`. Manifest schema `vc-manifest/1`, canonicalised as sorted keys, no whitespace, UTF-8, `signatures` removed.
- Python 3.11 via `uv`, `ruff`, `pytest`. TypeScript strict, ESLint. Conventional commits.
- Disk budget is tight (≈2.8 GB free at planning time): no PyTorch (numpy training + hand-built ONNX graph), no shadcn, lean dependencies.

## Planner's calls (deviations from the spec, documented in `docs/LIMITATIONS.md`)

1. **PQ library:** `dilithium-py` (pure-Python FIPS 204 ML-DSA-65) instead of liboqs; same algorithm, no C build. liboqs is an optional backend behind the same `sign/verify` interface.
2. **Earth Engine:** real `extract.py` against `earthengine-api` is implemented but only runs with credentials (`EE_SERVICE_ACCOUNT_JSON`). Without credentials the pipeline uses a **fixture provider** that loads committed pixel samples (`data/demo/samples/*.json`). Demo outputs are labelled "pipeline replay on fixture samples" unless produced with live EE. Numbers in the UI come only from running the code.
3. **Database:** SQLAlchemy with SQLite default, Postgres via `DATABASE_URL`. Geometry stored as GeoJSON; overlap pre-check done with H3 in Python, so PostGIS is optional.
4. **IPFS:** content-addressed local store (`data/ipfs/`) computing real CIDv1 (raw, sha2-256) via `multiformats`; `IPFS_API_URL` optionally mirrors to kubo. Gateway links use the computed CID.
5. **No ERC-20:** stakes/bonds use native testnet currency (spec §4 allows this).
6. **Model training:** numpy MLP distilled from the expert rule (`04` §7.2); ONNX graph built with `onnx.helper`.

## Review Focus

1. Polygon crossing the antimeridian or with holes → H3 polyfill must not crash; cells must be deduplicated (Task 7 test `test_cells_dedup_and_holes`).
2. Oracle submits `instances` whose score field element exceeds 10000 or is negative → contract must revert `InvalidInstances()` (Task 5 test `test_submit_reverts_on_out_of_range_score`).
3. Challenge opened in the last second of the window, then window passes before votes → challenge still resolvable; `finalize` must revert while a challenge is open (Task 5 test `test_finalize_reverts_while_challenged`).
4. Reversal larger than total buffer across all vintages → shortfall recorded, project frozen, transfers and retire revert (Task 4 test `test_reversal_shortfall_freezes`).
5. Manifest with non-ASCII beneficiary/metadata and differently ordered keys → identical canonical hash and valid signature (Task 10 test `test_canonical_stable_under_key_order_and_unicode`).

---

## Slice 1: Skeleton

### Task 1: Monorepo scaffold, tooling, CI

**Files:**
- Create: `README.md`, `.gitignore`, `.env.example`, `Makefile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `docs/LIMITATIONS.md`, `docs/BENCHMARKS.md`
- Create: `contracts/foundry.toml`, `contracts/remappings.txt`, `contracts/src/.gitkeep`
- Create: `ai/pyproject.toml` (package `vericanopy_ai`, deps above, `[tool.ruff]`, `[tool.pytest.ini_options]`)
- Create: `backend/pyproject.toml` (package `app`, depends on `vericanopy_ai` via path)
- Create: `web/` via `pnpm create next-app@latest web --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*"`

**Interfaces:**
- Produces: `make setup|chain|deploy|seed|pipeline|prove|submit|e2e|test` targets; `.env.example` keys from `09` §6.

- [ ] Step 1: Write scaffold files; run `forge init --no-git --force contracts` then `forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git` in `contracts/`.
- [ ] Step 2: `cd ai && uv venv --python 3.11 && uv pip install -e .` ; `cd backend && uv pip install -e .` (shared `.venv` at repo root: `uv venv .venv --python 3.11`).
- [ ] Step 3: Verify: `forge build` passes (empty), `pytest ai` collects 0 tests without error, `pnpm --dir web build` passes.
- [ ] Step 4: Commit `chore: scaffold monorepo, tooling, CI`.

## Slice 2: Registry and credits

### Task 2: `ProjectRegistry`

**Files:**
- Create: `contracts/src/ProjectRegistry.sol`, `contracts/src/interfaces/IProjectRegistry.sol`, `contracts/test/ProjectRegistry.t.sol`

**Interfaces:**
- Produces: exactly the API in `06` §3 (`createProject`, `addCells`, `activate`, `proveOverlap`, `setStatus`, `ownerOfCell`, `getProject(uint256) returns (Project memory)`, `projectCount()`), roles `GOVERNANCE_ROLE`, `ISSUER_ROLE`, `ORACLE_CONTRACT_ROLE` (granted to IntegrityOracle for `setStatus`).
- Merkle leaf = `keccak256(abi.encodePacked(uint64 cell))`, OpenZeppelin `MerkleProof.verify`.

- [ ] Step 1: Tests: `test_create_and_add_cells`, `test_overlap_reverts_with_cell_and_owner` (expect `OverlapDetected(cell, 1)`), `test_add_cells_only_developer_while_pending`, `test_activate_requires_issuer`, `test_prove_overlap_marks_later_project_disputed`, `test_prove_overlap_invalid_proof_reverts`.
- [ ] Step 2: Run `forge test --match-contract ProjectRegistry` → compile failure.
- [ ] Step 3: Implement.
- [ ] Step 4: `forge test` green. Commit `feat(contracts): ProjectRegistry with H3 overlap guard`.

### Task 3: `VeriCredit`, `RetirementRegistry`

**Files:**
- Create: `contracts/src/VeriCredit.sol`, `contracts/src/RetirementRegistry.sol`, `contracts/src/interfaces/IVeriCredit.sol`, `contracts/test/VeriCredit.t.sol`

**Interfaces:**
- Produces: API from `06` §7, §9. `VeriCredit` has `struct Integrity { uint16 scoreBps; IntegrityStatus status; uint16 lastPeriod; }`, `integrityOf(projectId)`, `tokenIdFor(projectId, vintage)`, `setMinIssueScoreBps`, `setImpairThresholdBps`, `setBufferBps`, `bufferPool()` address set by governance, `oracle()` address set by governance. `mintVintage` mints `tonnes` to `to` and `tonnes*bufferBps/10000` to `bufferPool` and calls `IBufferPool.onBufferMinted(projectId, vintage, bufferTonnes)`.
- `RetirementRegistry.record(address holder, uint256 tokenId, uint256 amount, string beneficiary, uint16 scoreAtRetirement) returns (uint256)` only callable by VeriCredit; `getRetirement(id)`, `retirementCount()`.

- [ ] Step 1: Tests: `test_mint_requires_score_ge_min`, `test_mint_sends_buffer_share`, `test_set_integrity_impairs_below_threshold`, `test_frozen_tokens_cannot_transfer_or_retire`, `test_retire_records_score`, `test_only_oracle_sets_integrity`.
- [ ] Step 2–4: red → implement → green. Commit `feat(contracts): VeriCredit ERC-1155 living credits + RetirementRegistry`.

### Task 4: `BufferPool`

**Files:**
- Create: `contracts/src/BufferPool.sol`, `contracts/src/interfaces/IBufferPool.sol`, `contracts/test/BufferPool.t.sol`

**Interfaces:**
- Produces: `onBufferMinted(projectId, vintage, tonnes)` (only VeriCredit), `handleReversal(projectId, tonnes, period)` (only oracle), `bufferBalance(projectId, vintage)`, `vintagesOf(projectId) returns (uint16[])`, `shortfallOf(projectId)`, event `ProjectReversal(projectId, period, tonnes, covered, shortfall)`. Burns oldest vintage first via `IVeriCredit.burnBuffer(tokenId, amount)` (new VeriCredit function, only BufferPool). Shortfall → `IVeriCredit.freeze(projectId)`.

- [ ] Step 1: Tests: `test_reversal_burns_oldest_first`, `test_reversal_shortfall_freezes` (Review Focus 4: shortfall recorded, transfer and retire revert `ProjectFrozen()`), `test_only_oracle_handles_reversal`.
- [ ] Step 2–4: red → green. Commit `feat(contracts): BufferPool automatic reversal burns`.

### Task 5: `ModelRegistry`, `PQKeyRegistry`, `IntegrityOracle`, `ChallengeManager`, mock verifier

**Files:**
- Create: `contracts/src/ModelRegistry.sol`, `contracts/src/PQKeyRegistry.sol`, `contracts/src/IntegrityOracle.sol`, `contracts/src/ChallengeManager.sol`, `contracts/src/interfaces/IHalo2Verifier.sol`, `contracts/test/mocks/MockVerifier.sol` (returns configurable bool), `contracts/test/IntegrityOracle.t.sol`, `contracts/test/ChallengeManager.t.sol`

**Interfaces:**
- Produces: APIs from `06` §4–6 verbatim. Instance decoding: `instances[0] = featureCommitment` (field element as bytes32), `instances[instances.length-1] = scoreFe`; `scoreBps = uint16(scoreFe)` where the prover emits the rescaled integer score (0–10000) as the public output (see Task 11 for the fixed-point rule); revert `InvalidInstances()` if `scoreFe > 10000`.
- `IntegrityOracle` holds params (`challengeWindow`, `resolutionPeriod`, `minOracleStake`, `insuranceTreasury`), `getSubmission(id)`, `submissionCount()`, `lastFinalizedPeriod(projectId)`, `pendingWithdrawals(addr)`, `withdraw()`. `ChallengeManager` is a separate contract with `CHALLENGE_MANAGER` role on the oracle; oracle exposes `onChallengeResolved(submissionId, upheld)` and `onChallengeTimeout(submissionId)` (only ChallengeManager) and `openWindowCheck(submissionId)` view used by ChallengeManager.
- `ChallengeManager`: `openChallenge`, `vote`, `resolveTimeout`, `withdraw`, `getChallenge(id)`, `challengeCount()`, `minChallengeBond`, `resolverQuorum`, `resolutionPeriod`.

- [ ] Step 1: Oracle tests: `test_submit_valid_proof_opens_window`, `test_submit_invalid_proof_reverts`, `test_submit_wrong_period_reverts`, `test_submit_reverts_on_out_of_range_score` (Review Focus 2), `test_submit_requires_active_pq_key_owned_by_oracle`, `test_finalize_sets_integrity_and_burns_buffer`, `test_finalize_reverts_before_window`, `test_finalize_reverts_while_challenged` (Review Focus 3).
- [ ] Step 2: Challenge tests: `test_upheld_pays_challenger_and_treasury_and_rejects_submission`, `test_rejected_splits_bond_and_submission_finalizable`, `test_timeout_refunds_both_and_voids`, `test_double_vote_reverts`, `test_bond_below_half_stake_reverts`, `test_withdraw_pull_payment`.
- [ ] Step 3: Implement; `forge test` green; `forge test --gas-report > docs/gas-report.txt`.
- [ ] Step 4: Commit `feat(contracts): IntegrityOracle, ChallengeManager, Model/PQ registries`.

### Task 6: Deploy script, Anvil deployment, invariant test

**Files:**
- Create: `contracts/script/Deploy.s.sol`, `contracts/script/Seed.s.sol`, `contracts/test/Invariants.t.sol`, `contracts/deployments/.gitkeep`
- Modify: `Makefile` (`chain`, `deploy`, `seed`)

**Interfaces:**
- Produces: `contracts/deployments/<chainId>.json` with `{chainId, contracts:{ProjectRegistry, ModelRegistry, PQKeyRegistry, VeriCredit, RetirementRegistry, BufferPool, IntegrityOracle, ChallengeManager, Verifier}, params:{...}}` written by `vm.writeJson`. Demo params from Global Constraints. Deploy uses `MockVerifier` when `USE_MOCK_VERIFIER=true`, else `Halo2Verifier` (Task 13).
- `Seed.s.sol`: registers demo projects A, B, C from `data/demo/cells/*.json` (cells computed by Task 7), activates them, registers PQ key hash from env `PQ_PUBKEY_HASH`, registers model hash from env `MODEL_HASH`.

- [ ] Step 1: Invariant: `invariant_supply_accounting` (`issued == circulating + retired + bufferHeld + bufferBurned`) and `invariant_frozen_never_moves` with a handler contract.
- [ ] Step 2: `make chain && make deploy` writes `deployments/31337.json`. Commit `feat(contracts): deploy + seed scripts, invariants`.

## Slice 3: Satellite AI

### Task 7: H3 cells, geometry hash, demo geometries

**Files:**
- Create: `ai/vericanopy_ai/h3cells.py`, `ai/vericanopy_ai/geometry.py`, `ai/tests/test_h3cells.py`, `data/demo/project_A.geojson`, `project_B.geojson`, `project_C.geojson`, `project_D_overlap.geojson`, `data/demo/README.md`
- Create: CLI `ai/vericanopy_ai/cli.py` with `python -m vericanopy_ai cells <geojson> --res 8 --out <json>`

**Interfaces:**
- Produces: `polyfill_cells(geom: dict, res: int) -> list[int]` (sorted, deduped uint64), `canonical_geojson(geom) -> bytes`, `geometry_sha256(geom) -> str` (`0x`-prefixed), `fine_cell_root(cells_res11: list[int]) -> str` + `merkle_proof(cells, cell) -> list[str]` (keccak leaves matching Task 2).
- Demo polygons: A and B drawn in forested regions; C placed within the 2021 Manavgat (Antalya, Türkiye) fire region (documented in `data/demo/README.md` with the MODIS burned-area verification step; dates marked `[VERIFY]` until checked); D overlaps A.

- [ ] Step 1: Tests: `test_cells_dedup_and_holes` (Review Focus 1: polygon with hole + multipolygon crossing antimeridian returns sorted unique ints), `test_geometry_hash_canonical`, `test_merkle_root_and_proof_roundtrip`, `test_demo_D_overlaps_A`.
- [ ] Step 2–3: Implement, green. Commit `feat(ai): H3 polyfill, geometry hash, demo geometries`.

### Task 8: Extraction providers (Earth Engine + fixture)

**Files:**
- Create: `ai/vericanopy_ai/extract.py` (`EarthEngineProvider`, `FixtureProvider`, `get_provider(cfg)`), `ai/vericanopy_ai/config.py` (`PipelineConfig` dataclass with matching params from `04` §4, dataset IDs from `04` §2), `data/demo/samples/{A,B,C}_{2018..2025}.json`, `ai/scripts/make_fixture_samples.py`, `ai/tests/test_extract.py`

**Interfaces:**
- Produces: `Provider.sample(project, period, cfg) -> Samples` with `Samples.treat: DataFrame`, `Samples.ctrl: DataFrame` (columns: `lat, lon, treecover2000, elevation, slope, travel_time, pre_loss_pressure, agb, loss_year, burned, ndvi_drop, sar_change, cloud_free, dw_trees_start, dw_trees_end`), `Samples.meta: dict` (dataset ids, date ranges, provider name, `provisional: bool`).
- Fixture samples are generated once by `make_fixture_samples.py` with fixed seeds and project-specific loss/fire parameters (C has burned fraction in 2021), committed, and labelled `"provider": "fixture"` in meta.

- [ ] Step 1: Tests: `test_fixture_provider_deterministic`, `test_project_C_fire_year_has_burned_pixels`, `test_ee_provider_requires_credentials` (raises clear error when env missing).
- [ ] Step 2–3: Implement, green. Commit `feat(ai): extraction providers (Earth Engine + fixture samples)`.

### Task 9: Matching, measurements, features

**Files:**
- Create: `ai/vericanopy_ai/matching.py`, `ai/vericanopy_ai/measure.py`, `ai/vericanopy_ai/features.py`, `ai/tests/test_matching.py`, `ai/tests/test_measure.py`, `ai/tests/test_features.py`

**Interfaces:**
- Produces: `match(treat, ctrl, cfg) -> MatchResult(pairs: ndarray[(n,2)], matched_fraction: float, propensity: ndarray)`, `balance(treat, ctrl, pairs, covariates) -> dict[str,float]` (SMD per covariate + `max_smd`), `bootstrap_support(treat, ctrl, cfg, B) -> tuple[low, high]`.
- `measure.py`: pure functions per `04` §5: `loss_rate(df, pairs_idx, start_year, eval_years) -> float`, `support_ratio(dL, dL_claim) -> tuple[float, bool flag]`, `tco2e(area_ha, agb, cf=0.47) -> float`, `reversal_tco2e(...)`, `leakage_delta(...)`, `fire_fraction(...)`, `sar_optical_agreement(...)`.
- `features.py`: `build_features(samples, project, period, cfg) -> FeatureResult(vector: list[float] (16, 6 dp), diagnostics: dict, reversal_tco2e: int, provisional: bool)` in exact order of `04` §6.

- [ ] Step 1: Tests with hand-computed values: `test_support_ratio_clip_and_flag`, `test_tco2e_formula` (1 ha, 100 Mg/ha → 172.333…), `test_match_caliper_drops_unmatched`, `test_balance_smd`, `test_build_features_shape_order_rounding`.
- [ ] Step 2–3: Implement, green. Commit `feat(ai): counterfactual matching, measurements, fv1 features`.

### Task 10: Expert rule, MLP training, ONNX export, scoring, manifest

**Files:**
- Create: `ai/vericanopy_ai/model.py` (`expert_score`, `MLP` numpy class, `train`, `export_onnx`, `model_hash`), `ai/vericanopy_ai/manifest.py` (`build_manifest`, `canonical`, `manifest_sha256`), `ai/vericanopy_ai/score.py` (`run(project_id, period, cfg) -> ScoreResult` writing `data/outputs/<project>/<period>/{features,score,manifest}.json`), `ai/zk/artifacts/model.onnx` (committed, small), `ai/tests/test_model.py`, `ai/tests/test_manifest.py`, `ai/tests/snapshots/`

**Interfaces:**
- Produces: `expert_score(x: ndarray[16]) -> float` per `04` §7.2; `MLP(16→16→8→1, ReLU, Sigmoid)`, `train(n=200_000, seed=0, epochs) -> MLP` (Adam, MSE) reporting MAE on 20% holdout; `export_onnx(mlp, path)` builds graph with `onnx.helper` (Gemm/Relu/Gemm/Relu/Gemm/Sigmoid), `model_hash(path) -> str` = `0x`+sha256 of ONNX bytes; `predict_onnx(path, x) -> float` via onnxruntime.
- Manifest exactly per `04` §8; `canonical(manifest) -> bytes` (sort_keys, separators `(",",":")`, ensure_ascii False, `signatures` removed); `score_bps = round(score*10000)`.

- [ ] Step 1: Tests: `test_expert_score_hand_example`, `test_mlp_monotone_in_support_and_reversal` (over 500 random vectors), `test_onnx_matches_numpy` (max abs err < 1e-5), `test_mae_vs_expert_reported` (asserts MAE < 0.03 and writes value to `docs/BENCHMARKS.md` section via a helper), `test_canonical_stable_under_key_order_and_unicode` (Review Focus 5), `test_run_is_deterministic` (two runs identical features and score_bps), snapshot test for demo A/B/C 2024.
- [ ] Step 2–3: Implement, train, commit `model.onnx` + `training_report.json`. Commit `feat(ai): distilled MLP scorer, ONNX export, manifest`.

## Slice 4 handled in contracts (Task 5). Slice 5: zkML

### Task 11: EZKL circuit build and proving

**Files:**
- Create: `ai/zk/build_circuit.py`, `ai/zk/prove.py`, `ai/zk/artifacts/{settings.json, calibration.json}` (compiled circuit, keys, srs gitignored; `make zk-setup` regenerates), `ai/tests/test_zk.py` (marked `slow`, skipped if artifacts missing)

**Interfaces:**
- Produces: `build(onnx_path, out_dir, input_visibility="hashed", param_visibility="fixed", output_visibility="public")`; `prove(features: list[float], out_dir) -> ProofBundle(proof_path, instances: list[int], feature_commitment: str, score_bps_from_instance: int, proof_hex: str)`; `verify_local(bundle) -> bool`; `evm_calldata(bundle) -> tuple[bytes proof, list[int] instances]`.
- Fixed-point rule: the ONNX output stays a probability; `prove.py` rescales the public output field element with EZKL's output scale to `score_bps = round(y * 10000)` and the contract trusts the instance; the manifest records both `output_scale` and the raw instance so anyone can recompute. Document in `05`-derived `docs/ZK.md`.
- Fallback flag: `ZK_MODE=onchain|offchain` in `.env`; offchain stores `keccak256(proof)` and verification result.

- [ ] Step 1: Run `build` on `model.onnx`; measure proving time, proof size, float-vs-proven max error over 1,000 vectors; write to `docs/BENCHMARKS.md`.
- [ ] Step 2: Tests: `test_prove_and_verify_roundtrip`, `test_tampered_instance_fails`, `test_score_instance_matches_onnx_within_tolerance`.
- [ ] Step 3: Commit `feat(zk): EZKL circuit, prover, benchmarks`.

### Task 12: Solidity verifier + oracle integration

**Files:**
- Create: `contracts/src/verifiers/Halo2Verifier.sol` (generated by `ezkl create-evm-verifier`), `contracts/test/fixtures/proof_A_2024.json`, `contracts/test/IntegrityOracle.zk.t.sol`

- [ ] Step 1: Generate verifier; check bytecode size with `forge build --sizes`. If > 24,576 bytes, try EZKL reusable verifier; if still too large, set `ZK_MODE=offchain` and document in `docs/LIMITATIONS.md`.
- [ ] Step 2: Test `test_real_proof_verifies_and_decodes_score`, `test_tampered_proof_reverts`.
- [ ] Step 3: Commit `feat(zk): on-chain Halo2 verifier wired to IntegrityOracle` (or fallback commit with docs).

## Slice 6: Post-quantum attestations

### Task 13: ML-DSA-65 signing module

**Files:**
- Create: `ai/pq/__init__.py`, `ai/pq/keys.py` (`keygen() -> (pk, sk)`, `save/load` with `0600` perms), `ai/pq/sign_verify.py` (`sign(manifest, sk) -> str b64`, `verify(manifest, sig_b64, pk) -> bool`, `pubkey_hash(pk) -> str`, `ALG="ML-DSA-65"`), `ai/pq/bench.py`, `ai/tests/test_pq.py`

- [ ] Step 1: Tests: `test_sign_verify_roundtrip`, `test_tampered_manifest_fails`, `test_wrong_key_fails`, `test_sizes_match_fips204` (pk 1952 B, sig 3309 B).
- [ ] Step 2: Implement with `dilithium-py` (`ML_DSA_65`); `bench.py` measures keygen/sign/verify time and ECDSA (`eth_account`) sign/verify time, writes `docs/BENCHMARKS.md` PQ section.
- [ ] Step 3: Commit `feat(pq): ML-DSA-65 manifest attestations + benchmarks`.

## Backend

### Task 14: Backend core: DB, IPFS store, API reads

**Files:**
- Create: `backend/app/main.py`, `backend/app/config.py`, `backend/app/db.py`, `backend/app/models.py` (tables from `09` §2 as SQLAlchemy models, geometry as JSON text), `backend/app/ipfs.py` (`put_json(obj) -> cid`, `get_json(cid)`, `put_bytes`), `backend/app/routers/{projects,submissions,challenges,portfolio,stats,metadata,verify,jobs,evidence}.py`, `backend/app/services/overlap.py`, `backend/tests/conftest.py` (SQLite tmp DB), `backend/tests/test_api.py`

**Interfaces:**
- Produces: every endpoint in `09` §3 (P1 `pdd`, `webhooks` return 501 with message). `POST /api/v1/projects/overlap-check` body `{geometry, h3_res}` → `{cells: [str], conflicts: [{cell, project_id, project_name}]}`. `POST /api/v1/verify/pq` body `{manifest_cid?|manifest?, signature?, pq_key_id?}` → `{manifest_hash_matches_chain, key_registered, signature_valid, zk_proof_verified, proof_mode, details}`. Auth: `X-API-Key` header for `/jobs/*` and evidence upload (env `ADMIN_API_KEY`); rate limit via `slowapi` on public reads.

- [ ] Step 1: Tests: `test_projects_list_empty`, `test_overlap_check_reports_conflict`, `test_verify_pq_valid_and_tampered`, `test_metadata_shape`, `test_jobs_requires_api_key`.
- [ ] Step 2–3: Implement, green. Commit `feat(backend): FastAPI API, models, IPFS store`.

### Task 15: Chain indexer + notifier

**Files:**
- Create: `backend/app/indexer/{__init__,events,run}.py`, `backend/app/services/notify.py`, `backend/tests/test_indexer.py` (Anvil-backed, skipped if `anvil` missing)

**Interfaces:**
- Produces: `index_once(w3, deployments, db, confirmations=5)` processes `ProjectCreated/CellsAdded/ProjectActivated/ProjectStatusChanged/ScoreSubmitted/ScoreFinalized/ChallengeOpened/ChallengeVoted/ChallengeResolved/SubmissionVoided/TransferSingle/TransferBatch/Retired/ProjectReversal/ModelRegistered/PQKeyRegistered`; reorg handling by re-scanning from `last_block - confirmations`. `notify.on_reversal(project_id, period, tonnes, covered, shortfall)` inserts a `notifications` row per holder and retiree of that project; `on_score_finalized` likewise when status becomes Impaired.

- [ ] Step 1: Test: deploy to Anvil, seed, emit a reversal, run `index_once`, assert `reversals` row + notifications for holders.
- [ ] Step 2–3: Implement, green. Commit `feat(backend): chain indexer and buyer notifications`.

### Task 16: Oracle worker, scheduler, resolver CLI, e2e script

**Files:**
- Create: `backend/app/workers/oracle.py` (`run_score_job(project_id, period) -> JobResult`: pipeline → prove → manifest → sign → IPFS → `submitScore` tx with stake → record), `backend/app/workers/finalizer.py` (`finalize_due()`), `backend/app/workers/scheduler.py` (RQ scheduler, optional; plain loop fallback), `backend/app/cli.py` (`vericanopy-resolve <submissionId>`: re-run manifest, diff, vote), `scripts/e2e.py`
- Modify: `Makefile` (`pipeline`, `prove`, `submit`, `e2e`, `test`)

- [ ] Step 1: `scripts/e2e.py`: Anvil → deploy → seed → score A/B/C 2024 → submit → warp 5 min (`evm_increaseTime`) → finalize → mint vintages → retire → score C 2021 with reversal → finalize → assert buffer burned + notification → open challenge on B → 2 resolver votes uphold → assert slashing. Exit non-zero on any assertion failure.
- [ ] Step 2: `make e2e` passes. Commit `feat(backend): oracle worker, finalizer, resolver CLI, e2e scenario`.

## Slice 7: Frontend

### Task 17: Web foundation: wagmi config, contracts, design system, layout

**Files:**
- Create: `web/lib/{wagmi.ts,contracts.ts,api.ts,h3.ts,errors.ts,format.ts}`, `web/lib/abis/*.json` (copied from `contracts/out` by `scripts/sync-abis.ts`), `web/app/layout.tsx`, `web/app/providers.tsx`, `web/components/{TopBar,IntegrityBadge,ProofBadge,HashChip,Skeleton,EmptyState,ErrorState}.tsx`, `web/app/globals.css` (palette tokens from `08` §1, Inter + JetBrains Mono)
- Test: `web/__tests__/errors.test.ts` (vitest): decodes `OverlapDetected` → "This land overlaps Project #1 at cell …"; `IntegrityBadge` renders text label + icon per status.

- [ ] Step 1–3: Red → implement → `pnpm test` + `pnpm build` green. Commit `feat(web): foundation, wagmi, design tokens, badges`.

### Task 18: Explore map + project detail

**Files:**
- Create: `web/app/page.tsx`, `web/components/{MapView,H3Overlay,ProjectList,StatsBar}.tsx`, `web/app/projects/[id]/page.tsx`, `web/components/{TwinChart,BeforeAfterSlider,ScoreHistoryChart,SubmissionTable,ManifestViewer,ChallengeModal,RetireModal}.tsx`
- Backend: add `GET /projects/{id}/evidence` series shape `{years:[], project_cover:[], twin_cover:[], twin_ci_low:[], twin_ci_high:[], fires:[{year, fraction}], tiles:{before:url|null, after:url|null}}`.

- [ ] Steps: implement all six tabs from `08` §3; critical values (score, status) read from chain via wagmi `useReadContract`; lists from API. `pnpm build` green. Commit `feat(web): explore map and project detail`.

### Task 19: Register, Portfolio, Challenges, Verify, Security pages

**Files:**
- Create: `web/app/register/page.tsx` (4-step wizard with MapLibre draw via `@mapbox/mapbox-gl-draw` or GeoJSON upload, live overlap pre-check, batched `addCells` with progress, decoded revert on insist), `web/app/portfolio/page.tsx` (holdings, retirements, notifications inbox, certificate HTML download), `web/app/challenges/page.tsx`, `web/app/verify/page.tsx` (`VerifyChecklist`), `web/app/security/page.tsx` (`PQComparisonCard` fed from `docs/BENCHMARKS.md` JSON export `web/public/benchmarks.json`; shows `—` when missing)

- [ ] Steps: implement; Playwright smoke `web/e2e/smoke.spec.ts` (home loads, project page loads, verify page runs checks against local API). Commit `feat(web): register, portfolio, challenges, verify, security`.

### Task 20: Demo mode

**Files:**
- Create: `web/app/demo/page.tsx`, `web/components/{DemoStepper,TimeSlider}.tsx`, `data/demo/outputs/` (precomputed by `make demo-data`: scores per project per year 2018–2025), backend `GET /demo/timeline` serving them with `provenance: "fixture"|"earth-engine"`.

- [ ] Steps: slider 2018→2025 drives per-project state; fire year on C drops score, animates buffer burn, shows toast with impacted retirements; banner text depends on provenance. Commit `feat(web): guided demo mode with time slider`.

## Slice 8: Docs, tests, submission

### Task 21: README, docs, CI green, benchmarks

**Files:**
- Modify: `README.md` (pitch, architecture mermaid, track statement, quick start, addresses table (`—` until deployed), trust model + PQ scope tables, references from `01` verified links, licence + data attributions), `docs/LIMITATIONS.md`, `docs/BENCHMARKS.md` (only measured), `docs/ARCHITECTURE.md`, `docs/SUBMISSION.md` (Devpost text + video script from `12`), `.github/workflows/ci.yml` (contracts, ai, backend, web jobs).

- [ ] Steps: run `make test`; push; confirm GitHub Actions green. Commit `docs: README, limitations, benchmarks, submission kit`.

### Task 22: Testnet deployment (Polygon Amoy) — requires user secrets

- [ ] Steps: with `DEPLOYER_KEY` + funded Amoy wallet: `make deploy CHAIN=amoy`, verify contracts, seed, run oracle job for A/B/C, update README addresses, deploy web to Vercel, API to Railway/Render. Blocked until the user supplies keys; everything else in the plan is independent of this task.
