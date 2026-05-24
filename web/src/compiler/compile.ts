// Forward compiler. Recipe → CompileResult.
//
// Pipeline (handoff §"Forward compilation algorithm"):
//   1. #version + precision header.
//   2. `out vec4 fragColor`.
//   3. Global uniforms (always: time, mouse, resolution, tempo_bps).
//   4. Per-block uniform declarations.
//   5. Helper function definitions (deduplicated).
//   6. main() — uv/d/col prelude → recipe-header magic comment →
//      per-block emission (animation locals + substituted snippet, wrapped
//      in @shade:block / @shade:end markers) → fragColor write.
//
// `partialGlsl` is emitted on error: everything up to and including the
// LAST successfully compiled block + the closing fragColor + `}` so the
// renderer can still draw something while the user fixes the bad block.

import { animUniformBindings, emitAnimLocal } from './anim';
import { BLOCK_LIBRARY } from './blocks';
import { substitutePlaceholders } from './format';
import { GLSL_HELPERS, HELPER_EMISSION_ORDER, resolveHelperClosure } from './helpers';
import { emitBlockClose, emitBlockOpen, emitRecipeHeader } from './markers';
import type {
  BlockDef,
  Block,
  CompileError,
  CompileResult,
  Recipe,
  UniformBinding,
} from './types';

const GLOBAL_UNIFORM_DECLS: readonly string[] = [
  'uniform vec2 u_resolution;',
  'uniform float u_time;',
  'uniform vec2 u_mouse;',
  'uniform float u_tempo_bps;',
];

const GLOBAL_UNIFORM_BINDINGS: readonly UniformBinding[] = [
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
  const uniforms: UniformBinding[] = [...GLOBAL_UNIFORM_BINDINGS];

  // ── Pre-pass: validate + collect per-block uniforms + helpers ──────
  const perBlockUniformDecls: string[] = [];
  const helperRequests = new Set<string>();
  const enabledBlocks = recipe.blocks.filter((b) => b.enabled);

  for (const b of enabledBlocks) {
    const def = BLOCK_LIBRARY[b.type];
    if (!def) {
      return failPartial(
        { code: 'unknown_block_type', message: `unknown block type "${b.type}"`, blockId: b.id },
        recipe,
        b.id,
      );
    }
    const validation = validateBlockParams(b, def);
    if (validation) return failPartial(validation, recipe, b.id);

    if (def.helpers) for (const h of def.helpers) helperRequests.add(h);
    // noise_wiggle anim implicitly needs `noise` helper.
    for (const p of Object.values(b.params)) {
      if (p.animation?.type === 'noise_wiggle') helperRequests.add('noise');
    }

    collectUniformsForBlock(b, def, uniforms, perBlockUniformDecls);
  }
  const helperClosure = resolveHelperClosure(helperRequests);

  // ── Emit ────────────────────────────────────────────────────────────
  const lines: string[] = [];
  lines.push('#version 300 es');
  lines.push('precision highp float;');
  lines.push('');
  lines.push('out vec4 fragColor;');
  lines.push('');
  for (const d of GLOBAL_UNIFORM_DECLS) lines.push(d);
  lines.push('');

  if (perBlockUniformDecls.length > 0) {
    lines.push('// === per-block uniforms ===');
    for (const d of perBlockUniformDecls) lines.push(d);
    lines.push('');
  }

  const anyHelperEmitted = HELPER_EMISSION_ORDER.some(
    (name) => helperClosure.has(name) && GLSL_HELPERS[name],
  );
  if (anyHelperEmitted) lines.push('// === helpers ===');
  for (const name of HELPER_EMISSION_ORDER) {
    if (!helperClosure.has(name)) continue;
    const body = GLSL_HELPERS[name];
    if (!body) continue;
    for (const hl of body.split('\n')) lines.push(hl);
    lines.push('');
  }

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

  for (const b of enabledBlocks) {
    const def = BLOCK_LIBRARY[b.type]!; // pre-validated above
    emitBlock(b, def, lines);
  }

  for (const l of MAIN_EPILOGUE) lines.push(l);
  lines.push('}');

  return { ok: true, glsl: lines.join('\n'), uniforms };
}

// ─── Block emission ────────────────────────────────────────────────────

