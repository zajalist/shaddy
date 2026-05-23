# Handoff: UX / Mobile / Demo track

> **For the receiving agent (or AndyHanDev).** Everything you need is in this file or linked from it.

## What you're building

The **UX layer** for *Shaddy* — app shell, responsive layouts (desktop split / mobile stacked), template gallery, photo upload + camera capture, photo→shader progress modal, settings panel, QR-code share, touch gestures, compile-error display, plus the demo script and backup video.

Everything from backend (sub-projects A–C, merged into `badr`) and editor (sub-projects D–F, PRs #57–#59) and integration (sub-project G, PR #61) is in place — including a working CSS-gradient renderer mock and a real WebGL renderer (PR #60). The only thing still stubbed in `ux/index.tsx` is the `AppShell` itself: today it just renders `"Shaddy"` centered on a dark background.

You ship **~10 GitHub issues** that round out the demo.

## Identity for commits

You are **AndyHanDev** (GitHub `AndyHanDev`).

```powershell
git -c user.email=<andy's email> -c user.name=AndyHanDev commit -m "..."
```

Use `andyhandev@users.noreply.github.com` if you don't have a real email.

## Repo + branch

- Clone: `https://github.com/zajalist/shaddy`
- Base: **`main`** — but assume the editor + renderer + integration PR stack (#57, #58, #59, #60, #61) merges before yours. Wait for those, or rebase on top of `integration/wiring` if you start in parallel.
- Your branch: **`ux/shell`** off `main` after the stack merges.

## Read first (~10 min)

1. **`SPEC.md`** §4 (Tier 1/2/3 scope), §8 (UX layout — full ASCII for desktop + mobile).
2. **`CONTRACTS.md`** — **§4 (UX↔Integration) is your contract.** Also §1 (Renderer surface — what you consume).
3. **`web/src/ux/README.md`** — pointer to your module.
4. **`web/src/integration/App.tsx`** — to see the current bare-bones assembly. You're replacing the placeholder layout, not rewriting integration glue.

## Your scope

| # | Issue | Tier | Notes |
|---|---|---|---|
| #34 | Publish ux/index.ts surface | 1 | **Partly done** — `AppShell` + `encodeShareUrl` + `decodeShareUrl` exist as a stub. Implement `AppShell` body. |
| #35 | Desktop layout — canvas left / editor right | 1 | Top bar with `[templates] [photo→] [share] [phone QR]`. ASCII in SPEC §8. |
| #36 | Mobile layout — stacked + draggable handle | 1 | Canvas on top, editor below; drag handle to switch which fills screen; bottom action bar. |
| #37 | Template gallery sheet | 1 | Reads `templates/manifest.ts` (from renderer). 3 cols mobile, 4 cols desktop. |
| #38 | Photo upload + camera capture UI | 2 | `<input type="file" accept="image/*" capture="environment">` on mobile triggers camera. Drag-and-drop on desktop. |
| #39 | ~~Share URL hash encode/decode~~ | 1 | **Already shipped in PR #61 (sub-project G).** Close as done. |
| #40 | QR code popover | 1 | `qrcode` npm package already in deps. Modal that closes on outside click. |
| #41 | Touch gestures — pinch zoom + long-press number scrub | 2 | Pinch sets `u_zoom`/`u_pan` uniforms. Long-press scrub is handled by editor → emits handle drag → `replaceLiteral`. Already in `EditorProps.onPatternsChange`. |
| #42 | Compile error surface in layout | 1 | **Partly done** — G already wires `errors` from `renderer.onCompile` into `<EditorPane>`'s `errors` prop. UX adds a banner/toast on top. |
| #43 | Photo→shader progress modal + reconnect UX | 2 | Listens to frames from `optimizePhoto`. Modal shows current `preview_b64` + step counter + cancel button. |
| #44 | Demo script + 10 pre-loaded "remix" examples + backup video | 1 | Write `docs/demo-script.md`. Record OBS/phone video of the photo→shader flow. Commit to `docs/demo-backup.mp4` or link from script. |
| #47 | E2E browser smoke | 1 | Manual Playwright run-through. The 7-step script is in the issue body. |
| #48 | Mid-range phone bug-bash | 1 | Real-device task. Log findings to `docs/bugbash-2026-05-23.md`. |
| #53 | Settings panel — Device toggle (Auto / GPU / CPU) | 1 | Gear icon → popover with radio. localStorage `shaddy:device`. Passed via `optimizePhoto(file, templateId, { device })`. |

## What's already in place that you build on

- **Renderer (PR #60)** — real WebGL2 renderer with 12 starter templates, hot-reload, GLSL error parsing, FPS watchdog. `createRenderer()` in `@/renderer`.
- **Editor (PRs #57–#59)** — CodeMirror + AST + `findLiterals` + `findPatterns` + `replaceLiteral`. `<EditorPane>` and `useEditorStore` ready.
- **Integration (PR #61)** — `App.tsx` instantiates the renderer, holds source, wires editor + errors + patterns + photo-match. `backend-client.ts` has `optimizePhoto()` — use it from your photo-modal.
- **Backend (badr / PRs #54–#56)** — POST `/optimize` + WS streaming + real plasma/voronoi/gradient-noise PyTorch templates. Set `VITE_BACKEND_URL`. CORS allows `*:5173` and `*.trycloudflare.com`.

## What's stubbed / awaiting you

- `ux/AppShell`: renders only a centered "Shaddy" h1. Replace with the real layout per SPEC §8.
- `App.tsx`'s integration page is functional but spartan — the canvas + editor are stacked side by side via a hardcoded 2-column grid. Once your `AppShell` is real, `App.tsx` should hand it the renderer + editor + photo-match callback (the shape is already passed in via props — see existing integration code).

## Locked decisions you don't need to re-litigate

- Tailwind v4 (no `tailwind.config.js`).
- React 19, npm, ESLint v9 flat config.
- `@/*` path aliases → `web/src/*`.
- ESLint `no-restricted-imports` enforces the module boundaries — **don't import from `@/integration*` in your code.** Integration imports from you, not the other way.
- Backend wire format: see `web/src/shared/backend-types.ts`.

## Done criteria

- Issues #34, #35, #36, #37, #38, #40, #41, #42, #43, #44, #53 closed.
- #39 closed as duplicate-of-G.
- `npm run dev` on desktop opens a real layout that matches SPEC §8.
- Phone (LAN, `npm run dev -- --host`) shows the mobile-stacked layout.
- Photo→shader full flow works against `make dev` on the backend (live preview + done-frame drops final GLSL into editor).
- Settings panel persists Device choice in localStorage and passes it on every `optimizePhoto`.
- `docs/demo-script.md` is written and a backup video is committed/linked.
- CI green: typecheck + lint + tests.
- One PR back to `main` titled e.g. `ux: app shell + responsive layouts + photo flow + settings + demo`.

## What to flag back

- Contract changes (touching `CONTRACTS.md §4`).
- Anything you'd need to add to the backend or editor.
- Anything that requires `getUserMedia` HTTPS — use cloudflared tunnel for that, instructions in `backend/README.md`.

Good luck. UX is the last mile to the demo — most of the back-end magic is built; you make it visible and pleasant.
