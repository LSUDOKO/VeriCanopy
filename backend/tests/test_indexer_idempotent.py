from types import SimpleNamespace

from app.indexer.events import VintageMinted
from app.indexer.run import apply_log
from app.models import Vintage


def _log(tx: str, idx: int, block: int = 7):
    return {
        "args": {"projectId": 42, "vintage": 2024, "to": "0xb1", "tonnes": 1000, "bufferTonnes": 200},
        "transactionHash": bytes.fromhex(tx[2:]),
        "logIndex": idx,
        "blockNumber": block,
    }


def test_apply_log_is_idempotent_per_tx_and_log_index(db):
    tx = "0x" + "ab" * 32
    ctx = SimpleNamespace(w3=None, contracts={}, mock_verifier=False).__dict__
    assert apply_log(db, VintageMinted, _log(tx, 0), ctx) is True
    assert apply_log(db, VintageMinted, _log(tx, 0), ctx) is False  # same event seen again (re-scan)
    assert apply_log(db, VintageMinted, _log(tx, 1), ctx) is True  # different log index
    db.commit()
    v = db.get(Vintage, str((42 << 16) | 2024))
    assert v.issued == 2 * 1200 and v.buffer == 400
