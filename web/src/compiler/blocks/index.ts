// BLOCK_LIBRARY — the canonical registry of every block type the compiler
// recognises. Task 7+ populate this with concrete BlockDef entries; for now
// it's an empty map so compile() / tests link cleanly with no blocks.

import type { BlockDef, BlockType } from '../types';

export const BLOCK_LIBRARY: Record<BlockType, BlockDef> = {};
