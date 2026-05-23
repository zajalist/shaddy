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
  WILDCARD_DISPLAY_NAME_FALLBACK,
  WILDCARD_FRIENDLY_NAME,
  lookupCardDef,
} from './library';
import { END_MARKER, formatCardMarker } from './markers';
import { formatParameterForDisplay, substitutePlaceholders } from './format';
import type {
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

  // ── Pass 2: emit the GLSL body, tracking spans line by line ──
  const lines: string[] = [];

  if (uniformDecls.length > 0) {
    lines.push('// === per-card uniforms ===');
    for (const decl of uniformDecls) lines.push(decl);
    lines.push('');
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
  const def = lookupCardDef(card.type);
  if (!def) {
    // Defensive — recipe references a card type we no longer have. Render
    // as a wildcard-style marker so the user at least sees the cardId.
    out.push(formatCardMarker({ cardId: card.id, friendlyName: `Unknown (${card.type})` }));
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
  out.push(formatCardMarker({ cardId: card.id, friendlyName }));
  // Wildcard rawSource is emitted verbatim (no indentation injection — the
  // user is responsible for their own formatting inside a wildcard span).
  if (card.rawSource.length > 0) {
    for (const rawLine of card.rawSource.split('\n')) {
      out.push(rawLine);
      bodyOut.push(rawLine);
    }
  }
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
