// Curated recipes for the /gallery page.
//
// Each entry is a hand-tuned Recipe built from cards in the library. The
// `mk(type, overrides)` helper looks up the CardDef so we get every param
// filled with its declared default, then merges in any overrides as
// `Parameter` values — keeping each recipe declaration to the minimum that
// makes a particular look distinct.
//
// `mode: '3d'` is set on the few recipes that combine raymarched SDF cards;
// the gallery's mode-filter chips read `recipe.mode ?? '2d'`.

import {
  CARD_LIBRARY,
  generateCardId,
  type Card,
  type Parameter,
  type ParameterValue,
  type Recipe,
  type TypedCard,
} from '@/cards';

export type CuratedRecipe = {
  id: string;
  title: string;
  tag: string;
  author: string;
  recipe: Recipe;
  featured?: boolean;
  recent?: boolean;
};

// ─── helpers ────────────────────────────────────────────────────────────

/**
 * Build a TypedCard from a library type + optional param overrides.
 * Pulls defaults from the live CARD_LIBRARY so we never drift from the
 * source of truth on what params a card has.
 */
function mk(type: string, overrides: Record<string, ParameterValue> = {}): TypedCard {
  const def = CARD_LIBRARY[type];
  if (!def) throw new Error(`gallery: unknown card type "${type}"`);
  const params: Record<string, Parameter> = {};
  for (const [k, p] of Object.entries(def.params)) {
    // Media params (image/video) default to null; gallery recipes don't
    // include any such cards so this defensive `?? 0` is unreachable for
    // shipped recipes, but satisfies the now-nullable ParameterValue type.
    const next: ParameterValue = (
      k in overrides ? overrides[k]! : (p.default ?? 0)
    );
    params[k] = { value: next, animation: null };
  }
  // Surface typos early — silently dropping unknown override keys would
  // make a "scale: 4" override on a card without `scale` look correct.
  for (const k of Object.keys(overrides)) {
    if (!(k in def.params)) {
      throw new Error(`gallery: card "${type}" has no param "${k}"`);
    }
  }
  return {
    kind: 'typed',
    id: generateCardId(),
    type,
    enabled: true,
    params,
    alpha: 1,
    blendMode: 'normal',
  };
}

function recipe2d(cards: Card[]): Recipe {
  return { canvasAspect: 'square', cards };
}
function recipe3d(cards: Card[]): Recipe {
  return { canvasAspect: 'square', cards, mode: '3d' };
}

// ─── curated set ────────────────────────────────────────────────────────
// 14 recipes — 11 in 2D, 3 in 3D — picked to span the library's range
// (sdf primitives, noise, fractals, glitch, raymarched). The tags are
// use-case framings: what this recipe could SHIP as.

