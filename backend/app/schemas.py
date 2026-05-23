from typing import Literal, Union

from pydantic import BaseModel, Field

TemplateId = Literal["plasma", "voronoi-cells", "gradient-noise"]
RequestedDevice = Literal["auto", "cuda", "cpu"]
Device = Literal["cuda", "cpu"]


class OptimizeRequest(BaseModel):
    template_id: TemplateId
    image_base64: str
    device: RequestedDevice = "auto"
    max_steps: int = Field(default=500, ge=1, le=500)
    wall_clock_cap_sec: int = Field(default=30, ge=1, le=30)


class OptimizeAccepted(BaseModel):
    job_id: str
    ws_url: str
    resolved_device: Device


class OptimizeError(BaseModel):
    error: str


# --- WebSocket frames ---


class ProgressFrame(BaseModel):
    type: Literal["progress"]
    step: int
    total: int
    loss: float
    preview_b64: str  # data:image/jpeg;base64,...


class DoneFrame(BaseModel):
    type: Literal["done"]
    final_params: dict[str, float | list[float]]
    glsl: str
    loss: float


class ErrorFrame(BaseModel):
    type: Literal["error"]
    message: str


OptimizeFrame = Union[ProgressFrame, DoneFrame, ErrorFrame]
