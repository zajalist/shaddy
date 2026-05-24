// Cards module — the authoring model + its compiled-shader representation.
// See CONTRACTS.md §3 (Cards) for the locked public surface; only this file
// and ./markers.ts ./compile.ts ./reparse.ts ./library/* are re-exported
// from ./index.ts.

// ─── Recipe ─────────────────────────────────────────────────────────────

/** The Recipe is the source of truth. The emitted GLSL is a *projection*. */
export type Recipe = {
  cards: Card[];
  canvasAspect: 'square' | 'portrait' | 'landscape';
  /** Compiler dispatch flag. '2d' (default, omitted in old recipes) emits the
   *  classic uv/d/col fragment template. '3d' emits a raymarched SDF scene
   *  with Lambert + soft shadow shading; only cards with mode:'3d' contribute
   *  meaningfully (2d cards become no-ops). Old Recipe JSON without this
   *  field is treated as '2d'. */
  mode?: ShaderTemplate;
};

/** Which shader template the compiler should emit. See Recipe.mode. */
export type ShaderTemplate = '2d' | '3d';

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
  /** PR #2 fills this with the Animation tagged union. */
  animation: null;
};

export type ParameterValue = number | ColorRgb;
export type ColorRgb = readonly [number, number, number];

// ─── Card library schema ────────────────────────────────────────────────

export type CardCategory = 'shape' | 'distortion' | 'color' | 'effect';

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
    };

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
  /** A GLSL expression returning vec3 — sets the global material colour. The
   *  LAST material-card before raymarch wins (v1 — material is global, not
   *  per-surface). */
  material?: string;
};

/** A typed-card definition. Wildcards have no CardDef — they're a hard-coded
 *  shape in the compiler/UI. */
export type CardDef = {
  type: string;
  category: CardCategory;
  friendlyName: string;
  description: string;
  icon: string;
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
