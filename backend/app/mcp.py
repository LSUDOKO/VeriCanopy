"""Model Context Protocol server for VeriCanopy, mounted at /mcp (streamable HTTP, stateless).

Agents get read access to the registry, deterministic score explanations and *unsigned* transaction
payloads for the marketplace and retirements. No keys are held here; the caller's wallet signs.

    claude mcp add --transport http vericanopy https://vericanopy-api.onrender.com/mcp
"""

from __future__ import annotations

import contextlib
import json
from typing import Any

from fastapi import FastAPI
from starlette.routing import Route
from mcp.server.mcpserver import MCPServer
from sqlalchemy import select

from app.chain import explorer_tx, load_abi, load_deployments
from app.config import settings
from app.db import SessionLocal
from app.models import Challenge, Listing, Project, Submission

mcp = MCPServer(
    "VeriCanopy",
    version="1.0.0",
    instructions=(
        "Forest carbon credits scored from satellite data, proven with zkML on Base Sepolia (chain 84532) and "
        "signed with ML-DSA-65. Scores are in basis points (10000 = 1.0). prepare_* tools return unsigned "
        "transactions; the user signs them with their own wallet."
    ),
)


def _db():
    return SessionLocal()


def _proj(db, p: Project) -> dict[str, Any]:
    from app.routers.projects import _proj as full

    d = full(db, p)
    d.pop("geometry", None)  # keep tool output small; geometry hash is enough for agents
    return d


@mcp.tool()
def list_projects(status: str | None = None) -> list[dict[str, Any]]:
    """List registered forest projects with their latest integrity score and status."""
    db = _db()
    try:
        q = select(Project).order_by(Project.id)
        if status:
            q = q.where(Project.status == status)
        return [_proj(db, p) for p in db.execute(q).scalars().all()]
    finally:
        db.close()


@mcp.tool()
def get_project(project_id: int) -> dict[str, Any]:
    """One project: developer, country, geometry hash, H3 cell count, vintages and integrity."""
    db = _db()
    try:
        p = db.get(Project, project_id)
        return _proj(db, p) if p else {"error": "project not found"}
    finally:
        db.close()


@mcp.tool()
def get_submissions(project_id: int) -> list[dict[str, Any]]:
    """Score submissions for a project (period, score_bps, proof mode, manifest CID, tx links)."""
    from app.routers.projects import _sub

    db = _db()
    try:
        rows = db.execute(select(Submission).where(Submission.project_id == project_id).order_by(Submission.id)).scalars().all()
        out = []
        for s in rows:
            d = _sub(s)
            d["tx_url"] = explorer_tx(s.tx_hash)
            out.append(d)
        return out
    finally:
        db.close()


@mcp.tool()
def get_evidence(project_id: int, period: int | None = None) -> dict[str, Any]:
    """Twin-chart evidence: forest cover per year inside the parcel vs matched control twins, plus fires."""
    from app.routers.projects import evidence

    db = _db()
    try:
        d = evidence(project_id, period, db)
        d.pop("manifest", None)
        return d
    finally:
        db.close()


@mcp.tool()
def explain_score(project_id: int, period: int) -> dict[str, Any]:
    """Deterministic per-feature attribution of a period's integrity score (no LLM), with data sources and proof status."""
    from app.services.explain import explain

    db = _db()
    try:
        return explain(db, project_id, period) or {"error": "project not found"}
    finally:
        db.close()


@mcp.tool()
def list_listings(project_id: int | None = None) -> list[dict[str, Any]]:
    """Open marketplace listings: token, vintage, units left, price per unit in wei, seller, project integrity."""
    from app.routers.market import listings

    db = _db()
    try:
        return listings(True, project_id, db)["listings"]
    finally:
        db.close()


def _tx(contract: str, fn: str, args: list[Any], value: int = 0) -> dict[str, Any]:
    from web3 import Web3

    dep = load_deployments()
    to = dep["contracts"][contract]
    c = Web3().eth.contract(address=to, abi=load_abi(contract))
    data = c.encode_abi(fn, args=args)
    return {"chainId": int(dep["chainId"]), "to": to, "data": data, "value": str(value), "function": f"{contract}.{fn}", "args": [str(a) for a in args]}


