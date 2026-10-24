from app import ipfs


def test_named_blob_roundtrip_and_overwrite(client, db):
    ipfs.put_named("evidence/9/2024", b'{"v":1}')
    assert ipfs.get_named_json("evidence/9/2024") == {"v": 1}
    ipfs.put_named("evidence/9/2024", b'{"v":2}')
    assert ipfs.get_named_json("evidence/9/2024") == {"v": 2}
    assert ipfs.get_named_json("missing") is None
