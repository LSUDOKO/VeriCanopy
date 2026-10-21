"""Off-chain overlap pre-check (F1): H3 cells of a geometry vs indexed project cells."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session
from vericanopy_ai.geometry import geometry_sha256
from vericanopy_ai.h3cells import cells_to_geojson, polyfill_cells

from app.models import Project, ProjectCell

MAX_CELLS = 5000  # ≈3,700 km² at res 8; larger projects use res 7 or batch registration


class TooManyCells(ValueError):
    pass


def overlap_check(db: Session, geometry: dict, h3_res: int = 8) -> dict:
    from vericanopy_ai.geometry import area_ha

    if area_ha(geometry) > MAX_CELLS * 74:  # res-8 cell ≈ 74 ha; cheap check before polyfill
        raise TooManyCells(f"geometry too large for the overlap pre-check (max ≈{MAX_CELLS} res-8 cells)")
    cells = polyfill_cells(geometry, h3_res)
    if len(cells) > MAX_CELLS:
        raise TooManyCells(f"{len(cells)} cells exceeds the {MAX_CELLS}-cell limit")
    strs = [str(c) for c in cells]
    conflicts: list[dict] = []
    if strs:
        rows = db.execute(select(ProjectCell).where(ProjectCell.cell.in_(strs))).scalars().all()
        names = {p.id: p.name for p in db.execute(select(Project)).scalars().all()}
        for r in rows:
            conflicts.append(
                {"cell": r.cell, "project_id": r.project_id, "project_name": names.get(r.project_id)}
            )
    return {
        "h3_res": h3_res,
        "cells": strs,
        "cell_count": len(strs),
        "geometry_sha256": geometry_sha256(geometry),
        "conflicts": conflicts,
        "conflict_cells_geojson": cells_to_geojson([int(c["cell"]) for c in conflicts])
        if conflicts
        else None,
        "cells_geojson": cells_to_geojson(cells),
    }
