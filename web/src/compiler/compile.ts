// Forward compiler. Recipe → CompileResult.
//
// Pipeline (handoff §"Forward compilation algorithm"):
//   1. Precision / version header.
//   2. Global uniforms (always: time, mouse, resolution, tempo_bps).
//   3. Per-block uniform declarations.
//   4. Helper function definitions (deduplicated).
//   5. main() — uv/d/col prelude → recipe-header magic comment →
//      per-block emission → fragColor write.
//
// Per-block emission is in walkBlocks(); empty-recipe path skips it.

import { emitRecipeHeader } from './markers';
import type { CompileResult, Recipe, UniformBinding } from './types';

const GLOBAL_UNIFORM_DECLS: readonly string[] = [
  'uniform vec2 u_resolution;',
  'uniform float u_time;',
  'uniform vec2 u_mouse;',
  'uniform float u_tempo_bps;',
];

const GLOBAL_UNIFORM_BINDINGS: UniformBinding[] = [
  { name: 'u_resolution', type: 'vec2', source: { kind: 'global_resolution' } },
  { name: 'u_time', type: 'float', source: { kind: 'global_time' } },
  { name: 'u_mouse', type: 'vec2', source: { kind: 'global_mouse' } },
  { name: 'u_tempo_bps', type: 'float', source: { kind: 'global_tempo_bps' } },
];

const MAIN_PRELUDE = [
  '  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;',
  '  uv.x *= u_resolution.x / u_resolution.y;',
  '  float d = 0.0;',
  '  vec3 col = vec3(0.0);',
];

const MAIN_EPILOGUE = ['  fragColor = vec4(col, 1.0);'];

export function compile(recipe: Recipe): CompileResult {
  const lines: string[] = [];
  const uniforms: UniformBinding[] = [...GLOBAL_UNIFORM_BINDINGS];

  // 1. Version + precision + out
  lines.push('#version 300 es');
  lines.push('precision highp float;');
  lines.push('');
  lines.push('out vec4 fragColor;');
  lines.push('');

  // 2. Global uniforms
  for (const decl of GLOBAL_UNIFORM_DECLS) lines.push(decl);
  lines.push('');

  // 3. Per-block uniform decls + 4. helpers come in Task 6.

  // 5. main()
  lines.push('void main() {');
  for (const l of MAIN_PRELUDE) lines.push(l);
  lines.push('');
  lines.push(
    '  ' +
      emitRecipeHeader({
        globalTempo: recipe.globalTempo,
        canvasAspect: recipe.canvasAspect,
      }),
  );
  lines.push('');

  // Per-block walker in Task 6; no-op for now.

  for (const l of MAIN_EPILOGUE) lines.push(l);
  lines.push('}');

  return {
    ok: true,
    glsl: lines.join('\n'),
    uniforms,
  };
}
