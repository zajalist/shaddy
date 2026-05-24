// Magic comment protocol that anchors each block's GLSL span in the emitted
// shader source. The reverse parser reads these — never the GLSL body.

import type { Recipe } from './types';

// Permissive whitespace so hand edits to the source (extra spaces, tabs)
// don't break round-trip.
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
  const out: BlockMarker[] = [];
  // Reset lastIndex since the regex is /g.
  BLOCK_OPEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BLOCK_OPEN_REGEX.exec(source)) !== null) {
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
