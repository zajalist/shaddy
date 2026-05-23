# backend/

**Owner:** zajalist
**Public surface:** HTTP + WebSocket — see [`../CONTRACTS.md`](../CONTRACTS.md) §3.

FastAPI + PyTorch. Receives an image + template id, runs gradient descent on the template's exposed parameters, streams progress frames over WebSocket, returns the final parameters and a filled-in GLSL shader.

## Layout
- `app/` — FastAPI app, routes, WS handler.
- `templates/` — PyTorch implementations of `plasma`, `voronoi-cells`, `gradient-noise`. Each mirrors a GLSL template in `web/src/renderer/templates/`. **Keep math identical or document the divergence.**
- `optim/` — Adam loop, LPIPS+MSE loss, parallel-init harness.
- `scripts/mock_server.py` — fake server that streams pre-recorded frames (UX uses on machines without a GPU).

## Deployment
- Demo day: Modal or Replicate (free tier).
- Dev: local CUDA or CPU fallback at 64×64.
- Backup: pre-recorded demo video (the UX track owns recording it).
