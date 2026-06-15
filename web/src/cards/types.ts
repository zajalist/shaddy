// Cards module — the authoring model + its compiled-shader representation.
// See CONTRACTS.md §3 (Cards) for the locked public surface; only this file
// and ./markers.ts ./compile.ts ./reparse.ts ./library/* are re-exported
// from ./index.ts.

// ─── Recipe ─────────────────────────────────────────────────────────────

/** The Recipe is the source of truth. The emitted GLSL is a *projection*. */
export type Recipe = {
  /** The image pass cards — what renders to screen. Kept at the top level for
   *  full back-compat with single-pass readers across the app. When
   *  `passes` is set, this stays in sync with the image entry inside it. */
  cards: Card[];
  canvasAspect: 'square' | 'portrait' | 'landscape';
  /** Compiler dispatch flag. '2d' (default, omitted in old recipes) emits the
   *  classic uv/d/col fragment template. '3d' emits a raymarched SDF scene
   *  with Lambert + soft shadow shading; only cards with mode:'3d' contribute
   *  meaningfully (2d cards become no-ops). Old Recipe JSON without this
   *  field is treated as '2d'. */
  mode?: ShaderTemplate;
  /** OPTIONAL extra buffer passes (A/B/C/D). The image pass is implicit and
   *  always present — it's the top-level `cards` array. Buffer passes render
   *  to offscreen FBOs in alphabetical order BEFORE the image pass, and can
   *  sample each other (or themselves, ping-pong) via the
   *  `sample_buffer_{a,b,c,d}` cards. Omit the field for a single-pass
   *  recipe (the back-compat default). */
  passes?: Pass[];
  /** OPTIONAL user-built animation chains. Each is a reusable scalar signal a
   *  param can bind to via `animation: { type: 'custom', ref: <id> }`. Shared
   *  across all passes. Omit when no custom animations exist. See AnimChain. */
  animations?: AnimChain[];
};

/** One render pass in a multi-pass recipe. The image pass is always present
 *  (sourced from `Recipe.cards`); buffer passes A/B/C/D are added via the
 *  chain-tabs UI and stored in `Recipe.passes`. */
export type Pass = {
  id: PassId;
  name: string;
  cards: Card[];
  mode?: ShaderTemplate;
};

/** Pass identifier. 'image' is the final-to-screen pass; 'a'..'d' are
 *  offscreen FBOs that earlier passes write to and later passes can sample. */
export type PassId = 'image' | 'a' | 'b' | 'c' | 'd';

/** Render order for multi-pass: A → B → C → D → Image. Earlier passes write
 *  to their own FBO; later passes can sample any earlier pass's output. */
export const PASS_RENDER_ORDER: readonly PassId[] = ['a', 'b', 'c', 'd', 'image'] as const;

/** Buffer-only pass ids (A-D, no image). */
export const BUFFER_PASS_IDS: readonly Exclude<PassId, 'image'>[] = ['a', 'b', 'c', 'd'] as const;

/** Which shader template the compiler should emit. See Recipe.mode.
 *  'volume' is a volumetric raymarcher built from blocks: a Volume camera sets
 *  the ray, a density-field block emits `volField(p)`, and a Volume march block
 *  accumulates colour through it. Trailing 2D colour/effect cards post-process. */
export type ShaderTemplate = '2d' | '3d' | 'volume';

/** A card is either a typed entry from the CARD_LIBRARY or a wildcard that
 *  carries arbitrary GLSL the system cannot represent as a known card. */
export type Card = TypedCard | WildcardCard;

/** How a card's final `col` is composed against whatever the previous card
 *  produced. 'normal' = standard alpha blend; the rest are classic Porter-Duff
 *  / Photoshop-style RGB ops applied per-channel then alpha-mixed. */
export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen' | 'lighten' | 'darken';

export const BLEND_MODES: readonly BlendMode[] = [
  'normal', 'add', 'multiply', 'screen', 'lighten', 'darken',
] as const;

/** A scoped attribute — another library card attached to a host block whose
 *  GLSL is applied ONLY to that block. By category: distortion attrs
 *  save→mutate→restore the block's `uv`; colour/effect attrs post-process its
 *  `col`; shape attrs combine into its `d`. `type` is a library card type used
 *  as the modifier; `params` override that card's defaults exactly like a
 *  normal card. Optional everywhere for back-compat with pre-attribute JSON. */
