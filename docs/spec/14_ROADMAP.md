# 14 · Roadmap

## Phase 0: Hackathon MVP (now → 25 Oct 2026)
- Slices 1–8 from `AGENT_INSTRUCTIONS.md`.
- 3–4 demo projects, testnet deployment, on-chain zk verification (or documented off-chain fallback), ML-DSA attestations, demo mode, video.

## Phase 1: Credible beta (1–3 months)
- Tier-2 Merkle overlap fraud proofs.
- Claim Gap Analyser (LLM extraction of PDD claims with human confirmation).
- Public API + webhooks; ERC-1155 live metadata.
- Backtest the score against published independent REDD+ evaluations; publish methodology paper (arXiv preprint).
- Browser (WASM) ML-DSA verification.
- Bind `projectId` and `period` as public inputs in model v2 to remove replay assumptions.

## Phase 2: Decentralise trust (3–9 months)
- Staked, decentralised resolver set with randomised selection; incentive design informed by challenge-protocol research (`01` §D).
- Multiple independent oracles; disagreement triggers automatic review.
- Shared buffer pool and risk-priced buffers using wildfire/climate risk (R5, R6).
- Proof of feature extraction: TEE attestation or zk proof over committed satellite tiles (research frontier).

## Phase 3: Post-quantum completeness (6–18 months)
- STARK-family (hash-based) proofs for model inference.
- PQ smart accounts for oracle and governance (account abstraction with ML-DSA validation).
- On-chain or rollup-native ML-DSA verification.

## Phase 4: Expansion
- **Community Witness mobile app:** geotagged, timestamped, signed photos attached to challenges; offline-first for remote areas. (Not a novelty claim; similar community data exists, e.g. GainForest.)
- **Methane module:** landfill and coal-mine methane destruction credits checked against plume detections from high-resolution methane-sensing satellites `[VERIFY suitable public data sources]`. Note: coarse instruments (~km pixels) cannot attribute emissions to single small sites; use fine-resolution sources only.
- **Other project types:** afforestation/reforestation (ARR) growth verification with GEDI/canopy-height models; improved forest management with dynamic ex-post baselines (R4).
- **Registry integrations** and standards approval as a dMRV tool.

## Explicitly out of scope (with reasons)
- **Factory-level CO2 verification from Sentinel-5P:** TROPOMI does not measure CO2 and its ~5.5×7 km pixels cannot isolate single facilities.
- **Speculative token / ICO:** adds regulatory risk without improving integrity.
- **Claims of full post-quantum security** before Phase 3 is complete.
