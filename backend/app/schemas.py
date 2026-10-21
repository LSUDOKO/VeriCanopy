from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OverlapCheckIn(BaseModel):
    geometry: dict[str, Any]
    h3_res: int = Field(8, ge=5, le=11)


class VerifyPQIn(BaseModel):
    manifest: dict[str, Any] | None = None
    manifest_cid: str | None = None


class ScoreJobIn(BaseModel):
    project_id: int
    period: int
    demo_id: str | None = None
    submit: bool = True


class WebhookIn(BaseModel):
    url: str = Field(pattern=r"^https?://")
    project_id: int | None = None
