from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.report import render_pdf, signed_report, verify_report

router = APIRouter(tags=["reports"])


def _rep(db: Session, pid: int, period: int) -> dict[str, Any]:
    rep = signed_report(db, pid, period)
    if rep is None:
        raise HTTPException(status_code=404, detail="project not found")
    if not rep.get("schema"):
        raise HTTPException(status_code=404, detail=rep.get("reason", "no data for this period"))
    return rep


@router.get("/projects/{pid}/periods/{period}/report.json")
def report_json(pid: int, period: int, db: Session = Depends(get_db)):
    """ML-DSA-65 signed auditor report (canonical JSON; signature covers everything but `signatures`)."""
    return _rep(db, pid, period)


@router.get("/projects/{pid}/periods/{period}/report.pdf")
def report_pdf(pid: int, period: int, db: Session = Depends(get_db)):
    rep = _rep(db, pid, period)
    return Response(
        content=render_pdf(rep),
        media_type="application/pdf",
        headers={"content-disposition": f'inline; filename="vericanopy-{pid}-{period}-auditor-report.pdf"'},
    )


@router.post("/reports/verify")
def report_verify(report: dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Re-check a report's ML-DSA-65 signature, canonical hash, and that its key is registered on-chain."""
    return verify_report(db, report)
