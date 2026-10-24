"""Event handlers: one function per contract event, writing indexed state (09 §1 `indexer`)."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import ipfs
from app.models import (
    Challenge,
    Listing,
    ModelVersion,
    PQKey,
    Project,
    ProjectCell,
    Retirement,
    Reversal,
    Submission,
    Trade,
    Vintage,
)
from app.services import notify

PROJECT_STATUS = ["Pending", "Active", "UnderReview", "Disputed", "Retired"]
SUB_STATUS = ["Pending", "Challenged", "Finalized", "Rejected", "Voided"]
INTEGRITY_STATUS = ["Active", "UnderReview", "Impaired", "Frozen"]
REASON = ["WrongGeometry", "WrongDates", "CloudContamination", "BadMatching", "DataTampering", "Other"]


def _hex(b) -> str:
    return "0x" + bytes(b).hex() if not isinstance(b, str) else b


def _tx(log) -> str:
    return _hex(log["transactionHash"])


# ---------------------------------------------------------------- registry


def ProjectCreated(db: Session, log, ctx):
    a = log["args"]
    pid = int(a["projectId"])
    p = ctx["contracts"]["ProjectRegistry"].functions.getProject(pid).call()
    meta = ipfs.get_json(a["metadataURI"]) if a["metadataURI"].startswith("ipfs://") else None
    meta = meta or {}
    row = db.get(Project, pid) or Project(id=pid)
    row.developer = a["developer"].lower()
    row.geometry_hash = _hex(a["geometryHash"])
    row.metadata_uri = a["metadataURI"]
    row.h3_res = int(p[1])
    row.status = PROJECT_STATUS[int(p[2])]
    row.start_date = datetime.fromtimestamp(int(p[3]), tz=UTC).date().isoformat() if int(p[3]) else None
    row.claimed_baseline_bps = int(p[4])
    row.name = meta.get("name") or f"Project #{pid}"
    row.country = meta.get("country")
    row.geometry = meta.get("geometry")
    row.demo_id = meta.get("demo_id")
    row.created_tx = _tx(log)
    db.merge(row)


def CellsAdded(db: Session, log, ctx):
    pid = int(log["args"]["projectId"])
    tx = ctx["w3"].eth.get_transaction(log["transactionHash"])
    fn, params = ctx["contracts"]["ProjectRegistry"].decode_function_input(tx["input"])
    cells = params.get("cells", [])
    for c in cells:
        db.merge(ProjectCell(cell=str(int(c)), project_id=pid))
    p = db.get(Project, pid)
    if p:
        p.cell_count = (p.cell_count or 0) + len(cells)


def ProjectActivated(db: Session, log, ctx):
    p = db.get(Project, int(log["args"]["projectId"]))
    if p:
        p.status = "Active"


def ProjectStatusChanged(db: Session, log, ctx):
    p = db.get(Project, int(log["args"]["projectId"]))
    if p:
        p.status = PROJECT_STATUS[int(log["args"]["status"])]


def OverlapProven(db: Session, log, ctx):
    pass  # status change arrives via ProjectStatusChanged


# ------------------------------------------------------------- model / pq


def ModelRegistered(db: Session, log, ctx):
    a = log["args"]
    db.merge(
        ModelVersion(
            model_hash=_hex(a["modelHash"]),
            verifier=a["verifier"],
            artifacts_uri=a["artifactsURI"],
            output_scale=int(a["outputScale"]),
            active=True,
        )
    )


def ModelActiveSet(db: Session, log, ctx):
    m = db.get(ModelVersion, _hex(log["args"]["modelHash"]))
    if m:
        m.active = bool(log["args"]["active"])


def PQKeyRegistered(db: Session, log, ctx):
    a = log["args"]
    db.merge(
        PQKey(
            key_id=_hex(a["keyId"]),
            owner=a["owner"].lower(),
            algorithm=a["algorithm"],
            pubkey_hash=_hex(a["pubKeyHash"]),
            pubkey_uri=a["pubKeyURI"],
            active=True,
        )
    )


def PQKeyRevoked(db: Session, log, ctx):
    k = db.get(PQKey, _hex(log["args"]["keyId"]))
    if k:
        k.active = False


# ----------------------------------------------------------------- oracle


def ScoreSubmitted(db: Session, log, ctx):
    a = log["args"]
    db.merge(
        Submission(
            id=int(a["submissionId"]),
            project_id=int(a["projectId"]),
            period=int(a["period"]),
            score_bps=int(a["scoreBps"]),
            reversal_tonnes=int(a["reversalTonnes"]),
            feature_commitment=_hex(a["featureCommitment"]),
            model_hash=_hex(a["modelHash"]),
            manifest_hash=_hex(a["manifestHash"]),
            manifest_cid=a["manifestCID"],
            pq_key_id=_hex(a["pqKeyId"]),
            oracle=a["oracle"].lower(),
            stake=str(ctx["w3"].eth.get_transaction(log["transactionHash"])["value"]),
            status="Pending",
            window_end=int(a["windowEnd"]),
            tx_hash=_tx(log),
            proof_mode="none" if ctx.get("mock_verifier") else "onchain",
            block_number=int(log["blockNumber"]),
        )
    )


def SubmissionStatusChanged(db: Session, log, ctx):
    s = db.get(Submission, int(log["args"]["submissionId"]))
    if s:
        s.status = SUB_STATUS[int(log["args"]["status"])]


def ScoreFinalized(db: Session, log, ctx):
    a = log["args"]
    s = db.get(Submission, int(a["submissionId"]))
    if s:
        s.status = "Finalized"
        s.finalized_tx = _tx(log)
    p = db.get(Project, int(a["projectId"]))
    if p:
        p.score_bps = int(a["scoreBps"])
    notify.on_score_finalized(db, int(a["projectId"]), int(a["period"]), int(a["scoreBps"]), _tx(log))


def SubmissionVoided(db: Session, log, ctx):
    s = db.get(Submission, int(log["args"]["submissionId"]))
    if s:
        s.status = "Voided"


# ------------------------------------------------------------- challenges


def ChallengeOpened(db: Session, log, ctx):
    a = log["args"]
    db.merge(
        Challenge(
            id=int(a["challengeId"]),
            submission_id=int(a["submissionId"]),
            challenger=a["challenger"].lower(),
            bond=str(a["bond"]),
            reason=REASON[int(a["reason"])],
            evidence_cid=a["evidenceCID"],
            deadline=int(a["deadline"]),
            outcome="Open",
            tx_hash=_tx(log),
        )
    )


def ChallengeVoted(db: Session, log, ctx):
    c = db.get(Challenge, int(log["args"]["challengeId"]))
    if c:
        if log["args"]["uphold"]:
            c.votes_uphold += 1
        else:
            c.votes_reject += 1


def ChallengeResolved(db: Session, log, ctx):
    c = db.get(Challenge, int(log["args"]["challengeId"]))
    if c:
        c.outcome = "Upheld" if log["args"]["upheld"] else "Rejected"
        c.resolved_at = datetime.now(UTC)
        notify.on_challenge_resolved(db, c)


def ChallengeVoided(db: Session, log, ctx):
    c = db.get(Challenge, int(log["args"]["challengeId"]))
    if c:
        c.outcome = "Voided"
        c.resolved_at = datetime.now(UTC)


# ---------------------------------------------------------------- credits


def VintageMinted(db: Session, log, ctx):
    a = log["args"]
    tid = str((int(a["projectId"]) << 16) | int(a["vintage"]))
    v = db.get(Vintage, tid) or Vintage(
        token_id=tid, project_id=int(a["projectId"]), vintage=int(a["vintage"])
    )
    v.issued = (v.issued or 0) + int(a["tonnes"]) + int(a["bufferTonnes"])
    v.buffer = (v.buffer or 0) + int(a["bufferTonnes"])
    db.merge(v)


def IntegrityUpdated(db: Session, log, ctx):
    a = log["args"]
    p = db.get(Project, int(a["projectId"]))
    if p:
        prev = p.integrity_status
        p.integrity_status = INTEGRITY_STATUS[int(a["status"])]
        p.score_bps = int(a["scoreBps"])
        if p.integrity_status in ("Impaired", "Frozen") and prev != p.integrity_status:
            notify.on_integrity_status(db, p.id, p.integrity_status, int(a["scoreBps"]), _tx(log))


def ProjectFrozenEvent(db: Session, log, ctx):
    pass  # IntegrityUpdated follows


def BufferBurned(db: Session, log, ctx):
    a = log["args"]
    v = db.get(Vintage, str(int(a["tokenId"])))
    if v:
        v.burned = (v.burned or 0) + int(a["amount"])


def CreditsRetired(db: Session, log, ctx):
    a = log["args"]
    v = db.get(Vintage, str(int(a["tokenId"])))
    if v:
        v.retired = (v.retired or 0) + int(a["amount"])


def TransferSingle(db: Session, log, ctx):
    a = log["args"]
    _move(db, a["from"], a["to"], int(a["id"]), int(a["value"]))


def TransferBatch(db: Session, log, ctx):
    a = log["args"]
    for tid, val in zip(a["ids"], a["values"]):
        _move(db, a["from"], a["to"], int(tid), int(val))


def _move(db: Session, frm: str, to: str, tid: int, val: int):
    from app.models import Holding

    zero = "0x0000000000000000000000000000000000000000"
    for addr, sign in ((frm, -1), (to, +1)):
        if addr.lower() == zero:
            continue
        if addr.lower() == str(ctx_pool()).lower():
            continue  # the buffer pool's holdings are tracked in `vintages.buffer`, not as a buyer
        h = db.get(Holding, (addr.lower(), str(tid))) or Holding(
            holder=addr.lower(), token_id=str(tid), amount=0
        )
        h.amount = (h.amount or 0) + sign * val
        db.merge(h)
        db.flush()


_POOL_ADDR: list[str] = [""]


def ctx_pool() -> str:
    return _POOL_ADDR[0]


def Retired(db: Session, log, ctx):
    a = log["args"]
    blk = ctx["w3"].eth.get_block(log["blockNumber"])
    db.merge(
        Retirement(
            id=int(a["retirementId"]),
            holder=a["holder"].lower(),
            token_id=str(int(a["tokenId"])),
            amount=int(a["amount"]),
            beneficiary=a["beneficiary"],
            score_at_retirement=int(a["scoreAtRetirement"]),
            ts=int(blk["timestamp"]),
            tx_hash=_tx(log),
        )
    )


def ProjectReversal(db: Session, log, ctx):
    a = log["args"]
    r = Reversal(
        project_id=int(a["projectId"]),
        period=int(a["period"]),
        tonnes=int(a["tonnes"]),
        covered=int(a["covered"]),
        shortfall=int(a["shortfall"]),
        tx_hash=_tx(log),
    )
    existing = db.execute(
        select(Reversal).where(Reversal.tx_hash == r.tx_hash, Reversal.project_id == r.project_id)
    ).scalar_one_or_none()
    if existing:
        return
    db.add(r)
    db.flush()
    notify.on_reversal(db, r.project_id, r.period, r.tonnes, r.covered, r.shortfall, r.tx_hash)


# ------------------------------------------------------------- marketplace


def Listed(db: Session, log, ctx):
    a = log["args"]
    tid = int(a["tokenId"])
    db.merge(
        Listing(
            id=int(a["listingId"]),
            seller=a["seller"].lower(),
            token_id=str(tid),
            project_id=tid >> 16,
            vintage=tid & 0xFFFF,
            amount_listed=int(a["amount"]),
            amount_left=int(a["amount"]),
            price_per_unit_wei=str(a["pricePerUnit"]),
            active=True,
            tx_hash=_tx(log),
        )
    )


def Purchased(db: Session, log, ctx):
    a = log["args"]
    li = db.get(Listing, int(a["listingId"]))
    if li:
        li.amount_left = max(0, li.amount_left - int(a["amount"]))
        if li.amount_left == 0:
            li.active = False
    blk = ctx["w3"].eth.get_block(log["blockNumber"])
    db.add(
        Trade(
            listing_id=int(a["listingId"]),
            buyer=a["buyer"].lower(),
            token_id=str(int(a["tokenId"])),
            amount=int(a["amount"]),
            paid_wei=str(a["paid"]),
            fee_wei=str(a["fee"]),
            tx_hash=_tx(log),
            ts=int(blk["timestamp"]),
        )
    )


def Cancelled(db: Session, log, ctx):
    li = db.get(Listing, int(log["args"]["listingId"]))
    if li:
        li.amount_left = 0
        li.active = False


HANDLERS = {
    "ProjectRegistry": [ProjectCreated, CellsAdded, ProjectActivated, ProjectStatusChanged, OverlapProven],
    "ModelRegistry": [ModelRegistered, ModelActiveSet],
    "PQKeyRegistry": [PQKeyRegistered, PQKeyRevoked],
    "IntegrityOracle": [ScoreSubmitted, SubmissionStatusChanged, ScoreFinalized, SubmissionVoided],
    "ChallengeManager": [ChallengeOpened, ChallengeVoted, ChallengeResolved, ChallengeVoided],
    "VeriCredit": [
        VintageMinted,
        IntegrityUpdated,
        ProjectFrozenEvent,
        BufferBurned,
        CreditsRetired,
        TransferSingle,
        TransferBatch,
    ],
    "RetirementRegistry": [Retired],
    "BufferPool": [ProjectReversal],
    "Marketplace": [Listed, Purchased, Cancelled],
}
