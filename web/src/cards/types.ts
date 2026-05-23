// Cards module — the authoring model + its compiled-shader representation.
// See CONTRACTS.md §3 (Cards) for the locked public surface; only this file
// and ./markers.ts ./compile.ts ./reparse.ts ./library/* are re-exported
// from ./index.ts.

// ─── Recipe ─────────────────────────────────────────────────────────────

/** The Recipe is the source of truth. The emitted GLSL is a *projection*. */
export type Recipe = {
  cards: Card[];
  canvasAspect: 'square' | 'portrait' | 'landscape';
};

/** A card is either a typed entry from the CARD_LIBRARY or a wildcard that
 *  carries arbitrary GLSL the system cannot represent as a known card. */
export type Card = TypedCard | WildcardCard;

export type TypedCard = {
  kind: 'typed';
  id: string;
  type: string;
  enabled: boolean;
  params: Record<string, Parameter>;
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
  | { kind: 'color'; label: string; default: ColorRgb };

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
   *  are substituted with a uniform reference (e.g. `u_card3_softness`). */
  snippetTemplate: string;
  /** Names of helper functions this card depends on. The compiler emits the
   *  union of all required helpers exactly once at the top of the shader. */
  helpers?: string[];
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
  | { kind: 'card-deleted'; cardId: string };

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
