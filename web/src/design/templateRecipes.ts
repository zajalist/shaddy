// The landing-page template gallery, expressed as real composable Recipes.
//
// Each tile renders the COMPILED output of one of these recipes (see
// TemplatesShared), and clicking a tile opens that exact recipe in the
// /design editor as editable blocks. So "what you see" == "what opens".
//
// Most variants lead with a high-quality "scene" card (terrain, nebula,
// galaxy, …) that packs the look into one expressive block, followed by a
// post-effect or two (vignette/glow) you can tweak — so it still opens as a
// small, readable block stack rather than a wall of primitives.

import type { Card, Recipe, ParameterValue, Animation } from '@/cards';
import type { TemplateVariant } from './templateVariants';

let _seq = 0;

type ParamInput = Record<string, number | readonly [number, number, number]>;
type AnimInput = Record<string, Animation>;

/** Build a typed card. `params` are raw values; `anims` binds a param to a
 *  live Animation so it advances with u_time (animates on hover, still when
 *  time is frozen). */
function t(type: string, params: ParamInput = {}, anims: AnimInput = {}): Card {
  const wrapped: Record<string, { value: ParameterValue; animation: Animation | null }> = {};
  for (const [k, v] of Object.entries(params)) {
    wrapped[k] = { value: v as ParameterValue, animation: anims[k] ?? null };
  }
  for (const [k, a] of Object.entries(anims)) {
    if (!(k in wrapped)) wrapped[k] = { value: 0, animation: a };
  }
  return { kind: 'typed', id: `t${_seq++}`, type, enabled: true, params: wrapped };
}

function recipe(cards: Card[], mode?: '2d' | '3d'): Recipe {
  return { cards, canvasAspect: 'landscape', ...(mode ? { mode } : {}) };
}

export const TEMPLATE_RECIPES: Record<TemplateVariant, Recipe> = {
  // Sun-lit fbm heightfield → elevation tint → vignette.
  terrain: recipe([
    t('terrain', { scale: 1.6, drift: 0.04, snow: 0.78 }),
    t('vignette', { amount: 0.5, radius: 1.15 }),
  ]),

  // Domain-warped interstellar gas, glowing core + stars.
  nebula: recipe([
    t('nebula', { drift: 0.02, density: 1.3 }),
    t('vignette', { amount: 0.55, radius: 1.15 }),
  ]),

  // Twisting double-helix strands + base-pair rungs.
  dna: recipe([
    t('helix', { speed: 0.9, twist: 9, spread: 0.34, thickness: 0.06, rungs: 4.5 }),
    t('palette', { color_a: [0.02, 0.03, 0.08], color_b: [0.25, 0.95, 0.85] }),
    t('glow', { threshold: 0.4, intensity: 1.4 }),
  ]),

  // Layered ocean swell — caustics, foam, sun glint.
  ocean: recipe([
    t('sea', { speed: 0.6, choppy: 3 }),
    t('vignette', { amount: 0.4, radius: 1.2 }),
  ]),

  // Dark crust with glowing lava cracks.
  lava: recipe([
    t('molten', { scale: 1.5, flow: 0.15 }),
    t('glow', { threshold: 0.6, intensity: 1.1 }),
  ]),

  // Orbiting coloured metaballs merging into a molecule.
  molecule: recipe([
    t('atoms', { speed: 0.6, count: 5 }),
    t('vignette', { amount: 0.5, radius: 1.1 }),
  ]),

  // Spiral arms + dust + bright core + stars.
  galaxy: recipe([
    t('galaxy', { arms: 2, spin: 0.25 }),
    t('vignette', { amount: 0.6, radius: 1.05 }),
  ]),

  // Drifting aurora curtains over a starfield.
  aurora: recipe([
    t('aurora', { speed: 0.4, scale: 2.0, sway: 1.1, thickness: 0.4 }),
    t('palette', { color_a: [0.02, 0.04, 0.1], color_b: [0.2, 0.95, 0.6] }),
    t('glow', { threshold: 0.4, intensity: 1.3 }),
    t('starfield', { density: 80, coverage: 0.045, size: 0.07, twinkle: 1.8, color: [0.85, 0.9, 1.0] }),
  ]),

  // Rising turbulent flame shaped by an envelope.
  fire: recipe([
    t('flame', { speed: 1.0, scale: 3.0, width: 1.3 }),
    t('cosine_palette', { bias: [0.5, 0.18, 0.06], amp: [0.5, 0.36, 0.18], freq: [1.0, 1.1, 1.0], phase: [0.0, 0.12, 0.2] }),
    t('glow', { threshold: 0.5, intensity: 1.5 }),
  ]),

  // Faceted Voronoi gems with lit edges.
  crystals: recipe([
    t('gemfield', { scale: 4, drift: 0.03 }),
    t('vignette', { amount: 0.5, radius: 1.1 }),
  ]),

  // Perspective tunnel rushing inward.
  wormhole: recipe([
    t('wormhole', { speed: 1.0, rings: 8, sides: 6 }),
    t('vignette', { amount: 0.6, radius: 1.0 }),
  ]),

  // 3D — a twisted torus + spheres, smooth-unioned and lit.
  raymarch: recipe([
    t('material_color_3d', { color: [0.95, 0.5, 0.2] }),
    t('twist_3d', { amount: 1.0 }),
    t('smooth_union_3d', { k: 0.5 }),
    t('torus_3d', { r_major: 1.0, r_minor: 0.42 }),
    t('sphere_3d', { r: 0.6, cx: 0, cy: 0.7, cz: 0 }),
    t('sphere_3d', { r: 0.5, cx: 0, cy: -0.65, cz: 0 }),
  ], '3d'),
};
