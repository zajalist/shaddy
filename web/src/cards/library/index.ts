// The v1 card library. 4 typed cards across all four categories, plus the
// wildcard constants. Adding more cards is content work — drop a file in
// this folder, add it to CARD_LIBRARY_LIST, and the compiler + UI pick it
// up automatically.

import type { CardDef } from '../types';
import { PALETTE } from './palette';
import { RADIAL_GRADIENT } from './radial-gradient';
import { RIPPLE } from './ripple';
import { VIGNETTE } from './vignette';

export { PALETTE, RADIAL_GRADIENT, RIPPLE, VIGNETTE };
export {
  WILDCARD_DISPLAY_NAME_FALLBACK,
  WILDCARD_FRIENDLY_NAME,
  WILDCARD_ICON,
  WILDCARD_TYPE,
} from './wildcard';

export const CARD_LIBRARY_LIST: CardDef[] = [RADIAL_GRADIENT, RIPPLE, PALETTE, VIGNETTE];

export const CARD_LIBRARY: Record<string, CardDef> = Object.fromEntries(
  CARD_LIBRARY_LIST.map((c) => [c.type, c]),
);

export function lookupCardDef(type: string): CardDef | null {
  return CARD_LIBRARY[type] ?? null;
}