export type CardAttribute = {
  id: string;
  type: string;
  enabled: boolean;
  params: Record<string, Parameter>;
};

export type TypedCard = {
  kind: 'typed';
  id: string;
  type: string;
  enabled: boolean;
  params: Record<string, Parameter>;
  /** 0..1, default 1. Stored optional so old Recipe JSON (pre-blend) loads
   *  cleanly; state.ts defaults this at insert time. */
  alpha?: number;
  /** Default 'normal'. Same optional-for-back-compat rule as `alpha`. */
  blendMode?: BlendMode;
  /** Scoped modifier attributes attached to this block. Optional / default
   *  empty so pre-attribute recipes load unchanged. */
  attributes?: CardAttribute[];
  /** Present only on macro cards (`type === 'macro'`). The macro inline-expands
   *  to these sub-blocks at compile time (UE5 material-function style). Carried
   *  on the card so the recipe stays self-contained. */
  macro?: MacroDef;
};

/** A reusable "function" block: a named sequence of blocks that compiles by
 *  inline-expanding to its sub-blocks' GLSL (with their params baked as literal
 *  constants, so the result is self-contained and compressible). */
export type MacroDef = {
  name: string;
  blocks: TypedCard[];
  /** When set, the compiler emits minimal byte-identical GLSL for the macro
   *  body (constant-fold + CSE via the compiler normalizer). */
  compress?: boolean;
  /** Optional curated icon key (see design/macro-icons). Purely cosmetic —
   *  picks the glyph shown for this macro in the palette / canvas / inspector.
   *  Undefined falls back to the default ▣ mark. */
  icon?: string;
};

export type WildcardCard = {
  kind: 'wildcard';
  id: string;
  enabled: boolean;
  /** Raw GLSL between this wildcard's markers. Compiler emits it verbatim. */
  rawSource: string;
  /** First non-empty comment in the rawSource, or null. Becomes the display
   *  name; falls back to "Custom code" in the UI. */
  displayName: string | null;
  alpha?: number;
  blendMode?: BlendMode;
};

export type Parameter = {
  value: ParameterValue;
  /** When set, the param's value is driven per-frame from u_time / u_mouse
   *  instead of being a static uniform. The compiler emits a GLSL local for it
   *  and the endpoints (min/max/speed/…) become live uniforms so they stay
   *  editable. null = a plain static value (the default for every param). */
  animation: Animation | null;
  /** For media-backed params (kind: 'image' | 'video'), the live source the
   *  renderer should sample as a sampler2D. The Recipe.value stays a string
   *  (a data URL for images, an opaque tag like 'webcam' for video) so the
   *  Recipe remains serialisable; the integration layer carries the actual
   *  element across compile cycles via this field. */
  sourceRef?: MediaSourceRef | null;
};

/** Per-parameter animation. Time-driven kinds read `u_time` (seconds since
 *  mount); `mouse` reads `u_mouse`. Endpoints are stored on the Animation (and
 *  emitted as live uniforms) so dragging them is a cheap setUniform, not a
 *  recompile. float-valued: sine | pulse | noise | mouse; vec3-valued:
 *  color_cycle. */
export type Animation =
  | { type: 'sine'; min: number; max: number; speed: number; phase: number }
  | { type: 'pulse'; min: number; max: number; speed: number; duty: number }
  | { type: 'noise'; min: number; max: number; speed: number }
  | { type: 'mouse'; min: number; max: number; axis: 'x' | 'y' }
  | { type: 'color_cycle'; colorA: ColorRgb; colorB: ColorRgb; speed: number }
  /** A user-built animation: the param's value comes from a shared
   *  `Recipe.animations[].id` chain (see AnimChain). Many params can `ref`
   *  the same chain — the compiler emits the chain once and references it. */
  | { type: 'custom'; ref: string };

/** The animation kinds valid for a float param vs a colour param. 'custom' is
 *  float-valued in v1 (the chain folds to a scalar). */
