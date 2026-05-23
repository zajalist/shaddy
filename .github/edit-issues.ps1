$ErrorActionPreference = 'Stop'
$repo = 'zajalist/shaddy'
$tmp = Join-Path $env:TEMP 'shaddy-edits'
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

# ───────── Issue #1: Vite + React + TS + Tailwind ─────────
@'
**Owner:** AndyHanDev (Renderer track needs this first; UX builds on it.)

Stand up the frontend toolchain so every other web/ issue has a place to land.

## Decisions locked from the grilling session
- **No `npm create vite`** — `web/` already has scaffolded folders (`renderer/`, `editor/`, `ux/`, `integration/`, `shared/`). Hand-write the configs to avoid clobbering them.
- **React 19** (default ship of `create-vite` today). No backport to 18.
- **Tailwind v4** via `@tailwindcss/vite` plugin. **No** `tailwind.config.js` or `postcss.config.js`. Use `@import "tailwindcss"` in the entry CSS plus an optional `@theme` block for tokens.
- **Path aliases**: `@/*` → `web/src/*` in both `vite.config.ts` (`resolve.alias`) and `tsconfig.json` (`paths`). Every cross-module import in this repo uses the alias.
- **Prettier** with `.prettierrc` (2-space, single quotes, semicolons on, `printWidth: 100`). `npm run format`.
- **No pre-commit hooks** — CI is the gate.
- **`server.host: true`** and **`server.allowedHosts: true`** in `vite.config.ts` (LAN dev + cloudflared tunnel).

## Tasks
- [ ] `web/package.json` with: `react@^19`, `react-dom@^19`, `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss@^4`, `@tailwindcss/vite`, `zustand`, `codemirror`, `@codemirror/lang-cpp`, `@codemirror/state`, `@codemirror/view`, `glsl-parser`, `react-colorful`, `qrcode`, `prettier`, `eslint@^9`.
- [ ] `web/tsconfig.json` (strict mode, `paths: { "@/*": ["src/*"] }`).
- [ ] `web/tsconfig.node.json` for vite config.
- [ ] `web/vite.config.ts` with `@vitejs/plugin-react`, `@tailwindcss/vite`, `resolve.alias { "@": path.resolve(__dirname, "src") }`, `server: { host: true, allowedHosts: true }`.
- [ ] `web/index.html` with `<div id="root">` and `<script type="module" src="/src/main.tsx">`.
- [ ] `web/src/main.tsx` mounts a placeholder `<AppShell />` (real assembly lives in `integration/`).
- [ ] `web/src/index.css` = `@import "tailwindcss";`
- [ ] `web/.prettierrc` per spec above.
- [ ] `web/package.json` scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`.
- [ ] CI passes (already wired in `.github/workflows/ci.yml`).

## Acceptance
- `cd web && npm install && npm run dev` opens a page that says "Shaddy" in a Tailwind heading.
- `npm run dev -- --host` makes the page reachable from another device on the same wifi.
- `npm run typecheck` and `npm run build` both green. CI green on `main`.
- The five scaffolded subfolders under `web/src/` and their READMEs are untouched.
'@ | Set-Content -Path (Join-Path $tmp 'i1.md') -Encoding UTF8
gh issue edit 1 --repo $repo --body-file (Join-Path $tmp 'i1.md') | Out-Null
Write-Host "Edited issue #1"

# ───────── Issue #2: Backend skeleton ─────────
@'
**Owner:** zajalist

Stand up the backend so ML work has a place to land. No model yet — just the skeleton.

## Decisions locked from the grilling session
- **Python 3.11** (matches CI; safest wheel availability across Modal + macOS + Linux).
- **Two requirements files:**
  - `requirements.txt` — CPU torch wheel. Default install. CI uses this. New contributors use this.
  - `requirements-gpu.txt` — `--extra-index-url https://download.pytorch.org/whl/cu121` + the matching torch/torchvision wheels. Devs with a local GPU and the Modal deploy use this.
- **CORS allowlist:** `http://localhost:5173`, regex-allow `http://*:5173` for LAN dev, `https://*.trycloudflare.com` for the camera tunnel, plus the prod frontend origin via env var.
- `make dev` binds to `0.0.0.0:8000` so phones on LAN can hit it.

