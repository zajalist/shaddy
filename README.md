# Shaddy

> **Will the real slim shader please stand up?**

A learning environment for shader art. The canvas and the code are the same surface — drag the canvas to edit the GLSL, edit the GLSL to move the canvas. Pick from 12 starter templates and play with the math live. One responsive web app, works on phone and desktop.

> **2026-05-23 — frontend-only.** The photo→shader gradient-descent feature (FastAPI + PyTorch backend) has been cut for this build. Reasons + reversal path: [`docs/decisions/2026-05-23-frontend-only.md`](./docs/decisions/2026-05-23-frontend-only.md).

## What this repo contains

| Path | Owner | What it is |
|---|---|---|
| [`SPEC.md`](./SPEC.md) | both | Master product spec. Read first. Deferred sections are marked. |
| [`CONTRACTS.md`](./CONTRACTS.md) | both | API seams between the three tracks. Don't cross them without updating this file. |
| [`web/`](./web) | andyhandev + zajalist | React + Vite + TS app. Internal isolation via folders. |
| [`web/src/renderer/`](./web/src/renderer) | andyhandev | WebGL2 renderer, shader compile, 12-template library, lens stack. |
| [`web/src/editor/`](./web/src/editor) | zajalist | CodeMirror, GLSL parser, bidirectional binding. |
| [`web/src/ux/`](./web/src/ux) | andyhandev | App shell, responsive layout, mobile gestures, share URL, demo. |
| [`web/src/integration/`](./web/src/integration) | both | The seam — wires Editor ↔ Renderer together (App.tsx, main.tsx). |

## How to work in here

1. Pick an issue in your track (`track:renderer`, `track:editor`, `track:ux-mobile`).
2. Read [`CONTRACTS.md`](./CONTRACTS.md) for the public API your module exposes.
3. Build behind your seam. Use the mock harnesses in `web/src/<your-track>/__mocks__/` so you don't block on another track shipping first.
4. When your contract changes, update `CONTRACTS.md` in the same PR. **Contract changes need both owners' review.**
5. Integration issues run last, against shipped contracts.

## The 30-second demo

Judge takes the phone, picks a template, drags a circle larger — sees the code change. Types `sin(` in the code — sees the canvas ripple. Toggles the lens stack — sees every step of the shader as a thumbnail. Hits share — gets a URL.

## Roles

- **Renderer + UX/Mobile/Demo** — andyhandev
- **Editor/Parser** — zajalist

See [`CONTRACTS.md`](./CONTRACTS.md) for the three interfaces that let everyone work in parallel.
