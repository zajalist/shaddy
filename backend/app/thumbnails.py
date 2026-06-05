import hashlib
import os

from fastapi import HTTPException, UploadFile

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
MAX_THUMB_BYTES = 2 * 1024 * 1024


async def store_thumbnail(file: UploadFile, thumbs_dir: str) -> str:
    """Validate a PNG upload and write it content-addressed under thumbs_dir.

    Returns the relative path (``<ab>/<sha256>.png``) to store in the DB.
    """
    data = await file.read()
    if len(data) > MAX_THUMB_BYTES:
        raise HTTPException(status_code=413, detail="thumbnail too large")
    if data[:8] != PNG_MAGIC:
        raise HTTPException(status_code=415, detail="only PNG thumbnails are accepted")

    sha = hashlib.sha256(data).hexdigest()
    shard = sha[:2]
    rel_path = f"{shard}/{sha}.png"
    dest = os.path.join(thumbs_dir, rel_path)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if not os.path.exists(dest):  # content-addressed -> identical bytes dedupe
        with open(dest, "wb") as fh:
            fh.write(data)
    return rel_path
