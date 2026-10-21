from __future__ import annotations

import threading
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db
from app.deps import require_api_key
from app.models import Job
from app.schemas import ScoreJobIn

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _run(job_id: str, body: ScoreJobIn) -> None:
    from app.workers.oracle import run_score_job

    db = SessionLocal()
    job = db.get(Job, job_id)
    try:
        job.status = "running"
        db.commit()
        res = run_score_job(
            body.project_id,
            body.period,
            demo_id=body.demo_id,
            submit=body.submit,
            log=lambda s: _log(db, job, s),
        )
        job.result = res
        job.status = "done"
    except Exception as e:  # job log keeps the error for the admin UI
        job.status = "failed"
        job.log += f"\nERROR: {e}"
    finally:
        db.commit()
        db.close()


def _log(db, job, s: str) -> None:
    job.log += s + "\n"
    db.commit()


@router.post("/score", dependencies=[Depends(require_api_key)])
def score(body: ScoreJobIn, db: Session = Depends(get_db)):
    jid = str(uuid.uuid4())
    db.add(Job(id=jid, kind="score", project_id=body.project_id, period=body.period, status="queued"))
    db.commit()
    threading.Thread(target=_run, args=(jid, body), daemon=True).start()
    return {"job_id": jid, "status": "queued"}


@router.get("/{jid}")
def get_job(jid: str, db: Session = Depends(get_db)):
    j = db.get(Job, jid)
    if not j:
        raise HTTPException(status_code=404, detail="job not found")
    return {
        "id": j.id,
        "kind": j.kind,
        "project_id": j.project_id,
        "period": j.period,
        "status": j.status,
        "log": j.log,
        "result": j.result,
    }
