// Turn a Recipe into a fragment shader that renders inside ONE tile of the
// shared landing-grid canvas.
//
// The cards compiler emits a full fragment body (helpers + main) that the
// renderer normally wraps with FRAGMENT_PREAMBLE and draws fullscreen. On the
// landing page we draw all 12 tiles into a single WebGL2 canvas using scissored
// sub-viewports, so the 2D template's `gl_FragCoord.xy / u_resolution` (which
// assumes a fullscreen draw) must be offset by the tile's origin. We inject a
// `u_tile_origin` uniform and rewrite that one prelude line. The 3D path uses
// `v_uv` (which interpolates correctly per-viewport) and needs no patch.

import { compile } from '@/cards';
import type { CompiledShader, Recipe } from '@/cards';
import { FRAGMENT_PREAMBLE } from '@/renderer';

// Vertex shader matching the renderer's: one fullscreen triangle that also
// works per-viewport (v_uv goes 0..1 across whatever viewport is bound).
export const TILE_VERT = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0,
                (gl_VertexID == 2) ? 3.0 : -1.0);
  v_uv = (p + 1.0) * 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

// The exact prelude line compile2d emits (see cards/compile.ts MAIN_PRELUDE).
const PRELUDE_2D = '  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;';
// Offset by the tile's framebuffer origin so each tile's centre maps to uv=0.
const PRELUDE_2D_TILED = '  vec2 uv = ((gl_FragCoord.xy - u_tile_origin) / u_resolution) * 2.0 - 1.0;';

export type TileFragment = {
  fragSrc: string;
  compiled: CompiledShader;
  is3d: boolean;
};

/** Compile a recipe and wrap it into a tile-ready fragment shader string. */
export function buildTileFragment(recipe: Recipe): TileFragment {
  const compiled = compile(recipe);
  const is3d = recipe.mode === '3d';
  const body = is3d ? compiled.glsl : compiled.glsl.replace(PRELUDE_2D, PRELUDE_2D_TILED);
  // u_tile_origin is harmless (unused) in the 3D path.
  const fragSrc = `${FRAGMENT_PREAMBLE}\nuniform vec2 u_tile_origin;\n${body}`;
  return { fragSrc, compiled, is3d };
}
