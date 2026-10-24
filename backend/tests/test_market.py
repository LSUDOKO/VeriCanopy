from types import SimpleNamespace

from app.indexer.events import Cancelled, Listed, Purchased
from app.models import Listing, Project


class _W3:
    class eth:
        @staticmethod
        def get_block(_):
            return {"timestamp": 1700000000}


def _log(args, tx="0x" + "cd" * 32, idx=0):
    return {"args": args, "transactionHash": bytes.fromhex(tx[2:]), "logIndex": idx, "blockNumber": 5}


def test_market_index_and_api(client, db):
    db.add(
        Project(id=9, developer="0xd", name="Pará block", country="BR", geometry_hash="0x0", status="Active")
    )
    db.commit()
    tid = (9 << 16) | 2024
    ctx = SimpleNamespace(w3=_W3(), contracts={}).__dict__
    Listed(
        db,
        _log({"listingId": 1, "seller": "0xSELL", "tokenId": tid, "amount": 100, "pricePerUnit": 10**15}),
        ctx,
    )
    db.commit()
    r = client.get("/api/v1/market/listings").json()["listings"]
    assert r[0]["project_name"] == "Pará block" and r[0]["amount_left"] == 100 and r[0]["vintage"] == 2024
    Purchased(
        db,
        _log(
            {
                "listingId": 1,
                "buyer": "0xBUY",
                "tokenId": tid,
                "amount": 40,
                "paid": 40 * 10**15,
                "fee": 4 * 10**13,
            },
            idx=1,
        ),
        ctx,
    )
    db.commit()
    li = db.get(Listing, 1)
    assert li.amount_left == 60 and li.active
    st = client.get("/api/v1/market/stats").json()
    assert st["open_units"] == 60 and st["units_traded"] == 40
    act = client.get("/api/v1/market/activity/0xbuy").json()
    assert act["purchases"][0]["amount"] == 40
    Cancelled(db, _log({"listingId": 1, "returned": 60}, idx=2), ctx)
    db.commit()
    assert client.get("/api/v1/market/listings").json()["listings"] == []
