# Decision — Frontend-only architecture (photo-match deferred)

**Date:** 2026-05-23
**Status:** accepted
**Driver:** product owner

## Context

The original spec ([SPEC.md](../../SPEC.md)) called for a FastAPI + PyTorch backend exposing `POST /optimize` + a WebSocket stream that ran differentiable-rendering gradient descent to fit a procedural shader to an uploaded photo. The backend's `track:ml-backend` was in flight on `backend/skeleton` and had landed real progress (FastAPI app, optimizer, three differentiable templates).

The product owner reset scope: "I want everything to run on the frontend so remove the FastAPI and whatever we do not need."

## Decision

The product is now **frontend-only**. There is no server, no API, nothing leaves the browser. Sharing happens via URL hash; the live preview happens in WebGL2.

Specifically:

- The FastAPI app under `backend/` was deleted in full.
- The frontend's `backend-client.ts`, `backend-types.ts`, and their tests were deleted — they had no other consumer (PR #61 added them but never wired AppShell to use them).
- `CONTRACTS.md` §3 (ML Backend ↔ UX) was removed and the four-track structure renumbered to three. The `onPhotoMatch(file, templateId)` field on the UX `AppShell` props was removed.
- The CI workflow's `backend:` job was removed.
- Five backend design / plan docs were deleted from `docs/superpowers/{specs,plans}/`.
- `SPEC.md` retains the photo-match vision, with a `🚫 DEFERRED` marker on every section that depends on a server.

## What's still in scope

- Renderer (WebGL2, fullscreen quad, hot-swap compile, 12 templates, lens stack, mobile perf guardrails) — already shipped via PR #60.
- Editor (CodeMirror, GLSL parser, bidirectional binding) — in progress.
- UX (responsive layout, touch gestures, share-via-URL).
- Integration layer that composes the three.

## What would need to come back if photo-match returns

Whoever picks up photo-match in the future will need:

1. **A differentiable shader runtime in the browser.** Options:
   - Hand-rolled gradient descent against WebGL2 (compute the loss in a fragment shader, read back, finite-difference or backprop manually). Cheapest, hardest.
   - TensorFlow.js with custom ops that mirror the GLSL templates. Heavier dependency; mature.
   - WebGPU compute shaders. Best fit long-term; spotty browser support today.
   - WebAssembly port of a small PyTorch subset. Overkill.
2. **Mirror the math of `plasma`, `voronoi-cells`, `gradient-noise`** in whatever differentiable runtime you pick. The GLSL source lives at `web/src/renderer/templates/`; the backend's `/*PARAM:name*/` template format (deleted) is the reference for which literals were tunable.
3. **A perceptual loss.** LPIPS in browser is ~10 MB of weights; MobileNet features via TensorFlow.js is lighter. Pure MSE produces blur.
4. **A UX surface for "upload photo / show progress / accept result"** — the contract was on `AppShell`'s `onPhotoMatch(file, templateId)` field; reinstate something analogous.

If you decide to restore the server route instead of going pure-frontend, the deleted spec lives in git history at commit `<this-commit-sha>~1` under `docs/superpowers/specs/2026-05-23-backend-{skeleton,optimizer,stretch-templates}-design.md`.

## Coordination notes

`zajalist`'s in-flight `backend/skeleton` branch will conflict heavily with this change. They can either close the branch or rebase onto post-deletion main and decide whether to bring any of the work back as a frontend-side reimplementation.

## Reversal cost

Low for "restore server" (revert this commit + a few cleanup edits). High for "reimplement photo-match client-side" — that's a real ML port. The point of writing this doc is to make sure neither path starts from scratch.
