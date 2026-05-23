// Card-boundary markers in the emitted GLSL.
//
// Format (one card per marker, one marker per source line):
//
//   //#card <cardId> <friendlyName> { <paramKey>:<displayValue>, ... }
//   ...card body...
//   //#card <cardId2> <friendlyName2>
//   ...
//   //#end
//
// The closing `//#end` is required so the last card's span has a fixed
// terminator. Marker lines and the `//#end` line are rendered as atomic,
// uneditable decorations in the code view — users can't put their cursor
// in them, so they can't accidentally delete or mangle them.

export const MARKER_PREFIX = '//#card';
export const END_MARKER = '//#end';

export type MarkerLine = {
  /** 1-based line number in the full source string. */
  lineNumber: number;
  cardId: string;
  friendlyName: string;
};

export type EndMarker = {
  lineNumber: number;
};

// ─── Formatting ─────────────────────────────────────────────────────────

export function formatCardMarker(opts: {
  cardId: string;
  friendlyName: string;
  paramDisplays?: Record<string, string>;
}): string {
  const head = `${MARKER_PREFIX} ${opts.cardId} ${opts.friendlyName}`;
  const displays = opts.paramDisplays;
  if (!displays) return head;
  const entries = Object.entries(displays);
  if (entries.length === 0) return head;
  const inside = entries.map(([k, v]) => `${k}:${v}`).join(', ');
  return `${head} { ${inside} }`;
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
  // Strip any trailing `{ ... }` (the parameter display block).
  const braceIdx = rest.indexOf('{');
  const head = braceIdx >= 0 ? rest.slice(0, braceIdx).trim() : rest;
  const spaceIdx = head.indexOf(' ');
  if (spaceIdx < 0) {
    return { lineNumber, cardId: head, friendlyName: '' };
  }
  return {
    lineNumber,
    cardId: head.slice(0, spaceIdx),
    friendlyName: head.slice(spaceIdx + 1).trim(),
  };
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
