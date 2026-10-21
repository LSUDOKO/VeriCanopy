from app.models import Holding, Notification, Retirement
from app.services.notify import on_reversal


def test_reversal_notifies_holders_and_retirees_numerically(db):
    # project 1 token ids are 65536..131071; "67557" > "131071" as strings, so a string range would miss it
    db.add(Holding(holder="0xholder", token_id=str((1 << 16) | 2021), amount=10))
    db.add(Holding(holder="0xother", token_id=str((9 << 16) | 2021), amount=10))
    db.add(
        Retirement(
            id=77,
            holder="0xretiree",
            token_id=str((1 << 16) | 2023),
            amount=5,
            beneficiary="x",
            score_at_retirement=7000,
        )
    )
    db.commit()
    n = on_reversal(db, 1, 2024, 1000, 1000, 0, "0xtx")
    db.commit()
    assert n == 2
    notes = {x.address: x for x in db.query(Notification).filter_by(kind="reversal").all()}
    assert set(notes) == {"0xholder", "0xretiree"}
    assert notes["0xretiree"].payload["impacted_retirements"] == [77]
