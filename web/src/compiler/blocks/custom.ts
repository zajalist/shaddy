import type { BlockDef } from '../types';

// `custom` is the escape hatch — its `code` param is a string of raw GLSL
// that gets emitted verbatim inside a `{ ... }` block scope, so variable
// declarations inside it don't leak. The user provides `uv`, `d`, `col`
// just like any other block.
//
// The AI-import path also targets this block when Claude can't map
// to a typed block.

export const CUSTOM: BlockDef = {
  type: 'custom',
  category: 'custom',
  friendlyName: 'Custom code',
  icon: 'CodeSimple',
  description: 'Raw GLSL inside a block scope. Reads uv/d/col; writes d/col.',
  params: {
    code: {
      kind: 'string',
      default: '  // your code here\n  d = 0.5;',
      label: 'code',
      animatable: false,
    },
  },
  // `code` is special-cased in compile() — its template doesn't go through
  // substitutePlaceholders. Setting glsl to the placeholder is purely
  // documentary; compile.ts intercepts the type === 'custom' branch.
  glsl: '{{code}}',
};
