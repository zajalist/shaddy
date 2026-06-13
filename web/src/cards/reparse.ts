// Reverse parser: user edits the GLSL in the code view → we update the
// Recipe (and emit a list of events describing what changed).
//
// Per Q2 and Q3 of the design grill:
//   - Markers are atomic CodeMirror decorations, so the user normally can't
//     delete / reorder them. If somehow the marker structure doesn't match
//     the previous recipe (count, order, or cardIds), we keep the previous
//     recipe and report `syntaxPending: true` — the code view shows a tiny
//     "syntax pending" indicator until the next debounce tick succeeds.
//   - Code shows uniforms, not literals (Q3). Param values can't be edited
//     from the code view, so this parser never emits 'param-updated' events
//     today — kept on the union for symmetry / a future literal-mode.
//   - A typed card whose body diverges from its `expectedBody` (after
//     normalizing whitespace + comments) becomes a wildcard with the
//     current body as its rawSource. A wildcard whose body changes just
//     gets its rawSource updated.

import { findAllMarkers, findEndLine, sliceSpanBody } from './markers';
import { lookupCardDef } from './library';
import { uniformNameFor, attrUniformNameFor } from './compile';
import { animUniforms } from './anim';
import { formatParameterAsGlslLiteral } from './format';
import type {
  BlendMode,
  Card,
  CompiledShader,
  ParameterValue,
  Recipe,
  ReparseEvent,
  ReparseResult,
  TypedCard,
  WildcardCard,
} from './types';

/** When a typed card becomes a wildcard, its captured body still references
 *  that card's per-card uniforms (`u_card{i}_param`). But a wildcard emits no
 *  uniform declarations of its own, so those references would be UNDECLARED in
 *  the recompiled shader → a GL compile error that blanks the preview. Bake the
 *  card's current param values in as GLSL literals so the wildcard is
 *  self-contained (and renders exactly what it looked like at capture). Only
 *  the card's OWN uniforms are baked; references to still-typed neighbours stay
 *  as uniforms and remain declared. */
function bakeOwnUniformLiterals(body: string, cardIndex: number, card: TypedCard): string {
  const def = lookupCardDef(card.type);
  if (!def) return body;
  // text params are inlined identifiers, not uniforms; sampler kinds can't be a
  // literal — leave both untouched.
  const isMedia = (k: string): boolean => k === 'text' || k === 'image' || k === 'video' || k === 'buffer';
  const repl: Array<{ name: string; lit: string }> = [];

  for (const [paramKey, paramDef] of Object.entries(def.params)) {
    if (isMedia(paramDef.kind)) continue;
    const anim = card.params[paramKey]?.animation;
    if (anim && (paramDef.kind === 'float' || paramDef.kind === 'color')) {
      // Animated → bake the ENDPOINT uniforms (min/max/speed/…). The static
      // u_card{i}_{key} is never emitted for an animated param; the body reads
      // these via its per-frame local, so baking them keeps the wildcard
      // self-contained AND still animating (it computes from baked endpoints).
      for (const au of animUniforms(cardIndex, paramKey, anim)) {
        repl.push({ name: au.name, lit: formatParameterAsGlslLiteral(au.value) });
      }
      continue;
    }
    const value = (card.params[paramKey]?.value ?? paramDef.default) as ParameterValue;
    repl.push({ name: uniformNameFor(cardIndex, paramKey), lit: formatParameterAsGlslLiteral(value) });
  }
  // Wired attribute uniforms (u_card{i}_a{n}_param) — same treatment.
  (card.attributes ?? []).forEach((attr, attrIndex) => {
    const adef = lookupCardDef(attr.type);
    if (!adef) return;
    for (const [paramKey, paramDef] of Object.entries(adef.params)) {
      if (isMedia(paramDef.kind)) continue;
      const value = (attr.params[paramKey]?.value ?? paramDef.default) as ParameterValue;
      repl.push({ name: attrUniformNameFor(cardIndex, attrIndex, paramKey), lit: formatParameterAsGlslLiteral(value) });
    }
  });

  // Replace LONGEST names first so a name can't clobber a longer one sharing its
  // prefix (e.g. u_card0_size must not corrupt u_card0_size_min).
  repl.sort((a, b) => b.name.length - a.name.length);
  let out = body;
  for (const { name, lit } of repl) out = out.split(name).join(lit);
  return out;
}

