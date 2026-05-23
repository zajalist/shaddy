// GLSL parser wrapper. We pin to @shaderfrog/glsl-parser (modern, TS-friendly).
// The parser returns a tree-like AST; we treat it as opaque to consumers and
// only expose typed accessors via findLiterals / findPatterns (sub-projects E/F).
//
// `parse(src)` returns `null` on parse failure — callers should hand that to
// the empty-sentinel branch of the cache.

import { parser } from '@shaderfrog/glsl-parser';

export type GlslAst = unknown;
export const EMPTY_AST: GlslAst = Object.freeze({ type: 'empty', errors: [] });

export function parseGlsl(src: string): GlslAst | null {
  try {
    return parser.parse(src);
  } catch {
    return null;
  }
}
