"""Integrity-indexed price guide: listings + trades bucketed by the project's finalised integrity score."""

from __future__ import annotations

from statistics import median

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Listing, Submission, Trade

BANDS = [("A", 8500, 10001), ("B", 7000, 8500), ("C", 5500, 7000), ("D", 0, 5500)]


def band_of(score_bps: int | None) -> str | None:
    if score_bps is None:
        return None
    return next(b for b, lo, hi in BANDS if lo <= score_bps < hi)


def price_guide(db: Session) -> dict:
    scores: dict[int, int] = {}
    for s in db.execute(select(Submission).where(Submission.status == "Finalized").order_by(Submission.period)).scalars():
        scores[s.project_id] = s.score_bps  # last finalised period wins
    listings = db.execute(select(Listing)).scalars().all()
    lst = {li.id: li for li in listings}
    by: dict[str, dict[str, list[float]]] = {b: {"listings": [], "trades": []} for b, _, _ in BANDS}
    for li in listings:
        b = band_of(scores.get(li.project_id))
        if b and li.active and li.amount_left > 0:
            by[b]["listings"].append(int(li.price_per_unit_wei) / 1e18)
    for t in db.execute(select(Trade)).scalars().all():
        li = lst.get(t.listing_id)
        b = band_of(scores.get(li.project_id)) if li else None
        if b and t.amount:
            by[b]["trades"].append(int(t.paid_wei) / 1e18 / t.amount)
    bands = []
    for b, lo, hi in BANDS:
        ls, tr = by[b]["listings"], by[b]["trades"]
        ref = tr or ls
        bands.append(
            {
                "band": b,
                "score_min": lo / 100,
                "score_max": None if hi > 10000 else hi / 100,
                "listings": len(ls),
                "trades": len(tr),
                "listing_median_eth": median(ls) if ls else None,
                "listing_min_eth": min(ls) if ls else None,
                "listing_max_eth": max(ls) if ls else None,
                "trade_median_eth": median(tr) if tr else None,
                "reference_low_eth": min(ref) if ref else None,
                "reference_high_eth": max(ref) if ref else None,
                "basis": "trades" if tr else ("listings" if ls else None),
            }
        )
    return {
        "unit": "ETH per tCO2e (Base Sepolia testnet)",
        "bands": bands,
        "methodology": (
            "Each listing and trade is assigned to the band of its project's latest finalised integrity score "
            "(A >= 85, B 70-85, C 55-70, D < 55). Reference range is min/max of executed trade prices per tonne; "
            "when a band has no trades it falls back to open listing prices. Medians are unweighted."
        ),
    }
