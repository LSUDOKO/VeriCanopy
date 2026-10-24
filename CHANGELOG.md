# Changelog

All notable changes to VeriCanopy are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-10-25

First public release for the IEEE ClimateChain Global Hackathon 2026.

### Added
- Full contract suite on Base Sepolia: ProjectRegistry (H3 overlap lock), ModelRegistry, PQKeyRegistry, IntegrityOracle with on-chain Halo2 verification, ChallengeManager (2-of-3 resolvers, bonds), VeriCredit ERC-1155 living credits, BufferPool, RetirementRegistry, Marketplace.
- Earth Engine extraction pipeline (Hansen GFC 2025, Sentinel-1/2, GEDI L4B, MODIS burned area, Dynamic World) with twin-forest matching and a distilled MLP integrity model.
- EZKL/Halo2 zkML proofs (4,416-byte proofs, ~6 s) verified by a deployed `Halo2Verifier`.
- ML-DSA-65 (FIPS 204) signed manifests and auditor reports.
- FastAPI backend with chain indexer, oracle and finalizer workers, content-addressed evidence store, webhooks, rate limiting.
- MCP server (`/mcp`) exposing registry, evidence, score explanations, and unsigned transaction preparation to AI agents.
- Score explanation endpoint and Ask page.
- NASA FIRMS active-fire badge, leakage ring analysis, year slider on satellite tiles.
- Alerts feed (JSON + RSS), integrity-indexed price guide, public status page, model registry page, printable retirement certificates.
- Next.js 16 web app with brand system, Apple-style UI, scroll animations, Registry map, Market, Register wizard, Portfolio, Challenges, Verify, Security.

[1.0.0]: https://github.com/LSUDOKO/VeriCanopy/releases/tag/v1.0.0
