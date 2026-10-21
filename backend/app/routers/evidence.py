from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app import ipfs

router = APIRouter(tags=["evidence"])
MAX_UPLOAD = 5 * 1024 * 1024


@router.post("/evidence")
async def upload_evidence(file: UploadFile = File(...)):
    """Upload challenge evidence to the content-addressed store; returns its CID (max 5 MB, 413 otherwise)."""
    chunks: list[bytes] = []
    size = 0
    while chunk := await file.read(256 * 1024):
        size += len(chunk)
        if size > MAX_UPLOAD:
            raise HTTPException(status_code=413, detail="file too large (max 5 MB)")
        chunks.append(chunk)
    data = b"".join(chunks)
    cid = ipfs.put_bytes(data)
    return {"cid": cid, "uri": f"ipfs://{cid}", "gateway_url": ipfs.gateway_url(cid), "size": len(data)}


@router.get("/ipfs/{cid}")
def get_ipfs(cid: str):
    from fastapi import HTTPException, Response

    if not ipfs.is_cid(cid):
        raise HTTPException(status_code=400, detail="invalid CID")
    b = ipfs.get_bytes(cid)
    if b is None:
        raise HTTPException(status_code=404, detail="not found")
    return Response(content=b, media_type="application/octet-stream")
