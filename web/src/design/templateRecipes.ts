// The landing-page template gallery, expressed as real composable Recipes.
//
// Each tile renders the COMPILED output of one of these recipes (see
// TemplatesShared), and clicking a tile opens that exact recipe in the
// /design editor as editable blocks. So "what you see" == "what opens" —
// there is no separate hand-written GLSL for the previews anymore.
//
// Recipes are built only from cards in the public library (CARD_LIBRARY),
// so they survive validateRecipe() and round-trip through the share-hash.

import type { Card, Recipe, ParameterValue, Animation } from '@/cards';
import type { TemplateVariant } from './templateVariants';

let _seq = 0;

type ParamInput = Record<string, number | readonly [number, number, number]>;
type AnimInput = Record<string, Animation>;

/** Build a typed card. `type` keys into the library; `params` are raw values
 *  (numbers or rgb triples) wrapped as static Parameters. `anims` binds a
 *  param to a live Animation (sine/pulse/…) instead — the value advances with
 *  u_time, so the tile animates on hover and reads still when time is frozen. */
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

/** A leading Translate whose offset traces a slow circle (x = sin, y = cos),
 *  giving a continuous drift to otherwise-static noise fields. */
function drift(speed: number, amp: number): Card {
  return t('translate', {}, {
    x: { type: 'sine', min: -amp, max: amp, speed, phase: 0 },
    y: { type: 'sine', min: -amp, max: amp, speed, phase: 1.5708 },
  });
}

function recipe(cards: Card[], mode?: '2d' | '3d'): Recipe {
  return { cards, canvasAspect: 'landscape', ...(mode ? { mode } : {}) };
}

// iq cosine-palette presets — a + b·cos(2π(c·t + d)), per channel.
const HOT = { bias: [0.5, 0.18, 0.06], amp: [0.5, 0.36, 0.18], freq: [1.0, 1.1, 1.0], phase: [0.0, 0.12, 0.2] } as const;
const SPACE = { bias: [0.32, 0.22, 0.5], amp: [0.4, 0.3, 0.5], freq: [1.0, 1.0, 1.0], phase: [0.0, 0.22, 0.5] } as const;
const GEM = { bias: [0.5, 0.5, 0.5], amp: [0.5, 0.5, 0.5], freq: [1.0, 1.0, 1.0], phase: [0.0, 0.33, 0.67] } as const;

