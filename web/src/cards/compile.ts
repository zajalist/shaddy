// Recipe → CompiledShader.
//
// The emitted GLSL is the *body* a fragment shader would have — preamble
// (#version, precision, standard uniform decls) is added by the renderer
// before sending to the GL driver. Span line numbers are 1-based and
// relative to the emitted body string; the code-view component adds the
// renderer preamble offset (USER_LINE_OFFSET in renderer/gl/preamble) when
// it renders.
//
// Compiler invariant: same recipe → byte-identical glsl output. The
// reverse parser relies on this — it normalizes the user's source span
// against `span.expectedBody` and decides "still matches" vs "wildcard."

import {
  CARD_LIBRARY_LIST,
  GLSL_HELPERS,
  HELPER_EMISSION_ORDER,
  WILDCARD_DISPLAY_NAME_FALLBACK,
  WILDCARD_FRIENDLY_NAME,
  lookupCardDef,
  resolveHelperClosure,
} from './library';
import { END_MARKER, formatCardMarker } from './markers';
import { formatParameterForDisplay, substitutePlaceholders } from './format';
import type {
  BlendMode,
  Card,
  CardDef,
  CompiledShader,
  Recipe,
  Span,
  TypedCard,
  UniformBinding,
  WildcardCard,
} from './types';

// Standard variables every card snippet can read or write.
const MAIN_PRELUDE = [
  '  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;',
  '  uv.x *= u_resolution.x / u_resolution.y;',
  '  float d = 0.0;',
  '  vec3 col = vec3(0.0);',
];

const MAIN_EPILOGUE = ['  fragColor = vec4(col, 1.0);'];

// Tiny blend-mode helper, emitted once at the top of the helpers block only
// when at least one card uses a non-'normal' blend mode. Each card with a
// non-default composition wraps its body in:
//   { vec3 _pc=col; float _pd=d; <body>; col=mix(_pc, _shadeBlend(_pc, col, MODE), ALPHA); d=mix(_pd,d,ALPHA); }
// where MODE is a small int constant per BlendMode (see BLEND_MODE_CODE).
const BLEND_HELPER_NAME = '_shadeBlend';
const BLEND_HELPER_GLSL = `vec3 ${BLEND_HELPER_NAME}(vec3 base, vec3 over, int mode) {
  if (mode == 1) return base + over;                         // add
  if (mode == 2) return base * over;                         // multiply
  if (mode == 3) return vec3(1.0) - (vec3(1.0) - base) * (vec3(1.0) - over); // screen
  if (mode == 4) return max(base, over);                     // lighten
  if (mode == 5) return min(base, over);                     // darken
  return over;                                               // normal (0)
}`;

const BLEND_MODE_CODE: Record<BlendMode, number> = {
  normal: 0, add: 1, multiply: 2, screen: 3, lighten: 4, darken: 5,
};

function cardAlpha(card: Card): number {
  return card.alpha ?? 1;
}
function cardBlend(card: Card): BlendMode {
  return card.blendMode ?? 'normal';
}
function hasNonDefaultComposition(card: Card): boolean {
  return cardAlpha(card) < 1 || cardBlend(card) !== 'normal';
}

// Re-export for callers that need the marker prefix to set up code-view
// decorations without depending on ./markers directly.
export { END_MARKER } from './markers';