export const FLOAT_ANIM_TYPES = ['sine', 'pulse', 'noise', 'mouse', 'custom'] as const;
export const COLOR_ANIM_TYPES = ['color_cycle'] as const;

// ─── Custom animation chains (built from animation blocks) ───────────────

/** A shared, reusable animation: an ordered chain of animation blocks that
 *  fold left→right into one scalar value-over-time. Lives on the same canvas
 *  as composer blocks but is a distinct species (cannot puzzle-connect to
 *  them). Stored on the Recipe so it serialises + rides Share URLs, and so a
 *  single chain can drive many params. See cards/anim-blocks.ts. */
export type AnimChain = {
  id: string;
  /** User-facing name shown in the inspector ∼-menu and on the canvas. */
  name: string;
  /** The blocks, in fold order. The first block is typically a source
   *  (Time/Mouse); the rest transform the running value. */
  blocks: AnimBlock[];
};

/** One animation block instance inside an AnimChain. `type` keys into
 *  ANIM_BLOCKS (the AnimBlockDef library); `params` mirrors the Card model. */
export type AnimBlock = {
  id: string;
  type: string;
  params: Record<string, Parameter>;
};

/** Library definition for an animation block — the AnimBlockDef analogue of
 *  CardDef, but it emits a single GLSL expression that transforms a running
 *  scalar value `v`. See cards/anim-blocks.ts. */
export type AnimBlockDef = {
  type: string;
  label: string;
  icon: string;
  description: string;
  /** A `source` block ignores the incoming `v` and produces a fresh value
   *  (Time → u_time, Mouse → u_mouse). A non-source block reads `{{v}}`. */
  source?: boolean;
  params: Record<string, ParamDef>;
  /** GLSL expression producing the new value. `{{v}}` = the running value so
   *  far; `{{paramKey}}` = that param (a baked literal in v1). */
  transform: string;
  /** Helper functions the transform depends on (e.g. 'noise2'). */
  helpers?: string[];
};

/** Live media a sampler2D param is bound to. */
export type MediaSourceRef =
  | { kind: 'image'; element: HTMLImageElement | HTMLCanvasElement | ImageBitmap }
  | { kind: 'video'; element: HTMLVideoElement };

export type ParameterValue = number | ColorRgb | MediaParamValue;
export type ColorRgb = readonly [number, number, number];

/** Stored value for image/video params. For images: a data URL (so it
 *  round-trips through Recipe JSON serialisation). For videos: the string
 *  'webcam' (the live source is non-serialisable; the UI re-acquires it). */
export type MediaParamValue = string;

// ─── Card library schema ────────────────────────────────────────────────

export type CardCategory = 'shape' | 'distortion' | 'color' | 'effect';

/** A pipeline register a card's GLSL reads from / writes to. The compiler
 *  threads exactly these three mutable vars (see MAIN_PRELUDE). */
export type Register = 'uv' | 'd' | 'col';

/** Which registers a card touches. The compiler reasons about ordering/tiling
 *  from this instead of inferring from `category`. Optional on CardDef: when
 *  absent it's DERIVED from `category` (see `cardIO`), so existing cards need no
 *  annotation; a card can declare it to override the category default. */
export type CardIO = { reads: readonly Register[]; writes: readonly Register[] };

export type ParamDef =
  | { kind: 'float'; label: string; default: number; min: number; max: number; step?: number }
  | { kind: 'color'; label: string; default: ColorRgb }
  | {
      kind: 'select';
      label: string;
      /** Default option value (an integer). Stored as a number under the hood;
       *  emitted as a `float` uniform that the shader casts via `int(u_*)`. */
      default: number;
      options: ReadonlyArray<{ value: number; label: string }>;
    }
  /** A user-supplied still image (PNG/JPG). Stored in the Recipe as a data
   *  URL; emitted as a `sampler2D` uniform the compiler can reference inside
   *  the snippet. */
  | { kind: 'image'; label: string; default: MediaParamValue | null }
  /** A live video feed (webcam). Stored in the Recipe as the string
   *  'webcam' (the live element isn't serialisable); emitted as a
   *  `sampler2D` uniform that RecipeCanvas re-uploads each frame. */
  | { kind: 'video'; label: string; default: MediaParamValue | null }
  /** A reference to another pass's previous-frame FBO. Emitted as a
   *  `sampler2D` uniform; the multi-pass renderer binds the appropriate
   *  buffer texture every frame (using the ping-pong "previous" slot when
   *  the consumer pass is the same as the producer). Stored as a string
   *  literal of the target buffer id ('a' | 'b' | 'c' | 'd') so the Recipe
   *  round-trips through JSON. */
  | { kind: 'buffer'; label: string; default: 'a' | 'b' | 'c' | 'd' }
  /** A free-text string (e.g. a named-reroute label). COMPILE-ONLY: the value
   *  is inlined into the GLSL as a sanitized identifier, never emitted as a
   *  uniform. Stored as a string so the Recipe round-trips through JSON. */
  | { kind: 'text'; label: string; default: string };

