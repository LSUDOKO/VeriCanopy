from app import ipfs
from app.models import Project


def test_tiles_serves_cached_blobs_and_reports_missing_credentials(client, db, monkeypatch):
    monkeypatch.delenv("EE_SERVICE_ACCOUNT_JSON", raising=False)
    monkeypatch.delenv("EE_SERVICE_ACCOUNT_JSON_B64", raising=False)
    db.add(
        Project(
            id=77,
            developer="0xd",
            name="T",
            geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]},
            geometry_hash="0x0",
            status="Active",
            start_date="2019-01-01",
        )
    )
    db.commit()
    cid = ipfs.put_named("tile/77/2019", b"\x89PNG fake")
    r = client.get("/api/v1/projects/77/tiles?period=2023").json()
    assert r["before"]["url"] == f"/api/v1/ipfs/{cid}" and r["before"]["year"] == 2019
    assert r["after"]["year"] == 2023 and "unavailable" in r["after"] and r["pending"] is False
    assert client.get("/api/v1/projects/999/tiles").status_code == 404
