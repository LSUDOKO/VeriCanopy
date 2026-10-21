"""Single-container production entrypoint: API + indexer loop + finalizer loop (+ lazy zk bootstrap).

Used by the App Runner / Docker deployment where one always-on instance is enough. Set RUN_INDEXER=0 or
RUN_SCHEDULER=0 to disable a loop (e.g. when running separate services).
"""

from __future__ import annotations

import hashlib
import logging
import os
import threading
import time

import uvicorn

from app.config import REPO_ROOT

log = logging.getLogger("run_all")
ART = REPO_ROOT / "ai" / "zk" / "artifacts"


def _indexer_loop() -> None:
    from app.indexer.run import index_once

    while True:
        try:
            index_once()
        except Exception as e:  # keep the loop alive; /healthz exposes lag
            log.error("indexer: %s", e)
        time.sleep(int(os.environ.get("INDEXER_INTERVAL_S", "6")))


def _scheduler_loop() -> None:
    from app.workers.finalizer import finalize_due

    while True:
        try:
            finalize_due(log=log.info)
        except Exception as e:
            log.error("scheduler: %s", e)
        time.sleep(int(os.environ.get("SCHEDULER_INTERVAL_S", "30")))


def _zk_bootstrap() -> None:
    """Rebuild the EZKL proving key if absent (deterministic: the resulting vk must match the committed hash)."""
    if (ART / "pk.key").exists() or os.environ.get("ZK_MODE", "onchain") != "onchain":
        return
    try:
        from zk.build_circuit import VK, build

        log.info("zk bootstrap: building circuit + keys (one-off, ~1 min)")
        build()
        got = hashlib.sha256(VK.read_bytes()).hexdigest()
        want = (ART / "vk.sha256").read_text().strip()
        if got != want:
            log.error(
                "zk bootstrap: verifying key hash mismatch (%s != %s); proofs would not verify on-chain",
                got,
                want,
            )
            (ART / "pk.key").unlink(missing_ok=True)
        else:
            log.info("zk bootstrap: ready (vk matches committed hash)")
    except Exception as e:
        log.error("zk bootstrap failed: %s", e)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format='{"ts":"%(asctime)s","lvl":"%(levelname)s","src":"%(name)s","msg":"%(message)s"}',
    )
    if os.environ.get("RUN_INDEXER", "1") == "1":
        threading.Thread(target=_indexer_loop, name="indexer", daemon=True).start()
    if os.environ.get("RUN_SCHEDULER", "1") == "1":
        threading.Thread(target=_scheduler_loop, name="scheduler", daemon=True).start()
    if os.environ.get("RUN_ZK_BOOTSTRAP", "1") == "1":
        threading.Thread(target=_zk_bootstrap, name="zk-bootstrap", daemon=True).start()
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), log_level="info")


if __name__ == "__main__":
    main()
