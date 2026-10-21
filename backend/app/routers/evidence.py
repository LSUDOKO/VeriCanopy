from __future__ import annotations

from fastapi import APIRouter, File, UploadFile

from app import ipfs

router = APIRouter(tags=["evidence"])


@router.post("/evidence")
async def upload_evidence(file: UploadFile = File(...)):
    """Upload challenge evidence to the content-addressed store; returns its CID (max 5 MB)."""
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        return {"error": "file too large (max 5 MB)"}
    cid = ipfs.put_bytes(data)
    return {"cid": cid, "uri": f"ipfs://{cid}", "gateway_url": ipfs.gateway_url(cid), "size": len(data)}


@router.get("/ipfs/{cid}")
def get_ipfs(cid: str):
    from fastapi import HTTPException, Response

    b = ipfs.get_bytes(cid)
    if b is None:
        raise HTTPException(status_code=404, detail="not found")
    return Response(content=b, media_type="application/octet-stream")
