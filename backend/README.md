# backend/

**Owner:** zajalist
**Public surface:** HTTP + WebSocket — see [`../CONTRACTS.md`](../CONTRACTS.md) §3.

FastAPI + PyTorch. Receives an image + template id, runs gradient descent on the template's exposed parameters, streams progress frames over WebSocket, returns the final parameters and a filled-in GLSL shader.

## Layout
- `app/` — FastAPI app, routes, WS handler.
- `templates/` — GLSL placeholders + `defaults.json`. Sub-project B will add PyTorch mirrors here. Each must keep math identical to `web/src/renderer/templates/` or document the divergence.
- `optim/` — (sub-project B) Adam loop, LPIPS+MSE loss, parallel-init harness.
- `scripts/mock_server.py` — (sub-project B) fake server that streams pre-recorded frames (UX uses on machines without a GPU).

## Local development

```powershell
cd backend
# uv (recommended, ~10x faster):
uv venv --python 3.11 .venv
.\.venv\Scripts\Activate.ps1
uv pip install -r requirements.txt

# or plain venv + pip:
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

make dev    # binds 0.0.0.0:8000
```

### GPU setup (optional)

If you have a CUDA GPU, swap to the GPU torch wheel:

```powershell
pip install -r requirements-gpu.txt
```

The dev server detects the device automatically via `device.detect()`. `GET /health` returns the chosen device.

### Phone testing

To hit `make dev` from a phone on the same wifi:

1. `make dev` already binds to `0.0.0.0:8000`, so it's reachable at `http://<your-LAN-IP>:8000`.
2. The frontend (`web/`) needs to run with `npm run dev -- --host` so the phone can load it.
3. For features that require HTTPS (camera capture on iOS Safari), use a cloudflared quick tunnel:
   ```powershell
   cloudflared tunnel --url http://localhost:5173    # for the frontend
   cloudflared tunnel --url http://localhost:8000    # for the backend, if needed
   ```
   Both `*.trycloudflare.com` and LAN `*:5173` origins are already in the CORS allowlist.

## Running tests

```powershell
make test
# or:
.\.venv\Scripts\python.exe -m pytest -q
```

## What this skeleton does (sub-project A)

- `POST /optimize` validates the request, resolves the device (`auto`/`cuda`/`cpu`), allocates a `job_id`, parks the job behind a 10-second TTL.
- `WS /optimize/stream/{job_id}` sends one stub `DoneFrame` with the template's default parameters + unmodified template GLSL, then closes.

Sub-project B replaces the WS handler's stub with real PyTorch optimization. Wire format stays identical.

## Mock server (for UX without a GPU)

The mock backend ships pre-recorded progress frames over the real wire format — useful for UX dev on machines without a GPU.

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m scripts.mock_server   # http://localhost:8001
```

Point `VITE_BACKEND_URL=http://localhost:8001` on the frontend and the UI behaves as if a real optimization is streaming.

## Deploy to Modal

Requires a Modal account + `pip install modal` + `modal token new` (one-time).

```powershell
cd backend
modal deploy deploy/modal_app.py
```

Modal will print a URL like `https://<account>--shaddy-backend-fastapi-app.modal.run`. Set that as `VITE_BACKEND_URL` on the frontend.

LPIPS VGG weights are baked into the image build so the first request doesn't pay the cold-start tax of a ~58 MB weight download.

## Deployment

- Demo day: Modal (free tier). Image uses `requirements-gpu.txt`.
- Dev: local CUDA or automatic CPU fallback at 64×64.
- Backup: pre-recorded demo video (the UX track owns recording it).
