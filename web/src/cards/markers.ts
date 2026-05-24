// Card-boundary markers in the emitted GLSL.
//
// Format (one card per marker, one marker per source line):
//
//   //#card <cardId> <friendlyName> { <paramKey>:<displayValue>, ... } @{"alpha":0.5,"blend":"add"}
//   ...card body...
//   //#card <cardId2> <friendlyName2>
//   ...
//   //#end
//
// The trailing `@{...}` JSON block is OPTIONAL — it only appears when the
// card has non-default alpha (< 1) or blend (≠ 'normal'). The reverse parser
// uses it to recover those values when the user edits them in source.
//
// The closing `//#end` is required so the last card's span has a fixed
// terminator. Marker lines and the `//#end` line are rendered as atomic,
// uneditable decorations in the code view — users can't put their cursor
// in them, so they can't accidentally delete or mangle them.

import type { BlendMode } from './types';

export const MARKER_PREFIX = '//#card';
export const END_MARKER = '//#end';
export const COMPOSITION_TAG = '@';

export type MarkerLine = {
  /** 1-based line number in the full source string. */
  lineNumber: number;
  cardId: string;
  friendlyName: string;
  /** Parsed from the trailing @{"alpha":…} block, when present. */
  alpha?: number;
  blend?: BlendMode;
};

export type EndMarker = {
  lineNumber: number;
};

// ─── Formatting ─────────────────────────────────────────────────────────

export function formatCardMarker(opts: {
  cardId: string;
  friendlyName: string;
  paramDisplays?: Record<string, string>;
  alpha?: number;
  blend?: BlendMode;
}): string {
  const head = `${MARKER_PREFIX} ${opts.cardId} ${opts.friendlyName}`;
  const displays = opts.paramDisplays;
  let withParams = head;
  if (displays) {
    const entries = Object.entries(displays);
    if (entries.length > 0) {
      const inside = entries.map(([k, v]) => `${k}:${v}`).join(', ');
      withParams = `${head} { ${inside} }`;
    }
  }
  const compositionParts: string[] = [];
  if (typeof opts.alpha === 'number' && opts.alpha < 1) {
    compositionParts.push(`"alpha":${roundForMarker(opts.alpha)}`);
  }
  if (opts.blend && opts.blend !== 'normal') {
    compositionParts.push(`"blend":"${opts.blend}"`);
  }
  if (compositionParts.length === 0) return withParams;
  return `${withParams} ${COMPOSITION_TAG}{${compositionParts.join(',')}}`;
}

function roundForMarker(n: number): string {
  // 3 sig fractional digits — same scheme as formatFloatForDisplay, kept local
  // so markers.ts doesn't import format.ts (markers is upstream of format).
  if (Number.isInteger(n)) return n.toString();
  return Number(n.toFixed(3)).toString();
}

// ─── Parsing ────────────────────────────────────────────────────────────

/** Try to parse a single line as a card marker. Returns null on no match. */
export function parseCardMarker(line: string, lineNumber: number): MarkerLine | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith(MARKER_PREFIX)) return null;
  const after = trimmed.charAt(MARKER_PREFIX.length);
  // Require the prefix to be followed by a separator — otherwise `//#cardx`
  // would falsely match as `//#card` + identifier `x`.
  if (after !== '' && after !== ' ' && after !== '\t') return null;
  const rest = trimmed.slice(MARKER_PREFIX.length).trim();
  if (rest.length === 0) return null;

  // Extract the trailing `@{…}` composition block if present, *before* the
  // param-display `{ … }` stripping, so `@{...}` always wins. We anchor to
  // the LAST `@{` to avoid clashing with anything earlier on the line.
  let composition: { alpha?: number; blend?: BlendMode } | null = null;
  let head = rest;
  const atIdx = head.lastIndexOf(`${COMPOSITION_TAG}{`);
  if (atIdx >= 0 && head.endsWith('}')) {
    const json = head.slice(atIdx + 1); // includes leading '{'
    composition = parseCompositionJson(json);
    head = head.slice(0, atIdx).trim();
  }
  // Strip any trailing `{ ... }` (the parameter display block).
  const braceIdx = head.indexOf('{');
  if (braceIdx >= 0) head = head.slice(0, braceIdx).trim();

  const spaceIdx = head.indexOf(' ');
  const cardId = spaceIdx < 0 ? head : head.slice(0, spaceIdx);
  const friendlyName = spaceIdx < 0 ? '' : head.slice(spaceIdx + 1).trim();
  const out: MarkerLine = { lineNumber, cardId, friendlyName };
  if (composition?.alpha !== undefined) out.alpha = composition.alpha;
  if (composition?.blend !== undefined) out.blend = composition.blend;
  return out;
}

const VALID_BLENDS: ReadonlySet<string> = new Set([
  'normal', 'add', 'multiply', 'screen', 'lighten', 'darken',
]);

function parseCompositionJson(json: string): { alpha?: number; blend?: BlendMode } | null {
  // Tiny tolerant parser. We don't use JSON.parse for two reasons:
  //  1) We want graceful degradation — a half-edited blob shouldn't make
  //     the whole marker line fail to parse.
  //  2) JSON.parse hates trailing commas / single quotes a user might type.
  const out: { alpha?: number; blend?: BlendMode } = {};
  const alphaMatch = /"alpha"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(json);
  if (alphaMatch?.[1] !== undefined) {
    const n = Number(alphaMatch[1]);
    if (Number.isFinite(n)) out.alpha = Math.max(0, Math.min(1, n));
  }
  const blendMatch = /"blend"\s*:\s*"([a-z]+)"/.exec(json);
  if (blendMatch?.[1] && VALID_BLENDS.has(blendMatch[1])) {
    out.blend = blendMatch[1] as BlendMode;
  }
  return out;
}

export function isEndMarker(line: string): boolean {
  return line.trim() === END_MARKER;
}

/** Find every card marker in document order. */
export function findAllMarkers(source: string): MarkerLine[] {
  const lines = source.split('\n');
  const out: MarkerLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = parseCardMarker(lines[i] ?? '', i + 1);
    if (m) out.push(m);
  }
  return out;
}

/** Find the `//#end` line, if any. Returns 1-based line number or null. */
export function findEndLine(source: string): number | null {
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (isEndMarker(lines[i] ?? '')) return i + 1;
  }
  return null;
}

/** Slice a card span's body lines out of the source.
 *  `startLine` is the //#card marker's line; `endLine` is the body's last line.
 *  Returns the text between (exclusive of marker line, inclusive of endLine). */
export function sliceSpanBody(source: string, startLine: number, endLine: number): string {
  const lines = source.split('\n');
  // startLine is 1-based; body starts on startLine+1.
  // endLine is 1-based, inclusive.
  if (endLine < startLine + 1) return '';
  return lines.slice(startLine, endLine).join('\n');
}
