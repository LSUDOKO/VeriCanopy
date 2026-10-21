"""Finalise submissions whose challenge window has passed and that have no open challenge (09 §4 step 6)."""

from __future__ import annotations

from app.chain import contracts, load_deployments
from app.chain import w3 as _w3
from app.config import settings
from app.txn import ANVIL_KEYS, send


def finalize_due(log=print) -> list[int]:
    web3 = _w3()
    cs = contracts(load_deployments())
    oracle, cm = cs["IntegrityOracle"], cs["ChallengeManager"]
    now = web3.eth.get_block("latest")["timestamp"]
    done = []
    for sid in range(1, oracle.functions.submissionCount().call() + 1):
        s = oracle.functions.getSubmission(sid).call()
        status, window_end = s[12], s[11]
        if status != 0 or window_end > now:
            continue
        if cm.functions.openChallengeOf(sid).call() != 0:
            continue
        send(web3, oracle.functions.finalize(sid), settings.oracle_private_key or ANVIL_KEYS["oracle"])
        log(f"finalized submission #{sid}")
        done.append(sid)
    return done


if __name__ == "__main__":
    finalize_due()