export const TEMPLATE_RECIPES: Record<TemplateVariant, Recipe> = {
  // ── procedural terrain: ridged heightfield → earthy ramp → contour lines ──
  terrain: recipe([
    t('terrain', { scale: 1.6, drift: 0.04, snow: 0.78 }),
    t('vignette', { amount: 0.5, radius: 1.15 }),
  ]),

  // ── interstellar gas cloud + sprinkled stars ──
  nebula: recipe([
    drift(0.18, 0.16),
    t('domain_warp', { scale: 2.0, warp: 1.6 }),
    t('cosine_palette', SPACE),
    t('glow', { threshold: 0.5, intensity: 1.1 }),
    t('starfield', { density: 70, coverage: 0.05, size: 0.09, twinkle: 2.5, color: [0.9, 0.95, 1.0] }),
    t('vignette', { amount: 0.6, radius: 1.1 }),
  ]),

  // ── double helix — twisting strands + base-pair rungs ──
  dna: recipe([
    t('helix', { speed: 0.9, twist: 9, spread: 0.34, thickness: 0.06, rungs: 4.5 }),
    t('palette', { color_a: [0.02, 0.03, 0.08], color_b: [0.25, 0.95, 0.85] }),
    t('glow', { threshold: 0.4, intensity: 1.4 }),
  ]),

  // ── open water — domain-warped swell + caustic shimmer ──
  ocean: recipe([
    t('caustics', { scale: 4.0, speed: 0.5 }),
    t('cosine_palette', { bias: [0.1, 0.3, 0.5], amp: [0.1, 0.3, 0.45], freq: [1.0, 1.0, 1.0], phase: [0.6, 0.55, 0.45] }),
    t('glow', { threshold: 0.6, intensity: 0.9 }),
    t('vignette', { amount: 0.4, radius: 1.2 }),
  ]),

  // ── molten rock — turbulence → hot ramp → glow ──
  lava: recipe([
    drift(0.3, 0.13),
    t('turbulence', { scale: 3.5 }),
    t('cosine_palette', HOT),
    t('glow', { threshold: 0.55, intensity: 1.4 }),
  ]),

  // ── molecule — merging metaballs lit by a soft glow ──
  molecule: recipe([
    t('metaballs', { speed: 0.6, falloff: 0.2 }),
    t('palette', { color_a: [0.02, 0.04, 0.12], color_b: [0.35, 0.8, 1.0] }),
    t('glow', { threshold: 0.45, intensity: 1.6 }),
    t('vignette', { amount: 0.5, radius: 1.1 }),
  ]),

  // ── spiral galaxy — twirled log-spiral arms, bright core, stars ──
  galaxy: recipe([
    t('twirl', { cx: 0, cy: 0, radius: 1.4 }, {
      strength: { type: 'sine', min: 0.4, max: 2.4, speed: 0.25, phase: 0 },
    }),
    t('spiral_arms', { arms: 2, twist: 5, softness: 0.5 }),
    t('cosine_palette', SPACE),
    t('glow', { threshold: 0.45, intensity: 1.3 }),
    t('starfield', { density: 90, coverage: 0.04, size: 0.07, twinkle: 2, color: [1.0, 0.95, 0.85] }),
    t('vignette', { amount: 0.65, radius: 1.0 }),
  ]),

  // ── aurora — drifting curtains over a starfield ──
  aurora: recipe([
    t('aurora', { speed: 0.4, scale: 2.0, sway: 1.1, thickness: 0.4 }),
    t('palette', { color_a: [0.02, 0.04, 0.1], color_b: [0.2, 0.95, 0.6] }),
    t('glow', { threshold: 0.4, intensity: 1.3 }),
    t('starfield', { density: 80, coverage: 0.045, size: 0.07, twinkle: 1.8, color: [0.85, 0.9, 1.0] }),
  ]),

  // ── fire — rising turbulent flame shaped by an envelope ──
  fire: recipe([
    t('flame', { speed: 1.0, scale: 3.0, width: 1.3 }),
    t('cosine_palette', HOT),
    t('glow', { threshold: 0.5, intensity: 1.5 }),
  ]),

  // ── crystals — voronoi cells, each a different gem colour ──
  crystals: recipe([
    drift(0.16, 0.09),
    t('voronoi_cells', { scale: 4.0, jitter: 1.0 }),
    t('cosine_palette', GEM),
    t('contour', { spacing: 0.18, thickness: 0.03 }),
    t('vignette', { amount: 0.5, radius: 1.1 }),
  ]),

  // ── wormhole — polar tunnel rushing inward ──
  wormhole: recipe([
    t('polar_warp', { radial_scale: 1.0 }),
    t('plasma', { scale: 6, speed: 1.0 }),
    t('cosine_palette', { bias: [0.5, 0.5, 0.5], amp: [0.5, 0.5, 0.5], freq: [1.0, 1.0, 1.0], phase: [0.0, 0.33, 0.67] }),
    t('glow', { threshold: 0.5, intensity: 1.2 }),
    t('vignette', { amount: 0.7, radius: 0.9 }),
  ]),

  // ── 3D — a twisted torus + sphere, smooth-unioned and lit ──
  raymarch: recipe([
    t('material_color_3d', { color: [0.95, 0.5, 0.2] }),
    t('twist_3d', { amount: 1.1 }),
    t('smooth_union_3d', { k: 0.4 }),
    t('torus_3d', { r_major: 0.85, r_minor: 0.32 }),
    t('sphere_3d', { r: 0.5, cx: 0, cy: 0.55, cz: 0 }),
    t('sphere_3d', { r: 0.4, cx: 0, cy: -0.5, cz: 0 }),
  ], '3d'),
};