function emitBlock(b: Block, def: BlockDef, lines: string[]): void {
  lines.push('  ' + emitBlockOpen(b.id, b.type, b.params));

  // Animation locals first.
  for (const [pname, p] of Object.entries(b.params)) {
    if (p.animation) lines.push('  ' + emitAnimLocal(b.id, pname, p.animation));
  }

  // Substituted snippet — animated params resolve to the local name; static
  // params resolve to the uniform name. An unknown placeholder means the
  // BlockDef.glsl references a name that's not in def.params — almost
  // always a block-library authoring typo. Fail loudly so per-block tests
  // catch it instead of emitting a reference to an undeclared uniform.
  const snippet = substitutePlaceholders(def.glsl, (paramName) => {
    if (!(paramName in def.params)) {
      throw new Error(
        `[compiler] block "${def.type}" glsl references {{${paramName}}} which is not declared in def.params`,
      );
    }
    const p = b.params[paramName];
    if (p?.animation) return `_${b.id}_${paramName}`;
    return `u_${b.id}_${paramName}`;
  });
  for (const sl of snippet.split('\n')) lines.push('  ' + sl);

  lines.push('  ' + emitBlockClose(b.id));
  lines.push('');
}

// ─── Uniform collection ────────────────────────────────────────────────

function collectUniformsForBlock(
  b: Block,
  def: BlockDef,
  uniforms: UniformBinding[],
  decls: string[],
): void {
  for (const [paramName, paramDef] of Object.entries(def.params)) {
    const p = b.params[paramName];
    if (!p) continue; // pre-validated in validateBlockParams — defensive only.

    if (p.animation) {
      for (const ub of animUniformBindings(b.id, paramName, p.animation)) {
        uniforms.push(ub);
        decls.push(`uniform ${ub.type} ${ub.name};`);
      }
      continue;
    }

    // Static param → one uniform with the param's GL type.
    const name = `u_${b.id}_${paramName}`;
    const glType = glTypeForParam(paramDef.kind);
    if (glType) {
      decls.push(`uniform ${glType} ${name};`);
      uniforms.push({
        name,
        type: glType,
        source: { kind: 'static', blockId: b.id, paramName },
      });
    }
  }
}

function glTypeForParam(
  kind: BlockDef['params'][string]['kind'],
): 'float' | 'vec2' | 'vec3' | null {
  switch (kind) {
    case 'number':
      return 'float';
    case 'vec2':
      return 'vec2';
    case 'color':
      return 'vec3';
    case 'string':
      return null; // strings don't produce a uniform; they're inlined (custom block)
  }
}

// ─── Validation ────────────────────────────────────────────────────────

function validateBlockParams(b: Block, def: BlockDef): CompileError | null {
  for (const [name, defP] of Object.entries(def.params)) {
    const p = b.params[name];
    if (!p) {
      return {
        code: 'missing_param',
        message: `block "${b.id}" (${b.type}) is missing param "${name}"`,
        blockId: b.id,
        paramName: name,
      };
    }
    // color_cycle animation requires kind: 'color'.
    if (p.animation?.type === 'color_cycle' && defP.kind !== 'color') {
      return {
        code: 'param_type_mismatch',
        message: `block "${b.id}" param "${name}" has color_cycle animation but kind is ${defP.kind}`,
        blockId: b.id,
        paramName: name,
      };
    }
    // Other animations must NOT be on color params (they're scalar).
    if (p.animation && p.animation.type !== 'color_cycle' && defP.kind === 'color') {
      return {
        code: 'param_type_mismatch',
        message: `block "${b.id}" param "${name}" is a color but animation type "${p.animation.type}" is scalar`,
        blockId: b.id,
        paramName: name,
      };
    }
  }
  return null;
}

// ─── Partial-output failure path ───────────────────────────────────────

function failPartial(
  error: CompileError,
  recipe: Recipe,
  brokenBlockId: string,
): CompileResult {
  // Build a Recipe containing only the blocks BEFORE the broken one, then
  // compile that. Yields a renderable shader without the bad block.
  const stopIdx = recipe.blocks.findIndex((b) => b.id === brokenBlockId);
  const partialRecipe: Recipe = {
    ...recipe,
    blocks: stopIdx >= 0 ? recipe.blocks.slice(0, stopIdx) : [],
  };
  const partial = compile(partialRecipe);
  return {
    ok: false,
    error,
    partialGlsl: partial.ok ? partial.glsl : undefined,
  };
}

// Re-exported for tests / consumers that want validation independent of compile.
export { validateBlockParams };
