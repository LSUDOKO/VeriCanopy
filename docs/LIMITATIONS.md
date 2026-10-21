# Limitations (honest scope)

This file lists every place where the MVP deviates from the full specification in `docs/spec/`, and why. Updated as the build progresses.

| Area | Limitation | Reason | Path forward |
|---|---|---|---|
| Earth Engine | Live satellite extraction runs only when `EE_SERVICE_ACCOUNT_JSON` is set. Otherwise the pipeline runs on committed **fixture samples** (`data/demo/samples/`) and every output is labelled `provider: fixture`. | No Earth Engine credentials in the build environment. | Set credentials; `make pipeline` then uses `EarthEngineProvider`. |
| Post-quantum library | ML-DSA-65 is implemented with `dilithium-py` (pure Python, FIPS 204) rather than liboqs. | No C toolchain dependency; same algorithm and parameter set. | `pip install -e "./ai[oqs]"` switches to liboqs via the same interface. |
| Database | SQLite by default; Postgres via `DATABASE_URL`. PostGIS is not required because overlap pre-checks use H3 in Python. | Lean local dev. | Postgres/PostGIS in `docker-compose.yml`. |
| IPFS | Content-addressed local store with real CIDv1 (raw, sha2-256). Mirrored to a kubo node only when `IPFS_API_URL` is set. | No pinning service in dev. | Pinning service in production. |
| Post-quantum scope | Only manifest attestations are PQ-signed. Halo2/KZG proofs and Ethereum ECDSA are **not** quantum-safe. | Technology availability. | See `docs/spec/07_POST_QUANTUM.md` §8. |
| Challenge resolution | 2-of-3 resolver multisig (trusted operators). | MVP. | Decentralised staked resolvers (roadmap). |
| Model | v1 scorer is distilled from a transparent expert rule; zkML proves the published model was used, not that the rule is right. | No labelled dataset at MVP stage. | Backtest against published REDD+ evaluations. |
