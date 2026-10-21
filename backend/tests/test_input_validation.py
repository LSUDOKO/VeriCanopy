import io


def test_overlap_check_bounds_resolution_and_size(client, demo_dir):
    import json

    a = json.loads((demo_dir / "project_A.geojson").read_text())
    assert (
        client.post(
            "/api/v1/projects/overlap-check", json={"geometry": a["geometry"], "h3_res": 15}
        ).status_code
        == 422
    )
    huge = {"type": "Polygon", "coordinates": [[[-60, -10], [-40, -10], [-40, 10], [-60, 10], [-60, -10]]]}
    r = client.post("/api/v1/projects/overlap-check", json={"geometry": huge, "h3_res": 8})
    assert r.status_code == 413


def test_evidence_upload_too_large_returns_413(client):
    big = io.BytesIO(b"x" * (5 * 1024 * 1024 + 1))
    r = client.post("/api/v1/evidence", files={"file": ("big.bin", big, "application/octet-stream")})
    assert r.status_code == 413


def test_ipfs_path_traversal_rejected(client):
    assert client.get("/api/v1/ipfs/..%2F..%2Fsecrets%2Fml_dsa_65.sk").status_code in (400, 404)
    assert client.get("/api/v1/ipfs/../../etc/passwd").status_code in (400, 404)
    assert client.post("/api/v1/verify/pq", json={"manifest_cid": "../../etc/passwd"}).json()["ok"] is False


def test_metadata_bad_token_returns_400(client):
    assert client.get("/api/v1/metadata/not-a-number").status_code == 400
