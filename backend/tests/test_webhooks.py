import httpx

from app.models import Holding
from app.services.notify import on_reversal
from app.services.webhooks import sign


def test_register_and_deliver_signed_webhook(client, db):
    assert client.post("/api/v1/webhooks", json={"url": "ftp://bad"}).status_code == 422
    r = client.post("/api/v1/webhooks", json={"url": "https://example.test/hook", "project_id": 77})
    assert r.status_code == 201
    secret = r.json()["secret"]
    db.add(Holding(holder="0xwh", token_id=str((77 << 16) | 2024), amount=5))
    db.commit()
    received = []

    def handler(req: httpx.Request):
        received.append(
            (req.headers["X-VeriCanopy-Signature"], req.content, req.headers["X-VeriCanopy-Event"])
        )
        return httpx.Response(204)

    import app.services.webhooks as wh

    orig = wh.httpx.Client
    wh.httpx.Client = lambda **kw: orig(transport=httpx.MockTransport(handler), **kw)  # type: ignore[assignment]
    try:
        on_reversal(db, 77, 2024, 10, 10, 0, "0xtx")
    finally:
        wh.httpx.Client = orig  # type: ignore[assignment]
    db.commit()
    assert len(received) == 1
    sig, body, event = received[0]
    assert event == "project.reversal" and sig == sign(secret, body)
    assert (
        client.delete(f"/api/v1/webhooks/{r.json()['id']}", headers={"x-webhook-secret": "wrong"}).status_code
        == 404
    )
    assert client.delete(f"/api/v1/webhooks/{r.json()['id']}", headers={"x-webhook-secret": secret}).json()[
        "ok"
    ]
