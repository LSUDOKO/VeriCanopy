# 00 · Project Overview

## 1. Identity
- **Name:** VeriCanopy
- **Tagline:** Carbon credits that prove themselves.
- **Hackathon track:** Carbon Markets & Emissions Transparency (IEEE ClimateChain Global Hackathon 2026). Secondary relevance: Climate Data & Environmental Monitoring.
- **Product type:** Web platform (Next.js) + AI/satellite engine (Python) + smart contracts (EVM testnet). Mobile witness app is roadmap.

## 2. The problem (in plain words)
Companies buy forest carbon credits to say "our pollution is cancelled because this forest was protected." Peer-reviewed studies repeatedly find large problems:

1. **Over-crediting.** Many projects claim far more avoided deforestation than actually happened. Evaluations of dozens of REDD+ projects using synthetic-control and matching methods found persistent over-crediting (see `01_RESEARCH_FOUNDATION.md`, sources R1–R4).
2. **Credits are checked once.** A credit verified at issuance is never automatically re-checked. If the forest burns or is logged later, the credit still looks valid (R5, R6).
3. **Double counting.** The same land can be claimed by more than one project or registry.
4. **Trust bottlenecks.** Ratings come from private AI models (you must trust the company) or human validators (slow, expensive, conflict-prone).
5. **Long horizon.** Forest credits make claims about 30–100 years. Records signed today with ECDSA may be forgeable by future quantum computers.

## 3. The solution
VeriCanopy closes **three trust gaps**:

| Gap | Question | VeriCanopy mechanism |
|---|---|---|
| **Computation** | Did the AI really run the registered model? | zkML proof (EZKL/Halo2) verified on-chain against a registered model hash |
| **Input** | Was the right land and data used? Is this land sold twice? | Reproducible data manifests + open challenge game + H3 geospatial overlap registry |
| **Time** | Is the credit still true today, and will its records stay trustworthy for decades? | Living integrity score, automatic buffer burns on reversal, post-quantum (ML-DSA) attestations |

## 4. How it works (user journey)
1. A project developer registers a forest polygon. The contract checks it does not overlap any registered land.
2. The AI engine pulls satellite data (Sentinel-2, Sentinel-1 radar, Hansen forest change, GEDI biomass) for the project and for matched "twin" forest outside it.
3. It computes an **integrity score** (0–1): how much real difference the project made versus its twin, versus what it claimed.
4. The tiny scoring model runs inside EZKL, producing a zero-knowledge proof. The oracle posts score + proof + stake on-chain. The verifier contract checks the proof.
5. The score manifest is signed with ML-DSA-65 (post-quantum) and stored on IPFS; its hash is on-chain.
6. A challenge window opens. Anyone can dispute the inputs by posting a bond. Disputes are resolved and the loser is slashed.
7. Credits (ERC-1155, one ID per project-vintage) carry the latest integrity score. Each monitoring period the AI re-checks. Detected forest loss triggers automatic burns from the project's buffer pool, and buyers whose retired credits are affected get notified.

## 5. Elevator pitch (30 seconds)
> "Zero-knowledge proofs prove the maths, not the truth. Today a carbon credit is checked once by someone you have to trust. VeriCanopy checks every credit continuously from space, proves the AI checking it is honest, blocks land from being sold twice, and automatically corrects the credit when a forest burns, with records signed to survive quantum computers."

## 6. Competitor landscape (be accurate; cite in pitch)

| Player | What they do | What VeriCanopy adds |
|---|---|---|
| **Sylvera** | Private ML + satellite (optical, radar, lidar) ratings of carbon projects; ratings sold via web app/API | Ratings are not cryptographically verifiable and do not change the credit itself |
| **ESA-backed SCORE (Uptoearth)** | Satellite-based rating and ongoing monitoring of carbon projects | Same: trusted off-chain service |
| **Open Forest Protocol** | Blockchain MRV on NEAR; human validators review project data | VeriCanopy's verdict is a proven AI computation, contestable by anyone, not only appointed validators |
| **GainForest** | Community field data, AI models, Solana payouts for verified milestones | Community evidence exists there; VeriCanopy's novelty is not the witness feature |
| **PACT (Cambridge, arXiv 2403.14581)** | Remote sensing + econometrics + on-chain credits on Tezos | PACT issues once; VeriCanopy re-verifies continuously, proves inference, and auto-handles reversals |
| **Hackathon "zk-carbon" projects** | Use ZK for privacy of emissions data | VeriCanopy uses ZK for **verifiable AI**, not just privacy |
| Others to mention only after checking current status `[VERIFY]` | Pachama, Renoster, BeZero, Toucan, KlimaDAO, Regen Network | Check current offerings before citing |

## 7. What is genuinely new (claim only this)
To our knowledge from public research, products and GitHub (checked Oct 2026), no public system combines:
1. zkML proof that a satellite-derived integrity score came from a registered model, **verified on-chain**;
2. credit tokens whose integrity state **updates automatically** with buffer burns and buyer notifications;
3. an open, staked **challenge game** over the AI's inputs;
4. an on-chain **geospatial double-registration guard**;
5. **post-quantum signed** attestations for long-lived credit records.

Phrase it as: *"first integrated system of its kind to our knowledge"*, never *"nothing like this exists."*

## 8. Target users
- **Credit buyers** (corporates, ESG teams): want proof their offsets are real and stay real.
- **Registries and standards bodies:** want cheaper, continuous, auditable MRV.
- **Rating agencies and auditors:** want reproducible evidence.
- **Project developers (honest ones):** want a credibility premium for high-integrity projects.
- **Communities, NGOs, journalists:** want an open way to challenge bad credits.
