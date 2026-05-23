# CONTRACTS

The four tracks are physically isolated under `web/src/{renderer,editor,cards,ux}/`. They only meet through the interfaces in this file. **No module imports from a sibling module's internals.** If you need something across a seam, propose a contract change here and get a sign-off from the other owner before merging.

This file is the law. The `web/src/integration/` folder is the only place those seams are wired up.

> The product is now **frontend-only**. The ML backend (`POST /optimize`, WS streaming, PyTorch optimizer) has been cut — photo-match is deferred. See [`docs/decisions/2026-05-23-frontend-only.md`](./docs/decisions/2026-05-23-frontend-only.md) and the "Deferred" callout in [`SPEC.md`](./SPEC.md).

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
- The editor never imports `integration/` — that's the seam, and seams are one-way.

**Test harness:**
- `web/src/editor/__mocks__/editor.ts` — a textarea that calls `onSourceChange`. Lets renderer + UX teams build without CodeMirror.

---

## 3. Cards ↔ everyone

**Module:** `web/src/cards/`
**Owner:** andyhandev
**Public surface:** `web/src/cards/index.ts`

The card system: the Recipe (ordered list of typed Cards + Wildcards), a Recipe→GLSL compiler, and a reverse parser that maps user edits in the compiled GLSL back to recipe deltas. The Recipe is the **source of truth** for what's on the canvas; everything else is a projection.

```ts
// web/src/cards/index.ts — DO NOT IMPORT ANYTHING ELSE FROM cards/

export type Recipe = {
  cards: Card[];
  canvasAspect: 'square' | 'portrait' | 'landscape';
};

export type Card = TypedCard | WildcardCard;

export type TypedCard = {
  kind: 'typed';
  id: string;
  type: string;                          // matches a CardDef.type
  enabled: boolean;
  params: Record<string, Parameter>;
};

export type WildcardCard = {
  kind: 'wildcard';
  id: string;
  enabled: boolean;
  rawSource: string;                     // raw GLSL emitted verbatim
  displayName: string | null;            // first line-comment in rawSource
};

export type Parameter = {
  value: number | readonly [number, number, number];
  animation: null;                       // PR #2 fills this in
};

// ─── Compile (Recipe → GLSL) ───────────────────────────────────────
export type CompiledShader = {
  glsl: string;                          // fragment-shader BODY only;
                                         // renderer.wrapFragmentSource adds
                                         // the standard preamble
  spans: Span[];                         // one per card, body-relative lines
  uniforms: UniformBinding[];            // for renderer.setUniform per tick
};

export function compile(recipe: Recipe): CompiledShader;

// ─── Reverse parse (GLSL edit → Recipe delta) ───────────────────────
export function reparse(
  prevRecipe: Recipe,
  prevCompiled: CompiledShader,
  nextSource: string,
): ReparseResult;

// ─── React surface ─────────────────────────────────────────────────
export function CardStack(props: { onEditCode: (cardId: string) => void }): JSX.Element;
export function CodeView(props: CodeViewProps): JSX.Element;

// ─── Library + starters ────────────────────────────────────────────
export const CARD_LIBRARY_LIST: CardDef[];
export const STARTER_RECIPES: StarterRecipe[];

// + types: ColorRgb, CardCategory, ParamDef, CardDef, Span, UniformBinding,
//          ReparseEvent, ReparseResult, CodeViewHandle, CodeViewProps,
//          CardsState, StarterRecipe
// + helpers: lookupCardDef, useCardsStore, cloneRecipeWithFreshIds,
//            generateCardId, isColor, formatParameterForDisplay,
//            formatParameterAsGlslLiteral, normalizeGlsl, validateRecipe,
//            uniformNameFor, MARKER_PREFIX, END_MARKER
```

**Hard rules:**
- The Recipe is the source of truth. The compiled GLSL is a projection.
- The compiler emits the **fragment body** only; `renderer.wrapFragmentSource()` adds the standard preamble (`#version`, `precision`, standard uniform decls, `out vec4 fragColor`). Code-view consumers wrap with `FRAGMENT_PREAMBLE` to show the user the full source.
- `compile(recipe)` is byte-deterministic for any given recipe (modulo marker comments showing live param values).
- `reparse()` is **pattern-tolerant** — adding comments / reflowing whitespace inside a card span does NOT mutate the recipe; any structural change does (typed card → wildcard).
- Cards may import `@/editor` (entry only) for AST helpers (`findPatternsFromAst`). Cards may NOT import `@/renderer`, `@/ux`, or `@/integration` — the renderer is consumed by the integration layer, which then feeds compiled GLSL + uniforms to the renderer.

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
}): JSX.Element;

/** URL-hash share format. Stable, versioned. Bumps require both owners' review. */
export function encodeShareUrl(state: { source: string; uniforms?: Record<string, number> }): string;
export function decodeShareUrl(url: string): { source: string; uniforms?: Record<string, number> } | null;
```

UX is the module that composes `renderer/` and `editor/` into a UI. That's what makes it the integration layer for the frontend.

---

## 5. Integration

**Module:** `web/src/integration/`
**Owners:** both

This is where:
- `App.tsx` / `AppShell.tsx` instantiates `createRenderer()`, holds the source string in Zustand, passes everything into the UX shell.
- `main.tsx` mounts to `#root`.

`integration/` may import from anywhere. Every other module may NOT import from `integration/`.

---

## Dependency direction (enforced by ESLint — see `web/eslint.config.js`)

```
integration/  ───────────────┐
   │  │  │  │                │
   ▼  ▼  ▼  ▼                ▼
ux/  cards/  editor/  renderer/  shared/
       │
       └── may import @/editor entry (for AST helpers)
```

Arrows point to modules that may be imported. Anything that draws an arrow the wrong way is a bug.

---

## Changing this file

1. Open a PR that touches `CONTRACTS.md` AND the code that implements the change.
2. Tag both `@andyhandev` and `@zajalist` for review.
3. Update any mock harness so the other tracks don't immediately break.
4. Land it in one merge.
