"""Recent protocol events as a flat feed (JSON + RSS 2.0). Derived from indexed tables, no extra storage."""

from __future__ import annotations

from datetime import UTC, datetime
from email.utils import format_datetime
from xml.etree import ElementTree as ET

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.chain import explorer_tx
from app.models import Challenge, Listing, Project, Retirement, Reversal, Submission, Trade


def _ts(ts: int | None) -> int:
    return int(ts or 0)


def alerts(db: Session, project_id: int | None = None, limit: int = 50) -> list[dict]:
    names = {p.id: p.name or f"Project #{p.id}" for p in db.execute(select(Project)).scalars().all()}
    items: list[dict] = []

    def add(kind: str, pid: int | None, title: str, body: str, tx: str | None, ts: int, ref: str):
        if project_id is not None and pid != project_id:
            return
        items.append(
            {"id": ref, "kind": kind, "project_id": pid, "project_name": names.get(pid), "title": title,
             "body": body, "tx_hash": tx, "tx_url": explorer_tx(tx), "ts": ts}
        )

    subs = db.execute(select(Submission).order_by(Submission.id.desc()).limit(limit)).scalars().all()
    sub_pid = {s.id: s.project_id for s in db.execute(select(Submission)).scalars().all()}
    for s in subs:
        add(
            f"submission_{s.status.lower()}", s.project_id,
            f"{names.get(s.project_id)} · period {s.period} score {s.score_bps / 100:.1f} ({s.status})",
            f"Integrity score {s.score_bps / 100:.1f}/100 for period {s.period}; proof mode {s.proof_mode}.",
            s.finalized_tx or s.tx_hash, _ts(s.window_end), f"sub-{s.id}",
        )
    for c in db.execute(select(Challenge).order_by(Challenge.id.desc()).limit(limit)).scalars().all():
        pid = sub_pid.get(c.submission_id)
        add(
            "challenge_" + c.outcome.lower(), pid,
            f"Challenge #{c.id} on {names.get(pid)} · {c.outcome}",
            f"Reason {c.reason}; votes uphold {c.votes_uphold} / reject {c.votes_reject}.",
            c.tx_hash, int(c.resolved_at.timestamp()) if c.resolved_at else _ts(c.deadline), f"ch-{c.id}",
        )
    for r in db.execute(select(Reversal).order_by(Reversal.id.desc()).limit(limit)).scalars().all():
        add(
            "buffer_burn", r.project_id,
            f"Reversal · {names.get(r.project_id)} period {r.period}: {r.tonnes} t, {r.covered} t covered",
            f"Buffer burn covered {r.covered} t; shortfall {r.shortfall} t." + (" Project frozen." if r.shortfall else ""),
            r.tx_hash, 0, f"rev-{r.id}",
        )
    for p in db.execute(select(Project)).scalars().all():
        if p.integrity_status in ("Impaired", "Frozen"):
            add("freeze" if p.integrity_status == "Frozen" else "impaired", p.id,
                f"{names.get(p.id)} is {p.integrity_status}", "Transfers are blocked while frozen.", None, 0, f"st-{p.id}")
    for li in db.execute(select(Listing).order_by(Listing.id.desc()).limit(limit)).scalars().all():
        add("listing", li.project_id,
            f"Listing #{li.id} · {li.amount_listed} t {names.get(li.project_id)} {li.vintage}",
            f"{int(li.price_per_unit_wei) / 1e18:.5f} ETH per tonne; {li.amount_left} left.",
            li.tx_hash, int(li.created_at.timestamp()) if li.created_at else 0, f"li-{li.id}")
    lst_pid = {li.id: li.project_id for li in db.execute(select(Listing)).scalars().all()}
    for t in db.execute(select(Trade).order_by(Trade.id.desc()).limit(limit)).scalars().all():
        add("trade", lst_pid.get(t.listing_id), f"Trade · {t.amount} t bought from listing #{t.listing_id}",
            f"Paid {int(t.paid_wei) / 1e18:.5f} ETH.", t.tx_hash, _ts(t.ts), f"tr-{t.id}")
    for r in db.execute(select(Retirement).order_by(Retirement.id.desc()).limit(limit)).scalars().all():
        add("retirement", None, f"Retirement #{r.id} · {r.amount} t", f"Beneficiary: {r.beneficiary or '—'}",
            r.tx_hash, _ts(r.ts), f"ret-{r.id}")
    items.sort(key=lambda x: (x["ts"], x["id"]), reverse=True)
    return items[:limit]


def rss(items: list[dict], title: str, link: str) -> bytes:
    root = ET.Element("rss", version="2.0")
    ch = ET.SubElement(root, "channel")
    ET.SubElement(ch, "title").text = title
    ET.SubElement(ch, "link").text = link
    ET.SubElement(ch, "description").text = "VeriCanopy protocol events: scores, challenges, buffer burns, trades."
    for it in items:
        e = ET.SubElement(ch, "item")
        ET.SubElement(e, "title").text = it["title"]
        ET.SubElement(e, "description").text = it["body"]
        ET.SubElement(e, "guid", isPermaLink="false").text = it["id"]
        ET.SubElement(e, "category").text = it["kind"]
        if it["tx_url"]:
            ET.SubElement(e, "link").text = it["tx_url"]
        if it["ts"]:
            ET.SubElement(e, "pubDate").text = format_datetime(datetime.fromtimestamp(it["ts"], UTC))
    return ET.tostring(root, xml_declaration=True, encoding="utf-8")
