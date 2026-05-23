// editor/ — public surface. See CONTRACTS.md §2.
//
// The editor owns: CodeMirror integration, GLSL parsing, AST cache, and (in
// sub-projects E/F) the bidirectional binding (numeric scrub, color picker,
// pattern handles).
//
// Source is the single source of truth. There is no internal "handle state".
// Drag = replaceLiteral(src, id, value) = onSourceChange(new_src).

import { AstCache } from './parse/ast-cache';
import { EMPTY_AST, parseGlsl } from './parse/glsl';
import type { GlslAst } from './parse/glsl';

// Re-export the public types (see CONTRACTS.md §2).

import type { GLSLError } from '../renderer';

export type LiteralKind = 'float' | 'int' | 'vec3-color';

export type LiteralHandle = {
  id: string;
  kind: LiteralKind;
  loc: { start: number; end: number; line: number; column: number };
  value: number | [number, number, number];
};

export type PatternHandle =
  | { kind: 'circle'; cx: LiteralHandle; cy: LiteralHandle; r?: LiteralHandle }
  | { kind: 'color'; rgb: LiteralHandle }
  | { kind: 'smoothstep'; a: LiteralHandle; b: LiteralHandle };

export interface EditorProps {
  source: string;
  onSourceChange(next: string): void;
  errors?: GLSLError[];
  onPatternsChange?(handles: PatternHandle[]): void;
}

// The real CodeMirror-backed editor. Use this in the integration layer.
export { CodeMirrorPane as EditorPane } from './cm/codemirror-pane';

// Zustand source store. Use when you want a shared source string across
// components rather than passing through props.
export { useEditorStore } from './state';
export type { EditorState } from './state';

// --- Parsing surface ---------------------------------------------------------

export type Ast = GlslAst;

const _cache = new AstCache<Ast>(parseGlsl, EMPTY_AST);

/** Parse GLSL source into an AST. Cached by exact source string.
 *  Same input -> same object reference. Broken source returns an empty AST. */
export function parse(src: string): Ast {
  return _cache.get(src);
}

/** Reset the AST cache. Tests only. */
export function _resetParseCache(): void {
  // Replace the internal map. Quick hack — works because AstCache exposes
  // `size()` for assertions but no public clear.
  while (_cache.size() > 0) {
    // No public iterator; reach into private state for tests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inner: Map<unknown, unknown> = (_cache as any).map;
    inner.clear();
  }
}

// --- Literal extraction + mutation (sub-project E) ---------------------------

import { findLiteralsFromAst, replaceLiteralInSource } from './parse/literals';

/** Walk the AST and return every numeric literal and `vec3(f, f, f)` color
 *  literal in source order. IDs are stable across literal-value edits. */
export function findLiterals(ast: Ast): LiteralHandle[] {
  return findLiteralsFromAst(ast);
}

/** Replace a literal by handle id, returning the new source string.
 *  Source is the single source of truth — there is no separate handle state. */
export function replaceLiteral(
  src: string,
  handleId: string,
  newValue: number | [number, number, number],
): string {
  return replaceLiteralInSource(src, handleId, newValue);
}

// --- Pattern matchers (sub-project F) ----------------------------------------

import { findPatternsFromAst } from './parse/patterns';

export function findPatterns(ast: Ast): PatternHandle[] {
  return findPatternsFromAst(ast);
}
