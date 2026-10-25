# @lsudoko/vericanopy-mcp

Model Context Protocol server for **VeriCanopy**: forest carbon credits scored from satellite data, proven with zkML on Base Sepolia and signed with ML-DSA-65.

This package is a zero-dependency stdio bridge to the hosted server at `https://vericanopy-api.onrender.com/mcp/`, so clients that only speak stdio (Claude Desktop, Cursor, older Claude Code) can use it. Clients that support remote HTTP servers can connect to that URL directly.

## Install (GitHub Packages)

```sh
echo "@lsudoko:registry=https://npm.pkg.github.com" >> ~/.npmrc
npx -y @lsudoko/vericanopy-mcp
```

## Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "vericanopy": { "command": "npx", "args": ["-y", "@lsudoko/vericanopy-mcp"] }
  }
}
```

## Claude Code

```sh
claude mcp add vericanopy -- npx -y @lsudoko/vericanopy-mcp
# or remote, no package needed:
claude mcp add --transport http vericanopy https://vericanopy-api.onrender.com/mcp/
```

## claude.ai

Customize → Connectors → Add custom connector → URL `https://vericanopy-api.onrender.com/mcp/`, no sign-in.

## Tools

`list_projects`, `get_project`, `get_submissions`, `get_evidence`, `explain_score`, `list_listings`, `prepare_buy_tx`, `prepare_retire_tx`, `get_challenge`, `verify_manifest`. The `prepare_*` tools return **unsigned** transactions; your wallet signs. The server holds no keys.

Set `VERICANOPY_MCP_URL` to point at a self-hosted backend.

MIT · https://github.com/LSUDOKO/VeriCanopy
