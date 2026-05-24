// Shade Compiler — public surface. Importers get EXACTLY this; everything
// else is internal. See docs/superpowers/specs/2026-05-23-compiler-rework.md
// and the engineering handoff for the contract.

export type {
  Recipe,
  Block,
  BlockType,
  Parameter,
  ParamValue,
  Animation,
  BlockDef,
  ParamDef,
  CompileResult,
  UniformBinding,
  CompileError,
} from './types';

export { compile } from './compile';
export { parseShadeGlsl } from './parse';
export type { ParseResult } from './parse';
export { BLOCK_LIBRARY, BLOCK_LIBRARY_LIST } from './blocks';
export { makeDefaultBlock, validateRecipe } from './default-block';
export type { ValidateResult } from './default-block';
