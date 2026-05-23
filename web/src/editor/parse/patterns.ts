/* eslint-disable @typescript-eslint/no-explicit-any */
// Pattern matchers — recognize specific GLSL idioms and surface them as
// PatternHandles so the UX can render canvas-side direct-manipulation widgets
// (draggable circle center, smoothstep range slider, color swatch).
//
// Recognized patterns (per CONTRACTS.md §2):
//   1. `length(uv - vec2(X, Y))` (with optional `- R` for radius)  → circle
//   2. final `vec3(r, g, b)` flowing into gl_FragColor/fragColor    → color
//   3. `smoothstep(A, B, x)` where A and B are numeric literals     → smoothstep
//
// We only match the simple, fixed-shape forms. Anything else (e.g. a circle
// where cx is a computed expression) gets no handle — the user can still scrub
// the underlying literals via the editor's per-literal handles.

import { findNumericLeaves } from './walk';
import { findLiteralsFromAst } from './literals';
import type { LiteralHandle, PatternHandle } from '../index';

export function findPatternsFromAst(ast: unknown): PatternHandle[] {
  if (!ast) return [];

  const literals = findLiteralsFromAst(ast);
  // Build node→handle lookup from the leaves we already enumerated. Both
  // walkers see the same node refs, so identity-keyed lookup is safe.
  const leaves = findNumericLeaves(ast as any);
  const nodeToHandle = new Map<any, LiteralHandle>();
  let handleIdx = 0;
  for (const leaf of leaves) {
    if (leaf.kind === 'float_constant' || leaf.kind === 'int_constant') {
      const handle = literals[handleIdx++];
      if (handle && (handle.kind === 'float' || handle.kind === 'int')) {
        nodeToHandle.set(leaf.node, handle);
      }
    }
  }
  // Also map vec3-color leaf nodes to their handles.
  const colorHandles = literals.filter((h) => h.kind === 'vec3-color');
  let colorIdx = 0;
  for (const leaf of leaves) {
    if (leaf.kind === 'function_call_vec3_color') {
      const h = colorHandles[colorIdx++];
      if (h) nodeToHandle.set(leaf.node, h);
    }
  }

  const out: PatternHandle[] = [];
  const seen = new Set<any>();

  const walk = (node: any): void => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    if (typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    // ---- Circle: length(uv - vec2(X, Y))[ - R] ---------------------------
    // Look for function_call to `length`.
    if (node.type === 'function_call' && _fnName(node) === 'length') {
      const circle = _tryCircle(node, nodeToHandle);
      if (circle) out.push(circle);
      // Fall through to recurse — `length(...)` could itself contain children
      // worth visiting (unlikely here but cheap).
    }

    // ---- Smoothstep: smoothstep(A, B, x) ---------------------------------
    if (node.type === 'function_call' && _fnName(node) === 'smoothstep') {
      const ss = _trySmoothstep(node, nodeToHandle);
      if (ss) out.push(ss);
    }

    // Generic descent.
    for (const k of Object.keys(node)) {
      if (k === 'type' || k === 'whitespace') continue;
      walk(node[k]);
    }
  };
  walk(ast);

  // ---- Color: final vec3 flowing into gl_FragColor / fragColor -----------
  const color = _findFinalFragColorVec3(ast, nodeToHandle);
  if (color) out.push(color);

  return out;
}

// ────────────────────────────────────────────────────────────────────────────

function _fnName(call: any): string | null {
  const id = call.identifier;
  if (!id) return null;
  if (typeof id?.specifier?.token === 'string') return id.specifier.token;
  if (typeof id?.specifier?.specifier?.token === 'string') return id.specifier.specifier.token;
  if (typeof id?.identifier === 'string') return id.identifier;
  if (typeof id?.identifier?.identifier === 'string') return id.identifier.identifier;
  return null;
}

function _topLevelArgs(call: any): any[] {
  const args = call.args ?? [];
  const list: any[] = Array.isArray(args) ? args : [];
  // Skip punctuation (commas).
  return list.filter((a) => a && typeof a === 'object' && a.type !== 'literal');
}

function _isFloat(n: any): boolean {
  return n && (n.type === 'float_constant' || n.type === 'int_constant');
}

/** Match `vec2(X, Y)` literal call with 2 numeric children. */
function _matchVec2Literal(node: any): { x: any; y: any } | null {
  if (!node || node.type !== 'function_call') return null;
  if (_fnName(node) !== 'vec2') return null;
  const args = _topLevelArgs(node);
  if (args.length !== 2) return null;
  if (!_isFloat(args[0]) || !_isFloat(args[1])) return null;
  return { x: args[0], y: args[1] };
}

