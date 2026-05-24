import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { BLOCK_LIBRARY } from './blocks';
import type { Block, Recipe } from './types';

function emptyRecipe(): Recipe {
  return { version: 1, blocks: [], globalTempo: 120, canvasAspect: 'square' };
}

describe('compile — empty recipe', () => {
  it('returns ok', () => {
    expect(compile(emptyRecipe()).ok).toBe(true);
  });

  it('emits a valid-looking fragment shader skeleton', () => {
    const out = compile(emptyRecipe());
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toContain('#version 300 es');
    expect(out.glsl).toContain('precision highp float;');
    expect(out.glsl).toContain('out vec4 fragColor;');
    expect(out.glsl).toContain('void main()');
    expect(out.glsl).toContain('fragColor = vec4(col, 1.0);');
  });

  it('declares the four global uniforms', () => {
    const out = compile(emptyRecipe());
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toContain('uniform vec2 u_resolution;');
    expect(out.glsl).toContain('uniform float u_time;');
    expect(out.glsl).toContain('uniform vec2 u_mouse;');
    expect(out.glsl).toContain('uniform float u_tempo_bps;');
  });

  it('returns the four global uniform bindings', () => {
    const out = compile(emptyRecipe());
    if (!out.ok) throw new Error('expected ok');
    const kinds = out.uniforms.map((u) => u.source.kind).sort();
    expect(kinds).toEqual(['global_mouse', 'global_resolution', 'global_tempo_bps', 'global_time']);
  });

  it('emits the @shade:recipe header', () => {
    const out = compile(emptyRecipe());
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toContain('// @shade:recipe tempo=120 aspect=square');
  });
});

function recipeOf(blocks: Block[]): Recipe {
  return { version: 1, blocks, globalTempo: 120, canvasAspect: 'square' };
}

function block(partial: Partial<Block> & { type: string }): Block {
  return {
    id: partial.id ?? 'b1',
    type: partial.type,
    enabled: partial.enabled ?? true,
    params: partial.params ?? {},
  };
}

describe('compile — block walker', () => {
  it('skips disabled blocks entirely', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'ripple',
          enabled: false,
          params: {
            freq: { value: 10, animation: null },
            phase: { value: 0, animation: null },
          },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).not.toContain('@shade:block id="b1"');
    expect(out.uniforms.find((u) => u.source.kind === 'static')).toBeUndefined();
  });

  it('emits a magic comment around each enabled block', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'radial_gradient',
          params: {
            center: { value: [0, 0], animation: null },
            softness: { value: 1, animation: null },
          },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    // Order-agnostic — JSON key order in the marker doesn't matter for the
    // round-trip parser (it just JSON.parses the blob). [^\n] (not [^}])
    // because the params JSON contains nested {…} for each param.
    expect(out.glsl).toMatch(/@shade:block id="b1" type="radial_gradient" params=\{[^\n]*"softness"[^\n]*\}/);
    expect(out.glsl).toMatch(/@shade:block id="b1" type="radial_gradient" params=\{[^\n]*"center"[^\n]*\}/);
    expect(out.glsl).toContain('@shade:end b1');
  });

  it('substitutes {{param}} placeholders with uniform names', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'ripple',
          params: {
            freq: { value: 10, animation: null },
            phase: { value: 0, animation: null },
          },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toContain('uniform float u_b1_freq;');
    expect(out.glsl).toContain('uniform float u_b1_phase;');
    expect(out.glsl).toContain('d = sin(d * u_b1_freq + u_b1_phase);');
  });

  it('returns a static UniformBinding per non-animated param', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'ripple',
          params: {
            freq: { value: 10, animation: null },
            phase: { value: 0, animation: null },
          },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    const statics = out.uniforms.filter((u) => u.source.kind === 'static');
    expect(statics.length).toBe(2);
    expect(statics.map((u) => u.name).sort()).toEqual(['u_b1_freq', 'u_b1_phase']);
  });

  it('emits helpers exactly once when multiple blocks use the same helper', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'noise_field',
          params: { scale: { value: 4, animation: null } },
        }),
        block({
          id: 'b2',
          type: 'noise_field',
          params: { scale: { value: 8, animation: null } },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    const noiseOccurrences = out.glsl.split('float noise(vec2 p)').length - 1;
    expect(noiseOccurrences).toBe(1);
    expect(out.glsl).toContain('float hash(vec2 p)'); // transitive
  });

  it('emits animation local + replaces param with local in snippet', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'ripple',
          params: {
            freq: {
              value: 10,
              animation: { type: 'sine', min: 5, max: 15, speed: 1.2, phase: 0, mode: 'hz' },
            },
            phase: { value: 0, animation: null },
          },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toContain('float _b1_freq = mix(u_b1_freq_min, u_b1_freq_max,');
    expect(out.glsl).toContain('d = sin(d * _b1_freq + u_b1_phase);');
    // Animated freq → no `u_b1_freq` static; only the four anim_* sub-uniforms.
    const animBindings = out.uniforms.filter(
      (u) => u.source.kind === 'anim_min' || u.source.kind === 'anim_max',
    );
    expect(animBindings.length).toBe(2);
  });

  it('errors with unknown_block_type and partialGlsl up to the broken block', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'radial_gradient',
          params: {
            center: { value: [0, 0], animation: null },
            softness: { value: 1, animation: null },
          },
        }),
        block({ id: 'b2', type: 'no_such_block', params: {} }),
      ]),
    );
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error('expected error');
    expect(out.error.code).toBe('unknown_block_type');
    expect(out.error.blockId).toBe('b2');
    expect(out.partialGlsl).toBeDefined();
    expect(out.partialGlsl!).toContain('@shade:block id="b1"');
    expect(out.partialGlsl!).not.toContain('@shade:block id="b2"');
  });

  it('errors when color_cycle is attached to a non-color param', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'ripple',
          params: {
            freq: {
              value: 10,
              animation: {
                type: 'color_cycle',
                colorA: [1, 0, 0],
                colorB: [0, 1, 0],
                speed: 1,
                mode: 'hz',
              },
            },
            phase: { value: 0, animation: null },
          },
        }),
      ]),
    );
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error('expected error');
    expect(out.error.code).toBe('param_type_mismatch');
  });
});

void BLOCK_LIBRARY; // referenced so the test file compiles before Task 7 lands blocks
