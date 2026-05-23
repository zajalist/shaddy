# CONTRACTS

The four tracks are physically isolated under `web/src/{renderer,editor,ux}/` and `backend/`. They only meet through the interfaces in this file. **No module imports from a sibling module's internals.** If you need something across a seam, propose a contract change here and get a sign-off from the other owner before merging.

This file is the law. The `web/src/integration/` folder is the only place those seams are wired up.

---

## 1. Renderer ↔ everyone

**Module:** `web/src/renderer/`
**Owner:** andyhandev
**Public surface:** `web/src/renderer/index.ts`

```ts
// web/src/renderer/index.ts — DO NOT IMPORT ANYTHING ELSE FROM renderer/

export type CompileResult =
  | { ok: true }
  | { ok: false; errors: GLSLError[] };

export type GLSLError = {
  line: number;       // 1-based, in user source coordinates (not wrapped)
  column: number;
  message: string;
};

export type Uniform =
  | { kind: 'float'; value: number }
  | { kind: 'vec2'; value: [number, number] }
  | { kind: 'vec3'; value: [number, number, number] }
  | { kind: 'vec4'; value: [number, number, number, number] };

export interface RendererAPI {
  /** Attach the WebGL canvas to a host element. Idempotent. */
  mount(host: HTMLElement): void;

  /** Compile a new fragment shader. Hot-swaps on success; keeps last good on failure. */
  compile(fragmentSource: string): CompileResult;

  /** Set or clear a named uniform. Persists across compiles. */
  setUniform(name: string, value: Uniform | null): void;

  /** Resize the drawing buffer. Caller decides device-pixel-ratio policy. */
  resize(width: number, height: number): void;

  /** Read back the current frame as PNG data URL. For thumbnails & share preview. */
  snapshot(): Promise<string>;

  /** Subscribe to compile events. Useful for UX surfaces that show errors. */
  onCompile(cb: (r: CompileResult) => void): () => void;

  /** Frame-per-second over the last second. UX shows it on debug. */
  getFps(): number;
}

export function createRenderer(): RendererAPI;
```

**Standard uniforms the renderer wires automatically** (caller does not set these):
- `u_time` — seconds since first mount, float.
- `u_resolution` — vec2, drawing buffer size.
- `u_mouse` — vec2, normalized 0..1 from `mount` host's pointer/touch.

**Lens stack add-on** (Tier 2, additive — does not break the above):
```ts
export interface LensStackAPI {
  /** Render the same shader N times, each time discarding after line K. */
  capture(fragmentSource: string, breakLines: number[]): Promise<string[]>; // PNG data URLs
}
export function createLensStack(): LensStackAPI;
```

**Test harness the renderer provides for downstream consumers:**
- `web/src/renderer/__mocks__/renderer.ts` — drop-in `RendererAPI` that renders a CSS gradient. Lets the editor + UX teams build without WebGL.

---

## 2. Editor ↔ everyone

**Module:** `web/src/editor/`
**Owner:** zajalist
**Public surface:** `web/src/editor/index.ts`

```ts
// web/src/editor/index.ts — DO NOT IMPORT ANYTHING ELSE FROM editor/

export type LiteralKind = 'float' | 'int' | 'vec3-color';

export type LiteralHandle = {
  id: string;              // stable across edits within the same AST shape
  kind: LiteralKind;
  loc: { start: number; end: number; line: number; column: number };
  value: number | [number, number, number];
};

export type PatternHandle =
  | { kind: 'circle'; cx: LiteralHandle; cy: LiteralHandle; r?: LiteralHandle }
  | { kind: 'color'; rgb: LiteralHandle }
  | { kind: 'smoothstep'; a: LiteralHandle; b: LiteralHandle };

export interface EditorProps {
  source: string;
  onSourceChange(next: string): void;
  errors?: import('../renderer').GLSLError[];
  onPatternsChange?(handles: PatternHandle[]): void;
}

export function EditorPane(props: EditorProps): JSX.Element;

/** Pure functions — no editor state. UX uses these for canvas-side handles. */
export function parse(src: string): Ast;
export function findLiterals(ast: Ast): LiteralHandle[];
export function findPatterns(ast: Ast): PatternHandle[];

/** Mutation: returns the new source. Source is the single source of truth. */
export function replaceLiteral(src: string, handleId: string, newValue: number | [number, number, number]): string;

export type Ast = unknown; // opaque to consumers
```

**Hard rules for this seam:**
- The source string is the single source of truth. There is no separate "handle state". Drag = mutate source = re-emit.
- The editor never imports the renderer. It receives `errors[]` as props.
- The editor never imports the backend. UX is the only thing that knows the backend exists.

**Test harness:**
- `web/src/editor/__mocks__/editor.ts` — a textarea that calls `onSourceChange`. Lets renderer + UX teams build without CodeMirror.

---

## 3. ML Backend ↔ UX

**Module:** `backend/`
**Owner:** zajalist
**Public surface:** HTTP + WebSocket. Schema declared in `backend/openapi.yaml` and mirrored to `web/src/shared/backend-types.ts`.

