import json
from pathlib import Path

import pytest

from app import ipfs

MANIFEST = Path(__file__).resolve().parents[2] / "data" / "outputs" / "A" / "2023" / "manifest.json"


@pytest.fixture(scope="module")
def seeded(client):
    from app.db import SessionLocal
    from app.models import Listing, Project, Submission

    db = SessionLocal()
    try:
        if db.get(Project, 7700) is None:
            db.add(Project(id=7700, developer="0xd", name="Explain Forest", country="BR", geometry_hash="0x0", status="Active"))
            db.add(
                Submission(
                    id=770001, project_id=7700, period=2023, score_bps=7187, status="Finalized", proof_mode="onchain", tx_hash="0x" + "ab" * 32, manifest_cid="bafkreitest"
                )
            )
            db.add(Listing(id=0, seller="0xs", token_id="1", project_id=7700, vintage=2023, amount_listed=10, amount_left=10, price_per_unit_wei="1000", active=True))
            db.commit()
    finally:
        db.close()
    m = json.loads(MANIFEST.read_text())
    ipfs.put_named("manifest/7700/2023", json.dumps(m).encode())
    yield m
    db = SessionLocal()  # shared sqlite session DB: remove our rows so later modules see only their own data
    try:
        for model, pk in ((Listing, 0), (Submission, 770001), (Project, 7700)):
            row = db.get(model, pk)
            if row is not None:
                db.delete(row)
        db.commit()
    finally:
        db.close()


def test_explain_is_deterministic_and_faithful(client, seeded):
    r = client.get("/api/v1/projects/7700/periods/2023/explain")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["available"] and d["score_bps"] == seeded["score_bps"]
    assert abs(d["score"] * 10_000 - d["score_bps"]) < 60  # ONNX score vs manifest bps
    assert len(d["drivers"]) == 16 and all("sentence" in x for x in d["drivers"])
    assert d["proof"]["verified_onchain"] is True
    assert "scored" in d["summary"]
    assert client.get("/api/v1/projects/7700/periods/2023/explain").json()["drivers"] == d["drivers"]
    assert client.get("/api/v1/projects/7700/periods/1999/explain").json()["available"] is False
    assert client.get("/api/v1/projects/9999/periods/2023/explain").status_code == 404


def test_report_signed_cached_and_verifiable(client, seeded):
    r = client.get("/api/v1/projects/7700/periods/2023/report.json")
    assert r.status_code == 200, r.text
    rep = r.json()
    sig = rep["signatures"]
    assert sig["algorithm"] == "ML-DSA-65" and sig["cid"] and sig["report_sha256"].startswith("0x")
    v = client.post("/api/v1/reports/verify", json=rep).json()
    assert v["signature_valid"] and v["report_hash_matches"]
    # cached: same signature on the second call
    assert client.get("/api/v1/projects/7700/periods/2023/report.json").json()["signatures"]["ml_dsa_65"] == sig["ml_dsa_65"]
    # tamper -> invalid
    rep["score"]["score_bps"] = 9999
    assert client.post("/api/v1/reports/verify", json=rep).json()["signature_valid"] is False
    pdf = client.get("/api/v1/projects/7700/periods/2023/report.pdf")
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"
    assert client.get("/api/v1/projects/7700/periods/1999/report.json").status_code == 404


def test_mcp_tools_direct(client, seeded, monkeypatch):
    from app import mcp as m

    monkeypatch.setenv("DEPLOYMENTS_JSON", (Path(__file__).resolve().parents[2] / "contracts" / "deployments" / "84532.json").read_text())

    ids = [p["id"] for p in m.list_projects()]
    assert 7700 in ids
    assert m.get_project(7700)["name"] == "Explain Forest" and "geometry" not in m.get_project(7700)
    assert m.get_submissions(7700)[0]["period"] == 2023
    assert m.explain_score(7700, 2023)["available"]
    assert any(li["id"] == 0 for li in m.list_listings())
    tx = m.prepare_buy_tx(0, 3)
    assert tx["to"].startswith("0x") and tx["data"].startswith("0x") and tx["value"] == "3000" and tx["chainId"]
    assert "error" in m.prepare_buy_tx(0, 11) and "error" in m.prepare_buy_tx(0, 0)
    rt = m.prepare_retire_tx("1", 2, "Acme Offsets")
    assert rt["data"].startswith("0x") and rt["value"] == "0"
    assert "error" in m.get_challenge(123456)
    assert m.verify_manifest("bafkreitest")["ok"] is False
    assert json.loads(m.project_resource(7700))["project"]["id"] == 7700


@pytest.mark.anyio
async def test_mcp_over_http(client, seeded):
    """Full MCP handshake through the mounted streamable-HTTP app using the official client."""
    import httpx2
    from mcp.client.session import ClientSession
    from mcp.client.streamable_http import streamable_http_client

    from app.main import app

    http = httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="http://test")
    async with streamable_http_client("http://test/mcp", http_client=http) as streams:
        read, write = streams[0], streams[1]
        async with ClientSession(read, write) as s:
            await s.initialize()
            names = {t.name for t in (await s.list_tools()).tools}
            assert {"list_projects", "explain_score", "prepare_buy_tx", "verify_manifest"} <= names
            res = await s.call_tool("get_project", {"project_id": 7700})
            assert "Explain Forest" in res.content[0].text
