# 01 · Research Foundation

Legend: **[CHECKED]** = located and its abstract/description read during project research (Oct 2026). **[VERIFY]** = well-known source from background knowledge; open the link and confirm details before quoting publicly.

Rule for the agent: paraphrase; never paste long passages; cite with title + link.

---

## A. Carbon credit integrity (the problem)

**R1. Tropical forest carbon offsets deliver partial gains amid persistent over-crediting** [CHECKED]
- PubMed ID 41066561. https://pubmed.ncbi.nlm.nih.gov/41066561/
- Evaluated 52 voluntary REDD+ projects across 12 tropical countries with synthetic control methods.
- **Use:** core evidence that over-crediting is widespread; justifies counterfactual-based scoring.

**R2. Unobserved confounders cannot explain over-crediting in avoided deforestation carbon projects** [CHECKED]
- PMCID PMC13253331. https://pmc.ncbi.nlm.nih.gov/articles/PMC13253331/
- Revisits 44 REDD+ projects; some reduced deforestation but over-crediting was widespread.
- **Use:** robustness argument: matching-based counterfactuals are defensible.

**R3. Learning lessons from over-crediting to ensure additionality in forest carbon credits** [CHECKED]
- PMCID PMC13133336. https://pmc.ncbi.nlm.nih.gov/articles/PMC13133336/
- Synthesises evaluations of first-generation REDD+ and mechanisms of over-crediting.
- **Use:** design of the "Claim Gap" metric.

**R4. Dynamic ex-post baselines for enhancing the credibility of Improved Forest Management carbon offsets** [CHECKED]
- PubMed ID 41728826. https://pubmed.ncbi.nlm.nih.gov/41728826/
- Builds satellite-based ex-post counterfactual baselines (2001–2020) for five IFM projects in China; project forests would have kept accumulating carbon anyway.
- **Use:** direct methodological basis for VeriCanopy's dynamic, re-computed baselines.

**R5. Forest carbon protocols underestimate climate-driven carbon loss risks** [CHECKED]
- PubMed ID 42162435. https://pubmed.ncbi.nlm.nih.gov/42162435/
- **Use:** justifies continuous monitoring and risk-priced buffers.

**R6. Widespread increases in future wildfire risk to global forest carbon offset projects revealed by explainable AI** [CHECKED]
- arXiv 2305.02397. https://arxiv.org/abs/2305.02397
- XAI model trained on millions of global satellite wildfire observations.
- **Use:** roadmap feature: wildfire-risk-priced buffer requirements.

**R7. Sensitivity of REDD+ effectiveness estimates to matching specifications and pixels vs polygons** [CHECKED]
- bioRxiv doi 10.1101/2024.05.22.595326
- **Use:** shows results depend on matching choices, so VeriCanopy publishes its matching spec in every manifest and allows challenges on it.

**R8. A Global Dataset of Location Data Integrity-Assessed Reforestation Efforts** [CHECKED]
- arXiv 2508.11349. https://arxiv.org/abs/2508.11349
- Reforestation claims are often self-reported; adds satellite time series for integrity assessment.
- **Use:** possible source of demo geometries and validation labels (check licence).

**R9. West et al., "Overstated carbon emission reductions from voluntary REDD+ projects in the Brazilian Amazon," PNAS 2020** [VERIFY]
**R10. West et al., "Action needed to make carbon offsets from forest conservation work for climate change mitigation," Science 2023** [VERIFY]
- **Use:** foundational synthetic-control evidence; widely cited.

## B. Blockchain + carbon (prior art to position against)

**B1. Global, robust and comparable digital carbon assets (PACT)** [CHECKED]
- arXiv 2403.14581. https://arxiv.org/abs/2403.14581. Jaffer, Dales, Ferris, Swinfield, Sorensen, Message, Keshav, Madhavapeddy.
- Remote sensing + econometrics + on-chain registry/custodian on Tezos.
- **Gap VeriCanopy fills:** no continuous re-verification, no proof of the computation, no automatic reversal handling.

**B2. A Blockchain-Oriented Software Engineering Architecture for Carbon Credit Certification Systems** [CHECKED]
- arXiv 2601.13772. https://arxiv.org/abs/2601.13772
- Blockchain + IoT certification architecture for small renewable installations.
- **Use:** architecture reference for certification flows.

**B3. Harnessing Web3 on Carbon Offset Market for Sustainability: Framework and A Case Study** [CHECKED]
- arXiv 2308.02039. https://arxiv.org/abs/2308.02039

**B4. Incentivizing Gigaton-Scale CDR via a Climate-Positive Blockchain** [CHECKED]
- arXiv 2308.02653. https://arxiv.org/abs/2308.02653

## C. Verifiable computation and AI (the "honest AI" layer)