### REST

```
POST /optimize
Content-Type: application/json

Request:
{
  "template_id": "plasma" | "voronoi-cells" | "gradient-noise",
  "image_base64": "data:image/png;base64,...",   // ≤ 1 MB
  "device": "auto" | "cuda" | "cpu",             // optional, default "auto"
  "max_steps": 500,                              // optional, server caps at 500
  "wall_clock_cap_sec": 30                       // optional, server enforces
}

Response 202:
{
  "job_id": "uuid",
  "ws_url": "/optimize/stream/{job_id}",         // relative
  "resolved_device": "cuda" | "cpu"              // what the server actually chose
}

Response 4xx: { "error": "human readable" }
```

**`device` semantics:**
- `"auto"` (default) — server uses `cuda` if `torch.cuda.is_available()`, else `cpu`.
- `"cuda"` — explicit. If not available, return **400** `{"error": "cuda requested but unavailable"}`.
- `"cpu"` — explicit. Forces CPU even if a GPU is present.
- `resolved_device` is echoed so the UX can show "Running on GPU" / "Running on CPU (slow)".

### WebSocket — `/optimize/stream/{job_id}`

Server → client messages (JSON, one per frame):
```ts
type OptimizeFrame =
  | { type: 'progress'; step: number; total: number; loss: number; preview_b64: string }
  | { type: 'done'; final_params: Record<string, number | number[]>; glsl: string; loss: number }
  | { type: 'error'; message: string };
```

`preview_b64` is a 256×256 **JPEG quality 85** (data URL prefix included). 10× smaller payload than PNG over flaky wifi; visually indistinguishable at preview scale. `glsl` is the final template with literals filled — drop straight into the renderer.

**Image format on the request side** (`image_base64`): accept anything PIL can parse — PNG, JPEG, WebP. The client is responsible for downscaling images >1MB to ≤1024px on the longest side before sending; the server rejects anything still >1MB with **400** after base64 decode.

**Failure behavior the UX must handle:**
- Connection drops → reconnect once, then surface "demo backup video" affordance.
- `error` frame → toast + offer pre-recorded backup.
- No frames for 5s → treat as stalled, show progress spinner becoming a warning.

**Local-dev contract:** `backend/Makefile` `make dev` runs at `http://0.0.0.0:8000`. UX reads `VITE_BACKEND_URL` and falls back to `http://localhost:8000`.

**CORS allowlist** (server side):
- `http://localhost:5173` — desktop dev.
- `http://*:5173` (regex match on LAN IPs) — phone-on-same-wifi dev via `vite --host`.
- `https://*.trycloudflare.com` — cloudflared quick tunnel (only way to test iOS camera, since `getUserMedia` requires HTTPS).
- The deployed frontend origin (set via env var on the backend in prod).

**Test harness:** `backend/scripts/mock_server.py` — pure-Python WebSocket that streams pre-recorded frames. UX team uses it on machines without a GPU.

---

## 4. UX ↔ Integration

**Module:** `web/src/ux/`
**Owner:** andyhandev
**Public surface:** `web/src/ux/index.ts`

```ts
// web/src/ux/index.ts

export function AppShell(props: {
  renderer: import('../renderer').RendererAPI;
  editorSource: string;
  onEditorSourceChange(next: string): void;
  errors: import('../renderer').GLSLError[];
  onPhotoMatch(file: File, templateId: string): Promise<void>;
}): JSX.Element;

/** URL-hash share format. Stable, versioned. Bumps require both owners' review. */
export function encodeShareUrl(state: { source: string; uniforms?: Record<string, number> }): string;
export function decodeShareUrl(url: string): { source: string; uniforms?: Record<string, number> } | null;
```

UX is the *only* module allowed to import from `renderer/`, `editor/`, and `shared/backend-types`. It assembles them. That's what makes it the integration layer for the frontend.

---

## 5. Integration

**Module:** `web/src/integration/`
**Owners:** both

This is where:
- `App.tsx` instantiates `createRenderer()`, holds the source string in Zustand, passes everything into `<AppShell>`.
- `main.tsx` mounts to `#root`.
- The backend WebSocket client lives. UX calls a single `optimizePhoto(file, templateId, onFrame)` function exported from `integration/backend-client.ts` — it knows the backend wire format; UX does not.

`integration/` may import from anywhere. Every other module may NOT import from `integration/`.

---

## Dependency direction (enforce mentally; later via ESLint)

```
integration/  ─────────┐
   │  │  │             │
   ▼  ▼  ▼             ▼
ux/  editor/  renderer/  shared/

backend/  (separate process, talks via HTTP/WS only)
```

Arrows point to modules that may be imported. Anything that draws an arrow the wrong way is a bug.

---

## Changing this file

1. Open a PR that touches `CONTRACTS.md` AND the code that implements the change.
2. Tag both `@andyhandev` and `@zajalist` for review.
3. Update any mock harness so the other tracks don't immediately break.
4. Land it in one merge.
