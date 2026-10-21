import hashlib

from vericanopy_ai.manifest import canonical, manifest_sha256


def test_canonical_stable_under_key_order_and_unicode():
    a = {
        "schema": "vc-manifest/1",
        "project_id": 3,
        "name": "Çiftlik ormanı — demo",
        "signatures": {"ml_dsa_65": "x"},
    }
    b = {"name": "Çiftlik ormanı — demo", "project_id": 3, "schema": "vc-manifest/1"}
    assert canonical(a) == canonical(b)
    assert b"signatures" not in canonical(a)
    assert "\\u" not in canonical(a).decode()
    assert manifest_sha256(a) == "0x" + hashlib.sha256(canonical(b)).hexdigest()
    assert manifest_sha256(a) != manifest_sha256({**b, "project_id": 4})
