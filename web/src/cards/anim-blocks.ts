// Animation-block library — the AnimBlockDef analogue of the card library, but
// every block emits one GLSL expression that transforms a running scalar value
// `v` over time. A custom animation (AnimChain) folds its blocks left→right
// into a single per-frame local the compiler binds to params. See
// cards/anim-blocks.test.ts and the design spec
// docs/superpowers/specs/2026-06-03-custom-animations-design.md.

import { glslFloat, substitutePlaceholders } from './format';
import type { AnimBlockDef, AnimChain } from './types';

/** The v1 animation blocks. Sources (Time/Mouse) produce a fresh value; the
 *  rest read the running value via `{{v}}`. Float-valued — a chain folds to a
 *  scalar, so custom animations drive float params (colour keeps color_cycle). */
export const ANIM_BLOCKS: Record<string, AnimBlockDef> = {
  time: {
    type: 'time',
    label: 'Time',
    icon: 'anim-time',
    description: 'Seconds since start, scaled. The usual chain source.',
    source: true,
    params: { scale: { kind: 'float', label: 'scale', default: 1, min: 0, max: 8, step: 0.01 } },
    transform: '(u_time * {{scale}})',
  },
  mouse: {
    type: 'mouse',
    label: 'Mouse',
    icon: 'anim-mouse',
    description: 'Pointer position on the chosen axis, mapped to 0..1. A source.',
    source: true,
    params: {
      axis: {
        kind: 'select',
        label: 'axis',
        default: 0,
        options: [
          { value: 0, label: 'x' },
          { value: 1, label: 'y' },
        ],
      },
    },
    transform: 'clamp(mix(u_mouse.x, u_mouse.y, {{axis}}) * 0.5 + 0.5, 0.0, 1.0)',
  },
  oscillate: {
    type: 'oscillate',
    label: 'Oscillate',
    icon: 'anim-osc',
    description: 'Sine wave of the running value → 0..1.',
    params: {
      speed: { kind: 'float', label: 'speed', default: 1, min: 0, max: 8, step: 0.01 },
      phase: { kind: 'float', label: 'phase', default: 0, min: 0, max: 6.2832, step: 0.01 },
    },
    transform: '(sin({{v}} * {{speed}} + {{phase}}) * 0.5 + 0.5)',
  },
  pulse: {
    type: 'pulse',
    label: 'Pulse',
    icon: 'anim-pulse',
    description: 'On/off square wave; duty sets the on-fraction.',
    params: {
      speed: { kind: 'float', label: 'speed', default: 1, min: 0, max: 8, step: 0.01 },
      duty: { kind: 'float', label: 'duty', default: 0.5, min: 0, max: 1, step: 0.01 },
    },
    transform: 'step({{duty}}, fract({{v}} * {{speed}}))',
  },
  noise: {
    type: 'noise',
    label: 'Noise',
    icon: 'anim-noise',
    description: 'Smooth value noise of the running value → ~0..1.',
    params: { speed: { kind: 'float', label: 'speed', default: 1, min: 0, max: 8, step: 0.01 } },
    transform: 'noise2(vec2({{v}} * {{speed}}, 0.0))',
    helpers: ['noise2'],
  },
  remap: {
    type: 'remap',
    label: 'Remap',
    icon: 'anim-remap',
    description: 'Map a 0..1 value into the [min, max] range.',
    params: {
      min: { kind: 'float', label: 'min', default: 0, min: -4, max: 4, step: 0.01 },
      max: { kind: 'float', label: 'max', default: 1, min: -4, max: 4, step: 0.01 },
    },
    transform: 'mix({{min}}, {{max}}, {{v}})',
  },
  ease: {
    type: 'ease',
    label: 'Ease',
    icon: 'anim-ease',
    description: 'Bend a 0..1 value with a power curve (>1 ease-in).',
    params: { exponent: { kind: 'float', label: 'curve', default: 2, min: 0.1, max: 6, step: 0.01 } },
    transform: 'pow(clamp({{v}}, 0.0, 1.0), {{exponent}})',
  },
};

/** The blocks as a list, in palette display order (object insertion order:
 *  Time, Mouse, Oscillate, Pulse, Noise, Remap, Ease). */
export const ANIM_BLOCK_LIST: readonly AnimBlockDef[] = Object.values(ANIM_BLOCKS);

/** GLSL identifier for a chain's per-frame local (`_anim_<sanitised id>`). */
export function animLocalName(chainId: string): string {
  return `_anim_${chainId.replace(/[^A-Za-z0-9_]/g, '_')}`;
}

/** Fold a chain into GLSL statements assigning its per-frame local. Block
 *  params bake to literals — editing one recompiles, but the chain still
 *  animates live through u_time / u_mouse (which are not baked). Returns the
 *  lines indented two spaces, ready to splice into main(). */
export function foldAnimChain(chain: AnimChain, local = animLocalName(chain.id)): string[] {
  const lines = [`  float ${local} = u_time;`];
  for (const blk of chain.blocks) {
    const def = ANIM_BLOCKS[blk.type];
    if (!def) continue;
    const expr = substitutePlaceholders(def.transform, (key) => {
      if (key === 'v') return local;
      const pd = def.params[key];
      if (!pd) {
        throw new Error(`[anim-blocks] block "${blk.type}" references unknown placeholder {{${key}}}`);
      }
      const raw = blk.params[key]?.value;
      const num = typeof raw === 'number' ? raw : ((pd as { default?: number }).default ?? 0);
      return glslFloat(num);
    });
    lines.push(`  ${local} = ${expr};`);
  }
  return lines;
}

/** Union of helper-function names every block in the chain needs. */
export function animChainHelpers(chain: AnimChain): string[] {
  const out = new Set<string>();
  for (const blk of chain.blocks) {
    for (const h of ANIM_BLOCKS[blk.type]?.helpers ?? []) out.add(h);
  }
  return [...out];
}

/** A fresh AnimBlock instance with default params, for the given block type. */
export function defaultAnimBlock(type: string, id: string): import('./types').AnimBlock {
  const def = ANIM_BLOCKS[type];
  const params: Record<string, import('./types').Parameter> = {};
  if (def) {
    for (const [key, pd] of Object.entries(def.params)) {
      params[key] = { value: (pd as { default: number }).default, animation: null };
    }
  }
  return { id, type, params };
}