/** Match `uv - vec2(X, Y)` or `vec2(X, Y) - uv`. Returns the vec2's children. */
function _matchUvMinusVec2(node: any): { x: any; y: any } | null {
  if (!node || node.type !== 'binary' || node.operator?.literal !== '-') return null;
  const v = _matchVec2Literal(node.right) ?? _matchVec2Literal(node.left);
  return v ?? null;
}

function _tryCircle(
  lengthCall: any,
  nodeToHandle: Map<any, LiteralHandle>,
): PatternHandle | null {
  const args = _topLevelArgs(lengthCall);
  if (args.length !== 1) return null;
  const inner = args[0];

  // length(uv - vec2(X, Y))
  const vec2Match = _matchUvMinusVec2(inner);

  // Also accept: length(uv - vec2(X, Y)) - R    (handled at outer scope, but
  // we accept the raw form here; r-detection is at the caller level if needed).
  if (!vec2Match) return null;

  const cx = nodeToHandle.get(vec2Match.x);
  const cy = nodeToHandle.get(vec2Match.y);
  if (!cx || !cy) return null;
  return { kind: 'circle', cx, cy };
}

function _trySmoothstep(
  call: any,
  nodeToHandle: Map<any, LiteralHandle>,
): PatternHandle | null {
  const args = _topLevelArgs(call);
  if (args.length < 2) return null;
  if (!_isFloat(args[0]) || !_isFloat(args[1])) return null;
  const a = nodeToHandle.get(args[0]);
  const b = nodeToHandle.get(args[1]);
  if (!a || !b) return null;
  return { kind: 'smoothstep', a, b };
}

/**
 * Walk main()'s body in document order; the LAST assignment to gl_FragColor
 * or fragColor / out_color is what we examine. If its rhs is a vec3, that's
 * the color handle. If rhs is vec4(<vec3>, ...), unwrap.
 *
 * If no qualifying assignment is found, return null.
 */
function _findFinalFragColorVec3(
  ast: any,
  nodeToHandle: Map<any, LiteralHandle>,
): PatternHandle | null {
  const mainFn = _findFunctionNamed(ast, 'main');
  if (!mainFn) return null;
  const stmts: any[] = mainFn?.body?.statements ?? [];

  let lastVec3Call: any = null;
  for (const stmt of stmts) {
    const rhs = _extractFragColorRhs(stmt);
    if (!rhs) continue;
    const vec3 = _unwrapToVec3(rhs);
    if (vec3) lastVec3Call = vec3;
  }
  if (!lastVec3Call) return null;
  const h = nodeToHandle.get(lastVec3Call);
  if (!h || h.kind !== 'vec3-color') return null;
  return { kind: 'color', rgb: h };
}

function _findFunctionNamed(ast: any, name: string): any | null {
  const top = ast?.program ?? [];
  for (const item of top) {
    if (item?.type === 'function') {
      const fnName = item?.prototype?.header?.name?.identifier;
      if (fnName === name) return item;
    }
  }
  return null;
}

function _extractFragColorRhs(stmt: any): any | null {
  // Looks like:
  //   expression_statement { expression: { type: 'assignment', left: <id>, right: <expr> } }
  const expr = stmt?.expression ?? stmt;
  if (!expr || typeof expr !== 'object') return null;
  if (expr.type !== 'assignment') return null;
  const leftName = _identifierName(expr.left);
  if (!leftName) return null;
  if (!['gl_FragColor', 'fragColor', 'out_color', 'outColor'].includes(leftName)) {
    return null;
  }
  return expr.right;
}

function _identifierName(node: any): string | null {
  if (!node) return null;
  if (typeof node.identifier === 'string') return node.identifier;
  if (typeof node?.identifier?.identifier === 'string') return node.identifier.identifier;
  return null;
}

function _unwrapToVec3(node: any): any | null {
  if (!node || typeof node !== 'object') return null;
  if (node.type !== 'function_call') return null;
  const fn = _fnName(node);
  if (fn === 'vec3') return node;
  if (fn === 'vec4') {
    // Find the first vec3 arg.
    const args = _topLevelArgs(node);
    for (const a of args) {
      const inner = _unwrapToVec3(a);
      if (inner) return inner;
    }
  }
  return null;
}
