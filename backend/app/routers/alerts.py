from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.alerts import alerts, rss

router = APIRouter(tags=["alerts"])


@router.get("/alerts")
def alerts_json(project_id: int | None = None, limit: int = Query(50, le=200), db: Session = Depends(get_db)):
    return {"alerts": alerts(db, project_id, limit)}


@router.get("/alerts.rss")
def alerts_rss(request: Request, db: Session = Depends(get_db)):
    return Response(rss(alerts(db), "VeriCanopy alerts", str(request.base_url)), media_type="application/rss+xml")


@router.get("/projects/{pid}/alerts.rss")
def project_rss(pid: int, request: Request, db: Session = Depends(get_db)):
    return Response(
        rss(alerts(db, pid), f"VeriCanopy alerts · project {pid}", str(request.base_url)),
        media_type="application/rss+xml",
    )
