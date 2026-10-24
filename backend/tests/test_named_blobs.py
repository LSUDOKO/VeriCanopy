from app import ipfs


def test_named_blob_roundtrip_and_overwrite(client, db):
    ipfs.put_named("evidence/9/2024", b'{"v":1}')
    assert ipfs.get_named_json("evidence/9/2024") == {"v": 1}
    ipfs.put_named("evidence/9/2024", b'{"v":2}')
    assert ipfs.get_named_json("evidence/9/2024") == {"v": 2}
    assert ipfs.get_named_json("missing") is None


def test_evidence_endpoint_falls_back_to_named_blobs(client, db):
    from app.models import Project, Submission

    db.add(Project(id=42, developer="0xd", name="P42", geometry_hash="0x0", status="Active"))
    db.add(Submission(id=4242, project_id=42, period=2024, score_bps=1, status="Finalized"))
    db.commit()
    ipfs.put_named(
        "evidence/42/2024",
        b'{"years":[2024],"project_cover":[0.9],"twin_cover":[0.8],"fires":[],"provider":"fixture"}',
    )
    ipfs.put_named("manifest/42/2024", b'{"provenance":"fixture-synthetic"}')
    r = client.get("/api/v1/projects/42/evidence").json()
    assert r["available"] and r["period"] == 2024 and r["provenance"] == "fixture-synthetic"
