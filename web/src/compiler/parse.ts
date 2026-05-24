// Reverse parser — Shade-emitted GLSL → Recipe.
//
// Reads the @shade:block magic comments; never inspects the GLSL body
// inside them. Per the handoff: arbitrary GLSL is NOT this parser's job
// (that's the AI-import path).

import { BLOCK_LIBRARY } from './blocks';
import { parseAllBlockMarkers, parseRecipeHeader } from './markers';
import type { Block, Recipe } from './types';

export type ParseResult =
  | { ok: true; recipe: Recipe; unknownBlocks: string[] }
  | { ok: false; reason: 'not_shade_authored' | 'malformed_marker' | 'invalid_recipe_json' };

export function parseShadeGlsl(source: string): ParseResult {
  const header = parseRecipeHeader(source);
  if (!header) {
    return { ok: false, reason: 'not_shade_authored' };
  }
  const markers = parseAllBlockMarkers(source);
  // Empty recipe (header but no blocks) is valid.

  const blocks: Block[] = [];
  const unknownTypes = new Set<string>();
  for (const m of markers) {
    if (!BLOCK_LIBRARY[m.type]) unknownTypes.add(m.type);
    blocks.push({
      id: m.id,
      type: m.type,
      enabled: true,
      params: m.params as Block['params'],
    });
  }

  return {
    ok: true,
    recipe: {
      version: 1,
      blocks,
      globalTempo: header.globalTempo,
      canvasAspect: header.canvasAspect,
    },
    unknownBlocks: [...unknownTypes],
  };
}
