// BLOCK_LIBRARY — the canonical registry of every block type the compiler
// recognises. The AI-import path (separate module) also reads this to know
// what types Claude is allowed to emit.

import type { BlockDef } from '../types';
import { PALETTE } from './palette';
import { RADIAL_GRADIENT } from './radial-gradient';
import { RIPPLE } from './ripple';

export { PALETTE, RADIAL_GRADIENT, RIPPLE };

const ALL: BlockDef[] = [RADIAL_GRADIENT, RIPPLE, PALETTE];

export const BLOCK_LIBRARY: Record<string, BlockDef> = Object.fromEntries(
  ALL.map((b) => [b.type, b]),
);

export const BLOCK_LIBRARY_LIST: readonly BlockDef[] = ALL;
