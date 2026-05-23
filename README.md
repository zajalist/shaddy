# Shaddy

> **Will the real slim shader please stand up?**

A learning environment for shader art. The canvas and the code are the same surface — drag the canvas to edit the GLSL, edit the GLSL to move the canvas. Drop in a photo and watch a shader gradient-descend toward it. One responsive web app, works on phone and desktop.

## What this repo contains

| Path | Owner | What it is |
|---|---|---|
| [`SPEC.md`](./SPEC.md) | both | Master product spec. Read first. |
| [`CONTRACTS.md`](./CONTRACTS.md) | both | API seams between the four tracks. Don't cross them without updating this file. |
| [`web/`](./web) | andyhandev + zajalist | React + Vite + TS app. Internal isolation via folders. |
| [`web/src/renderer/`](./web/src/renderer) | andyhandev | WebGL2 renderer, shader compile, template library. |
| [`web/src/editor/`](./web/src/editor) | zajalist | CodeMirror, GLSL parser, bidirectional binding. |
| [`web/src/ux/`](./web/src/ux) | andyhandev | App shell, responsive layout, mobile gestures, share URL, demo. |
| [`web/src/integration/`](./web/src/integration) | both | The seam — wires Editor ↔ Renderer ↔ Backend together. |
| [`backend/`](./backend) | zajalist | FastAPI + PyTorch service for photo → shader. |

## How to work in here

1. Pick an issue in your track (`track:renderer`, `track:editor`, `track:ml-backend`, `track:ux-mobile`).
2. Read [`CONTRACTS.md`](./CONTRACTS.md) for the public API your module exposes.
3. Build behind your seam. Use the mock harnesses in `web/src/<your-track>/__mocks__/` so you don't block on another track shipping first.
4. When your contract changes, update `CONTRACTS.md` in the same PR. **Contract changes need both owners' review.**
5. Integration issues run last, against shipped contracts.

## The 30-second demo

Judge takes the phone, drags a circle larger — sees the code change. Types `sin(` in the code — sees the canvas ripple. Snaps a photo of the room — taps *match* — watches a shader morph into a procedural impression of the photo. Hits share — gets a URL.

## Roles

- **Renderer + UX/Mobile/Demo** — andyhandev
- **Editor/Parser + ML Backend** — zajalist

See [`CONTRACTS.md`](./CONTRACTS.md) for the four interfaces that let everyone work in parallel.
