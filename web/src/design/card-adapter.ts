// Bridges the real cards library (@/cards) to the design/ UI's BlockDef shape.
//
// The design route was built as a standalone visual prototype with its own
// BlockDef / BlockMini types and a hardcoded BLOCK_LIB of 17 stylized blocks.
// This adapter wraps the real 94-card CARD_LIBRARY_LIST so the same visual
// components can render real cards without changing their props.
//
// Two category vocabularies — keep them mapped here so the rest of design/
// can keep using CategoryKey ('shape' | 'distort' | 'color' | 'effect').

import type { CardDef, CardCategory, Parameter, TypedCard } from '@/cards';
import { CARD_LIBRARY_LIST } from '@/cards';

import type { BlockDef, BlockMini, CategoryKey } from './tokens';

export function categoryToBlock(cat: CardCategory): CategoryKey {
  switch (cat) {
    case 'shape': return 'shape';
    case 'distortion': return 'distort';
    case 'color': return 'color';
    case 'effect': return 'effect';
  }
}

/** Map a CardDef → a BlockDef the design/ components already know how to
 *  render. The block id is the card *type* (e.g. 'radial_gradient') so the
 *  Palette can call insertTypedCard(blockId) directly. */
export function cardDefToBlockDef(def: CardDef): BlockDef {
  return {
    id: def.type,
    cat: categoryToBlock(def.category),
    name: def.friendlyName.toUpperCase(),
    // Custom SVG icons live in design/card-icons.tsx under the `card-<kebab>`
    // namespace; icons.tsx merges them into the renderer registry. Card defs
    // keep their emoji `def.icon` for the cards/ side of the world.
    icon: `card-${def.type.replace(/_/g, '-')}`,
    mini: defaultMiniFor(def),
  };
}

/** Build a default mini-preview based on the CardDef's first param. Used for
 *  Palette items where there's no live TypedCard yet. */
export function defaultMiniFor(def: CardDef): BlockMini {
  const entries = Object.entries(def.params);
  if (entries.length === 0) return { kind: 'slider', label: '·', value: 0.5 };
  // Try to find a color param first — it makes for a more interesting preview.
  const colorEntries = entries.filter(([, p]) => p.kind === 'color');
  if (colorEntries.length > 0) {
    const swatches = colorEntries.slice(0, 4).map(([, p]) => {
      if (p.kind !== 'color') return '#888';
      const [r, g, b] = p.default;
      return rgbToHex(r, g, b);
    });
    return { kind: 'swatches', values: swatches };
  }
  const [key, p] = entries[0]!;
  if (p.kind === 'float') {
    return { kind: 'slider', label: shortLabel(key), value: paramToNormalized(p.default, p) };
  }
  if (p.kind === 'select') {
    // Map the default option's index to a 0..1 slot so the mini slider hints
    // at the selection without being interactive.
    const idx = Math.max(0, p.options.findIndex((o) => o.value === p.default));
    const norm = p.options.length > 1 ? idx / (p.options.length - 1) : 0;
    const optLabel = p.options[idx]?.label ?? shortLabel(key);
    return { kind: 'slider', label: optLabel.slice(0, 6), value: norm };
  }
  return { kind: 'slider', label: '·', value: 0.5 };
}

/** Same as defaultMiniFor but using a live TypedCard's current values. */
export function miniForCard(def: CardDef, card: TypedCard): BlockMini {
  const entries = Object.entries(def.params);
  if (entries.length === 0) return { kind: 'slider', label: '·', value: 0.5 };
  const colorEntries = entries.filter(([, p]) => p.kind === 'color');
  if (colorEntries.length > 0) {
    const swatches = colorEntries.slice(0, 4).map(([key, p]) => {
      if (p.kind !== 'color') return '#888';
      const v = (card.params[key]?.value ?? p.default) as readonly [number, number, number];
      return rgbToHex(v[0], v[1], v[2]);
    });
    return { kind: 'swatches', values: swatches };
  }
  const [key, p] = entries[0]!;
  if (p.kind === 'float') {
    const live = (card.params[key]?.value ?? p.default) as number;
    return { kind: 'slider', label: shortLabel(key), value: paramToNormalized(live, p) };
  }
  if (p.kind === 'select') {
    const live = (card.params[key]?.value ?? p.default) as number;
    const idx = Math.max(0, p.options.findIndex((o) => o.value === live));
    const norm = p.options.length > 1 ? idx / (p.options.length - 1) : 0;
    const optLabel = p.options[idx]?.label ?? shortLabel(key);
    return { kind: 'slider', label: optLabel.slice(0, 6), value: norm };
  }
  return { kind: 'slider', label: '·', value: 0.5 };
}

