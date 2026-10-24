"""Auditor report per (project, period): canonical JSON signed with ML-DSA-65, plus a PDF rendering.

The signature covers the canonical form (sorted keys, no whitespace, `signatures` removed), exactly like
score manifests, so the same verifier applies. The signed JSON is stored as the named blob
`report/<pid>/<period>` and only re-signed when its inputs change.
"""

from __future__ import annotations

import base64
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pq.keys import load_or_create
from pq.sign_verify import ALG, pubkey_hash, sign, verify
from sqlalchemy import select
from sqlalchemy.orm import Session
from vericanopy_ai.manifest import canonical
from web3 import Web3

from app import ipfs
from app.chain import explorer_tx, load_deployments
from app.config import REPO_ROOT, settings
from app.models import Challenge, PQKey, Project, Reversal, Submission, Vintage
from app.services.explain import explain

SCHEMA = "vc-auditor-report/1"
LOGO = REPO_ROOT / "web" / "public" / "brand" / "logo-original.png"


def _keys() -> tuple[bytes, bytes, str]:
    pk, sk = load_or_create(Path(settings.pq_public_key_path), Path(settings.pq_secret_key_path))
    ph = pubkey_hash(pk)
    try:
        owner = load_deployments().get("oracleAddress")
    except Exception:
        owner = None
    key_id = (
        "0x" + Web3.solidity_keccak(["address", "bytes32"], [owner, bytes.fromhex(ph[2:])]).hex().removeprefix("0x")
        if owner
        else None
    )
    return pk, sk, key_id


def _sub_row(s: Submission) -> dict[str, Any]:
    return {
        "id": s.id,
        "status": s.status,
        "score_bps": s.score_bps,
        "reversal_tonnes": s.reversal_tonnes,
        "model_hash": s.model_hash,
        "manifest_hash": s.manifest_hash,
        "manifest_cid": s.manifest_cid,
        "pq_key_id": s.pq_key_id,
        "oracle": s.oracle,
        "proof_mode": s.proof_mode,
        "submit_tx": s.tx_hash,
        "submit_tx_url": explorer_tx(s.tx_hash),
        "finalized_tx": s.finalized_tx,
        "finalized_tx_url": explorer_tx(s.finalized_tx),
    }


def compile_report(db: Session, pid: int, period: int) -> dict[str, Any] | None:
    p = db.get(Project, pid)
    if not p:
        return None
    ex = explain(db, pid, period)
    if not ex or not ex.get("available"):
        return {"available": False, "reason": (ex or {}).get("reason", "no data")}
    subs = (
        db.execute(select(Submission).where(Submission.project_id == pid, Submission.period == period).order_by(Submission.id))
        .scalars()
        .all()
    )
    chal = (
        db.execute(select(Challenge).where(Challenge.submission_id.in_([s.id for s in subs] or [0]))).scalars().all()
    )
    revs = db.execute(select(Reversal).where(Reversal.project_id == pid, Reversal.period == period)).scalars().all()
    vints = db.execute(select(Vintage).where(Vintage.project_id == pid)).scalars().all()
    try:
        dep = load_deployments()
        contracts = dep.get("contracts", {})
    except Exception:
        contracts = {}
    return {
        "schema": SCHEMA,
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "chain_id": settings.chain_id,
        "contracts": {k: contracts.get(k) for k in ("IntegrityOracle", "VeriCredit", "ChallengeManager", "BufferPool", "Verifier")},
        "project": {
            "id": p.id,
            "name": p.name,
            "country": p.country,
            "developer": p.developer,
            "status": p.status,
            "integrity_status": p.integrity_status,
            "start_date": p.start_date,
            "claimed_baseline_bps": p.claimed_baseline_bps,
            "geometry_hash": p.geometry_hash,
            "h3_res": p.h3_res,
            "cell_count": p.cell_count,
            "created_tx": p.created_tx,
        },
        "period": period,
        "score": {"score_bps": ex["score_bps"], "score": ex["score"], "model_hash": ex["model_hash"], "feature_version": ex["feature_version"]},
        "explanation": {
            "summary": ex["summary"],
            "method": ex["method"],
            "positive_drivers": ex["positive_drivers"],
            "negative_drivers": ex["negative_drivers"],
            "drivers": ex["drivers"],
        },
        "evidence": {
            "provenance": ex["provenance"],
            "date_ranges": ex["date_ranges"],
            "data_sources": ex["data_sources"],
            "manifest_cid": ex["signature"]["manifest_cid"],
            "manifest_sha256": ex["signature"]["manifest_sha256"],
            "manifest_pq_key_id": ex["signature"]["pq_key_id"],
        },
        "submissions": [_sub_row(s) for s in subs],
        "challenges": [
            {
                "id": c.id,
                "submission_id": c.submission_id,
                "challenger": c.challenger,
                "reason": c.reason,
                "bond_wei": c.bond,
                "evidence_cid": c.evidence_cid,
                "votes_uphold": c.votes_uphold,
                "votes_reject": c.votes_reject,
                "outcome": c.outcome,
                "tx": c.tx_hash,
            }
            for c in chal
        ],
        "reversals": [{"tonnes": r.tonnes, "covered": r.covered, "shortfall": r.shortfall, "tx": r.tx_hash} for r in revs],
        "vintages": [{"token_id": v.token_id, "vintage": v.vintage, "issued": v.issued, "buffer": v.buffer, "retired": v.retired, "burned": v.burned} for v in vints],
        "signatures": {},
    }


