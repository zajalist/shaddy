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

// --- Stubbed surface (sub-projects E and F will implement) -------------------

export function findLiterals(_ast: Ast): LiteralHandle[] {
  // Sub-project E (issue #18, #19, #23). Returns [] until then.
  return [];
}

export function findPatterns(_ast: Ast): PatternHandle[] {
  // Sub-project F (issues #20, #21, #22). Returns [] until then.
  return [];
}

export function replaceLiteral(
  _src: string,
  _handleId: string,
  _newValue: number | [number, number, number],
): string {
  // Sub-project E (issue #23). Throw loudly so wrong call-sites surface during
  // dev rather than silently no-op.
  throw new Error('editor.replaceLiteral: not implemented yet (sub-project E)');
}
