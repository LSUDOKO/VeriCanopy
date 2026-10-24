# Contributing to VeriCanopy

Thanks for helping build verifiable forest carbon credits.

## Development setup

```bash
make setup        # python venv (uv), forge deps, pnpm install
make zk-setup     # EZKL circuit, proving key, SRS, Solidity verifier (one-off)
make chain        # anvil in terminal 1
make deploy       # full stack to the local chain
make api          # FastAPI + indexer + workers
make web          # Next.js dev server
```

Foundry binaries live in `~/.config/.foundry/bin` on the reference machine; the Makefile prepends that path.

## Project layout

| Path | What lives there |
|---|---|
| `contracts/` | Solidity 0.8.26 (Foundry). `forge test` must stay green. |
| `ai/` | Earth Engine extraction, matching, feature vector, MLP, EZKL circuit, ML-DSA-65 signing. |
| `backend/` | FastAPI API, chain indexer, oracle/finalizer workers, MCP server, content store. |
| `web/` | Next.js 16 app (wagmi, RainbowKit, MapLibre, GSAP). |
| `scripts/` | Deploy, seed, e2e, benchmark helpers. |
| `docs/` | Architecture, deployment, limitations, benchmarks, MCP, features. |

## Checks before a pull request

```bash
cd contracts && forge fmt --check && forge test
cd backend && ../.venv/bin/ruff check . && ../.venv/bin/pytest -q
cd ai && ../.venv/bin/ruff check . && ../.venv/bin/pytest -q -m "not slow"
cd web && pnpm lint && pnpm test && pnpm build
```

CI runs the same four jobs on every push and pull request.

## Commit messages

Conventional Commits: `feat(web): …`, `fix(backend): …`, `docs: …`, `test(contracts): …`.

## Security

Do not open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).

## Secrets

Never commit anything under `secrets/`, `.env*` files, Earth Engine service-account JSON, or ML-DSA secret keys. The `.gitignore` already covers these; keep it that way.
