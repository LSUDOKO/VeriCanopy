"""Chain indexer: scans contract events into Postgres/SQLite with reorg-safe re-scan (09 §1).

`python -m app.indexer.run` loops forever; `index_once()` is used by tests and the e2e script.
"""

from __future__ import annotations

import logging
import time

from sqlalchemy.orm import Session

from app.chain import contracts, load_deployments
from app.chain import w3 as _w3
from app.config import settings
from app.db import SessionLocal, init_db
from app.indexer.events import HANDLERS
from app.models import IndexerState

log = logging.getLogger("indexer")


def index_once(
    web3=None,
    dep: dict | None = None,
    db: Session | None = None,
    confirmations: int | None = None,
    chunk: int = 2000,
) -> int:
    """Index all new confirmed blocks. Returns the last indexed block."""
    web3 = web3 or _w3()
    dep = dep or load_deployments()
    confirmations = settings.indexer_confirmations if confirmations is None else confirmations
    own = db is None
    db = db or SessionLocal()
    try:
        chain_id = int(dep["chainId"])
        st = db.get(IndexerState, chain_id) or IndexerState(chain_id=chain_id, last_block=0)
        latest = web3.eth.block_number
        target = latest - confirmations
        if target < 0:
            return st.last_block
        # re-scan the confirmation window to survive small reorgs; handlers are idempotent (merge/upsert)
        start = max(st.last_block - confirmations, 0) if st.last_block else 0
        cs = contracts(dep)
        ctx = {"w3": web3, "contracts": cs, "mock_verifier": dep.get("params", {}).get("mockVerifier", False)}
        frm = start
        while frm <= target:
            to = min(frm + chunk - 1, target)
            logs = []
            for cname, handlers in HANDLERS.items():
                c = cs[cname]
                for h in handlers:
                    ev = getattr(c.events, h.__name__)
                    for lg in ev().get_logs(from_block=frm, to_block=to):
                        logs.append((int(lg["blockNumber"]), int(lg["logIndex"]), h, lg))
            logs.sort(key=lambda x: (x[0], x[1]))
            for _, _, h, lg in logs:
                h(db, lg, ctx)
            frm = to + 1
        st.last_block = target
        db.merge(st)
        db.commit()
        return target
    finally:
        if own:
            db.close()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format='{"ts":"%(asctime)s","lvl":"%(levelname)s","msg":"%(message)s"}'
    )
    init_db()
    while True:
        try:
            b = index_once()
            log.info("indexed to block %s", b)
        except Exception as e:  # keep running; alerting is via /healthz lag
            log.error("indexer error: %s", e)
        time.sleep(3)


if __name__ == "__main__":
    main()