export function compile(recipe: Recipe): CompiledShader {
  const uniformDecls: string[] = [];
  const uniforms: UniformBinding[] = [];

  // ── Pass 1: emit per-card uniform declarations + collect uniform bindings ──
  recipe.cards.forEach((card, cardIndex) => {
    if (card.kind !== 'typed') return;
    const def = lookupCardDef(card.type);
    if (!def) return;
    for (const [paramKey, paramDef] of Object.entries(def.params)) {
      const name = uniformNameFor(cardIndex, paramKey);
      const glType = paramDef.kind === 'color' ? 'vec3' : 'float';
      uniformDecls.push(`uniform ${glType} ${name};`);
      const value = card.params[paramKey]?.value ?? paramDef.default;
      uniforms.push({ name, cardId: card.id, paramKey, value });
    }
  });

  // ── Pass 2: collect helper functions referenced by any card ──
  const requestedHelpers = new Set<string>();
  for (const card of recipe.cards) {
    if (card.kind !== 'typed') continue;
    const def = lookupCardDef(card.type);
    if (!def?.helpers) continue;
    for (const h of def.helpers) requestedHelpers.add(h);
  }
  const helperClosure = resolveHelperClosure(requestedHelpers);
  const anyComposition = recipe.cards.some(hasNonDefaultComposition);

  // ── Pass 3: emit the GLSL body, tracking spans line by line ──
  const lines: string[] = [];

  if (uniformDecls.length > 0) {
    lines.push('// === per-card uniforms ===');
    for (const decl of uniformDecls) lines.push(decl);
    lines.push('');
  }

  // Helpers emitted exactly once, in the fixed order so dependents follow
  // their dependencies.
  const emittedHelpers: string[] = [];
  for (const name of HELPER_EMISSION_ORDER) {
    if (!helperClosure.has(name)) continue;
    const body = GLSL_HELPERS[name];
    if (!body) continue;
    emittedHelpers.push(body);
  }
  if (emittedHelpers.length > 0 || anyComposition) {
    lines.push('// === helpers ===');
    for (const body of emittedHelpers) {
      for (const helperLine of body.split('\n')) lines.push(helperLine);
      lines.push('');
    }
    if (anyComposition) {
      for (const helperLine of BLEND_HELPER_GLSL.split('\n')) lines.push(helperLine);
      lines.push('');
    }
  }

  lines.push('void main() {');
  for (const line of MAIN_PRELUDE) lines.push(line);
  lines.push('');

  const spans: Span[] = [];

  recipe.cards.forEach((card, cardIndex) => {
    const markerLine = lines.length + 1; // 1-based
    const cardBodyLines: string[] = [];

    if (card.kind === 'typed') {
      emitTypedCard(card, cardIndex, lines, cardBodyLines);
    } else {
      emitWildcardCard(card, lines, cardBodyLines);
    }

    // If this card composes (alpha < 1 or blend != normal), wrap its body
    // lines in a snapshot/mix block. We do this AFTER emit so the per-card
    // emitter doesn't have to know about composition.
    if (hasNonDefaultComposition(card)) {
      wrapWithComposition(card, lines, cardBodyLines);
    }

    const endLine = lines.length; // 1-based, INCLUSIVE
    spans.push({
      cardId: card.id,
      startLine: markerLine,
      endLine,
      expectedBody: cardBodyLines.join('\n'),
    });
  });

  lines.push(END_MARKER);
  lines.push('');
  for (const line of MAIN_EPILOGUE) lines.push(line);
  lines.push('}');

  return {
    glsl: lines.join('\n'),
    spans,
    uniforms,
  };
}

// ─── Per-card emitters ─────────────────────────────────────────────────

function emitTypedCard(
  card: TypedCard,
  cardIndex: number,
  out: string[],
  bodyOut: string[],
): void {
  // Portal — purely a visual chain-wrap marker. Emits the card marker line
  // (so reparse can still see it as a known card) plus a single comment so
  // the span has a non-empty body. Zero params → no uniforms, no helpers.
  if (card.type === 'portal') {
    out.push(
      formatCardMarker({
        cardId: card.id,
        friendlyName: 'Portal',
        alpha: card.alpha,
        blend: card.blendMode,
      }),
    );
    const body = '  // portal — visual chain wrap (no shader effect)';
    out.push(body);
    bodyOut.push(body);
    return;
  }

  const def = lookupCardDef(card.type);
  if (!def) {
    // Defensive — recipe references a card type we no longer have. Render
    // as a wildcard-style marker so the user at least sees the cardId.
    out.push(formatCardMarker({
      cardId: card.id,
      friendlyName: `Unknown (${card.type})`,
      alpha: card.alpha,
      blend: card.blendMode,
    }));
    const note = `  // unknown card type: ${card.type}`;
    out.push(note);
    bodyOut.push(note);
    return;
  }

  out.push(
    formatCardMarker({
      cardId: card.id,
      friendlyName: def.friendlyName,
      paramDisplays: buildParamDisplays(def, card),
      alpha: card.alpha,
      blend: card.blendMode,
    }),
  );

  const snippet = substitutePlaceholders(def.snippetTemplate, (paramKey) => {
    if (!(paramKey in def.params)) {
      // CardDef bug — placeholder references a non-existent param. Fail
      // loudly at compile so authoring mistakes surface in tests.
      throw new Error(
        `[cards.compile] card "${def.type}" references unknown placeholder {{${paramKey}}}`,
      );
    }
    return uniformNameFor(cardIndex, paramKey);
  });

  for (const snippetLine of snippet.split('\n')) {
    const indented = `  ${snippetLine}`;
    out.push(indented);
    bodyOut.push(indented);
  }
}

