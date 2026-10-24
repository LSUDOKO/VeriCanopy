"""Indexed chain state + off-chain records (09 §2). Geometry is stored as GeoJSON text (no PostGIS needed)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, BigInteger, DateTime, Integer, LargeBinary, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    developer: Mapped[str] = mapped_column(String(42))
    name: Mapped[str | None] = mapped_column(String(200))
    country: Mapped[str | None] = mapped_column(String(8))
    geometry: Mapped[dict | None] = mapped_column(JSON)
    geometry_hash: Mapped[str] = mapped_column(String(66))
    h3_res: Mapped[int] = mapped_column(Integer, default=8)
    start_date: Mapped[str | None] = mapped_column(String(10))
    claimed_baseline_bps: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="Pending")
    metadata_uri: Mapped[str | None] = mapped_column(Text)
    demo_id: Mapped[str | None] = mapped_column(String(16))
    cell_count: Mapped[int] = mapped_column(Integer, default=0)
    integrity_status: Mapped[str | None] = mapped_column(String(16))
    score_bps: Mapped[int | None] = mapped_column(Integer)
    created_tx: Mapped[str | None] = mapped_column(String(66))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ProjectCell(Base):
    __tablename__ = "project_cells"
    cell: Mapped[str] = mapped_column(String(24), primary_key=True)  # uint64 as decimal string
    project_id: Mapped[int] = mapped_column(BigInteger, index=True)


class Submission(Base):
    __tablename__ = "submissions"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    project_id: Mapped[int] = mapped_column(BigInteger, index=True)
    period: Mapped[int] = mapped_column(Integer)
    score_bps: Mapped[int] = mapped_column(Integer)
    reversal_tonnes: Mapped[int] = mapped_column(BigInteger, default=0)
    feature_commitment: Mapped[str | None] = mapped_column(String(66))
    model_hash: Mapped[str | None] = mapped_column(String(66))
    manifest_hash: Mapped[str | None] = mapped_column(String(66))
    manifest_cid: Mapped[str | None] = mapped_column(String(128))
    pq_key_id: Mapped[str | None] = mapped_column(String(66))
    oracle: Mapped[str | None] = mapped_column(String(42))
    stake: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(16), default="Pending")
    window_end: Mapped[int | None] = mapped_column(BigInteger)
    tx_hash: Mapped[str | None] = mapped_column(String(66))
    finalized_tx: Mapped[str | None] = mapped_column(String(66))
    proof_mode: Mapped[str] = mapped_column(String(12), default="onchain")
    block_number: Mapped[int | None] = mapped_column(BigInteger)


class Challenge(Base):
    __tablename__ = "challenges"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    submission_id: Mapped[int] = mapped_column(BigInteger, index=True)
    challenger: Mapped[str] = mapped_column(String(42))
    bond: Mapped[str] = mapped_column(String(40))
    reason: Mapped[str] = mapped_column(String(24))
    evidence_cid: Mapped[str | None] = mapped_column(String(128))
    votes_uphold: Mapped[int] = mapped_column(Integer, default=0)
    votes_reject: Mapped[int] = mapped_column(Integer, default=0)
    deadline: Mapped[int | None] = mapped_column(BigInteger)
    outcome: Mapped[str] = mapped_column(String(12), default="Open")
    tx_hash: Mapped[str | None] = mapped_column(String(66))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)


class Vintage(Base):
    __tablename__ = "vintages"
    token_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    project_id: Mapped[int] = mapped_column(BigInteger, index=True)
    vintage: Mapped[int] = mapped_column(Integer)
    issued: Mapped[int] = mapped_column(BigInteger, default=0)
    buffer: Mapped[int] = mapped_column(BigInteger, default=0)
    retired: Mapped[int] = mapped_column(BigInteger, default=0)
    burned: Mapped[int] = mapped_column(BigInteger, default=0)


class Holding(Base):
    __tablename__ = "holdings"
    holder: Mapped[str] = mapped_column(String(42), primary_key=True)
    token_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    amount: Mapped[int] = mapped_column(BigInteger, default=0)


class Retirement(Base):
    __tablename__ = "retirements"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    holder: Mapped[str] = mapped_column(String(42), index=True)
    token_id: Mapped[str] = mapped_column(String(80))
    amount: Mapped[int] = mapped_column(BigInteger)
    beneficiary: Mapped[str | None] = mapped_column(Text)
    score_at_retirement: Mapped[int] = mapped_column(Integer)
    ts: Mapped[int | None] = mapped_column(BigInteger)
    tx_hash: Mapped[str | None] = mapped_column(String(66))


class Reversal(Base):
    __tablename__ = "reversals"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(BigInteger, index=True)
    period: Mapped[int] = mapped_column(Integer)
    tonnes: Mapped[int] = mapped_column(BigInteger)
    covered: Mapped[int] = mapped_column(BigInteger)
    shortfall: Mapped[int] = mapped_column(BigInteger)
    tx_hash: Mapped[str | None] = mapped_column(String(66))


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    address: Mapped[str] = mapped_column(String(42), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    read_at: Mapped[datetime | None] = mapped_column(DateTime)


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    kind: Mapped[str] = mapped_column(String(32))
    project_id: Mapped[int | None] = mapped_column(BigInteger)
    period: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default="queued")
    log: Mapped[str] = mapped_column(Text, default="")
    result: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class IndexerState(Base):
    __tablename__ = "indexer_state"
    chain_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    last_block: Mapped[int] = mapped_column(BigInteger, default=0)


class ModelVersion(Base):
    __tablename__ = "model_versions"
    model_hash: Mapped[str] = mapped_column(String(66), primary_key=True)
    verifier: Mapped[str] = mapped_column(String(42))
    artifacts_uri: Mapped[str | None] = mapped_column(Text)
    output_scale: Mapped[int] = mapped_column(Integer, default=13)
    active: Mapped[bool] = mapped_column(default=True)


class PQKey(Base):
    __tablename__ = "pq_keys"
    key_id: Mapped[str] = mapped_column(String(66), primary_key=True)
    owner: Mapped[str] = mapped_column(String(42))
    algorithm: Mapped[str] = mapped_column(String(16))
    pubkey_hash: Mapped[str] = mapped_column(String(66))
    pubkey_uri: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(default=True)


class ProcessedLog(Base):
    """Every applied event, keyed by (tx_hash, log_index): makes re-scans and restarts idempotent."""

    __tablename__ = "processed_logs"
    tx_hash: Mapped[str] = mapped_column(String(66), primary_key=True)
    log_index: Mapped[int] = mapped_column(Integer, primary_key=True)
    block_number: Mapped[int] = mapped_column(BigInteger)


class Webhook(Base):
    """Registered webhook: receives JSON POSTs for project events (score finalised, reversal, status, challenge)."""

    __tablename__ = "webhooks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    url: Mapped[str] = mapped_column(Text)
    project_id: Mapped[int | None] = mapped_column(BigInteger, index=True)  # null = all projects
    secret: Mapped[str] = mapped_column(String(128))
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_status: Mapped[int | None] = mapped_column(Integer)
    last_delivery_at: Mapped[datetime | None] = mapped_column(DateTime)


class Blob(Base):
    """Content-addressed bytes (CIDv1 raw/sha2-256) shared by every service instance; mirrors the local dir."""

    __tablename__ = "blobs"
    cid: Mapped[str] = mapped_column(String(128), primary_key=True)
    data: Mapped[bytes] = mapped_column(LargeBinary)
    size: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class NamedBlob(Base):
    """Mutable name → CID pointer (e.g. evidence/<project>/<period>) so hosted instances find pipeline outputs."""

    __tablename__ = "named_blobs"
    name: Mapped[str] = mapped_column(String(200), primary_key=True)
    cid: Mapped[str] = mapped_column(String(128))
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
