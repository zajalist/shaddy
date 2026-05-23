// Public-API-facing literal extraction and mutation.
//
// IDs are sequential per-kind in source order:
//   float-0, float-1, ...   (every float_constant in document order)
//   int-0, int-1, ...
//   vec3-color-0, vec3-color-1, ...
//
// IDs stay stable across edits to literal VALUES (since the count + order of
// literals don't change). They DO change if the user adds/removes a literal,
// but that's expected.

import { parseGlsl } from './glsl';
import { findNumericLeaves, generateSource } from './walk';
import type { LiteralHandle } from '../index';

export function findLiteralsFromSource(src: string): LiteralHandle[] {
  const ast = parseGlsl(src);
  if (!ast) return [];
  return findLiteralsFromAst(ast, src);
}

export function findLiteralsFromAst(ast: unknown, src?: string): LiteralHandle[] {
  const leaves = findNumericLeaves(ast as any);
  let floatIdx = 0;
  let intIdx = 0;
  let colorIdx = 0;

  const handles: LiteralHandle[] = [];
  for (const leaf of leaves) {
    if (leaf.kind === 'float_constant') {
      const value = Number(leaf.text);
      handles.push({
        id: `float-${floatIdx++}`,
        kind: 'float',
        loc: { start: leaf.start, end: leaf.end, ..._lineCol(src, leaf.start) },
        value,
      });
    } else if (leaf.kind === 'int_constant') {
      const value = Number(leaf.text);
      handles.push({
        id: `int-${intIdx++}`,
        kind: 'int',
        loc: { start: leaf.start, end: leaf.end, ..._lineCol(src, leaf.start) },
        value,
      });
    } else if (leaf.kind === 'function_call_vec3_color') {
      // Skip color tracking here — emitted as a vec3-color below in a second
      // pass to keep the indexing per-kind clean.
    }
  }

  // Second pass for colors (preserve their own index sequence).
  for (const leaf of leaves) {
    if (leaf.kind !== 'function_call_vec3_color') continue;
    const children = leaf.numericChildren ?? [];
    if (children.length !== 3) continue;
    const triple = children.map((c) => Number(c.token));
    handles.push({
      id: `vec3-color-${colorIdx++}`,
      kind: 'vec3-color',
      loc: { start: leaf.start, end: leaf.end, ..._lineCol(src, leaf.start) },
      value: [triple[0], triple[1], triple[2]],
    });
  }

  return handles;
}

export function replaceLiteralInSource(
  src: string,
  handleId: string,
  newValue: number | [number, number, number],
): string {
  const ast = parseGlsl(src);
  if (!ast) throw new Error('editor.replaceLiteral: source does not parse');

  const leaves = findNumericLeaves(ast);

  if (handleId.startsWith('float-')) {
    const i = Number(handleId.slice('float-'.length));
    const target = _nth(leaves, 'float_constant', i);
    if (!target) throw new Error(`editor.replaceLiteral: no float at index ${i}`);
    if (typeof newValue !== 'number') {
      throw new Error('editor.replaceLiteral: float handle requires number value');
    }
    target.node.token = _formatFloat(newValue);
    return generateSource(ast);
  }

  if (handleId.startsWith('int-')) {
    const i = Number(handleId.slice('int-'.length));
    const target = _nth(leaves, 'int_constant', i);
    if (!target) throw new Error(`editor.replaceLiteral: no int at index ${i}`);
    if (typeof newValue !== 'number') {
      throw new Error('editor.replaceLiteral: int handle requires number value');
    }
    target.node.token = String(Math.trunc(newValue));
    return generateSource(ast);
  }

  if (handleId.startsWith('vec3-color-')) {
    const i = Number(handleId.slice('vec3-color-'.length));
    const target = _nth(leaves, 'function_call_vec3_color', i);
    if (!target) throw new Error(`editor.replaceLiteral: no vec3-color at index ${i}`);
    if (!Array.isArray(newValue) || newValue.length !== 3) {
      throw new Error('editor.replaceLiteral: vec3-color handle requires [r, g, b]');
    }
    const children = target.numericChildren ?? [];
    if (children.length !== 3) {
      throw new Error('editor.replaceLiteral: vec3-color target has malformed children');
    }
    for (let k = 0; k < 3; k++) {
      children[k].token = _formatFloat(newValue[k]);
    }
    return generateSource(ast);
  }

  throw new Error(`editor.replaceLiteral: unknown handle id ${handleId}`);
}

function _nth<T extends { kind: string }>(arr: T[], kind: string, n: number): T | undefined {
  let count = 0;
  for (const x of arr) {
    if (x.kind !== kind) continue;
    if (count === n) return x;
    count++;
  }
  return undefined;
}

function _formatFloat(x: number): string {
  // GLSL float literals need a decimal point. Use shortest representation
  // that round-trips. `10` -> `10.0`, `8.3` -> `8.3`.
  const s = String(x);
  if (!s.includes('.') && !s.includes('e') && !s.includes('E')) {
    return s + '.0';
  }
  return s;
}

function _lineCol(src: string | undefined, start: number): { line: number; column: number } {
  if (!src) return { line: 1, column: 1 };
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < start && i < src.length; i++) {
    if (src.charCodeAt(i) === 10 /* \n */) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: start - lineStart + 1 };
}
