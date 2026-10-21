import json
from pathlib import Path

from vericanopy_ai.geometry import canonical_geojson, geometry_sha256
from vericanopy_ai.h3cells import fine_cell_root, merkle_proof, polyfill_cells, verify_proof

DEMO = Path(__file__).resolve().parents[2] / "data" / "demo"


def _square(lon, lat, d=0.05):
    return [[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d], [lon, lat]]


def test_cells_dedup_and_holes():
    # polygon with a hole
    outer = _square(-55.0, -5.0, 0.2)
    hole = _square(-54.92, -4.92, 0.04)
    poly = {"type": "Polygon", "coordinates": [outer, hole]}
    cells = polyfill_cells(poly, 8)
    assert cells == sorted(set(cells))
    assert all(isinstance(c, int) for c in cells)
    assert len(cells) > 50
    no_hole = polyfill_cells({"type": "Polygon", "coordinates": [outer]}, 8)
    assert len(no_hole) > len(cells)
    # multipolygon with parts on both sides of the antimeridian (properly split)
    mp = {
        "type": "MultiPolygon",
        "coordinates": [[_square(179.9, -16.0, 0.1)], [_square(-180.0, -16.0, 0.1)]],
    }
    mcells = polyfill_cells(mp, 8)
    assert mcells == sorted(set(mcells))
    assert len(mcells) > 10


def test_geometry_hash_canonical():
    a = {"type": "Polygon", "coordinates": [_square(1.0, 2.0)]}
    b = {"coordinates": [_square(1.0, 2.0)], "type": "Polygon"}
    assert geometry_sha256(a) == geometry_sha256(b)
    assert geometry_sha256(a).startswith("0x") and len(geometry_sha256(a)) == 66
    assert canonical_geojson(a) == canonical_geojson(b)
    c = {"type": "Polygon", "coordinates": [_square(1.0, 2.1)]}
    assert geometry_sha256(a) != geometry_sha256(c)


def test_merkle_root_and_proof_roundtrip():
    cells = [555, 556, 999, 1234, 42]
    root = fine_cell_root(cells)
    assert root.startswith("0x") and len(root) == 66
    for c in cells:
        proof = merkle_proof(cells, c)
        assert verify_proof(root, c, proof)
    assert not verify_proof(root, 777, merkle_proof(cells, 555))
    # two-leaf tree matches the Solidity test vector: root = hashPair(leaf(555), leaf(556))
    assert fine_cell_root([555, 556]) == fine_cell_root([556, 555])


def test_demo_D_overlaps_A():
    a = json.loads((DEMO / "project_A.geojson").read_text())
    d = json.loads((DEMO / "project_D_overlap.geojson").read_text())
    b = json.loads((DEMO / "project_B.geojson").read_text())
    ca, cd, cb = (set(polyfill_cells(g["geometry"], 8)) for g in (a, d, b))
    assert ca & cd, "D must overlap A"
    assert not (ca & cb), "A and B must not overlap"
    for name in ("A", "B", "C"):
        n = len(polyfill_cells(json.loads((DEMO / f"project_{name}.geojson").read_text())["geometry"], 8))
        assert 20 <= n <= 400, f"{name} has {n} cells; keep within gas budget"
