// Three curated starter recipes — loaded by the "new from template" picker
// so the canvas isn't blank on first launch. Ids here are placeholders;
// callers should clone with cloneRecipeWithFreshIds() before installing.

import type { Recipe } from './types';

export type StarterRecipe = {
  id: string;
  name: string;
  description: string;
  recipe: Recipe;
  /** Shown as a one-click "preset" chip in the empty-canvas state. These
   *  showcase the composable patterns (grids = shape + repeat, concentric =
   *  ring with a rings count) now that the bespoke grid cards are retired. */
  preset?: boolean;
};

const SUNSET: Recipe = {
  canvasAspect: 'square',
  cards: [
    {
      kind: 'typed',
      id: 'sunset-1',
      type: 'radial_gradient',
      enabled: true,
      params: { softness: { value: 0.9, animation: null } },
    },
    {
      kind: 'typed',
      id: 'sunset-2',
      type: 'palette',
      enabled: true,
      params: {
        color_a: { value: [0.18, 0.08, 0.32], animation: null },
        color_b: { value: [0.98, 0.65, 0.25], animation: null },
      },
    },
    {
      kind: 'typed',
      id: 'sunset-3',
      type: 'vignette',
      enabled: true,
      params: {
        inner: { value: 0.4, animation: null },
        outer: { value: 1.4, animation: null },
        strength: { value: 0.85, animation: null },
      },
    },
  ],
};

const RIPPLE_POND: Recipe = {
  canvasAspect: 'square',
  cards: [
    {
      kind: 'typed',
      id: 'pond-1',
      type: 'radial_gradient',
      enabled: true,
      params: { softness: { value: 1.4, animation: null } },
    },
    {
      kind: 'typed',
      id: 'pond-2',
      type: 'ripple',
      enabled: true,
      params: {
        frequency: { value: 12, animation: null },
        amplitude: { value: 1, animation: null },
      },
    },
    {
      kind: 'typed',
      id: 'pond-3',
      type: 'palette',
      enabled: true,
      params: {
        color_a: { value: [0.04, 0.07, 0.14], animation: null },
        color_b: { value: [0.55, 0.85, 1.0], animation: null },
      },
    },
  ],
};

const CYAN_DOT: Recipe = {
  canvasAspect: 'square',
  cards: [
    {
      kind: 'typed',
      id: 'dot-1',
      type: 'radial_gradient',
      enabled: true,
      params: { softness: { value: 2.4, animation: null } },
    },
    {
      kind: 'typed',
      id: 'dot-2',
      type: 'palette',
      enabled: true,
      params: {
        color_a: { value: [0.04, 0.05, 0.07], animation: null },
        color_b: { value: [0.25, 0.95, 0.9], animation: null },
      },
    },
  ],
};

// ─── Composable presets (grids = shape + repeat; concentric = ring.rings) ──
const DOT_GRID: Recipe = {
  canvasAspect: 'square',
  cards: [
    { kind: 'typed', id: 'dotgrid-2', type: 'ring', enabled: true, params: {
      radius: { value: 0, animation: null }, thickness: { value: 0.22, animation: null }, rings: { value: 1, animation: null } } },
    { kind: 'typed', id: 'dotgrid-1', type: 'repeat', enabled: true, params: {
      count_x: { value: 6, animation: null }, count_y: { value: 6, animation: null }, scope: { value: 0, animation: null } } },
    { kind: 'typed', id: 'dotgrid-3', type: 'palette', enabled: true, params: {
      color_a: { value: [0.05, 0.06, 0.1], animation: null }, color_b: { value: [0.96, 0.78, 0.36], animation: null } } },
  ],
};

const SQUARE_GRID: Recipe = {
  canvasAspect: 'square',
  cards: [
    { kind: 'typed', id: 'sqgrid-2', type: 'square', enabled: true, params: {
      size: { value: 0.34, animation: null }, edge: { value: 0.02, animation: null } } },
    { kind: 'typed', id: 'sqgrid-1', type: 'repeat', enabled: true, params: {
      count_x: { value: 5, animation: null }, count_y: { value: 5, animation: null }, scope: { value: 0, animation: null } } },
    { kind: 'typed', id: 'sqgrid-3', type: 'palette', enabled: true, params: {
      color_a: { value: [0.08, 0.05, 0.12], animation: null }, color_b: { value: [0.45, 0.85, 1.0], animation: null } } },
  ],
};

const CONCENTRIC: Recipe = {
  canvasAspect: 'square',
  cards: [
    { kind: 'typed', id: 'conc-1', type: 'concentric', enabled: true, params: {
      type: { value: 0, animation: null }, count: { value: 8, animation: null }, width: { value: 0.4, animation: null } } },
    { kind: 'typed', id: 'conc-2', type: 'palette', enabled: true, params: {
      color_a: { value: [0.04, 0.05, 0.09], animation: null }, color_b: { value: [1.0, 0.55, 0.3], animation: null } } },
  ],
};

export const STARTER_RECIPES: StarterRecipe[] = [
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm radial gradient with a hint of vignette.',
    recipe: SUNSET,
  },
  {
    id: 'ripple-pond',
    name: 'Ripple pond',
    description: 'Concentric blue rings driven by sin-distortion.',
    recipe: RIPPLE_POND,
  },
  {
    id: 'cyan-dot',
    name: 'Cyan dot',
    description: 'Single sharp dot on dark.',
    recipe: CYAN_DOT,
  },
  {
    id: 'dot-grid',
    name: 'Dot grid',
    description: 'A ring (radius 0) tiled by repeat — grids = shape + repeat.',
    recipe: DOT_GRID,
    preset: true,
  },
  {
    id: 'square-grid',
    name: 'Square grid',
    description: 'A square tiled by repeat.',
    recipe: SQUARE_GRID,
    preset: true,
  },
  {
    id: 'concentric',
    name: 'Concentric rings',
    description: 'One ring card with rings = 8.',
    recipe: CONCENTRIC,
    preset: true,
  },
];
