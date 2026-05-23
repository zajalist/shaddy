from fastapi import APIRouter

from app import device

router = APIRouter()


@router.get("/health")
def health():
    return {"ok": True, "device": device.detect()}
