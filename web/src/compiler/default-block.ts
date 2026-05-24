// Small utilities the editor team needs for constructing fresh blocks +
// pre-flight-checking recipes before handing them to compile().

import { nanoid } from 'nanoid';

import { BLOCK_LIBRARY } from './blocks';
import { compile } from './compile';
import type { Block, CompileError, Parameter, Recipe } from './types';

export function makeDefaultBlock(type: string): Block {
  const def = BLOCK_LIBRARY[type];
  if (!def) throw new Error(`makeDefaultBlock: unknown block type "${type}"`);
  const params: Record<string, Parameter> = {};
  for (const [k, p] of Object.entries(def.params)) {
    params[k] = { value: p.default, animation: null };
  }
  return { id: nanoid(8), type, enabled: true, params };
}

export type ValidateResult = { ok: true } | { ok: false; errors: CompileError[] };

export function validateRecipe(recipe: Recipe): ValidateResult {
  // Cheap: try a compile. If it errors, surface the error. Anything that
  // would block the renderer is captured by the compiler's own validation.
  const c = compile(recipe);
  if (c.ok) return { ok: true };
  return { ok: false, errors: [c.error] };
}
