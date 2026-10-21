# Instructions for the Building Agent

You are building **VeriCanopy**. Read every file in this pack before writing code. When a file and this one disagree, this file wins.

## 1. Golden rules

1. **Never fabricate results.** Every number shown in the UI, README, pitch, or video (gas cost, proof time, accuracy, latency) must come from running the code. If not measured yet, show `—` or "not measured".
2. **Never fabricate citations.** Only cite sources listed in `01_RESEARCH_FOUNDATION.md`. Before quoting a paper, open its link and confirm it says what you claim. Sources marked `[VERIFY]` must be checked before use in public materials.
3. **Never accuse a real, named carbon project of fraud.** Use demo projects drawn by us ("Demo Project A/B/C"). If analysing a real published project, label output "model estimate for research demonstration" and cite the peer-reviewed study that analysed it.
4. **Be honest about post-quantum scope.** Attestation signatures are post-quantum (ML-DSA). The zk proofs (Halo2/KZG) and Ethereum's ECDSA are **not**. Say so in the README and the UI's "Security" page.
5. **Determinism matters.** Every pipeline step that produces a score must be reproducible from a manifest (dataset IDs, dates, geometry hash, code commit hash, model hash).
6. **Testnet only.** Never deploy to mainnet. Never put real private keys in the repo. Use `.env` + `.env.example`.
7. **Small, working increments.** Get a vertical slice working end-to-end before polishing any layer.

## 2. Build order (vertical slices)

### Slice 1: Skeleton (must work first)
- Monorepo per `03_SYSTEM_ARCHITECTURE.md` §6.
- Foundry project compiles; Next.js app runs; FastAPI app runs; docker-compose brings up Postgres+PostGIS and Redis.

### Slice 2: Registry and credits (no AI yet)
- `ProjectRegistry` with H3-cell overlap check, `VeriCredit` (ERC-1155), `BufferPool`, `RetirementRegistry`.
- Foundry tests: register, reject overlap, issue, retire, buffer burn.
- Frontend: wallet connect, register a project by drawing a polygon, see "Rejected: overlaps Project X".

### Slice 3: Satellite AI
- `ai/` pipeline per `04_AI_SATELLITE_PIPELINE.md`: GEE extraction → matching → features → score.
- Run on 3 demo projects; save `manifest.json` + `features.json` + `score.json`.

### Slice 4: Oracle without ZK
- `IntegrityOracle` accepts a score with oracle stake, starts challenge window, finalises.
- `ChallengeManager` with bonds, resolution, slashing.
- Score updates the project's integrity on-chain; reversal triggers `BufferPool.handleReversal`.

### Slice 5: zkML
- EZKL pipeline per `05_ZKML_PIPELINE.md`; generated `Halo2Verifier.sol` wired into `IntegrityOracle`.
- **Fallback:** if EZKL verifier deployment fails (e.g. contract size), keep proof verification off-chain in the backend, store proof hash on-chain, and document this clearly. The project must still work end-to-end.

### Slice 6: Post-quantum attestations
- `pq/` module per `07_POST_QUANTUM.md`; ML-DSA-65 signing of every score manifest; key registry on-chain; verification page.

### Slice 7: Frontend completeness and demo mode
- All pages in `08_FRONTEND_SPEC.md`; a **Demo Mode** with a time slider and a scripted fire event.

### Slice 8: Docs, tests, submission
- README with architecture diagram, measured benchmarks, limitations.
- Everything in `12_HACKATHON_SUBMISSION.md`.

## 3. Definition of done (MVP)

- [ ] A judge can open the deployed website, connect a testnet wallet, and see 3 demo projects on a map.
- [ ] Registering an overlapping polygon is rejected on-chain with a clear UI message.
- [ ] Each project shows an integrity score, its evidence (before/after imagery, project vs twin chart), and a "Proof verified" badge linking to the on-chain transaction.
- [ ] Moving the demo time slider to the fire year triggers a score drop, a buffer burn, and an "impacted retirements" notice.
- [ ] A challenge can be opened, resolved, and the loser's stake slashed.
- [ ] Every score manifest has a valid ML-DSA-65 signature verifiable on the "Verify" page.
- [ ] `forge test`, `pytest`, and frontend build all pass in CI.
- [ ] README lists real measured numbers and an honest limitations section.

## 4. Things NOT to build in the MVP
- Methane module, mobile witness app, mainnet, real token economics/ICO, KYC. These are roadmap items (`14_ROADMAP.md`).
- Do not add an ERC-20 governance/utility token. Staking uses testnet native currency or a mock ERC-20 clearly named `MockStake`.

## 5. Coding standards
- Solidity `^0.8.24`, OpenZeppelin Contracts v5, Foundry, NatSpec on every external function, custom errors, events for every state change.
- Python 3.11, type hints, `ruff` + `black`, `pytest`.
- TypeScript strict, Next.js App Router, `wagmi` + `viem`, ESLint.
- Conventional commits. Each slice is a PR-sized commit set.

## 6. When stuck
- Library APIs (EZKL, liboqs, Earth Engine, wagmi) change between versions. Check the installed version's docs before writing calls; pin versions in lockfiles.
- If a step is impossible, write the reason into `docs/LIMITATIONS.md` and implement the documented fallback rather than faking the feature.