def _inputs_digest(rep: dict[str, Any]) -> str:
    body = {k: v for k, v in rep.items() if k not in ("generated_at", "signatures")}
    return hashlib.sha256(canonical(body)).hexdigest()


def signed_report(db: Session, pid: int, period: int) -> dict[str, Any] | None:
    rep = compile_report(db, pid, period)
    if rep is None or not rep.get("schema"):
        return rep
    digest = _inputs_digest(rep)
    name = f"report/{pid}/{period}"
    cached = ipfs.get_named_json(name)
    if cached and (cached.get("signatures") or {}).get("inputs_digest") == digest:
        return cached
    pk, sk, key_id = _keys()
    rep["signatures"] = {}
    rep["signatures"] = {
        "algorithm": ALG,
        "ml_dsa_65": sign(rep, sk),
        "public_key_b64": base64.b64encode(pk).decode(),
        "pubkey_sha256": pubkey_hash(pk),
        "pq_key_id": key_id,
        "report_sha256": "0x" + hashlib.sha256(canonical(rep)).hexdigest(),
        "inputs_digest": digest,
    }
    rep["signatures"]["cid"] = ipfs.put_named(name, json.dumps(rep, ensure_ascii=False).encode())
    return rep


def verify_report(db: Session, rep: dict[str, Any]) -> dict[str, Any]:
    sigs = rep.get("signatures") or {}
    try:
        pk = base64.b64decode(sigs.get("public_key_b64") or "")
    except Exception:
        pk = b""
    sig_ok = bool(pk) and verify(rep, sigs.get("ml_dsa_65", ""), pk)
    ph = pubkey_hash(pk) if pk else None
    hash_ok = "0x" + hashlib.sha256(canonical(rep)).hexdigest() == sigs.get("report_sha256")
    key = db.execute(select(PQKey).where(PQKey.pubkey_hash == ph)).scalars().first() if ph else None
    return {
        "ok": sig_ok and hash_ok and bool(key and key.active),
        "signature_valid": sig_ok,
        "report_hash_matches": hash_ok,
        "key_registered_onchain": bool(key),
        "key_active": bool(key and key.active),
        "key_owner": key.owner if key else None,
        "pubkey_sha256": ph,
    }


# ---------------------------------------------------------------- PDF


def _s(v: Any) -> str:
    """Core Helvetica is latin-1 only: map the few symbols we use, drop the rest."""
    t = str(v if v not in (None, "") else "-")
    for a, b in (("×", "x"), ("–", "-"), ("—", "-"), ("…", "..."), ("→", "->"), ("▲", "+"), ("▼", "-"), ("’", "'")):
        t = t.replace(a, b)
    t = t.encode("latin-1", "replace").decode("latin-1")
    # break unspaced tokens (hashes, CIDs, base64) so the line breaker always finds a split point
    return " ".join(w if len(w) <= 40 else " ".join(w[i : i + 40] for i in range(0, len(w), 40)) for w in t.split(" "))