@mcp.tool()
def prepare_buy_tx(listing_id: int, amount: int) -> dict[str, Any]:
    """Unsigned Marketplace.buy(listingId, amount) transaction; `value` = amount × price in wei. Sign with your wallet."""
    if amount <= 0:
        return {"error": "amount must be positive"}
    db = _db()
    try:
        li = db.get(Listing, listing_id)
        if not li or not li.active:
            return {"error": "listing not found or inactive"}
        if amount > li.amount_left:
            return {"error": f"only {li.amount_left} units left"}
        value = int(li.price_per_unit_wei) * amount
        tx = _tx("Marketplace", "buy", [listing_id, amount], value)
        tx["summary"] = f"buy {amount} × token {li.token_id} (project {li.project_id}, vintage {li.vintage}) for {value} wei"
        return tx
    finally:
        db.close()


@mcp.tool()
def prepare_retire_tx(token_id: str, amount: int, beneficiary: str) -> dict[str, Any]:
    """Unsigned VeriCredit.retire(tokenId, amount, beneficiary) transaction. Retirement is permanent and recorded on-chain."""
    if amount <= 0:
        return {"error": "amount must be positive"}
    if not beneficiary or len(beneficiary) > 200:
        return {"error": "beneficiary required (max 200 chars)"}
    tx = _tx("VeriCredit", "retire", [int(token_id), amount, beneficiary])
    tx["summary"] = f"retire {amount} units of token {token_id} for '{beneficiary}'"
    return tx


@mcp.tool()
def get_challenge(challenge_id: int) -> dict[str, Any]:
    """A challenge against a score submission: reason, bond, evidence CID, resolver votes, outcome."""
    db = _db()
    try:
        c = db.get(Challenge, challenge_id)
        if not c:
            return {"error": "challenge not found"}
        s = db.get(Submission, c.submission_id)
        return {
            "id": c.id,
            "submission_id": c.submission_id,
            "project_id": s.project_id if s else None,
            "period": s.period if s else None,
            "challenger": c.challenger,
            "bond_wei": c.bond,
            "reason": c.reason,
            "evidence_cid": c.evidence_cid,
            "votes_uphold": c.votes_uphold,
            "votes_reject": c.votes_reject,
            "deadline": c.deadline,
            "outcome": c.outcome,
            "tx_url": explorer_tx(c.tx_hash),
        }
    finally:
        db.close()


@mcp.tool()
def verify_manifest(manifest_cid: str) -> dict[str, Any]:
    """Re-run the attestation checks on a manifest CID: hash vs chain, ML-DSA-65 key binding and signature, zk proof mode."""
    from app.services.verify import verify_pq

    db = _db()
    try:
        return verify_pq(db, manifest_cid=manifest_cid)
    finally:
        db.close()


@mcp.resource("vericanopy://projects")
def projects_resource() -> str:
    """All projects as JSON."""
    return json.dumps(list_projects(), default=str)


@mcp.resource("vericanopy://project/{project_id}")
def project_resource(project_id: int) -> str:
    """One project with its submissions as JSON."""
    return json.dumps({"project": get_project(project_id), "submissions": get_submissions(project_id)}, default=str)


def mount(app: FastAPI, path: str = "/mcp") -> None:
    """Mount the streamable-HTTP MCP app and run its session manager for the FastAPI app's lifetime."""
    # host="0.0.0.0" skips the localhost-only DNS-rebinding allowlist (we serve behind Render's proxy);
    # stateless + JSON responses keep it simple for CLI clients and tests.
    sub = mcp.streamable_http_app(streamable_http_path="/", stateless_http=True, json_response=True, host="0.0.0.0")
    app.mount(path, sub)

    class _Root:
        """Serve the bare `/mcp` path directly: Starlette's Mount would 307 to `/mcp/`, which some MCP clients reject."""

        async def __call__(self, scope, receive, send):
            scope = dict(scope, path="/", raw_path=b"/", root_path=scope.get("root_path", "") + path)
            await sub(scope, receive, send)

    app.router.routes.insert(0, Route(path, endpoint=_Root(), methods=["GET", "POST", "DELETE", "OPTIONS"]))
    stack = contextlib.AsyncExitStack()

    @app.on_event("startup")
    async def _mcp_start() -> None:
        await stack.enter_async_context(mcp.session_manager.run())

    @app.on_event("shutdown")
    async def _mcp_stop() -> None:
        await stack.aclose()


__all__ = ["mcp", "mount", "settings"]