/** A 3D card's contribution to the raymarched scene. Used by cards with
 *  `mode: '3d'`. The compiler walks 3D cards in recipe order and threads
 *  these expressions into sdScene() / the lighting pass. `{{paramKey}}`
 *  placeholders are substituted with a uniform reference, same as 2D.
 *
 *  Card "kinds" via the optional fields:
 *   - sdfExpr     → emits `d = sdMin/sdSmoothMin(d, <sdfExpr>, k)` into sdScene
 *   - domainExpr  → emits `p = <domainExpr>` (transforms `p` for cards that follow)
 *   - smoothness  → sets the union smoothness `k` for subsequent unions
 *   - material    → sets the global `mat` colour the lighting pass uses
 *   At most one of {sdfExpr, domainExpr, smoothness, material} should be set
 *   per card; the compiler dispatches on whichever is present.
 */
export type Card3DContribution = {
  /** A GLSL expression returning `float` given a vec3 `p`. */
  sdfExpr?: string;
  /** A GLSL expression returning vec3 — `p` is rebound to this value for
   *  subsequent cards (acts as a wrapping distortion). */
  domainExpr?: string;
  /** A GLSL expression returning float — sets the union smoothness `k` for
   *  subsequent unions. 0 means a hard min(). */
  smoothness?: string;
  /** A GLSL int expression (0|1|2) — sets the CSG combine mode `cm` for
   *  subsequent shapes: 0 union, 1 subtraction, 2 intersection. Persists like
   *  `smoothness`; respects the current `k` for smooth versions. */
  combine?: string;
  /** A raw GLSL statement that MODIFIES the running scene distance `d` in
   *  sdScene (in scope: `d`, hit point `p`, smoothness `k`). Used by surface
   *  operators — round (`d -= r`), onion shell (`d = abs(d) - t`), displace
   *  (`d += …`). Applied in card order, so it affects everything accumulated
   *  before it. */
  sdfStmt?: string;
  /** A GLSL expression returning vec3 — sets the global material colour. The
   *  LAST material-card before raymarch wins (v1 — material is global, not
   *  per-surface). */
  material?: string;
  // ── Composable raymarch shading (compile3d assembles these into main) ──
  /** vec3 albedo as a function of hit `p` and normal `n` — 3D texturing.
   *  Last one wins; overrides `material`. (Base layer.) */
  albedoExpr?: string;
  /** Statement(s) that MODIFY `alb` (the surface albedo) — stackable texturing.
   *  In scope: hit `p`, normal `n`, albedo `alb`. Applied in card order after the
   *  base albedo, so height-tint → slope-rock → triplanar detail compose. */
  albedo?: string;
  /** Statement(s) accumulating into `lcol` (the lit colour). In scope: hit `p`,
   *  normal `n`, ray dir `rd`, albedo `alb`, distance `t`, and g_sky(rd). Lights
   *  accumulate in card order. */
  light?: string;
  /** vec3 background/reflection colour as a function of ray dir `rd`. Emitted as
   *  `g_sky(rd)` (used for misses AND fresnel reflections). Last one wins. */
  sky?: string;
  /** Camera ray origin (vec3). Last one wins; defaults to the u_cam_eye uniform. */
  camEye?: string;
  /** Camera target (vec3). Last one wins; defaults to u_cam_target. */
  camTarget?: string;
  /** Camera focal length (float). Last one wins; default 1.6. */
  camFov?: string;
  // ── Volumetric mode (Recipe.mode === 'volume') ──
  /** Statements setting the volume ray: `vDir`, `vTime`, `vFrom`. */
  volCam?: string;
  /** Body of `float volField(vec3 p)` — must set local `a` (density). Emitted as
   *  a global function the Volume march calls. */
  volField?: string;
  /** The volume march loop body — accumulates into `col` using vDir/vFrom and
   *  volField(p). */
  volMarch?: string;
};