def render_pdf(rep: dict[str, Any]) -> bytes:
    from fpdf import FPDF as _FPDF

    class FPDF(_FPDF):  # sanitise + char-wrap everything so long hashes never overflow
        def cell(self, w=None, h=None, text="", *a, **k):  # type: ignore[override]
            return super().cell(w, h, _s(text), *a, **k)

        def multi_cell(self, w, h=None, text="", *a, **k):  # type: ignore[override]
            k.setdefault("new_x", "LMARGIN")
            k.setdefault("new_y", "NEXT")
            return super().multi_cell(w, h, _s(text), *a, **k)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    forest = (16, 64, 43)
    if LOGO.exists():
        pdf.image(str(LOGO), x=10, y=8, h=14)
    pdf.set_xy(28, 8)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*forest)
    pdf.cell(0, 8, "VeriCanopy Auditor Report", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(28)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(90, 90, 90)
    pr = rep["project"]
    pdf.cell(0, 5, f"{pr['name'] or 'Project ' + str(pr['id'])} ({pr['country'] or '-'})  |  Period {rep['period']}  |  chain {rep['chain_id']}  |  {rep['generated_at']}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    def h2(t: str) -> None:
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*forest)
        pdf.cell(0, 7, t, new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(20, 20, 20)
        pdf.set_font("Helvetica", "", 9)

    def kv(rows: list[tuple[str, Any]]) -> None:
        for k, v in rows:
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(55, 5.5, k)
            pdf.set_font("Helvetica", "", 9)
            pdf.multi_cell(0, 5.5, v, new_x="LMARGIN", new_y="NEXT")

    sc = rep["score"]
    h2("Integrity score")
    pdf.set_font("Helvetica", "B", 28)
    pdf.cell(0, 12, f"{sc['score_bps'] / 100:.1f} / 100", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5, rep["explanation"]["summary"])
    kv([("Model hash", sc["model_hash"]), ("Feature version", sc["feature_version"]), ("Attribution method", rep["explanation"]["method"])])

    h2("Score drivers (baseline-delta attribution)")
    pdf.set_fill_color(240, 244, 241)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.cell(80, 6, "Feature", fill=True)
    pdf.cell(30, 6, "Value", fill=True)
    pdf.cell(30, 6, "Typical", fill=True)
    pdf.cell(30, 6, "Contribution", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 8.5)
    for d in rep["explanation"]["drivers"]:
        pdf.cell(80, 5.5, d["label"][:52])
        pdf.cell(30, 5.5, d["display"])
        pdf.cell(30, 5.5, d["baseline_display"])
        pdf.cell(30, 5.5, f"{d['contribution']:+.4f}", new_x="LMARGIN", new_y="NEXT")

    h2("Evidence & data sources")
    ev = rep["evidence"]
    kv([("Provenance", ev["provenance"]), ("Date ranges", json.dumps(ev["date_ranges"])), ("Manifest CID", ev["manifest_cid"]), ("Manifest sha256", ev["manifest_sha256"]), ("Manifest ML-DSA key id", ev["manifest_pq_key_id"])])
    for s in ev["data_sources"]:
        pdf.cell(0, 5, f"- {s.get('name')}  [{s.get('id')}]  {s.get('role', '')}", new_x="LMARGIN", new_y="NEXT")

    h2("On-chain submissions")
    for s in rep["submissions"]:
        kv([(f"Submission #{s['id']}", f"{s['status']}  score {s['score_bps']} bps  proof {s['proof_mode']}"), ("  submit tx", s["submit_tx"]), ("  finalize tx", s["finalized_tx"]), ("  manifest hash", s["manifest_hash"])])
    if not rep["submissions"]:
        pdf.cell(0, 5, "none", new_x="LMARGIN", new_y="NEXT")

    h2("Challenges")
    for c in rep["challenges"]:
        pdf.cell(0, 5, f"#{c['id']}  {c['reason']}  by {c['challenger']}  votes {c['votes_uphold']}/{c['votes_reject']}  -> {c['outcome']}", new_x="LMARGIN", new_y="NEXT")
    if not rep["challenges"]:
        pdf.cell(0, 5, "none on record", new_x="LMARGIN", new_y="NEXT")

    h2("Reversals & vintages")
    for r in rep["reversals"]:
        pdf.cell(0, 5, f"reversal {r['tonnes']} t  covered {r['covered']}  shortfall {r['shortfall']}  tx {r['tx']}", new_x="LMARGIN", new_y="NEXT")
    for v in rep["vintages"]:
        pdf.cell(0, 5, f"vintage {v['vintage']}  issued {v['issued']}  buffer {v['buffer']}  retired {v['retired']}  burned {v['burned']}", new_x="LMARGIN", new_y="NEXT")

    h2("Attestation (ML-DSA-65, FIPS 204)")
    sg = rep["signatures"]
    kv([("Report sha256", sg.get("report_sha256")), ("Public key sha256", sg.get("pubkey_sha256")), ("PQ key id", sg.get("pq_key_id")), ("Signed JSON CID", sg.get("cid")), ("Signature (b64, first 64)", (sg.get("ml_dsa_65") or "")[:64] + "...")])
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(110, 110, 110)
    pdf.multi_cell(0, 4.5, "Verify: fetch report.json, drop `signatures`, canonicalise (sorted keys, no whitespace, UTF-8), sha256 must equal Report sha256; verify the ML-DSA-65 signature with the embedded public key; check sha256(public key) against PQKeyRegistry on Base Sepolia.")
    return bytes(pdf.output())
