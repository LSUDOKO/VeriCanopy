# 02 · Features Specification

Priority: **P0** = MVP must-have · **P1** = should-have · **P2** = roadmap.
★ = unique feature (part of the novelty claim).

---

## F1 ★ Geospatial Double-Registration Guard (P0)
**What:** A project's polygon is converted to H3 hexagon cells. The `ProjectRegistry` contract refuses to register any cell already owned by another active project.

**User stories**
- As a registry, I want overlapping claims to be rejected automatically so the same land cannot generate credits twice.
- As a buyer, I want to see that a project's land is exclusively claimed.

**Acceptance criteria**
- Registering a polygon that shares ≥1 cell with an active project reverts with `OverlapDetected(cellId, existingProjectId)`.
- UI shows a red map overlay of the overlapping cells and the conflicting project.
- Scalable mode (P1): Merkle root of cells + overlap fraud proof (see `06_SMART_CONTRACTS.md` §3).

## F2 ★ Counterfactual Integrity Score (P0)
**What:** For each project and monitoring period, compare forest outcomes inside the project to matched "twin" pixels outside it. Produce:
- `observed_effect`: avoided loss (or added gain) vs twins
- `claimed_effect`: from the project's declared baseline
- `integrity_score` ∈ [0,1] = how much of the claim is supported
- `reversal_tCO2e`: carbon lost this period inside the project

**Acceptance criteria**
- Each score has a `manifest.json` listing dataset IDs, date ranges, geometry hash, matching parameters, code commit, model hash.
- Re-running the pipeline with the same manifest reproduces the same features (within documented float tolerance) and the identical score.

## F3 ★ zkML Proof of Honest Scoring (P0, fallback allowed)
**What:** The final scoring model runs inside EZKL. The proof attests: *the registered model (hash H_m) applied to features with commitment H_f produced score S.* Verified on-chain by `Halo2Verifier`.

**Acceptance criteria**
- `IntegrityOracle.submitScore` reverts if the proof fails.
- UI shows a "Proof verified" badge with links to the verifying transaction, model hash, and feature commitment.
- Fallback (documented): off-chain verification + proof hash on-chain, UI labels it "verified off-chain".

## F4 ★ Living Credits (P0)
**What:** ERC-1155 credit tokens (one ID per project-vintage). Each ID has a public, updating `integrityScore` and status (`Active`, `UnderReview`, `Impaired`, `Frozen`).

**Acceptance criteria**
- New scores update state once their challenge window finalises.
- If `integrityScore < impairThreshold` (default 0.5) → status `Impaired`; UI shows a warning on every listing.
- Score history is queryable (events + backend index) and charted.

## F5 ★ Automatic Reversal Handling (P0)
**What:** When finalised data show `reversal_tCO2e > 0`, `BufferPool` burns that many buffer credits from the project's buffer. If the buffer is insufficient, the project's unretired credits are `Frozen`, and the shortfall is recorded.

**Acceptance criteria**
- Burn is automatic in the same transaction as score finalisation.
- `BufferPool` emits `ProjectReversal(projectId, period, tonnes, covered, shortfall)`. The backend indexer finds all holders and retirements of that project and notifies them (in-app inbox, email/webhook). No unbounded loops on-chain.

## F6 ★ Open Challenge Game (P0)
**What:** Each submitted score opens a challenge window. Anyone can post a bond and a challenge reason (wrong geometry, wrong date range, cloud contamination, bad matching, data tampering), plus an evidence URI.

**Acceptance criteria**
- Challenge only during the window, bond ≥ `minChallengeBond`.
- Resolution (MVP): a resolver set (M-of-N independent recomputers, e.g. 2-of-3) re-runs the manifest and votes. Winner gets bond + share of loser's stake. Documented as the MVP trust assumption.
- Score finalises only if unchallenged or challenge rejected.

## F7 ★ Post-Quantum Signed Attestations (P0)
**What:** Each score manifest is signed by the oracle with **ML-DSA-65** (and by ECDSA via the oracle's Ethereum transaction). ML-DSA public key hashes are registered on-chain. Signatures + manifests live on IPFS; hashes on-chain.

**Acceptance criteria**
- "Verify" page: paste or select a manifest → verifies the ML-DSA signature in the browser or backend and shows ✓/✗.
- Security page states clearly what is PQ-secure and what is not (see `07_POST_QUANTUM.md`).

## F8 Claim Gap Analyser (P1)
**What:** The project uploads its Project Design Document (PDF). An LLM extracts claimed baseline deforestation rate, area, and claimed tCO2e. The UI shows **Claimed vs Observed**.
- LLM output is structured JSON with page citations; a human confirms before it is used in scoring.
- Never presented as an accusation; shown as "model estimate".

## F9 Buyer Portfolio and Retirement (P0)
- Buy (testnet transfer from a demo issuer), retire with beneficiary name, download retirement certificate (PDF/HTML) showing the integrity score at retirement **and** a live link to its current status.

## F10 Evidence Viewer (P0)
- Per project: map with project polygon + twin sample areas; Sentinel-2 before/after tiles; time-series chart of forest cover (project vs twins); fire events overlay.

## F11 Demo Mode (P0, hackathon)
- Time slider 2018→2025; scripted reversal on Demo Project C (a polygon drawn in an area with a real, publicly documented wildfire, e.g. the 2021 Antalya/Muğla fires in Türkiye [VERIFY dates]).
- Demo Mode uses precomputed real pipeline outputs, labelled "replay of real computation".

## F12 Public API (P1)
- REST read API for scores, manifests, proofs, project states; webhooks for status changes.

## F13 Risk-priced buffers (P2)
- Buffer requirement = f(wildfire risk, historic loss, climate exposure); see R5, R6.

## F14 Community Witness App (P2)
- Geotagged photo evidence attachable to challenges. (Not a novelty claim; GainForest does community field data.)

## F15 Methane Module (P2)
- Landfill and coal mine methane credits checked against plume detections from high-resolution methane instruments. See `14_ROADMAP.md`.

---

## Roles and permissions

| Role | Can |
|---|---|
| Visitor | View map, projects, scores, proofs, verify signatures |
| Developer (project) | Register projects, upload PDD, request issuance |
| Issuer (registry admin, multisig) | Approve issuance, set parameters |
| Oracle | Submit scores with stake and proof |
| Challenger (anyone) | Open challenges with bond |
| Resolver (M-of-N) | Vote on challenges (MVP) |
| Buyer | Hold, transfer, retire credits; receive impact notices |
