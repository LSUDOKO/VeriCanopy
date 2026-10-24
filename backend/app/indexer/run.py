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
from app.models import IndexerState, ProcessedLog

log = logging.getLogger("indexer")


def apply_log(db: Session, handler, lg, ctx) -> bool:
    """Apply one event once. Returns False when (tx_hash, log_index) was already processed."""
    tx = lg["transactionHash"]
    tx = "0x" + bytes(tx).hex() if not isinstance(tx, str) else tx
    idx = int(lg["logIndex"])
    if db.get(ProcessedLog, (tx, idx)) is not None:
        return False
    handler(db, lg, ctx)
    db.add(ProcessedLog(tx_hash=tx, log_index=idx, block_number=int(lg["blockNumber"])))
    db.flush()
    return True


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
    chunk = (
        chunk or settings.indexer_chunk
    )  # public RPCs cap eth_getLogs ranges (Base Sepolia publicnode: 500)
    own = db is None
    db = db or SessionLocal()
    try:
        chain_id = int(dep["chainId"])
        st = db.get(IndexerState, chain_id) or IndexerState(chain_id=chain_id, last_block=0)
        latest = web3.eth.block_number
        target = latest - confirmations
        if target < 0:
            return st.last_block
        # Only blocks at depth >= confirmations are indexed, so a shallow reorg never reaches them; every applied
        # event is recorded in processed_logs, so a restart or overlapping scan cannot double-apply.
        start = st.last_block + 1 if st.last_block else int(dep.get("startBlock", 0))
        cs = contracts(dep)
        ctx = {"w3": web3, "contracts": cs, "mock_verifier": dep.get("params", {}).get("mockVerifier", False)}
        from app.indexer import events as _ev

        _ev._POOL_ADDR[0] = dep["contracts"].get("BufferPool", "")
        # one eth_getLogs per contract per chunk (public RPCs reject many narrow queries / wide ranges)
        decoders = {}
        for cname, handlers in HANDLERS.items():
            c = cs[cname]
            for h in handlers:
                ev = getattr(c.events, h.__name__)()
                decoders[
                    (
                        c.address.lower(),
                        "0x" + web3.keccak(text=ev.abi_element_identifier).hex().removeprefix("0x"),
                    )
                ] = (h, ev)
        frm = start
        while frm <= target:
            to = min(frm + chunk - 1, target)
            logs = []
            for cname in HANDLERS:
                addr = cs[cname].address
                for raw in web3.eth.get_logs({"address": addr, "fromBlock": frm, "toBlock": to}):
                    key = (addr.lower(), "0x" + bytes(raw["topics"][0]).hex())
                    if key not in decoders:
                        continue
                    h, ev = decoders[key]
                    logs.append((int(raw["blockNumber"]), int(raw["logIndex"]), h, ev.process_log(raw)))
            logs.sort(key=lambda x: (x[0], x[1]))
            for _, _, h, lg in logs:
                apply_log(db, h, lg, ctx)
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


def backfill(
    contract_name: str,
    from_block: int,
    to_block: int | None = None,
    web3=None,
    dep: dict | None = None,
    chunk: int | None = None,
) -> int:
    """Re-scan one contract's events over a block range regardless of IndexerState (idempotent via processed_logs).
    Use after adding a handler for a contract whose events were already passed by the live indexer."""
    web3 = web3 or _w3()
    dep = dep or load_deployments()
    chunk = chunk or settings.indexer_chunk
    cs = contracts(dep)
    c = cs[contract_name]
    ctx = {"w3": web3, "contracts": cs, "mock_verifier": dep.get("params", {}).get("mockVerifier", False)}
    decoders = {}
    for h in HANDLERS[contract_name]:
        ev = getattr(c.events, h.__name__)()
        decoders["0x" + web3.keccak(text=ev.abi_element_identifier).hex().removeprefix("0x")] = (h, ev)
    end = to_block if to_block is not None else web3.eth.block_number
    applied = 0
    db = SessionLocal()
    try:
        frm = from_block
        while frm <= end:
            to = min(frm + chunk - 1, end)
            for raw in web3.eth.get_logs({"address": c.address, "fromBlock": frm, "toBlock": to}):
                key = "0x" + bytes(raw["topics"][0]).hex()
                if key in decoders:
                    h, ev = decoders[key]
                    if apply_log(db, h, ev.process_log(raw), ctx):
                        applied += 1
            frm = to + 1
        db.commit()
    finally:
        db.close()
    return applied
