# Security policy

VeriCanopy is deployed on **Base Sepolia testnet only**. No mainnet funds are at risk, but we still treat findings seriously because the design is meant to carry real credits later.

## Reporting a vulnerability

Email the maintainer listed on the GitHub profile of [@LSUDOKO](https://github.com/LSUDOKO) or open a **private** security advisory on GitHub (Security → Advisories → Report a vulnerability). Please include reproduction steps and the affected component (contracts, backend, AI pipeline, web).

We aim to acknowledge within 72 hours.

## Scope

- Solidity contracts in `contracts/src` (ProjectRegistry, ModelRegistry, PQKeyRegistry, IntegrityOracle, ChallengeManager, VeriCredit, BufferPool, RetirementRegistry, Marketplace, Halo2Verifier integration).
- Backend API, indexer, oracle and finalizer workers, MCP server.
- Manifest signing and verification (ML-DSA-65) and zk proof handling.

## Known limitations

See [docs/LIMITATIONS.md](docs/LIMITATIONS.md). In particular, Ethereum transaction signatures and the Halo2/KZG proof system are not post-quantum; only the manifest attestations are.