**C1. Emission Impossible: privacy-preserving carbon emissions claims** [CHECKED]
- arXiv 2506.16347. https://arxiv.org/abs/2506.16347
- zk-SNARKs to prove emissions claims without revealing inputs.
- **Key insight used in pitch:** a ZK proof shows the prover knows inputs satisfying the circuit; it does **not** show those inputs reflect physical reality. VeriCanopy addresses the input problem with public satellite data, manifests and challenges.

**C2. A Survey of Zero-Knowledge Proof Based Verifiable Machine Learning** [CHECKED]
- arXiv 2502.18535. https://arxiv.org/abs/2502.18535

**C3. Artemis: Efficient Commit-and-Prove SNARKs for zkML** [CHECKED]
- arXiv 2409.12055. https://arxiv.org/abs/2409.12055
- **Use:** explains why binding the proof to committed inputs/model (commitment verification) matters.

**C4. Enhancing Trust in AI Marketplaces: Evaluating On-Chain Verification of Personalized AI Models using zk-SNARKs** [CHECKED]
- arXiv 2504.04794. https://arxiv.org/abs/2504.04794

**C5. opML: Optimistic Machine Learning on Blockchain** [CHECKED]
- arXiv 2401.17555. https://arxiv.org/abs/2401.17555
- Fraud-proof (challenge) model for ML on-chain.
- **Use:** inspiration for the challenge game.

**C6. EigenAI: Deterministic Inference, Verifiable Results** [CHECKED]
- arXiv 2602.00182. https://arxiv.org/abs/2602.00182
- Deterministic inference + optimistic re-execution with challenge window.

**C7. Toward Web 4.0: Bidirectional Trust between AI Agents and Blockchain** [CHECKED]
- arXiv 2605.08922. https://arxiv.org/abs/2605.08922
- Mentions ERC-7992 (ML model registration and ZK inference proof verification). **[VERIFY ERC-7992 status before citing.]**

**C8. EZKL documentation** [VERIFY version]: https://docs.ezkl.xyz, https://github.com/zkonduit/ezkl

## D. Challenge-game incentive design (to avoid naive mechanisms)

**D1. (Im)possibility of Incentive Design for Challenge-based Blockchain Protocols** [CHECKED]: arXiv 2512.20864. https://arxiv.org/abs/2512.20864
**D2. Hollow Victory: How Malicious Proposers Exploit Validator Incentives in Optimistic Rollup Dispute Games** [CHECKED]: arXiv 2504.05094. https://arxiv.org/abs/2504.05094
**D3. Economic Censorship Games in Fraud Proofs** [CHECKED]: arXiv 2502.20334. https://arxiv.org/abs/2502.20334
**D4. Dynamic Fraud Proof** [CHECKED]: arXiv 2502.10321. https://arxiv.org/abs/2502.10321
- **Use (all D):** set challenger rewards so winning a challenge is profitable, and protect against censorship and bond-griefing (see `06_SMART_CONTRACTS.md` §6).

## E. Data sources [VERIFY exact IDs/versions in the Earth Engine catalog]
- Hansen/UMD Global Forest Change (annual tree cover loss), Hansen et al., *Science* 2013. GEE: `UMD/hansen/global_forest_change_*` (use latest version)
- Sentinel-2 surface reflectance: `COPERNICUS/S2_SR_HARMONIZED`
- Sentinel-1 SAR GRD: `COPERNICUS/S1_GRD`
- GEDI L4B gridded above-ground biomass density: `LARSE/GEDI/GEDI04_B_002`
- ESA WorldCover: `ESA/WorldCover/v200`; Google Dynamic World: `GOOGLE/DYNAMICWORLD/V1`
- MODIS burned area: `MODIS/061/MCD64A1`; FIRMS active fire: `FIRMS`
- SRTM elevation: `USGS/SRTMGL1_003`
- Travel time to cities: `Oxford/MAP/accessibility_to_cities_2015_v1_0`
- Protected areas (WDPA): `WCMC/WDPA/current/polygons` (check licence for commercial use)

## F. Standards
- **NIST FIPS 204: ML-DSA** (Module-Lattice Digital Signature Standard, Aug 2024) [VERIFY]
- **Open Quantum Safe liboqs / liboqs-python** [VERIFY API]: https://openquantumsafe.org
- **Uber H3** hexagonal geospatial index: https://h3geo.org
- **ERC-1155** multi-token standard; **EIP-712** typed signatures
- **ICVCM Core Carbon Principles** (integrity benchmark for the voluntary market) [VERIFY]

## G. The research gap (one paragraph for the README)
Satellite-based counterfactual evaluation of carbon projects is now well established (R1–R4, R9–R10), and blockchain registries for carbon exist (B1–B3). Verifiable ML (C2–C6) has matured but has been applied to generic AI, not carbon MRV. Meanwhile, ZK carbon systems leave the input-truth problem open (C1). VeriCanopy is the first system we know of that ties these together: proven inference over public satellite evidence, contestable inputs, continuously updated credit state, and post-quantum signed records.
