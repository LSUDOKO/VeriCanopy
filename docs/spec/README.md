# VeriCanopy: Specification Pack

> **Carbon credits that prove themselves.**
> Satellite AI scores every forest carbon credit, a zero-knowledge proof shows the AI ran honestly, and the credit keeps updating itself for its whole life.

This folder is a complete build specification for an AI coding agent (or a human team). Read the files **in order**.

| # | File | What it contains |
|---|------|------------------|
| 0 | `AGENT_INSTRUCTIONS.md` | **Start here.** Rules, build order, definition of done, things the agent must never do |
| 1 | `00_PROJECT_OVERVIEW.md` | Problem, solution, pitch, novelty, competitor landscape |
| 2 | `01_RESEARCH_FOUNDATION.md` | Every paper and source, what each one contributes, the research gap |
| 3 | `02_FEATURES_SPEC.md` | All features, unique features, user stories, acceptance criteria |
| 4 | `03_SYSTEM_ARCHITECTURE.md` | Components, data flows, diagrams, monorepo layout, tech stack |
| 5 | `04_AI_SATELLITE_PIPELINE.md` | Datasets, counterfactual matching, features, model, scoring maths |
| 6 | `05_ZKML_PIPELINE.md` | EZKL proof pipeline, commitments, what is and is not proven |
| 7 | `06_SMART_CONTRACTS.md` | Every contract, storage, functions, events, interfaces, gas notes |
| 8 | `07_POST_QUANTUM.md` | Hybrid ECDSA + ML-DSA attestations, honest PQ claims |
| 9 | `08_FRONTEND_SPEC.md` | Pages, components, UX flows, design system |
| 10 | `09_BACKEND_API.md` | FastAPI services, DB schema, jobs, endpoints |
| 11 | `10_SECURITY_TESTING.md` | Threat model, attack scenarios, test plan |
| 12 | `11_DEPLOYMENT.md` | Environments, testnets, CI/CD, env vars |
| 13 | `12_HACKATHON_SUBMISSION.md` | Devpost text, demo video script, judging-criteria mapping |
| 14 | `13_BUSINESS_MARKET.md` | Market readiness, business model, compliance, go-to-market |
| 15 | `14_ROADMAP.md` | Phases from MVP to production, methane module, witness app |

## One-paragraph summary

Forest carbon credits are often over-credited, double-sold, or lose their value when a forest later burns. Existing raters (e.g. Sylvera) ask buyers to trust their private AI; existing blockchain MRV (e.g. Open Forest Protocol) relies on human validators. **VeriCanopy** combines: (1) a satellite AI that compares each project with matched unprotected "twin" forest, (2) a zkML proof (EZKL) verified on-chain that the registered model produced the published score, (3) a geospatial registry that blocks double-registration of land, (4) "living" credit tokens whose integrity score updates and whose buffer pool burns automatically on forest loss, (5) an open challenge game so anyone can dispute the inputs, and (6) post-quantum (ML-DSA) signed attestations so decades-long credit records stay unforgeable.

## Honesty note

"Market ready" in this pack means **production-grade architecture and a clear path to market**. A real launch additionally needs: security audits, legal review, methodology approval by a carbon standard or registry partner, and real project partners. These are listed in `13_BUSINESS_MARKET.md` and `14_ROADMAP.md`. Do not claim in any pitch that the product is already certified or audited.
