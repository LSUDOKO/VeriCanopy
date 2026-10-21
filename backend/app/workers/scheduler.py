"""Periodic worker loop: finalise due submissions and (optionally) re-score projects each monitoring period.

Plain loop; RQ/Redis is optional for production. `python -m app.workers.scheduler`.
"""

from __future__ import annotations

import logging
import os
import time

from app.workers.finalizer import finalize_due

log = logging.getLogger("scheduler")


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    interval = int(os.environ.get("SCHEDULER_INTERVAL_S", "30"))
    while True:
        try:
            finalize_due(log=log.info)
        except Exception as e:
            log.error("scheduler error: %s", e)
        time.sleep(interval)


if __name__ == "__main__":
    main()
