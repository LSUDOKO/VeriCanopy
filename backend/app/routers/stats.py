from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import IndexerState, Project, Retirement, Reversal, Vintage

router = APIRouter(tags=["stats"])


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    projects = db.scalar(select(func.count(Project.id))) or 0
    issued = db.scalar(select(func.coalesce(func.sum(Vintage.issued), 0))) or 0
    retired = db.scalar(select(func.coalesce(func.sum(Retirement.amount), 0))) or 0
    reversed_t = db.scalar(select(func.coalesce(func.sum(Reversal.tonnes), 0))) or 0
    covered = db.scalar(select(func.coalesce(func.sum(Reversal.covered), 0))) or 0
    st = db.execute(select(IndexerState)).scalars().first()
    return {
        "projects": projects,
        "credits_issued": int(issued),
        "credits_retired": int(retired),
        "tonnes_reversed": int(reversed_t),
        "tonnes_covered_by_buffers": int(covered),
        "indexed_block": st.last_block if st else None,
    }
