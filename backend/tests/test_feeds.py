import pytest

from app import ipfs
from app.db import SessionLocal
from app.models import Listing, Project, Retirement, Submission, Trade, Vintage

GEOM = {"type": "Polygon", "coordinates": [[[-55.0, -3.0], [-54.9, -3.0], [-54.9, -2.9], [-55.0, -2.9], [-55.0, -3.0]]]}


@pytest.fixture(autouse=True, scope="module")
def _cleanup():
    yield  # shared sqlite session DB: remove our rows so later modules see their own data only
    s = SessionLocal()
    for m, pk in ((Trade, 801), (Listing, 701), (Retirement, 601), (Vintage, "501000002024"), (Submission, 9001), (Project, 501)):
        row = s.get(m, pk)
        if row:
            s.delete(row)
    s.commit()
    s.close()


def _seed(db):
    if db.get(Project, 501):
        return
    db.add(Project(id=501, developer="0xd", name="Feed Forest", country="BR", geometry=GEOM, geometry_hash="0x1",
                   status="Active", start_date="2019-01-01", integrity_status="Active"))
    db.add(Submission(id=9001, project_id=501, period=2024, score_bps=9100, status="Finalized", proof_mode="onchain",
                      window_end=1_700_000_000, tx_hash="0xaa", finalized_tx="0xbb"))
    db.add(Vintage(token_id="501000002024", project_id=501, vintage=2024, issued=1000))
    db.add(Listing(id=701, seller="0xs", token_id="501000002024", project_id=501, vintage=2024, amount_listed=100,
                   amount_left=90, price_per_unit_wei=str(10**15), active=True, tx_hash="0xcc"))
    db.add(Trade(id=801, listing_id=701, buyer="0xb", token_id="501000002024", amount=10, paid_wei=str(10**16),
                 fee_wei="0", tx_hash="0xdd", ts=1_700_000_100))
    db.add(Retirement(id=601, holder="0xb", token_id="501000002024", amount=5, beneficiary="ACME Corp",
                      score_at_retirement=9100, ts=1_700_000_200, tx_hash="0xee"))
    db.commit()


def test_fires_without_ee_is_graceful(client, db, monkeypatch):
    _seed(db)
    monkeypatch.delenv("EE_SERVICE_ACCOUNT_JSON", raising=False)
    monkeypatch.delenv("EE_SERVICE_ACCOUNT_JSON_B64", raising=False)
    r = client.get("/api/v1/projects/501/fires?days=30")
    assert r.status_code == 200 and r.json()["available"] is False and "source" in r.json()
    assert client.get("/api/v1/projects/999/fires").status_code == 404


def test_alerts_json_and_rss(client, db):
    _seed(db)
    kinds = {a["kind"] for a in client.get("/api/v1/alerts").json()["alerts"]}
    assert {"submission_finalized", "listing", "trade", "retirement"} <= kinds
    rss = client.get("/api/v1/projects/501/alerts.rss")
    assert rss.status_code == 200 and rss.headers["content-type"].startswith("application/rss+xml")
    assert b"<rss" in rss.content and b"Feed Forest" in rss.content


def test_price_guide_bands(client, db):
    _seed(db)
    g = client.get("/api/v1/market/price-guide").json()
    a = next(b for b in g["bands"] if b["band"] == "A")
    assert a["trades"] == 1 and a["basis"] == "trades"
    assert abs(a["trade_median_eth"] - 0.001) < 1e-9 and abs(a["listing_median_eth"] - 0.001) < 1e-9
    assert "methodology" in g


def test_status_renders_without_rpc(client):
    s = client.get("/api/v1/status").json()
    assert s["status"] in ("operational", "degraded", "outage")
    assert s["checks"]["database"]["ok"] is True and "pq_signer" in s["checks"]


def test_model_card(client):
    m = client.get("/api/v1/model").json()
    assert m["chain"]["model_hash"] and m["artifact"]["matches_chain"] in (True, False)
    assert "support_ratio" in m["features"] and m["zk"]["proof_bytes"] == 4416


def test_retirements(client, db):
    _seed(db)
    r = client.get("/api/v1/retirements/601").json()
    assert r["serial"] == "VC-000601" and r["project_name"] == "Feed Forest" and r["vintage"] == 2024
    assert client.get("/api/v1/retirements?holder=0xB").json()["retirements"][0]["id"] == 601
    assert client.get("/api/v1/retirements/1").status_code == 404


def test_ring_geometry_and_cache(client, db, monkeypatch):
    _seed(db)
    monkeypatch.delenv("EE_SERVICE_ACCOUNT_JSON", raising=False)
    monkeypatch.delenv("EE_SERVICE_ACCOUNT_JSON_B64", raising=False)
    r = client.get("/api/v1/projects/501/ring?km=10").json()
    assert r["ring"]["geometry"]["type"] in ("Polygon", "MultiPolygon") and r["loss_pct"] is None
    from shapely.geometry import shape

    ring, parcel = shape(r["ring"]["geometry"]), shape(GEOM)
    assert ring.contains(parcel.buffer(0.05).exterior.centroid) is False  # ring is hollow
    assert 0.08 < ring.bounds[2] - parcel.bounds[2] < 0.10  # ~10 km ≈ 0.09° at the equator
    assert ipfs.get_named_json("ring/501/10") is not None
