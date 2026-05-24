// Magic comment protocol that anchors each block's GLSL span in the emitted
// shader source. The reverse parser reads these — never the GLSL body.

import type { Recipe } from './types';

/**
 * Matches one block-open marker line. Permissive whitespace so hand edits
 * (extra spaces, tabs) don't break round-trip.
 *
 * **Foot-gun:** this regex has the `/g` flag, which means `.exec()` /
 * `.test()` mutate its `lastIndex` as a side effect. `parseAllBlockMarkers`
 * defensively builds a fresh clone before scanning. If you call this regex
 * directly (e.g. from a test), be aware that subsequent calls from elsewhere
 * may skip matches until `lastIndex` is reset to 0.
 *
 * Capture groups: 1 = id, 2 = type, 3 = params JSON (single-line; never
 * contains a literal LF because `JSON.stringify` escapes newlines to `\\n`).
 */
export const BLOCK_OPEN_REGEX =
  /\/\/\s*@shade:block\s+id="([^"]+)"\s+type="([^"]+)"\s+params=(\{[^\n]*\})/g;

const RECIPE_HEADER_REGEX =
  /\/\/\s*@shade:recipe\s+tempo=(\d+(?:\.\d+)?)\s+aspect=(square|portrait|landscape)/;

export type BlockMarker = {
  id: string;
  type: string;
  params: Record<string, unknown>;
};

export function emitBlockOpen(
  id: string,
  type: string,
  params: Record<string, unknown>,
): string {
  // Embedding raw JSON in a // comment works because GLSL preprocessing
  // strips // comments before tokenization. If you ever pre-process the
  // source through a JS pipeline that re-quotes strings, this WILL break.
  return `// @shade:block id="${id}" type="${type}" params=${JSON.stringify(params)}`;
}

export function emitBlockClose(id: string): string {
  return `// @shade:end ${id}`;
}

export function emitRecipeHeader(opts: {
  globalTempo: number;
  canvasAspect: Recipe['canvasAspect'];
}): string {
  return `// @shade:recipe tempo=${opts.globalTempo} aspect=${opts.canvasAspect}`;
}

export function parseAllBlockMarkers(source: string): BlockMarker[] {
  // Fresh clone — never touch the exported regex's `lastIndex`. Cheap, and
  // protects against any external caller (incl. our own test file) having
  // run `.test()` / `.exec()` on it without resetting.
  const re = new RegExp(BLOCK_OPEN_REGEX.source, 'g');
  const out: BlockMarker[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const [, id, type, paramsJson] = match;
    let params: Record<string, unknown>;
    try {
      params = JSON.parse(paramsJson!) as Record<string, unknown>;
    } catch {
      // Malformed JSON inside the marker — skip; the caller can detect via
      // count mismatch and surface to the user.
      continue;
    }
    out.push({ id: id!, type: type!, params });
  }
  return out;
}

export function parseRecipeHeader(
  source: string,
): { globalTempo: number; canvasAspect: Recipe['canvasAspect'] } | null {
  const m = RECIPE_HEADER_REGEX.exec(source);
  if (!m) return null;
  return {
    globalTempo: Number(m[1]),
    canvasAspect: m[2] as Recipe['canvasAspect'],
  };
}