## Tasks
- [ ] `backend/requirements.txt` with: `fastapi`, `uvicorn[standard]`, `websockets`, `torch==<cpu-pin>`, `torchvision==<cpu-pin>`, `lpips`, `pillow`, `numpy`, `pytest`.
- [ ] `backend/requirements-gpu.txt` with the `--extra-index-url` line and matching CUDA torch/torchvision pins. Comment at top: "Run AFTER `pip install -r requirements.txt` to swap to GPU wheels."
- [ ] `backend/app/main.py` with `GET /health` returning `{"ok": true, "device": <"cuda"|"cpu">}` (echoes detected device for sanity).
- [ ] CORS middleware with the allowlist above (use `allow_origin_regex` for LAN + cloudflared).
- [ ] `backend/Makefile`: `make dev` → `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.
- [ ] `backend/README.md` adds a "GPU setup" section (`pip install -r requirements-gpu.txt`) and a "Phone testing" section (`cloudflared tunnel --url http://localhost:5173` + `--url http://localhost:8000` if needed).
- [ ] CI runs `pytest -q` against `requirements.txt` (CPU torch). No tests required yet — empty `tests/` is fine.

## Acceptance
- `make dev` serves `http://localhost:8000/health` → `{"ok": true, "device": "cpu" | "cuda"}`.
- A phone on the same wifi can `curl http://<laptop-LAN-IP>:8000/health` and see the same JSON.
- CI green on `main`.
'@ | Set-Content -Path (Join-Path $tmp 'i2.md') -Encoding UTF8
gh issue edit 2 --repo $repo --body-file (Join-Path $tmp 'i2.md') | Out-Null
Write-Host "Edited issue #2"

# ───────── Issue #3: ESLint module boundaries ─────────
@'
**Owners:** both

Enforce the dependency direction in `CONTRACTS.md` so isolation doesn't silently rot.

## Decisions locked from the grilling session
- **ESLint v9 flat config** (`web/eslint.config.js`).
- **No plugin** — use core ESLint `no-restricted-imports` with glob patterns matched against the `@/*` path aliases. Avoids `eslint-plugin-boundaries`/`eslint-plugin-import` install + version-compat headaches.
- Pattern syntax: `@/renderer` is allowed (the public surface), `@/renderer/*` is forbidden from outside `renderer/` (the internals).

## Rules (per CONTRACTS.md "Dependency direction" diagram)
- `web/src/renderer/**` may NOT import from `@/editor*`, `@/ux*`, `@/integration*`.
- `web/src/editor/**` may NOT import from `@/renderer*`, `@/ux*`, `@/integration*`.
- `web/src/ux/**` may NOT import from `@/integration*`. May import from `@/renderer`, `@/editor`, `@/shared` (entry-point only, NOT `@/renderer/*` deep paths).
- `web/src/integration/**` may import from anything.
- Nothing else may import from `@/integration*`.
- Inside any module, deep imports into a SIBLING module (`@/<other>/internal/path`) are forbidden everywhere.

## Concrete rule shape (sketch)
```js
// eslint.config.js
{
  files: ['src/renderer/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: ['@/editor*', '@/ux*', '@/integration*']
    }]
  }
}
// + analogous blocks for editor, ux, and a "no deep sibling imports" rule that
// blocks "@/renderer/*" etc. from everywhere except the matching module's own files.
```

## Tasks
- [ ] `web/eslint.config.js` flat config with the four module override blocks.
- [ ] `npm run lint` wired in `package.json` and CI.
- [ ] Add one **deliberate violation** in a PR branch to confirm CI fails with a readable "import restricted by pattern" message. Revert before merge.

## Acceptance
- A PR that does `import { foo } from "@/renderer/gl/internal"` from `ux/` fails CI with a clear message.
- A PR that does `import { createRenderer } from "@/renderer"` from `ux/` passes.
'@ | Set-Content -Path (Join-Path $tmp 'i3.md') -Encoding UTF8
gh issue edit 3 --repo $repo --body-file (Join-Path $tmp 'i3.md') | Out-Null
Write-Host "Edited issue #3"

# ───────── Issue #25: POST /optimize handler ─────────
@'
**Owner:** zajalist
**Contract:** §3 REST (now includes `device` field)

## Tasks
- [ ] Validate request body:
  - `template_id` is one of the 3 known ids.
  - `image_base64` decodes and is ≤ 1 MB.
  - `device` (optional, default `"auto"`) is one of `"auto" | "cuda" | "cpu"`.
