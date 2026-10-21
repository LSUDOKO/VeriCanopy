# 09 · Backend and API

FastAPI (Python 3.11) + Postgres 16/PostGIS + Redis/RQ workers + chain indexer.

## 1. Services
| Service | Responsibility |
|---|---|
| `api` | REST endpoints for web app and public API |
| `worker` | Runs AI pipeline jobs, EZKL proving, PQ signing, IPFS uploads, oracle tx submission |
| `indexer` | Follows contract events (web3.py), writes to Postgres; handles reorgs (confirmations depth ≥ 5) |
| `scheduler` | Periodic monitoring runs per project (cron-like, RQ scheduler) |
| `notifier` | Turns `ScoreFinalized` / `ProjectReversal` / challenge events into user notifications |

## 2. Database schema (SQL sketch)
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE projects (
  id BIGINT PRIMARY KEY,                 -- on-chain projectId
  developer TEXT NOT NULL,
  name TEXT, country TEXT,
  geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
  geometry_hash TEXT NOT NULL,
  h3_res SMALLINT NOT NULL,
  start_date DATE, claimed_baseline_bps INT,
  status TEXT NOT NULL, metadata_uri TEXT,
  created_tx TEXT, created_at TIMESTAMPTZ
);
CREATE INDEX ON projects USING GIST (geom);

CREATE TABLE project_cells (cell BIGINT PRIMARY KEY, project_id BIGINT REFERENCES projects(id));

CREATE TABLE submissions (
  id BIGINT PRIMARY KEY, project_id BIGINT REFERENCES projects(id),
  period SMALLINT, score_bps INT, reversal_tonnes BIGINT,
  feature_commitment TEXT, model_hash TEXT, manifest_hash TEXT, manifest_cid TEXT,
  pq_key_id TEXT, oracle TEXT, stake NUMERIC, status TEXT, window_end TIMESTAMPTZ,
  tx_hash TEXT, proof_mode TEXT CHECK (proof_mode IN ('onchain','offchain'))
);

CREATE TABLE challenges (
  id BIGINT PRIMARY KEY, submission_id BIGINT REFERENCES submissions(id),
  challenger TEXT, bond NUMERIC, reason TEXT, evidence_cid TEXT,
  votes_uphold INT DEFAULT 0, votes_reject INT DEFAULT 0, outcome TEXT, resolved_at TIMESTAMPTZ
);

CREATE TABLE vintages (token_id NUMERIC PRIMARY KEY, project_id BIGINT, vintage SMALLINT,
  issued BIGINT, buffer BIGINT, retired BIGINT DEFAULT 0, burned BIGINT DEFAULT 0);

CREATE TABLE holdings (holder TEXT, token_id NUMERIC, amount NUMERIC, PRIMARY KEY (holder, token_id));

CREATE TABLE retirements (id BIGINT PRIMARY KEY, holder TEXT, token_id NUMERIC, amount NUMERIC,
  beneficiary TEXT, score_at_retirement INT, ts TIMESTAMPTZ, tx_hash TEXT);

CREATE TABLE reversals (project_id BIGINT, period SMALLINT, tonnes BIGINT, covered BIGINT, shortfall BIGINT, tx_hash TEXT);

CREATE TABLE notifications (id BIGSERIAL PRIMARY KEY, address TEXT, kind TEXT, payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now(), read_at TIMESTAMPTZ);

CREATE TABLE jobs (id UUID PRIMARY KEY, kind TEXT, project_id BIGINT, period SMALLINT,
  status TEXT, log TEXT, result JSONB, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE indexer_state (chain_id INT PRIMARY KEY, last_block BIGINT);
```
Use Alembic migrations.

## 3. REST endpoints (`/api/v1`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/projects` | list with filters (`status`, `minScore`, `bbox`) |
| GET | `/projects/{id}` | detail + latest integrity + geometry GeoJSON |
| GET | `/projects/{id}/history` | submissions, scores, reversals |
| GET | `/projects/{id}/evidence?period=` | twin chart series, tile URLs, fire events |
| POST | `/projects/overlap-check` | body: GeoJSON → H3 cells + conflicts (off-chain pre-check) |
| POST | `/projects/{id}/pdd` | upload PDD → IPFS → claim extraction job (P1) |
| POST | `/jobs/score` | (oracle/admin auth) run pipeline for project/period |
| GET | `/jobs/{id}` | job status/logs |
| GET | `/submissions/{id}` | submission + manifest (from IPFS cache) |
| POST | `/verify/pq` | body: manifest CID or JSON → PQ verification result |
| GET | `/challenges?status=` | challenges list |
| POST | `/evidence` | upload challenge evidence → IPFS CID |
| GET | `/portfolio/{address}` | holdings, retirements, notifications |
| GET | `/metadata/{tokenId}` | ERC-1155 metadata JSON (live integrity) |
| GET | `/stats` | headline numbers from indexer |
| POST | `/webhooks` | (P1) register webhook for project events |

Auth: public reads; writes either via wallet signature (SIWE, EIP-4361) for users or API key for oracle/admin. Rate limit public endpoints.

## 4. Oracle job (worker) flow
1. Load project + period, build pipeline config, run `vericanopy_ai.score.run` (cache EE samples).
2. EZKL witness + proof; local verify must pass.
3. Build manifest, ML-DSA sign, upload manifest + proof + features to IPFS.
4. Encode calldata, send `submitScore` with stake from the oracle wallet (nonce management, gas estimation, retries with backoff).
5. Record job result; indexer picks up `ScoreSubmitted`.
6. After `windowEnd`, a scheduled job calls `finalize` if no open challenge.

## 5. Resolver tool (MVP challenge resolution)
CLI `vericanopy-resolve <submissionId>`: downloads manifest, re-runs the pipeline from the manifest, compares features and score, prints a diff, and (if the operator confirms) sends `vote(challengeId, uphold)`. Each of the 3 resolvers runs it independently with their own key.

## 6. Config (`.env.example`)
```
DATABASE_URL=postgresql+psycopg://vc:vc@localhost:5432/vericanopy
REDIS_URL=redis://localhost:6379/0
RPC_URL=https://rpc-amoy.polygon.technology   # [VERIFY current public RPC]
CHAIN_ID=80002
ORACLE_PRIVATE_KEY=            # testnet only
PQ_SECRET_KEY_PATH=./secrets/ml_dsa_65.sk
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY=https://ipfs.io/ipfs/
EE_SERVICE_ACCOUNT_JSON=./secrets/ee.json
EE_PROJECT=
DEPLOYMENTS_FILE=../contracts/deployments/80002.json
```