export const CURATED_RECIPES: CuratedRecipe[] = [
  {
    id: 'sunset-glow',
    title: 'Sunset Glow',
    tag: 'Drop it behind your travel app hero',
    author: 'by Nadia Werth',
    featured: true,
    recipe: recipe2d([
      mk('radial_gradient', { softness: 0.9 }),
      mk('palette_themed', { preset: 0 }),
      mk('vignette', { inner: 0.5, outer: 1.3, strength: 0.7 }),
      mk('grain', { amount: 0.08 }),
    ]),
  },
  {
    id: 'plasma-wave',
    title: 'Plasma Wave',
    tag: 'Sci-fi loading screen, no copyright to worry about',
    author: 'by Tomás Lacanal',
    featured: true,
    recipe: recipe2d([
      mk('plasma', { scale: 3, speed: 0.6 }),
      mk('palette_themed', { preset: 1 }),
      mk('bloom', { threshold: 0.6, intensity: 1.4 }),
    ]),
  },
  {
    id: 'voronoi-cells',
    title: 'Voronoi Cells',
    tag: 'Music video intro — that one shot before the drop',
    author: 'by Iris Mendes',
    recipe: recipe2d([
      mk('voronoi_cells', { scale: 6, jitter: 0.9 }),
      mk('palette_themed', { preset: 2 }),
      mk('contrast', { amount: 1.25 }),
      mk('film_grain_color', { amount: 0.12 }),
    ]),
  },
  {
    id: 'glassy-sphere',
    title: 'Glassy Sphere',
    tag: 'The product hero shot you keep meaning to commission',
    author: 'by Marek Halsig',
    featured: true,
    recipe: recipe3d([
      mk('sphere_3d', { r: 0.85, cy: 0.7 }),
      mk('ground_3d', { h: -0.15 }),
      mk('material_color_3d', { color: [0.35, 0.78, 0.92] }),
    ]),
  },
  {
    id: 'forest-of-rods',
    title: 'Forest of Rods',
    tag: 'Podcast cover that loops without anyone noticing',
    author: 'by Anya Kotani',
    recipe: recipe3d([
      mk('repeat_3d', { spacing_xz: 1.6 }),
      mk('box_3d', { sx: 0.18, sy: 1.1, sz: 0.18 }),
      mk('ground_3d', { h: -0.2 }),
      mk('material_color_3d', { color: [0.22, 0.46, 0.28] }),
    ]),
  },
  {
    id: 'mandelbulb-echo',
    title: 'Mandelbulb Echo',
    tag: 'Album art a teenage you would have killed for',
    author: 'by Soren Vass',
    featured: true,
    recent: true,
    recipe: recipe2d([
      mk('mandelbulb_2d', { zoom: 1.2, power: 8 }),
      mk('palette_themed', { preset: 4 }),
      mk('bloom', { threshold: 0.5, intensity: 1.6 }),
    ]),
  },
  {
    id: 'liquid-marble',
    title: 'Liquid Marble',
    tag: 'Skincare site background, calm and slightly expensive',
    author: 'by Priya Nair',
    recipe: recipe2d([
      mk('domain_warp', { scale: 2.4, warp: 1.6 }),
      mk('palette_themed', { preset: 3 }),
      mk('halftone', { scale: 110, angle: 0.6 }),
    ]),
  },
  {
    id: 'hex-tiles',
    title: 'Hex Tiles',
    tag: 'Mobile game menu, but you cared about the menu',
    author: 'by Jules Boucher',
    recent: true,
    recipe: recipe2d([
      mk('hex_grid', { scale: 8 }),
      mk('palette_themed', { preset: 5 }),
      mk('vignette', { inner: 0.4, outer: 1.4, strength: 0.6 }),
    ]),
  },
  {
    id: 'stellar-field',
    title: 'Stellar Field',
    tag: 'Astronomy app splash — works even on a 60Hz screen',
    author: 'by Cassia Renwick',
    recipe: recipe2d([
      mk('noise_field', { scale: 4 }),
      mk('fbm', { scale: 2.5, drift: 0.4 }),
      mk('palette_themed', { preset: 0 }),
      mk('glow', { threshold: 0.55, intensity: 1.5 }),
    ]),
  },
  {
    id: 'crt-boot',
    title: 'CRT Boot',
    tag: 'Bootloader vibes, optional scanlines, free crunch',
    author: 'by Dmitri Esper',
    featured: true,
    recipe: recipe2d([
      mk('stripes', { frequency: 16 }),
      mk('mirror_x', {}),
      mk('palette_themed', { preset: 4 }),
      mk('crt_curvature', { strength: 0.18 }),
      mk('vhs_glitch', { amount: 0.35 }),
    ]),
  },
  {
    id: 'ascii-storm',
    title: 'Ascii Storm',
    tag: 'Devlog header for the project you keep promising to finish',
    author: 'by Hye-Jin Park',
    recent: true,
    recipe: recipe2d([
      mk('turbulence', { scale: 3 }),
      mk('palette_themed', { preset: 6 }),
      mk('ascii', { cell_size: 10, levels: 8 }),
    ]),
  },
  {
    id: 'pulsing-heart',
    title: 'Pulsing Heart',
    tag: 'For the donate page that needs to feel alive',
    author: 'by Ivo Reinhardt',
    recipe: recipe2d([
      mk('heart', { size: 0.6 }),
      mk('palette_themed', { preset: 4 }),
      mk('bloom', { threshold: 0.45, intensity: 1.8 }),
      mk('pulse_brightness', { bpm: 72, depth: 0.35 }),
    ]),
  },
  {
    id: 'lava-rings',
    title: 'Lava Rings',
    tag: 'Festival poster background that prints just fine',
    author: 'by Beatrice Cole',
    recent: true,
    recipe: recipe2d([
      mk('radial_gradient', { softness: 1.6 }),
      mk('palette_themed', { preset: 2 }),
      mk('contrast', { amount: 1.35 }),
      mk('grain', { amount: 0.1 }),
    ]),
  },
  {
    id: 'glacier-cells',
    title: 'Glacier Cells',
    tag: 'Empty state that nobody will mind staring at',
    author: 'by Linnea Söder',
    recipe: recipe2d([
      mk('voronoi_cells', { scale: 4 }),
      mk('palette_themed', { preset: 3 }),
      mk('bloom', { threshold: 0.55, intensity: 1.1 }),
      mk('vignette', { inner: 0.5, outer: 1.2, strength: 0.5 }),
    ]),
  },
];
