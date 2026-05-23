"""Mock backend that streams pre-recorded frames over the contract WS.

Usage:
    python -m scripts.mock_server          # listens on :8001
    SHADDY_MOCK_PORT=9000 python -m scripts.mock_server

Streams 5 evenly-spaced progress frames at 400ms intervals, then a done frame
with a fixed parameter set. Same wire format as the real backend so UX can
develop against this without a GPU.
"""

import asyncio
import os
import uuid

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app import templates
from app.schemas import OptimizeRequest
from optim import glsl_fill

_FAKE_PARAMS_PROGRESSION = [
    {"freq_x": 10.0, "freq_y": 10.0, "phase": 0.0, "color_a": [0.5, 0.5, 0.5], "color_b": [0.5, 0.5, 0.5], "time_scale": 1.0},
    {"freq_x": 9.4, "freq_y": 10.6, "phase": 0.3, "color_a": [0.6, 0.4, 0.5], "color_b": [0.4, 0.6, 0.5], "time_scale": 1.1},
    {"freq_x": 8.5, "freq_y": 11.7, "phase": 0.8, "color_a": [0.7, 0.3, 0.4], "color_b": [0.3, 0.5, 0.7], "time_scale": 1.2},
    {"freq_x": 8.0, "freq_y": 12.3, "phase": 1.1, "color_a": [0.8, 0.2, 0.3], "color_b": [0.2, 0.4, 0.8], "time_scale": 1.3},
    {"freq_x": 7.8, "freq_y": 12.5, "phase": 1.2, "color_a": [0.85, 0.18, 0.32], "color_b": [0.18, 0.38, 0.82], "time_scale": 1.32},
]

# Tiny 4x4 magenta JPEG, base64. Placeholder preview for all frames — UX can swap.
_PLACEHOLDER_JPEG = (
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB"
    "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/9sAQwEBAQEBAQEBAQEBAQEBAQEBAQE"
    "BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/8AAEQgABAAEAwEiAAIRAQMRAf"
    "/EAB4AAAEFAQEBAQEAAAAAAAAAAAYDBAUHCAkKAgEL/8QALhAAAQQCAQMDAgUFAQAAAAAAAQACAwQFBhEHEiEx"
    "QQgicSMyUWFCgQkUM0MV/8QAFgEBAQEAAAAAAAAAAAAAAAAAAQME/8QAHxEAAQQCAwEAAAAAAAAAAAAAAQACEQM"
    "EITESQVH/2gAMAwEAAhEDEQA/AP3+pSlKj//Z"
)

app = FastAPI(title="Shaddy mock backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_jobs: dict[str, dict] = {}


@app.get("/health")
def health():
    return {"ok": True, "device": "mock"}


@app.post("/optimize", status_code=202)
def post_optimize(req: OptimizeRequest):
    job_id = uuid.uuid4().hex
    _jobs[job_id] = {"template_id": req.template_id}
    return {
        "job_id": job_id,
        "ws_url": f"/optimize/stream/{job_id}",
        "resolved_device": "cpu",
    }


@app.websocket("/optimize/stream/{job_id}")
async def stream(ws: WebSocket, job_id: str):
    job = _jobs.pop(job_id, None)
    if job is None:
        await ws.close(code=1008)
        return
    await ws.accept()
    total = len(_FAKE_PARAMS_PROGRESSION)
    template_src = templates.glsl(job["template_id"])

    for i in range(total):
        await ws.send_json({
            "type": "progress",
            "step": i * 50,
            "total": (total - 1) * 50,
            "loss": 0.8 / (i + 1),
            "preview_b64": _PLACEHOLDER_JPEG,
        })
        await asyncio.sleep(0.4)

    final = _FAKE_PARAMS_PROGRESSION[-1]
    await ws.send_json({
        "type": "done",
        "final_params": final,
        "glsl": glsl_fill.fill(template_src, final),
        "loss": 0.05,
    })
    await ws.close()


def main():
    import uvicorn

    port = int(os.environ.get("SHADDY_MOCK_PORT", "8001"))
    uvicorn.run("scripts.mock_server:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    main()
