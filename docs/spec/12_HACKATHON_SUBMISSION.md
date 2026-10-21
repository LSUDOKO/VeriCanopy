# 12 · Hackathon Submission Kit (IEEE ClimateChain Global Hackathon 2026)

Deadline: **25 Oct 2026, 7:30 pm IST (GMT+5:30)**. Required: track alignment, project description, 3–5 min demo video, public code repo, working prototype.

## 1. Track alignment (paste into Devpost)
**Track:** Carbon Markets & Emissions Transparency.
VeriCanopy directly targets the track's stated problems: lack of transparency, **double counting**, and **complex verification**. It provides blockchain-based credit verification (zk-verified AI scores on-chain), smart contracts that prevent double counting (H3 geospatial exclusivity), and continuous emissions-impact tracking for forest credits (living integrity scores with automatic reversal handling). It also contributes to Climate Data & Environmental Monitoring through reproducible, signed satellite evidence.

## 2. Project description (Devpost draft; edit with real measured numbers)
**Inspiration.** Peer-reviewed evaluations of dozens of forest carbon projects keep finding over-crediting, and credits are verified once and then never revisited, even when forests later burn. Ratings exist, but you must trust a private model. ZK proofs exist, but as the *Emission Impossible* paper notes, a proof shows correct maths, not true inputs.

**What it does.** VeriCanopy scores every forest credit from satellite evidence by comparing each project with matched "twin" forest, proves on-chain that the registered AI model produced the score (zkML), blocks the same land from being registered twice, automatically burns buffer credits when forest is lost, lets anyone challenge the inputs with a stake, and signs every record with a NIST post-quantum signature (ML-DSA) because forest credits must stay trustworthy for decades.

**How we built it.** Earth Engine (Hansen GFC, Sentinel-1/2, GEDI, MODIS fire) → counterfactual matching in Python → 16-feature vector → tiny MLP → EZKL Halo2 proof → Solidity verifier on Polygon Amoy; ERC-1155 living credits, buffer pool, challenge manager; liboqs ML-DSA-65; FastAPI + PostGIS indexer; Next.js + wagmi + MapLibre.

**Challenges.** Binding proofs to inputs, fixed-point accuracy in circuits, contract size of generated verifiers, designing challenge incentives that resist griefing and censorship.

**Accomplishments.** End-to-end on testnet: real satellite data → proven score → on-chain state change. Real measured benchmarks in `docs/BENCHMARKS.md`.

**What we learned.** Cryptography can prove computation, not reality; you need public evidence plus economic challenges for the inputs. Post-quantum claims must be scoped honestly.

**What's next.** Decentralised resolvers, STARK-based PQ proofs, risk-priced buffers, community witness app, methane module, registry partnerships.

**Target users, scale and adoption.** Buyers, registries, raters, honest developers, NGOs. Plugs into existing registries as a verification layer (no need to replace standards). Scales globally because inputs are public satellite data; cost per project-period is compute + one transaction.

## 3. Demo video script (4:30)
| Time | Scene | Say (short) | Criterion |
|---|---|---|---|
| 0:00–0:35 | Title + map | "Forest carbon credits are checked once, by someone you must trust. Studies of dozens of projects found widespread over-crediting." | Climate impact |
| 0:35–1:05 | Architecture diagram (3 trust gaps) | "ZK proofs prove the maths, not the truth. VeriCanopy closes three gaps: computation, input, and time." | Innovation |
| 1:05–1:45 | Register Demo Project D overlapping A → revert decoded | "Same land, sold twice? The contract refuses." | Technical / Practical |
| 1:45–2:40 | Project B: twin chart, claim vs observed, low score; proof badge → explorer tx; manifest | "The AI compares the project with its twin forest. The proof shows the registered model produced this score." | Technical |
| 2:40–3:30 | Demo slider to fire year on Project C: score drops, buffer burns, buyer notification | "When the forest burns, the credit corrects itself and buyers are told." | Climate impact |
| 3:30–4:05 | Challenge flow + Verify page (ML-DSA ✓) | "Anyone can challenge the inputs. Every record is signed post-quantum, scoped honestly." | Innovation / Security |
| 4:05–4:30 | Competitor table + roadmap | "Ratings you must trust → proofs you can check." | Presentation |

Recording tips: 1080p, large browser zoom, cursor highlight, captions, no dead air, show real tx hashes.

## 4. Judging-criteria map
| Criterion | Evidence in the submission |
|---|---|
| Climate impact | Targets over-crediting and reversals; peer-reviewed sources; tonnes reversed/covered shown |
| Innovation & creativity | zkML-verified MRV + living credits + challenge game + PQ attestations; competitor table |
| Technical execution | Working testnet deployment, tests passing, measured benchmarks, open repo |
| Practical usefulness | Verification layer for existing registries; public API; buyer notifications |
| Presentation | Guided demo page; clear 3-gap story; honest limitations |

## 5. Repo README checklist
- [ ] One-line pitch, GIF of demo, architecture diagram
- [ ] Track statement
- [ ] Quick start (`make setup && make chain && make deploy && make seed`)
- [ ] Deployed contract addresses + live demo URL
- [ ] Trust model and PQ scope tables
- [ ] `docs/BENCHMARKS.md` (measured only), `docs/LIMITATIONS.md`
- [ ] References (from `01_RESEARCH_FOUNDATION.md`, verified links only)
- [ ] Licence (MIT or Apache-2.0) and data attributions (ESA Copernicus, UMD/Hansen, NASA GEDI, MODIS)

## 6. Pitch Q&A prep (likely judge questions)
- *"Isn't Halo2 broken by quantum computers?"* Yes, and we say so. PQ covers attestations now; STARK proofs are on the roadmap.
- *"zkML doesn't prove the satellite data is real."* Correct. Inputs are public and reproducible from the manifest, and anyone can challenge with a stake.
- *"How is this different from Sylvera / Open Forest Protocol?"* See the competitor table: proven computation + automatic credit state + open challenges.
- *"Who resolves challenges?"* MVP: 2-of-3 independent recomputers, with timeout voiding. Roadmap: staked, decentralised resolver set.
- *"What if satellite data is wrong (clouds)?"* SAR + optical agreement feature, cloud-free fraction in the score, provisional detections never burn credits alone.