/** A typed-card definition. Wildcards have no CardDef — they're a hard-coded
 *  shape in the compiler/UI. */
export type CardDef = {
  type: string;
  category: CardCategory;
  friendlyName: string;
  description: string;
  icon: string;
  /** Which pipeline registers this card reads/writes. Optional — derived from
   *  `category` when omitted (see `cardIO`). Declared only when a card breaks
   *  its category's default (e.g. a distortion that also writes `d`). */
  io?: CardIO;
  params: Record<string, ParamDef>;
  /** GLSL body emitted into main() for this card. `{{paramKey}}` placeholders
   *  are substituted with a uniform reference (e.g. `u_card3_softness`).
   *  Required for 2D cards; 3D cards keep a placeholder snippet (referenced
   *  by library.test.ts only — the compiler ignores it when mode==='3d'). */
  snippetTemplate: string;
  /** Names of helper functions this card depends on. The compiler emits the
   *  union of all required helpers exactly once at the top of the shader. */
  helpers?: string[];
  /** Defaults to '2d'. 3D cards contribute via `contribution3d` and are
   *  no-ops in 2D recipes; 2D cards are no-ops in 3D recipes. */
  mode?: ShaderTemplate;
  /** Required when mode === '3d'. */
  contribution3d?: Card3DContribution;
  /** Deprecated cards: kept in the library so existing recipes still compile,
   *  but hidden from the palette/search. e.g. the old "grid" shape cards that
   *  are now made compositionally with `shape + repeat`. */
  hidden?: boolean;
};

// ─── Compiler output ────────────────────────────────────────────────────

export type Span = {
  cardId: string;
  /** 1-based line number of this card's `//#card cN …` marker. */
  startLine: number;
  /** 1-based line number of the LAST line of this card's body (inclusive),
   *  i.e. the line right before the next `//#card` / `//#end` marker. */
  endLine: number;
  /** The body the compiler emitted for this card (excludes the marker line).
   *  The reverse parser normalizes the user's current source against this to
   *  decide "still matches the card's shape" vs "convert to wildcard." */
  expectedBody: string;
};

export type UniformBinding = {
  name: string;
  cardId: string;
  paramKey: string;
  value: ParameterValue;
};

export type CompiledShader = {
  /** Full fragment-shader source string, ready for renderer.compile(). */
  glsl: string;
  /** One span per card, in recipe order. Spans cover the body of main() only;
   *  the preamble + helpers + main() boilerplate are not spans. */
  spans: Span[];
  /** Uniforms the integration layer should call renderer.setUniform on, in
   *  recipe order. Caller iterates this whenever recipe param values change
   *  without a structural change. */
  uniforms: UniformBinding[];
};

// ─── Reverse parser (code → recipe delta) ──────────────────────────────

export type ReparseEvent =
  | { kind: 'param-updated'; cardId: string; paramKey: string; newValue: ParameterValue }
  | { kind: 'card-became-wildcard'; cardId: string; capturedSource: string }
  | { kind: 'wildcard-updated'; cardId: string; capturedSource: string }
  | { kind: 'wildcard-inserted'; afterCardId: string | null; capturedSource: string }
  | { kind: 'card-deleted'; cardId: string }
  | { kind: 'alpha-updated'; cardId: string; alpha: number }
  | { kind: 'blend-updated'; cardId: string; blend: BlendMode };

export type ReparseResult = {
  /** The new recipe to commit. May be identical to the previous recipe if
   *  events is empty (e.g. the user only changed whitespace). */
  recipe: Recipe;
  events: ReparseEvent[];
  /** `true` when the source failed to tokenize/parse cleanly. The integration
   *  layer should keep the previous recipe and show a "syntax pending"
   *  indicator until a later debounce tick succeeds. */
  syntaxPending: boolean;
};
