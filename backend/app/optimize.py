import asyncio
import base64
import io
import re
import time
import uuid

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from app import device, templates
from app.jobs import Job, JobRegistry, SlotBusy
from app.schemas import DoneFrame, OptimizeAccepted, OptimizeError, OptimizeRequest

router = APIRouter()

UNCLAIMED_TTL_SEC: float = 10.0
MAX_IMAGE_BYTES: int = 1_000_000  # 1 MB

_DATA_URL_RE = re.compile(r"^data:[^;]+;base64,(.+)$", re.DOTALL)


def _decode_image_b64(b64: str) -> bytes:
    """Strip optional data-URL prefix and base64-decode. Raises ValueError on garbage."""
    m = _DATA_URL_RE.match(b64)
    payload = m.group(1) if m else b64
    try:
        return base64.b64decode(payload, validate=False)
    except Exception as exc:
        raise ValueError("invalid base64") from exc


def _err(message: str, code: int) -> JSONResponse:
    return JSONResponse(OptimizeError(error=message).model_dump(), status_code=code)


async def _gc_unclaimed(registry: JobRegistry, job_id: str, ttl: float) -> None:
    try:
        await asyncio.sleep(ttl)
    except asyncio.CancelledError:
        return
    current = registry.current()
    if current is not None and current.job_id == job_id and not current.ws_attached:
        await registry.release()


@router.post("/optimize", status_code=status.HTTP_202_ACCEPTED)
async def post_optimize(req: OptimizeRequest, request: Request):
    # 1. Decode image and enforce size cap.
    try:
        image_bytes = _decode_image_b64(req.image_base64)
    except ValueError:
        return _err("invalid base64", 400)
    if len(image_bytes) > MAX_IMAGE_BYTES:
        return _err("image exceeds 1MB", 400)

    # 2. Confirm it's a real image PIL can parse.
    try:
        Image.open(io.BytesIO(image_bytes)).verify()
    except (UnidentifiedImageError, Exception):
        return _err("unsupported image format", 400)

    # 3. Resolve device.
    try:
        resolved = device.resolve(req.device)
    except device.CudaUnavailable:
        return _err("cuda requested but unavailable", 400)

    # 4. Allocate job and try to occupy the slot.
    registry: JobRegistry = request.app.state.registry
    job = Job(
        job_id=uuid.uuid4().hex,
        template_id=req.template_id,
        image_bytes=image_bytes,
        resolved_device=resolved,
        max_steps=req.max_steps,
        wall_clock_cap_sec=req.wall_clock_cap_sec,
        created_at=time.monotonic(),
    )
    try:
        await registry.acquire(job)
    except SlotBusy:
        return _err("another job in progress", 503)

    # 5. Schedule TTL gc and stash the task on the job.
    job.gc_task = asyncio.create_task(_gc_unclaimed(registry, job.job_id, UNCLAIMED_TTL_SEC))

    return OptimizeAccepted(
        job_id=job.job_id,
        ws_url=f"/optimize/stream/{job.job_id}",
        resolved_device=resolved,
    )


@router.websocket("/optimize/stream/{job_id}")
async def ws_optimize_stream(ws: WebSocket, job_id: str):
    registry: JobRegistry = ws.app.state.registry
    job = registry.get(job_id)
    if job is None:
        # 1008 = policy violation. Matches spec §6.
        await ws.close(code=1008)
        return

    # We have a real job. Cancel the TTL gc if it's still pending.
    if job.gc_task is not None and not job.gc_task.done():
        job.gc_task.cancel()
    job.ws_attached = True

    await ws.accept()
    try:
        frame = DoneFrame(
            type="done",
            final_params=templates.defaults(job.template_id),
            glsl=templates.glsl(job.template_id),
            loss=0.0,
        )
        await ws.send_json(frame.model_dump())
        await ws.close()
    except WebSocketDisconnect:
        # Client vanished mid-frame; nothing to do.
        pass
    finally:
        await registry.release()