export function reparse(
  prevRecipe: Recipe,
  prevCompiled: CompiledShader,
  nextSource: string,
): ReparseResult {
  const markers = findAllMarkers(nextSource);

  // ── Structural sanity: marker count + cardIds must match prev recipe ──
  if (markers.length !== prevRecipe.cards.length) {
    return { recipe: prevRecipe, events: [], syntaxPending: true };
  }
  for (let i = 0; i < markers.length; i++) {
    if (markers[i]?.cardId !== prevRecipe.cards[i]?.id) {
      return { recipe: prevRecipe, events: [], syntaxPending: true };
    }
  }

  const endLine = findEndLine(nextSource);
  if (endLine === null) {
    return { recipe: prevRecipe, events: [], syntaxPending: true };
  }

  // ── Per-card body + composition comparison ─────────────────────────
  const events: ReparseEvent[] = [];
  const newCards: Card[] = [];

  for (let i = 0; i < prevRecipe.cards.length; i++) {
    const card = prevRecipe.cards[i]!;
    const marker = markers[i]!;
    const nextMarker = markers[i + 1];
    const bodyEndLine = nextMarker ? nextMarker.lineNumber - 1 : endLine - 1;
    const currentBody = sliceSpanBody(nextSource, marker.lineNumber, bodyEndLine);
    const expectedBody = prevCompiled.spans[i]?.expectedBody ?? '';

    // Detect marker-level composition edits FIRST. We diff against the
    // resolved (defaults-applied) values on the previous card so a user
    // typing `"alpha":1` on a no-comp marker doesn't emit a spurious event.
    const prevAlpha = card.alpha ?? 1;
    const prevBlend: BlendMode = card.blendMode ?? 'normal';
    const nextAlpha = marker.alpha ?? 1;
    const nextBlend: BlendMode = marker.blend ?? 'normal';
    let updatedCard: Card = card;
    // The marker writes alpha at 3 fractional digits, so a pure render→parse
    // cycle reads back a rounded value. Only adopt the marker alpha when the
    // user actually moved it PAST display precision — otherwise an unedited
    // round-trip would silently mutate e.g. 0.1234 → 0.123 every tick.
    if (Math.abs(nextAlpha - prevAlpha) > 5e-4) {
      updatedCard = { ...updatedCard, alpha: nextAlpha };
      events.push({ kind: 'alpha-updated', cardId: card.id, alpha: nextAlpha });
    }
    if (nextBlend !== prevBlend) {
      updatedCard = { ...updatedCard, blendMode: nextBlend };
      events.push({ kind: 'blend-updated', cardId: card.id, blend: nextBlend });
    }

    const bodyMatches = normalizeGlsl(currentBody) === normalizeGlsl(expectedBody);

    if (bodyMatches) {
      newCards.push(updatedCard);
      continue;
    }

    if (updatedCard.kind === 'typed') {
      // Self-contain the captured body: bake this card's own uniform values in
      // as literals so the resulting wildcard has no dangling u_card* refs.
      const baked = bakeOwnUniformLiterals(currentBody, i, updatedCard);
      const wildcard: WildcardCard = {
        kind: 'wildcard',
        id: updatedCard.id,
        enabled: updatedCard.enabled,
        rawSource: baked,
        displayName: extractDisplayName(baked),
        alpha: updatedCard.alpha,
        blendMode: updatedCard.blendMode,
      };
      newCards.push(wildcard);
      events.push({
        kind: 'card-became-wildcard',
        cardId: updatedCard.id,
        capturedSource: baked,
      });
      continue;
    }

    // Wildcard whose body changed — just update rawSource (+ displayName).
    const updated: WildcardCard = {
      ...updatedCard,
      rawSource: currentBody,
      displayName: extractDisplayName(currentBody),
    };
    newCards.push(updated);
    events.push({
      kind: 'wildcard-updated',
      cardId: updatedCard.id,
      capturedSource: currentBody,
    });
  }

  return {
    recipe: { ...prevRecipe, cards: newCards },
    events,
    syntaxPending: false,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

/** Strip comments + collapse whitespace so we can detect structural edits
 *  vs cosmetic ones (formatting, reflow, comment annotations). */
export function normalizeGlsl(src: string): string {
  return src
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First non-empty line in `body` — if it's a line comment, return the
 *  comment text; otherwise return null. Used to derive a wildcard's
 *  display name from a user-written header like `// fancy distortion`. */
export function extractDisplayName(body: string): string | null {
  for (const rawLine of body.split('\n')) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) continue;
    const m = /^\/\/\s*(.+)$/.exec(trimmed);
    if (m) {
      const name = m[1]?.trim();
      return name && name.length > 0 ? name : null;
    }
    return null;
  }
  return null;
}
