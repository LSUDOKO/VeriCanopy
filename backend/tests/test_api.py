import json

from pq.keys import keygen
from pq.sign_verify import pubkey_hash, sign_manifest
from vericanopy_ai.h3cells import polyfill_cells
from vericanopy_ai.manifest import manifest_sha256

from app import ipfs
from app.models import PQKey, Project, ProjectCell, Submission


def test_projects_list_empty(client):
    r = client.get("/api/v1/projects")
    assert r.status_code == 200 and r.json() == {"projects": []}
    assert client.get("/healthz").json()["ok"] is True


def test_overlap_check_reports_conflict(client, db, demo_dir):
    a = json.loads((demo_dir / "project_A.geojson").read_text())
    d = json.loads((demo_dir / "project_D_overlap.geojson").read_text())
    db.add(
        Project(
            id=1,
            developer="0xd1",
            name="Demo A",
            geometry=a["geometry"],
            geometry_hash="0x00",
            status="Active",
        )
    )
    for c in polyfill_cells(a["geometry"], 8):
        db.add(ProjectCell(cell=str(c), project_id=1))
    db.commit()
    r = client.post("/api/v1/projects/overlap-check", json={"geometry": d["geometry"], "h3_res": 8})
    assert r.status_code == 200
    body = r.json()
    assert body["conflicts"] and body["conflicts"][0]["project_id"] == 1
    assert body["conflicts"][0]["project_name"] == "Demo A"
    assert body["conflict_cells_geojson"]["type"] == "MultiPolygon"
    b = json.loads((demo_dir / "project_B.geojson").read_text())
    assert (
        client.post("/api/v1/projects/overlap-check", json={"geometry": b["geometry"]}).json()["conflicts"]
        == []
    )
    assert client.get("/api/v1/projects/1").json()["name"] == "Demo A"
    assert client.get("/api/v1/projects/999").status_code == 404


def test_verify_pq_valid_and_tampered(client, db):
    pk, sk = keygen()
    pk_cid = ipfs.put_bytes(pk)
    key_id = "0x" + "11" * 32
    db.add(
        PQKey(
            key_id=key_id,
            owner="0xac1e",
            algorithm="ML-DSA-65",
            pubkey_hash=pubkey_hash(pk),
            pubkey_uri=pk_cid,
            active=True,
        )
    )
    manifest = {
        "schema": "vc-manifest/1",
        "project_id": 1,
        "period": "2024",
        "score_bps": 7093,
        "features": [0.1] * 16,
    }
    signed = sign_manifest(manifest, sk, key_id)
    cid = ipfs.put_json(signed)
    db.add(
        Submission(
            id=1,
            project_id=1,
            period=2024,
            score_bps=7093,
            manifest_hash=manifest_sha256(signed),
            manifest_cid=cid,
            pq_key_id=key_id,
            oracle="0xac1e",
            status="Finalized",
            tx_hash="0xabc",
            proof_mode="onchain",
        )
    )
    db.commit()
    r = client.post("/api/v1/verify/pq", json={"manifest_cid": cid}).json()
    assert (
        r["ok"]
        and r["signature_valid"]
        and r["key_registered"]
        and r["manifest_hash_matches_chain"]
        and r["zk_proof_verified"]
    )
    tampered = {**signed, "score_bps": 9999}
    r2 = client.post("/api/v1/verify/pq", json={"manifest": tampered}).json()
    assert not r2["signature_valid"] and not r2["manifest_hash_matches_chain"] and not r2["ok"]
    assert client.get("/api/v1/submissions/1").json()["manifest"]["score_bps"] == 7093


def test_metadata_shape(client):
    tid = (1 << 16) | 2024
    r = client.get(f"/api/v1/metadata/{tid}").json()
    assert r["properties"]["project_id"] == 1 and r["properties"]["vintage"] == 2024
    assert r["properties"]["integrity_score_bps"] == 7093
    assert client.get("/api/v1/metadata/" + format(tid, "064x")).status_code == 200


def test_jobs_requires_api_key(client):
    assert client.post("/api/v1/jobs/score", json={"project_id": 1, "period": 2024}).status_code == 401
    assert client.post("/api/v1/webhooks", json={}).status_code == 422
    assert client.get("/api/v1/stats").json()["projects"] == 1
    assert client.get("/api/v1/portfolio/0xB1").json()["holdings"] == []