- [ ] Resolve device:
  - `"auto"` → `torch.cuda.is_available() ? "cuda" : "cpu"`.
  - `"cuda"` when not available → **400** `{"error": "cuda requested but unavailable"}`.
  - `"cpu"` → forced CPU even if GPU present.
- [ ] Allocate a `job_id` (uuid4).
- [ ] Store job in an in-memory registry `{job_id -> JobState{ ..., resolved_device }}`. (No DB.)
- [ ] Respond **202** with `{ job_id, ws_url, resolved_device }`.
- [ ] On invalid input, respond 4xx with `{error}`.

## Acceptance
- POST with a real PNG returns 202 + job_id + resolved_device.
- POST with an unknown template_id returns 400.
- POST with `device: "cuda"` on a CPU-only box returns 400 with the cuda-unavailable message.
- POST with `device: "cpu"` on a GPU box returns 202 with `resolved_device: "cpu"`.
'@ | Set-Content -Path (Join-Path $tmp 'i25.md') -Encoding UTF8
gh issue edit 25 --repo $repo --body-file (Join-Path $tmp 'i25.md') | Out-Null
Write-Host "Edited issue #25"

# ───────── Issue #33: CPU fallback ─────────
@'
**Owner:** zajalist

The production-readiness pass. Without these, the demo dies if wifi or the GPU times out.

## Tasks
- [ ] **Gate fallback on resolved device, not just availability.** If the job's resolved device (from issue #25) is `cpu`, downsample target to 64×64 and cap to 200 steps. Log a warning. This fires whether the user picked `"cpu"` explicitly or `"auto"` resolved to CPU.
- [ ] Hard wall-clock cap at 30s — return whatever the best result so far is.
- [ ] `backend/scripts/mock_server.py` — streams pre-recorded frames over WS for UX teammates without a GPU. Same `OptimizeFrame` schema. Honors the `device` field in requests (mock just echoes it).
- [ ] Modal (or Replicate) deploy config + a README section on how to update it. Deploy uses `requirements-gpu.txt`.
- [ ] Document the URL UX should point `VITE_BACKEND_URL` at.

## Acceptance
- `python scripts/mock_server.py` runs locally and serves the same wire format as the real server.
- A deployed instance answers `GET /health` over HTTPS with `device: "cuda"`.
- An explicit `device: "cpu"` request on a GPU deploy still runs at 64×64.
'@ | Set-Content -Path (Join-Path $tmp 'i33.md') -Encoding UTF8
gh issue edit 33 --repo $repo --body-file (Join-Path $tmp 'i33.md') | Out-Null
Write-Host "Edited issue #33"

# ───────── New issue: Settings panel with Device toggle ─────────
@'
**Owner:** AndyHanDev (UX)
**Contract:** §3 — `device` field on `POST /optimize`

A small settings menu (gear icon in the top bar) where the user picks the optimization device.

## Tasks
- [ ] Gear icon in the top bar opens a popover/menu.
- [ ] One control: `Device: [Auto | GPU | CPU]` radio (or segmented control).
- [ ] Persist choice in `localStorage` (`shaddy:device`).
- [ ] Default is `Auto`.
- [ ] Every `optimizePhoto(file, templateId)` call reads the current setting and passes it as the `device` field in the `POST /optimize` body. (Implementation lives in `integration/backend-client.ts` — UX just calls the function with the setting.)
- [ ] When the optimize response comes back with `resolved_device` that differs from the requested device (e.g., `"auto"` → `"cpu"`), show a small banner in the progress modal: "Running on CPU (slow)" or "Running on GPU".
- [ ] If the backend returns 400 `cuda requested but unavailable`, show a toast and gracefully fall back to `"auto"` for the retry.

## Acceptance
- Toggling to `CPU` and running photo→shader sends `device: "cpu"` in the request and the progress modal shows "Running on CPU (slow)".
- Toggling to `GPU` on a deploy without CUDA shows the error toast and offers a one-click "Use Auto instead".
- Setting persists across reloads.
'@ | Set-Content -Path (Join-Path $tmp 'new-settings.md') -Encoding UTF8
gh issue create --repo $repo `
  --title "[ux] Settings panel: Device toggle (Auto / GPU / CPU)" `
  --body-file (Join-Path $tmp 'new-settings.md') `
  --assignee AndyHanDev `
  --label "track:ux-mobile" --label "tier:1" --label "contract" | Out-Null
Write-Host "Created new Settings issue"

Write-Host "`nAll edits applied."
