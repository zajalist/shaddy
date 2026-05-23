// Three curated starter recipes — loaded by the "new from template" picker
// so the canvas isn't blank on first launch. Ids here are placeholders;
// callers should clone with cloneRecipeWithFreshIds() before installing.

import type { Recipe } from './types';

export type StarterRecipe = {
  id: string;
  name: string;
  description: string;
  recipe: Recipe;
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
];
