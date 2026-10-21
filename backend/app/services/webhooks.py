"""Webhook delivery (F12). Payloads are signed with HMAC-SHA256 of the body using the webhook secret
(`X-VeriCanopy-Signature: sha256=<hex>`). Delivery is best-effort with one retry; failures never block indexing."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Webhook

log = logging.getLogger("webhooks")


def sign(secret: str, body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def deliver(
    db: Session, event: str, project_id: int | None, payload: dict, client: httpx.Client | None = None
) -> int:
    hooks = db.execute(select(Webhook).where(Webhook.active.is_(True))).scalars().all()
    hooks = [h for h in hooks if h.project_id is None or h.project_id == project_id]
    if not hooks:
        return 0
    body = json.dumps(
        {"event": event, "project_id": project_id, "data": payload, "sent_at": datetime.now(UTC).isoformat()},
        default=str,
    ).encode()
    own = client is None
    client = client or httpx.Client(timeout=10)
    sent = 0
    try:
        for h in hooks:
            headers = {
                "content-type": "application/json",
                "X-VeriCanopy-Signature": sign(h.secret, body),
                "X-VeriCanopy-Event": event,
            }
            status = None
            for _ in range(2):
                try:
                    status = client.post(h.url, content=body, headers=headers).status_code
                    if status < 500:
                        break
                except Exception as e:  # network errors are retried once, then recorded
                    log.warning("webhook %s failed: %s", h.url, e)
            h.last_status = status
            h.last_delivery_at = datetime.now(UTC)
            sent += 1
    finally:
        if own:
            client.close()
    return sent