/** Map a typed card-param float value (min..max range) → 0..1 normalized for
 *  the existing SliderRail / mini slider components. */
export function paramToNormalized(
  value: number,
  def: { min: number; max: number },
): number {
  const span = def.max - def.min;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (value - def.min) / span));
}

export function normalizedToParam(
  norm: number,
  def: { min: number; max: number; step?: number },
): number {
  const clamped = Math.max(0, Math.min(1, norm));
  const raw = def.min + clamped * (def.max - def.min);
  if (!def.step || def.step <= 0) return raw;
  const snapped = Math.round((raw - def.min) / def.step) * def.step + def.min;
  return Math.max(def.min, Math.min(def.max, snapped));
}

/** Short label suitable for the in-block mini slider. Trims to the first
 *  syllable-ish chunk so it fits the cramped 9px caption. */
function shortLabel(key: string): string {
  const cleaned = key.replace(/_/g, ' ').toLowerCase();
  // Take the first word, max 6 chars
  const first = cleaned.split(' ')[0] ?? cleaned;
  return first.slice(0, 6);
}

function rgbToHex(r: number, g: number, b: number): string {
  const to255 = (v: number) => {
    const n = Math.max(0, Math.min(255, Math.round(v * 255)));
    return n.toString(16).padStart(2, '0');
  };
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

/** The library list, materialized as BlockDefs in their original card order. */
export const ALL_BLOCKS: BlockDef[] = CARD_LIBRARY_LIST.map(cardDefToBlockDef);

/** Fast lookup by card type. */
const REAL_BLOCK_BY_ID: Record<string, BlockDef> = Object.fromEntries(
  ALL_BLOCKS.map((b) => [b.id, b]),
);

// First card in each category — used as a category-aware fallback when a
// legacy id can't be resolved exactly.
const FIRST_BY_CAT: Record<CategoryKey, BlockDef | undefined> = {
  shape:   ALL_BLOCKS.find((b) => b.cat === 'shape'),
  distort: ALL_BLOCKS.find((b) => b.cat === 'distort'),
  color:   ALL_BLOCKS.find((b) => b.cat === 'color'),
  effect:  ALL_BLOCKS.find((b) => b.cat === 'effect'),
};

// The Landing + DesktopApp prototype components were written against an
// earlier curated 17-block library and call blockById('circle'), 'ripple',
// 'palette', etc. Those ids don't exist in the real 94-card library, so we
// map them to category-appropriate cards. Keeps the visual demo intact while
// the rest of the design route is being wired to real cards.
const LEGACY_ALIAS_CAT: Record<string, CategoryKey> = {
  circle: 'shape',
  stripes: 'shape',
  voronoi: 'shape',
  grid: 'shape',
  noise: 'shape',
  ripple: 'distort',
  swirl: 'distort',
  kaleido: 'distort',
  warp: 'distort',
  palette: 'color',
  hueshift: 'color',
  invert: 'color',
  contrast: 'color',
  glow: 'effect',
  bloom: 'effect',
  feedback: 'effect',
  grain: 'effect',
};

/** Lookup that never returns undefined — falls back via legacy alias →
 *  category → first card so prototype code paths stay alive even when the
 *  real card library doesn't carry the exact id the demo asked for. */
export const BLOCK_BY_ID: Record<string, BlockDef> = new Proxy(REAL_BLOCK_BY_ID, {
  get(target, prop: string) {
    if (prop in target) return target[prop];
    const aliasCat = LEGACY_ALIAS_CAT[prop];
    if (aliasCat && FIRST_BY_CAT[aliasCat]) return FIRST_BY_CAT[aliasCat];
    return ALL_BLOCKS[0];
  },
}) as Record<string, BlockDef>;

// Re-export the Parameter type for downstream design/ files that need it.
export type { Parameter };
