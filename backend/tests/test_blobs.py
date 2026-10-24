from app import ipfs
from app.models import Blob


def test_put_bytes_persists_in_db_and_reads_back_without_local_file(client, db, tmp_path, monkeypatch):
    cid = ipfs.put_bytes(b"hello canopy")
    assert db.get(Blob, cid) is not None
    monkeypatch.setattr(ipfs, "_dir", lambda: tmp_path)  # simulate a fresh instance with no local store
    assert ipfs.get_bytes(cid) == b"hello canopy"