function emitWildcardCard(card: WildcardCard, out: string[], bodyOut: string[]): void {
  const friendlyName = card.displayName ?? WILDCARD_DISPLAY_NAME_FALLBACK;
  out.push(formatCardMarker({
    cardId: card.id,
    friendlyName,
    alpha: card.alpha,
    blend: card.blendMode,
  }));
  // Wildcard rawSource is emitted verbatim (no indentation injection — the
  // user is responsible for their own formatting inside a wildcard span).
  if (card.rawSource.length > 0) {
    for (const rawLine of card.rawSource.split('\n')) {
      out.push(rawLine);
      bodyOut.push(rawLine);
    }
  }
}

/** Mutate `out` (and `bodyOut`) in place: take the already-emitted card body
 *  lines off the tail and re-emit them inside an alpha/blend composition
 *  block. Both `out` (full source buffer) and `bodyOut` (this card's body
 *  for span.expectedBody) get the same wrapped lines. */
function wrapWithComposition(card: Card, out: string[], bodyOut: string[]): void {
  // Snapshot the body lines we just wrote (still in both buffers), then pop
  // them off so we can re-emit wrapped.
  const popCount = bodyOut.length;
  const innerLines = bodyOut.slice();
  out.splice(out.length - popCount, popCount);
  bodyOut.length = 0;

  const alpha = cardAlpha(card);
  const blend = cardBlend(card);
  const alphaLit = glslLit(alpha);
  const modeLit = String(BLEND_MODE_CODE[blend]);

  const push = (s: string): void => {
    out.push(s);
    bodyOut.push(s);
  };
  push('  {');
  push('    vec3 _prev_col = col;');
  push('    float _prev_d = d;');
  for (const line of innerLines) {
    // Already 2-space indented from the emitter; add another indent step so
    // the body reads as a clear scoped block.
    push(`  ${line}`);
  }
  push(`    col = mix(_prev_col, ${BLEND_HELPER_NAME}(_prev_col, col, ${modeLit}), ${alphaLit});`);
  push(`    d = mix(_prev_d, d, ${alphaLit});`);
  push('  }');
}

function glslLit(n: number): string {
  const s = Number(n.toFixed(6)).toString();
  return s.includes('.') ? s : `${s}.0`;
}

// ─── Helpers ───────────────────────────────────────────────────────────

export function uniformNameFor(cardIndex: number, paramKey: string): string {
  return `u_card${cardIndex}_${paramKey}`;
}

function buildParamDisplays(def: CardDef, card: TypedCard): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [paramKey, paramDef] of Object.entries(def.params)) {
    const value = card.params[paramKey]?.value ?? paramDef.default;
    out[paramKey] = formatParameterForDisplay(value);
  }
  return out;
}

/** Quick sanity check used by tests: every card type referenced by a recipe
 *  exists in CARD_LIBRARY (or is `wildcard`). */
export function validateRecipe(recipe: Recipe): string[] {
  const out: string[] = [];
  const known = new Set(CARD_LIBRARY_LIST.map((c) => c.type));
  for (const card of recipe.cards) {
    if (card.kind === 'wildcard') continue;
    if (!known.has(card.type)) out.push(`unknown card type: ${card.type}`);
  }
  return out;
}

void WILDCARD_FRIENDLY_NAME; // re-exported via cards/index; referenced so tree-shaking can't drop it under strict imports
