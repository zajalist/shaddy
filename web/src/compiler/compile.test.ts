import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import type { Recipe } from './types';

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
