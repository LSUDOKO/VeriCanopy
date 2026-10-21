"""H3 polyfill (centroid containment) and Merkle commitments over fine cells.

Leaf = keccak256(abi.encodePacked(uint64 cell)); pairs are hashed in sorted order so that
OpenZeppelin's MerkleProof.verify accepts the proofs (see contracts/src/ProjectRegistry.sol).
"""

from __future__ import annotations

from typing import Any

import h3
from eth_hash.auto import keccak

Geometry = dict[str, Any]

LOCK_RESOLUTION = 8
FINE_RESOLUTION = 11


def polyfill_cells(geom: Geometry, res: int = LOCK_RESOLUTION) -> list[int]:
    """Return sorted, de-duplicated uint64 H3 cells whose centroid lies inside the geometry."""
    polys = _polygons(geom)
    cells: set[int] = set()
    for rings in polys:
        outer = [(lat, lon) for lon, lat in rings[0]]
        holes = [[(lat, lon) for lon, lat in ring] for ring in rings[1:]]
        poly = h3.LatLngPoly(outer, *holes)
        cells.update(h3.str_to_int(c) for c in h3.h3shape_to_cells(poly, res))
    return sorted(cells)


def cells_to_geojson(cells: list[int]) -> Geometry:
    """GeoJSON MultiPolygon of the given cells (for map overlays)."""
    coords = []
    for c in cells:
        boundary = h3.cell_to_boundary(h3.int_to_str(c))
        ring = [[lon, lat] for lat, lon in boundary]
        ring.append(ring[0])
        coords.append([ring])
    return {"type": "MultiPolygon", "coordinates": coords}


# ------------------------------------------------------------------ merkle


def _leaf(cell: int) -> bytes:
    return keccak(int(cell).to_bytes(8, "big"))


def _pair(a: bytes, b: bytes) -> bytes:
    return keccak(a + b) if a < b else keccak(b + a)


def _layers(cells: list[int]) -> list[list[bytes]]:
    layer = sorted({_leaf(c) for c in cells})
    layers = [layer]
    while len(layer) > 1:
        nxt = [_pair(layer[i], layer[i + 1]) if i + 1 < len(layer) else layer[i] for i in range(0, len(layer), 2)]
        layers.append(nxt)
        layer = nxt
    return layers


def fine_cell_root(cells: list[int]) -> str:
    if not cells:
        return "0x" + "00" * 32
    return "0x" + _layers(cells)[-1][0].hex()


def merkle_proof(cells: list[int], cell: int) -> list[str]:
    layers = _layers(cells)
    idx = layers[0].index(_leaf(cell))
    proof: list[str] = []
    for layer in layers[:-1]:
        sib = idx ^ 1
        if sib < len(layer):
            proof.append("0x" + layer[sib].hex())
        idx //= 2
    return proof


def verify_proof(root: str, cell: int, proof: list[str]) -> bool:
    h = _leaf(cell)
    for p in proof:
        h = _pair(h, bytes.fromhex(p[2:]))
    return "0x" + h.hex() == root


def _polygons(geom: Geometry) -> list[list[list[list[float]]]]:
    t = geom["type"]
    if t == "Polygon":
        return [geom["coordinates"]]
    if t == "MultiPolygon":
        return list(geom["coordinates"])
    if t == "Feature":
        return _polygons(geom["geometry"])
    raise ValueError(f"unsupported geometry type {t}")
