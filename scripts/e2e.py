"""Full local scenario (10 §3 `make e2e`): Anvil → deploy → seed → score → submit → finalise → mint → retire →
reversal → buffer burn + notification → challenge → slashing. Exits non-zero on any failed assertion."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
E2E_DIR = ROOT / "data" / "e2e"
shutil.rmtree(E2E_DIR, ignore_errors=True)
E2E_DIR.mkdir(parents=True)
os.environ.update(
    {
        "DATABASE_URL": f"sqlite:///{E2E_DIR}/e2e.db",
        "IPFS_STORE_DIR": str(E2E_DIR / "ipfs"),
        "DEPLOYMENTS_FILE": str(ROOT / "contracts" / "deployments" / "31337.json"),
        "RPC_URL": os.environ.get("RPC_URL", "http://127.0.0.1:8545"),
        "INDEXER_CONFIRMATIONS": "0",
        "PQ_SECRET_KEY_PATH": str(E2E_DIR / "ml_dsa_65.sk"),
        "PQ_PUBLIC_KEY_PATH": str(E2E_DIR / "ml_dsa_65.pk"),
    }
)
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "scripts"))
FOUNDRY = Path.home() / ".config" / ".foundry" / "bin"
os.environ["PATH"] = f"{FOUNDRY}:{os.environ['PATH']}"

from web3 import Web3


def sh(cmd: str, cwd: Path = ROOT) -> None:
    print(f"$ {cmd}")
    subprocess.run(cmd, shell=True, check=True, cwd=cwd)


def main() -> int:
    rpc = os.environ["RPC_URL"]
    anvil = None
    try:
        Web3(Web3.HTTPProvider(rpc)).eth.block_number
    except Exception:
        anvil = subprocess.Popen(["anvil", "--chain-id", "31337", "--silent"], stdout=subprocess.DEVNULL)
        time.sleep(2)
    try:
        return scenario()
    finally:
        if anvil:
            anvil.terminate()


def scenario() -> int:
    sh(f"{sys.executable} scripts/deploy_all.py")

    from app.chain import contracts, load_deployments
    from app.chain import w3 as _w3
    from app.db import SessionLocal, init_db
    from app.indexer.run import index_once
    from app.models import (
        Challenge,
        Notification,
        Project,
        Retirement,
        Reversal,
        Submission,
    )
    from app.txn import ANVIL_KEYS, TxError, send
    from app.workers.finalizer import finalize_due
    from app.workers.oracle import run_score_job
    from eth_account import Account
    from seed import seed

    init_db()
    web3 = _w3()
    dep = load_deployments()
    cs = contracts(dep)
    buyer = Account.from_key(ANVIL_KEYS["buyer"]).address
    challenger = Account.from_key(ANVIL_KEYS["challenger"]).address
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        print(("  ✓ " if cond else "  ✗ ") + msg)
        if not cond:
            failures.append(msg)

    def warp(seconds: int) -> None:
        web3.provider.make_request("evm_increaseTime", [seconds])
        web3.provider.make_request("evm_mine", [])

    def idx() -> None:
        index_once(web3, dep, confirmations=0)

    print("\n== 1. Seed demo projects (D must be rejected)")
    ids = seed(log=print)
    idx()
    check(ids["A"] > 0 and ids["B"] > 0 and ids["C"] > 0, f"A/B/C registered: {ids}")
    check(
        ids.get("D_overlap", 0) < 0,
        "D (overlapping A) rejected on-chain with OverlapDetected",
    )
    db = SessionLocal()
    check(db.query(Project).count() == 4, "indexer has 4 project rows (D stays Pending)")
    A, B, C = ids["A"], ids["B"], ids["C"]

    print("\n== 2. Score A 2023 → finalise → mint vintages → retire")
    r = run_score_job(A, 2023, log=print)
    warp(301)
    finalize_due(log=print)
    idx()
    sA = db.get(Submission, r["submission_id"])
    check(
        sA.status == "Finalized" and sA.score_bps == r["score_bps"],
        f"A 2023 finalised with {sA.score_bps} bps (proof mode {sA.proof_mode})",
    )
    check(
        cs["VeriCredit"].functions.integrityOf(A).call()[0] == r["score_bps"],
        "on-chain integrity matches submission",
    )
    check(r["score_bps"] >= 7000, "A score ≥ minIssueScoreBps, so vintages can be issued")
    for v in (2021, 2022, 2023):
        send(
            web3,
            cs["VeriCredit"].functions.mintVintage(A, v, buyer, 40_000),
            ANVIL_KEYS["deployer"],
        )
    tidA = cs["VeriCredit"].functions.tokenIdFor(A, 2023).call()
    send(
        web3,
        cs["VeriCredit"].functions.retire(tidA, 1_000, "Acme Corp (demo)"),
        ANVIL_KEYS["buyer"],
    )
    idx()
    check(
        db.query(Retirement).filter_by(holder=buyer.lower()).count() == 1,
        "retirement indexed with score at retirement",
    )
    check(
        cs["BufferPool"].functions.bufferBalance(A, 2021).call() == 8_000,
        "buffer pool holds 20% of each vintage",
    )

    print("\n== 3. Score A 2024 (background loss) → reversal burns buffer, holders notified")
    r = run_score_job(A, 2024, log=print)
    warp(301)
    finalize_due(log=print)
    idx()
    rev = db.query(Reversal).filter_by(project_id=A, period=2024).first()
    check(
        rev is not None and rev.tonnes == r["reversal_tco2e"] and rev.shortfall == 0,
        f"reversal {r['reversal_tco2e']} t fully covered by buffers",
    )
    check(
        cs["VeriCredit"].functions.integrityOf(A).call()[1] == 0,
        "A stays Active after covered reversal",
    )
    n = db.query(Notification).filter_by(address=buyer.lower(), kind="reversal").count()
    check(n == 1, "buyer received one reversal notification")

    print("\n== 4. Project C: score 2019 → mint → retire → fire year 2021 → shortfall → Frozen")
    r = run_score_job(C, 2019, log=print)
    warp(301)
    finalize_due(log=print)
    idx()
    check(r["score_bps"] >= 7000, "C 2019 pre-fire score issuable")
    send(
        web3,
        cs["VeriCredit"].functions.mintVintage(C, 2019, buyer, 30_000),
        ANVIL_KEYS["deployer"],
    )
    tidC = cs["VeriCredit"].functions.tokenIdFor(C, 2019).call()
    send(
        web3,
        cs["VeriCredit"].functions.retire(tidC, 500, "Globex (demo)"),
        ANVIL_KEYS["buyer"],
    )
    idx()
    r = run_score_job(C, 2021, log=print)
    check(
        r["reversal_tco2e"] > 6_000,
        f"fire-year reversal {r['reversal_tco2e']} t exceeds the 6,000 t buffer",
    )
    warp(301)
    finalize_due(log=print)
    idx()
    integ = cs["VeriCredit"].functions.integrityOf(C).call()
    check(integ[1] == 3, "C is Frozen after buffer shortfall")
    rev = db.query(Reversal).filter_by(project_id=C, period=2021).first()
    check(
        rev is not None and rev.covered == 6_000 and rev.shortfall > 0,
        f"buffer burned {rev.covered if rev else 0} t, shortfall {rev.shortfall if rev else 0} t recorded",
    )
    note = (
        db.query(Notification)
        .filter_by(address=buyer.lower(), kind="reversal")
        .order_by(Notification.id.desc())
        .first()
    )
    check(
        note is not None
        and note.payload["project_id"] == C
        and len(note.payload["impacted_retirements"]) == 1,
        "buyer notified with impacted retirement",
    )
    try:
        send(
            web3,
            cs["VeriCredit"].functions.safeTransferFrom(buyer, challenger, tidC, 1, b""),
            ANVIL_KEYS["buyer"],
        )
        check(False, "frozen credits must not transfer")
    except TxError as e:
        check("ProjectFrozen" in str(e), f"frozen credit transfer reverted: {e}")

    print("\n== 5. Project B: low score → challenge (WrongDates) → upheld → oracle slashed")
    r = run_score_job(B, 2024, log=print)
    sid = r["submission_id"]
    stake = r["stake_wei"]
    bond = max(cs["ChallengeManager"].functions.minChallengeBond().call(), stake // 2)
    send(
        web3,
        cs["ChallengeManager"].functions.openChallenge(sid, 1, "bafy-demo-evidence"),
        ANVIL_KEYS["challenger"],
        value=bond,
    )
    send(web3, cs["ChallengeManager"].functions.vote(1, True), ANVIL_KEYS["resolver1"])
    send(web3, cs["ChallengeManager"].functions.vote(1, True), ANVIL_KEYS["resolver2"])
    idx()
    sB = db.get(Submission, sid)
    ch = db.get(Challenge, 1)
    check(
        sB.status == "Rejected" and ch.outcome == "Upheld",
        "challenge upheld; submission rejected",
    )
    check(
        cs["IntegrityOracle"].functions.pendingWithdrawals(challenger).call() == stake // 2,
        "challenger receives half of the oracle stake",
    )
    check(
        cs["ChallengeManager"].functions.pendingWithdrawals(challenger).call() == bond,
        "challenger bond refunded",
    )
    check(
        db.get(Project, B).status == "UnderReview",
        "B set UnderReview after upheld challenge",
    )
    db.close()

    print("\n== Summary")
    print(json.dumps({"projects": ids, "failures": failures}, indent=1))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
