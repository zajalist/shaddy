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
import type {
  Card,
  CompiledShader,
  Recipe,
  ReparseEvent,
  ReparseResult,
  WildcardCard,
} from './types';

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

  // ── Per-card body comparison ────────────────────────────────────────
  const events: ReparseEvent[] = [];
  const newCards: Card[] = [];

  for (let i = 0; i < prevRecipe.cards.length; i++) {
    const card = prevRecipe.cards[i]!;
    const marker = markers[i]!;
    const nextMarker = markers[i + 1];
    const bodyEndLine = nextMarker ? nextMarker.lineNumber - 1 : endLine - 1;
    const currentBody = sliceSpanBody(nextSource, marker.lineNumber, bodyEndLine);
    const expectedBody = prevCompiled.spans[i]?.expectedBody ?? '';

    const bodyMatches = normalizeGlsl(currentBody) === normalizeGlsl(expectedBody);

    if (bodyMatches) {
      newCards.push(card);
      continue;
    }

    if (card.kind === 'typed') {
      const wildcard: WildcardCard = {
        kind: 'wildcard',
        id: card.id,
        enabled: card.enabled,
        rawSource: currentBody,
        displayName: extractDisplayName(currentBody),
      };
      newCards.push(wildcard);
      events.push({
        kind: 'card-became-wildcard',
        cardId: card.id,
        capturedSource: currentBody,
      });
      continue;
    }

    // Wildcard whose body changed — just update rawSource (+ displayName).
    const updated: WildcardCard = {
      ...card,
      rawSource: currentBody,
      displayName: extractDisplayName(currentBody),
    };
    newCards.push(updated);
    events.push({
      kind: 'wildcard-updated',
      cardId: card.id,
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
