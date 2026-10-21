import json

import pytest

from pq.keys import keygen, load_keypair, save_keypair
from pq.sign_verify import ALG, pubkey_hash, sign, sign_manifest, verify, verify_manifest


@pytest.fixture(scope="module")
def kp():
    return keygen()


def test_sign_verify_roundtrip(kp):
    pk, sk = kp
    m = {"schema": "vc-manifest/1", "project_id": "A", "score_bps": 7093, "signatures": {}}
    sig = sign(m, sk)
    assert verify(m, sig, pk)
    assert ALG == "ML-DSA-65"


def test_tampered_manifest_fails(kp):
    pk, sk = kp
    m = {"schema": "vc-manifest/1", "project_id": "A", "score_bps": 7093}
    sig = sign(m, sk)
    assert not verify({**m, "score_bps": 9000}, sig, pk)


def test_wrong_key_fails(kp):
    pk, sk = kp
    pk2, _ = keygen()
    m = {"a": 1}
    assert not verify(m, sign(m, sk), pk2)


def test_sizes_match_fips204(kp):
    pk, sk = kp
    assert len(pk) == 1952
    assert len(sk) == 4032
    import base64

    sig = base64.b64decode(sign({"x": 1}, sk))
    assert len(sig) == 3309
    assert pubkey_hash(pk).startswith("0x") and len(pubkey_hash(pk)) == 66


def test_sign_manifest_embeds_signature_and_verifies(kp, tmp_path):
    pk, sk = kp
    m = {"schema": "vc-manifest/1", "project_id": "C", "score_bps": 82, "signatures": {}}
    key_id = "0x" + "ab" * 32
    signed = sign_manifest(m, sk, key_id)
    assert signed["signatures"]["algorithm"] == ALG
    assert signed["signatures"]["pq_key_id"] == key_id
    assert verify_manifest(signed, pk)
    save_keypair(tmp_path / "k.pk", tmp_path / "k.sk", pk, sk)
    pk2, sk2 = load_keypair(tmp_path / "k.pk", tmp_path / "k.sk")
    assert pk2 == pk and sk2 == sk
    assert oct((tmp_path / "k.sk").stat().st_mode)[-3:] == "600"
    json.dumps(signed)  # serialisable
