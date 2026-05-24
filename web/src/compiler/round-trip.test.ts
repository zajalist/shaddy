import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { parseShadeGlsl } from './parse';
import type { Recipe } from './types';

const RECIPES: Recipe[] = [
  // 1. empty
  { version: 1, blocks: [], globalTempo: 120, canvasAspect: 'square' },

  // 2. single block, static params
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'radial_gradient',
        enabled: true,
        params: {
          center: { value: [0, 0], animation: null },
          softness: { value: 0.7, animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 3. shape → distortion → color chain
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'radial_gradient',
        enabled: true,
        params: {
          center: { value: [0, 0], animation: null },
          softness: { value: 1, animation: null },
        },
      },
      {
        id: 'b2',
        type: 'ripple',
        enabled: true,
        params: {
          freq: { value: 10, animation: null },
          phase: { value: 0, animation: null },
        },
      },
      {
        id: 'b3',
        type: 'palette',
        enabled: true,
        params: {
          colorA: { value: [0, 0.4, 1], animation: null },
          colorB: { value: [1, 0.2, 0.6], animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 4. animated sine
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'ripple',
        enabled: true,
        params: {
          freq: {
            value: 10,
            animation: { type: 'sine', min: 5, max: 15, speed: 1.2, phase: 0, mode: 'hz' },
          },
          phase: { value: 0, animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'portrait',
  },

  // 5. animated pulse with bpm mode
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'ripple',
        enabled: true,
        params: {
          freq: {
            value: 10,
            animation: { type: 'pulse', min: 5, max: 15, speed: 1, duty: 0.5, mode: 'bpm' },
          },
          phase: { value: 0, animation: null },
        },
      },
    ],
    globalTempo: 132,
    canvasAspect: 'landscape',
  },

  // 6. mouse_follow animation
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'radial_gradient',
        enabled: true,
        params: {
          center: { value: [0, 0], animation: null },
          softness: {
            value: 1,
            animation: { type: 'mouse_follow', min: 0.5, max: 2, axis: 'x' },
          },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 7. color_cycle on a color param
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'palette',
        enabled: true,
        params: {
          colorA: {
            value: [0, 0, 0],
            animation: {
              type: 'color_cycle',
              colorA: [1, 0, 0],
              colorB: [0, 1, 0],
              speed: 1,
              mode: 'hz',
            },
          },
          colorB: { value: [1, 1, 1], animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 8. noise_wiggle (pulls noise helper transitively)
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'ripple',
        enabled: true,
        params: {
          freq: {
            value: 10,
            animation: { type: 'noise_wiggle', min: 5, max: 15, speed: 1, mode: 'hz' },
          },
          phase: { value: 0, animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 9. custom block
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'custom',
        enabled: true,
        params: {
          code: { value: 'd = sin(uv.x * 10.0);', animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 10. full ten-block stress
  {
    version: 1,
    blocks: [
      { id: 'b1', type: 'radial_gradient', enabled: true, params: { center: { value: [0, 0], animation: null }, softness: { value: 1, animation: null } } },
      { id: 'b2', type: 'ring', enabled: true, params: { center: { value: [0, 0], animation: null }, radius: { value: 0.5, animation: null }, thickness: { value: 0.05, animation: null } } },
      { id: 'b3', type: 'stripes', enabled: true, params: { direction: { value: [1, 0], animation: null }, width: { value: 8, animation: null } } },
      { id: 'b4', type: 'noise_field', enabled: true, params: { scale: { value: 4, animation: null } } },
      { id: 'b5', type: 'voronoi', enabled: true, params: { scale: { value: 5, animation: null }, jitter: { value: 1, animation: null } } },
      { id: 'b6', type: 'ripple', enabled: true, params: { freq: { value: 10, animation: null }, phase: { value: 0, animation: null } } },
      { id: 'b7', type: 'palette', enabled: true, params: { colorA: { value: [0, 0.4, 1], animation: null }, colorB: { value: [1, 0.2, 0.6], animation: null } } },
      { id: 'b8', type: 'vignette', enabled: true, params: { inner: { value: 0.5, animation: null }, outer: { value: 1.5, animation: null } } },
      { id: 'b9', type: 'glow', enabled: true, params: { threshold: { value: 0.55, animation: null }, intensity: { value: 1.2, animation: null } } },
      { id: 'b10', type: 'grain', enabled: true, params: { amount: { value: 0.05, animation: null } } },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },
];

describe('round-trip — compile() then parseShadeGlsl() returns the original Recipe', () => {
  it.each(RECIPES.map((r, i) => [i, r] as const))(
    'recipe #%i round-trips byte-equal',
    (_i, original) => {
      const compiled = compile(original);
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) return;
      const parsed = parseShadeGlsl(compiled.glsl);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(parsed.recipe).toEqual(original);
    },
  );
});
