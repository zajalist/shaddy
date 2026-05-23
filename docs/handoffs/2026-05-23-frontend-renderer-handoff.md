# Handoff: Frontend setup + Renderer track

> **For the receiving Claude agent.** Read this whole file before doing anything. Everything you need is here or linked from here.

## What you're building

The **WebGL2 renderer module + the frontend toolchain it lives in** for *Shaddy* — a learning environment for GLSL shader art.

You will ship 11 GitHub issues, all on the `track:renderer` + the foundational setup issue. By the time you're done, the renderer module is importable, the canvas paints a hardcoded shader at 60fps, all 12 starter templates render, and the editor track has a mock harness to build against.

You are NOT touching: backend (Python — owned by zajalist, in progress in branch `backend/skeleton`), editor module, UX module, or integration glue. The boundary rules are enforced — see "Module isolation" below.

## Identity for commits

You are acting on behalf of **AndyHanDev** (GitHub `AndyHanDev`).
Commit author convention:
```powershell
git -c user.email=<andy's email> -c user.name=AndyHanDev commit -m "..."
```
If you don't know Andy's email, use `andyhandev@users.noreply.github.com` (GitHub's noreply form), and the human can fix later.

## Repo + branch

- Clone: `https://github.com/zajalist/shaddy`
- Base branch: **`main`** (NOT `backend/skeleton` — that's zajalist's parallel work).
- Your branch: **`frontend/renderer-skeleton`**.
- When done: push, open a PR back to `main`. **Do not merge yourself** — the human reviews and merges.

```powershell
git clone https://github.com/zajalist/shaddy
cd shaddy
git checkout -b frontend/renderer-skeleton
```

## Read these first (~10 min)

1. **`README.md`** — the brand and the tracks.
2. **`SPEC.md`** — full product spec.
3. **`CONTRACTS.md`** — **the law.** The four isolation seams. Pay particular attention to **§1 (Renderer)** which is what you're implementing.
4. **`web/src/renderer/README.md`** — module-level pointers.

Skim, don't memorize — refer back as you work.

## What zajalist is doing right now (so you don't collide)

zajalist is on branch `backend/skeleton`, implementing sub-project A: FastAPI skeleton + POST `/optimize` + WS `/optimize/stream/{id}` (stub DoneFrame). When that branch merges, you'll see:

- New files under `backend/`
- `backend/openapi.yaml`
- **`web/src/shared/backend-types.ts`** ← created by zajalist's branch.

**Do not create `web/src/shared/backend-types.ts` yourself.** If you need it before the backend branch lands, leave a placeholder reference. After both branches merge, it will exist.

You will not touch:
- `backend/**`
- `web/src/shared/backend-types.ts`
- `CONTRACTS.md` §3 (backend contract)

You can touch CONTRACTS.md §1 (renderer) if the contract evolves while you implement, but coordinate via the PR — same rule applies to anyone editing CONTRACTS.md.

## Your scope (11 issues)

| # | Issue | Tier | Note |
|---|---|---|---|
| #1 | [setup] Scaffold Vite + React + TS + Tailwind in web/ | 1 | **Do this first** — unblocks everything. |
| #4 | [renderer][contract] Publish renderer/index.ts skeleton | 1 | **Second priority.** Publish the public surface so editor + UX teams can write against it. |
| #5 | [renderer] WebGL2 context + fullscreen quad | 1 | |
| #6 | [renderer] Shader compile + hot-swap; keep last-good on failure | 1 | |
| #7 | [renderer] GLSL error parsing → {line, column, message} | 1 | |
| #8 | [renderer] Standard uniforms: u_time, u_resolution, u_mouse | 1 | |
| #9 | [renderer] Implement setUniform / resize / snapshot / onCompile / getFps | 1 | |
| #10 | [renderer] Template library: 12 starter shaders + manifest | 1 | |
| #11 | [renderer] Mock harness: CSS-gradient stand-in for RendererAPI | 1 | **Critical** — editor + UX teams depend on this. |
| #12 | [renderer][tier-2] Lens stack capture API | 2 | Tier 2 — ship if there's time. |
| #13 | [renderer] Mobile perf: cap canvas resolution + FPS guardrails | 1 | |

URLs: each is `https://github.com/zajalist/shaddy/issues/<N>`.

The body of every issue has detailed acceptance criteria and any locked-in decisions (e.g., issue #1 has the full locked-in setup decisions from a previous grilling session).

## Setup decisions already locked (don't re-litigate)

From a prior grilling session — these are baked into the issue bodies but flagging here so you don't waste time exploring alternatives:

- **Single Vite app** (no monorepo/workspaces). Folder isolation only.
- **npm** (not pnpm/yarn/bun).
- **Hand-write the configs** — do NOT run `npm create vite@latest` — `web/` already has `src/{renderer,editor,ux,integration,shared}/` scaffolded with READMEs. `create vite` would clobber them.
- **React 19** (default ship of create-vite today).
- **Tailwind v4** (`@tailwindcss/vite` plugin, no `tailwind.config.js`).
- **Path aliases:** `@/*` → `web/src/*` in both `vite.config.ts` (`resolve.alias`) and `tsconfig.json` (`paths`).
- **Prettier** with `.prettierrc` (2-space, single quotes, semicolons on, `printWidth: 100`).
- **No pre-commit hooks**.
- **Vite `server.host: true`** and **`server.allowedHosts: true`** (for LAN dev + cloudflared tunnel).
- **ESLint v9 flat config** + native `no-restricted-imports` rule against the `@/*` aliases (per CONTRACTS.md dependency direction).

## Module isolation rules (FROM `CONTRACTS.md`)

- `web/src/renderer/**` may NOT import from `@/editor*`, `@/ux*`, `@/integration*`.
- Renderer exports ONLY through `web/src/renderer/index.ts`. No deep imports allowed from outside.
- Renderer must NOT import from the backend types (`@/shared/backend-types`). It speaks only in its own types.

ESLint issue #3 will enforce this — set it up early.

## Renderer public surface (verbatim from CONTRACTS.md §1)

```ts
export type CompileResult =
  | { ok: true }
  | { ok: false; errors: GLSLError[] };

export type GLSLError = { line: number; column: number; message: string };

export type Uniform =
  | { kind: 'float'; value: number }
  | { kind: 'vec2'; value: [number, number] }
  | { kind: 'vec3'; value: [number, number, number] }
  | { kind: 'vec4'; value: [number, number, number, number] };

export interface RendererAPI {
  mount(host: HTMLElement): void;
  compile(fragmentSource: string): CompileResult;
  setUniform(name: string, value: Uniform | null): void;
  resize(width: number, height: number): void;
  snapshot(): Promise<string>;
  onCompile(cb: (r: CompileResult) => void): () => void;
  getFps(): number;
}

export function createRenderer(): RendererAPI;
```

Standard uniforms the renderer wires automatically (caller does not set):
- `u_time` (float, seconds since first mount)
- `u_resolution` (vec2, drawing buffer size)
- `u_mouse` (vec2, normalized 0..1 from `mount` host's pointer/touch events)

Lens stack (tier 2, additive):
```ts
export interface LensStackAPI {
  capture(fragmentSource: string, breakLines: number[]): Promise<string[]>;
}
export function createLensStack(): LensStackAPI;
```

Mock harness (issue #11):
- File: `web/src/renderer/__mocks__/renderer.ts`
- Exports a `createRenderer()` that paints a CSS gradient instead of using WebGL.
- `compile()` always returns `{ ok: true }`.
- Lets editor + UX teams build before WebGL is in.

## Suggested order of operations

1. Read all the linked docs (10 min).
2. **Issue #1** — scaffold the toolchain. End state: `npm run dev` opens a Tailwind hello-world page. Commit.
3. **Issue #4** — publish stubbed `renderer/index.ts` matching CONTRACTS.md §1. All methods throw "not implemented" but typecheck. Commit.
4. **Issue #11 (mock harness)** — out of order, but the editor + UX teams need it. Half an hour. Commit.
5. Issues #5, #6, #7, #8, #9, #13 — the real renderer, in any order that makes sense.
6. **Issue #10** — 12 starter templates. Coordinate `plasma`, `voronoi-cells`, `gradient-noise` shapes with whatever's currently in `backend/templates/*.glsl` once the backend branch lands (these need matching params for sub-project B).
7. **Issue #12 (lens stack)** — tier 2; only if time permits.

## Workflow

```dot
For each issue:
  1. Read the issue body + the relevant CONTRACTS.md section.
  2. Make the change. Keep commits small + frequent.
  3. `npm run typecheck` + `npm run lint` green.
  4. Test in browser at http://localhost:5173 (and on a phone via `npm run dev -- --host` when relevant).
  5. Push.
  6. Optionally: comment on the issue with a status update.

Final step:
  7. Open one PR for the whole branch back to main.
     `gh pr create --base main --head frontend/renderer-skeleton ...`
     Body should list every issue closed with "Closes #N".
```

## Acceptance criteria for the whole handoff

- A fresh checkout + `cd web && npm install && npm run dev` shows a Tailwind page.
- The renderer's public surface (`web/src/renderer/index.ts`) matches CONTRACTS.md §1 exactly.
- All 12 templates render. Voronoi and plasma at 60fps on desktop, ≥45fps on a mid-range phone (test if you can).
- `import { createRenderer } from "@/renderer"` typechecks from another file.
- The mock harness at `web/src/renderer/__mocks__/renderer.ts` is drop-in compatible.
- ESLint module-boundary rule (issue #3) catches `import { foo } from "@/renderer/gl/internal"` from outside the renderer folder.
- All 11 tier-1 issues closed by the PR. Issue #12 (tier 2) optional.
- CI green on the branch (.github/workflows/ci.yml runs typecheck + lint).

## Things to flag back to the human

If you hit any of these, stop and ask:
- A contract change you want to make (touching CONTRACTS.md §1).
- A template parameter shape that doesn't match what `backend/templates/defaults.json` will expect.
- Browser support issue (e.g., WebGL2 not available on a target).
- Anything that requires editing `backend/**` or `web/src/shared/backend-types.ts` (those are zajalist's).

Do NOT:
- Merge your PR yourself.
- Force-push to `main`.
- Touch `backend/**`.
- Run `npm create vite` (clobbers scaffolded folders).

## Quick reference

- **Spec:** `SPEC.md` and `docs/superpowers/specs/2026-05-23-backend-skeleton-design.md` (mostly backend, but the data-flow diagram shows where renderer sits).
- **Contracts:** `CONTRACTS.md`.
- **Plans/specs convention:** if you write any, put them in `docs/superpowers/{specs,plans}/YYYY-MM-DD-<topic>.md`.
- **CI:** `.github/workflows/ci.yml` already runs typecheck + lint.
- **Issue tracker:** https://github.com/zajalist/shaddy/issues — filter by `label:track:renderer` to see only what's yours.
- **The other side's work (for context only — DON'T MODIFY):**
  - `backend/` — zajalist, branch `backend/skeleton`.
  - `docs/superpowers/specs/2026-05-23-backend-skeleton-design.md` — the spec for what's currently shipping in parallel.

Good luck. The renderer is the foundation everyone else is going to stand on — ship the public surface and the mock harness early so the rest of the team can build against them.
