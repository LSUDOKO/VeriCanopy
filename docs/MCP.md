# VeriCanopy MCP server

The API exposes a [Model Context Protocol](https://modelcontextprotocol.io) server at `/mcp`
(streamable HTTP, stateless). Any MCP client can read the registry, get a deterministic explanation
of a score, and obtain **unsigned** transactions for the marketplace and retirements. The server holds
no keys: the user's wallet signs.

Production endpoint: `https://vericanopy-api.onrender.com/mcp`

## Connect

Claude Code:

```sh
claude mcp add --transport http vericanopy https://vericanopy-api.onrender.com/mcp
```

Claude Desktop / Cursor (`claude_desktop_config.json`, `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "vericanopy": { "type": "http", "url": "https://vericanopy-api.onrender.com/mcp" }
  }
}
```

Local development: `cd backend && uvicorn app.main:app --reload`, then use `http://127.0.0.1:8000/mcp`.

## Tools

| Tool | Arguments | Returns |
|---|---|---|
| `list_projects` | `status?` | projects with status, latest score, vintages |
| `get_project` | `project_id` | one project (geometry hash, cells, integrity) |
| `get_submissions` | `project_id` | score submissions with proof mode, manifest CID, tx links |
| `get_evidence` | `project_id`, `period?` | forest cover per year, project vs matched twins, fires |
| `explain_score` | `project_id`, `period` | per-feature attribution, data sources, proof and signature status |
| `list_listings` | `project_id?` | open marketplace listings |
| `prepare_buy_tx` | `listing_id`, `amount` | unsigned `Marketplace.buy` `{chainId,to,data,value}` |
| `prepare_retire_tx` | `token_id`, `amount`, `beneficiary` | unsigned `VeriCredit.retire` |
| `get_challenge` | `challenge_id` | challenge, votes, outcome |
| `verify_manifest` | `manifest_cid` | hash-vs-chain, ML-DSA-65 key binding and signature, zk proof mode |

Resources: `vericanopy://projects`, `vericanopy://project/{id}`.

## Score explanations

`explain_score` (also `GET /api/v1/projects/{id}/periods/{period}/explain`) is model-faithful and
contains no language-model output. For each of the 16 `fv1` features the stored vector is re-scored
with that feature replaced by the seeded dataset mean; the score change is the feature's
contribution. The same input always yields the same explanation, and the model hash is checked
against the published ONNX artifact.

## Auditor reports

`GET /api/v1/projects/{id}/periods/{period}/report.json` returns a canonical JSON report (project,
score, drivers, evidence CIDs, on-chain transactions, challenges, reversals, vintages) signed with
ML-DSA-65. `report.pdf` renders the same document. `POST /api/v1/reports/verify` re-checks the
signature, the canonical hash, and that the signing key is registered in `PQKeyRegistry`.

To verify independently: remove `signatures`, serialise with sorted keys and no whitespace (UTF-8),
`sha256` must equal `signatures.report_sha256`; verify `signatures.ml_dsa_65` (base64) with
`signatures.public_key_b64` using any FIPS 204 ML-DSA-65 implementation.
