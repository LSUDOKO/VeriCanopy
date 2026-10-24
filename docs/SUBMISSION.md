# Submission kit (IEEE ClimateChain Global Hackathon 2026)

Deadline: 25 Oct 2026, 7:30 pm IST. Public repo: https://github.com/LSUDOKO/VeriCanopy

## Track alignment
**Carbon Markets & Emissions Transparency.** VeriCanopy targets the track's stated problems — lack of transparency, double counting and complex verification — with blockchain-based credit verification (zk-verified AI scores on-chain), smart contracts that prevent double counting (H3 geospatial exclusivity), and continuous impact tracking (living integrity scores with automatic reversal handling). It also serves Climate Data & Environmental Monitoring through reproducible, signed satellite evidence.

## Project description (Devpost)
**Inspiration.** Peer-reviewed evaluations of dozens of forest carbon projects keep finding over-crediting, and credits are verified once and never revisited, even when forests later burn. Ratings exist, but you must trust a private model. ZK proofs exist, but a proof shows correct maths, not true inputs.

**What it does.** VeriCanopy scores every forest credit from satellite evidence by comparing each project with matched "twin" forest, proves on-chain that the registered AI model produced the score (zkML), blocks the same land from being registered twice, automatically burns buffer credits when forest is lost, lets anyone challenge the inputs with a stake, and signs every record with a NIST post-quantum signature (ML-DSA-65).

**How we built it.** Earth Engine extraction (Hansen GFC, Sentinel-1/2, GEDI, MODIS fire; deterministic labelled fixtures when credentials are absent) → counterfactual matching in Python → 16-feature vector → 417-parameter MLP → EZKL Halo2 proof → generated Solidity verifier (19.8 KB) → `IntegrityOracle` on an EVM chain; ERC-1155 living credits, buffer pool, challenge manager; ML-DSA-65 via a FIPS 204 implementation; FastAPI indexer/API; Next.js + wagmi + MapLibre.

**Challenges.** Binding proofs to inputs (Poseidon commitment as a public instance), fixed-point scaling (EZKL's calibrated lookup range hung the prover on valid vectors until we pinned it to the measured logit domain), the generated verifier's Yul failing under via-IR (compiled standalone), designing challenge incentives that resist griefing and censorship (bond ≥ stake/2, timeout voiding).

**Accomplishments.** End-to-end on a local chain with real proofs: satellite-style features → proven score → on-chain state change → buffer burn → buyer notification → challenge and slashing, all asserted by `make e2e`. Measured benchmarks in `docs/BENCHMARKS.md`.

**What we learned.** Cryptography proves computation, not reality; you need public evidence plus economic challenges for the inputs. Post-quantum claims must be scoped honestly.

**What's next.** Polygon Amoy deployment with live Earth Engine data, decentralised resolvers, STARK-based PQ proofs, risk-priced buffers, PDD claim extraction, community witness app, methane module, registry partnerships.

## Live vs scripted data
Submissions #4 onward on Base Sepolia use live Earth Engine data (`provider: earthengine`); #1–#3 used labelled fixture data before Earth Engine access existed. Say so on camera; the honest low real-data scores for arbitrary pilot rectangles are a feature.

## Demo video script (4:30)
| Time | Scene | Say |
|---|---|---|
| 0:00–0:35 | Explore map | "Forest carbon credits are checked once, by someone you must trust. Studies of dozens of projects found widespread over-crediting." |
| 0:35–1:05 | `/security` trust tables | "ZK proofs prove the maths, not the truth. VeriCanopy closes three gaps: computation, input, and time." |
| 1:05–1:45 | `/register` with the "overlaps the Tapajós block" example → red cells → on-chain revert decoded | "Same land, sold twice? The contract refuses." |
| 1:45–2:40 | Manavgat Pine Forest: live Sentinel-2 before/after, twin chart with the 2021 fire, Frozen badge; Proofs tab → proof badge, manifest, ML-DSA verify | "Real pixels, real fire, real proof: the registered model produced this score." |
| 2:40–3:30 | `/market`: buy 5 t of Tapajós 2021 with MetaMask on Base Sepolia; Portfolio shows the holding, Sell and Retire | "A living credit you can actually trade — with its integrity score on the price tag." |
| 3:30–4:05 | `/challenges` + `/verify` | "Anyone can challenge the inputs. Every record is signed post-quantum, scoped honestly." |
| 4:05–4:30 | README competitor table + roadmap | "Ratings you must trust → proofs you can check." |

## Judging-criteria map
| Criterion | Evidence |
|---|---|
| Climate impact | Targets over-crediting and reversals; peer-reviewed sources; tonnes reversed / covered shown on the Explore page |
| Innovation | zkML-verified MRV + living credits + challenge game + PQ attestations; competitor table in `docs/spec/00_PROJECT_OVERVIEW.md` |
| Technical execution | 43 contract tests incl. real-proof verification, 26 AI tests, backend tests, e2e scenario, measured benchmarks |
| Practical usefulness | Verification layer for existing registries; public read API; buyer notifications; retirement certificates with live link |
| Presentation | Guided demo page; three-gap story; honest limitations |

## Likely judge questions
- *Isn't Halo2 broken by quantum computers?* Yes, and we say so: PQ covers attestations now; STARK proofs are on the roadmap.
- *zkML doesn't prove the satellite data is real.* Correct. Inputs are public and reproducible from the manifest, and anyone can challenge with a stake.
- *Who resolves challenges?* MVP: 2-of-3 independent recomputers with timeout voiding. Roadmap: staked, decentralised resolver set.
- *What if the data is cloudy?* SAR + optical agreement and cloud-free fraction are features; provisional detections never burn credits alone.
