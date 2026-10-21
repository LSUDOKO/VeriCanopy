from pq.keys import keygen
from pq.sign_verify import pubkey_hash, sign_manifest
from vericanopy_ai.manifest import manifest_sha256

from app import ipfs
from app.models import PQKey, Submission
from app.services.verify import verify_pq


def _setup(db, sub_id: int, owner: str, key_owner: str, active: bool = True):
    pk, sk = keygen()
    key_id = "0x" + f"{sub_id:02x}" * 32
    db.add(
        PQKey(
            key_id=key_id,
            owner=key_owner,
            algorithm="ML-DSA-65",
            pubkey_hash=pubkey_hash(pk),
            pubkey_uri=ipfs.put_bytes(pk),
            active=active,
        )
    )
    m = {
        "schema": "vc-manifest/1",
        "project_id": 5,
        "period": "2024",
        "score_bps": 7000,
        "features": [0.2] * 16,
    }
    signed = sign_manifest(m, sk, key_id)
    cid = ipfs.put_json(signed)
    db.add(
        Submission(
            id=sub_id,
            project_id=5,
            period=2024,
            score_bps=7000,
            manifest_hash=manifest_sha256(signed),
            manifest_cid=cid,
            pq_key_id=key_id if owner == key_owner else "0x" + "ee" * 32,
            oracle=owner,
            status="Finalized",
            tx_hash="0x1",
            proof_mode="onchain",
        )
    )
    db.commit()
    return cid, signed, sk, key_id


def test_signature_by_a_foreign_key_is_rejected(db):
    cid, signed, _, _ = _setup(db, 901, owner="0xoracle", key_owner="0xattacker")
    r = verify_pq(db, manifest_cid=cid)
    assert r["signature_valid"] is True  # the maths checks out...
    assert r["key_registered"] is False  # ...but the key is not the submitting oracle's registered key
    assert r["ok"] is False


def test_revoked_key_fails_and_bound_key_passes(db):
    cid, _, _, _ = _setup(db, 902, owner="0xoracle", key_owner="0xoracle", active=False)
    assert verify_pq(db, manifest_cid=cid)["ok"] is False
    cid2, _, _, _ = _setup(db, 903, owner="0xoracle", key_owner="0xoracle")
    r = verify_pq(db, manifest_cid=cid2)
    assert r["ok"] and r["manifest_matches_submission"]


def test_manifest_project_period_must_match_submission(db):
    cid, signed, sk, key_id = _setup(db, 904, owner="0xoracle", key_owner="0xoracle")
    sub = db.get(Submission, 904)
    sub.period = 2023  # chain says 2023, manifest says 2024
    db.commit()
    r = verify_pq(db, manifest_cid=cid)
    assert r["manifest_matches_submission"] is False and r["ok"] is False
