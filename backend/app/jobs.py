import asyncio
from dataclasses import dataclass, field
from typing import Optional

from app.schemas import Device, TemplateId


class SlotBusy(Exception):
    """Raised when acquire() is called while another job occupies the slot."""


@dataclass
class Job:
    job_id: str
    template_id: TemplateId
    image_bytes: bytes
    resolved_device: Device
    max_steps: int
    wall_clock_cap_sec: int
    created_at: float
    gc_task: Optional[asyncio.Task] = field(default=None, compare=False)
    ws_attached: bool = field(default=False)


class JobRegistry:
    """Serial slot. At most one job exists at a time."""

    def __init__(self) -> None:
        self._slot: Optional[Job] = None
        self._lock = asyncio.Lock()

    async def acquire(self, job: Job) -> None:
        async with self._lock:
            if self._slot is not None:
                raise SlotBusy(self._slot.job_id)
            self._slot = job

    async def release(self) -> None:
        async with self._lock:
            self._slot = None

    def current(self) -> Optional[Job]:
        return self._slot

    def get(self, job_id: str) -> Optional[Job]:
        if self._slot is not None and self._slot.job_id == job_id:
            return self._slot
        return None
