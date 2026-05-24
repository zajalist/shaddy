import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { parseShadeGlsl } from './parse';
import type { Recipe } from './types';

describe('parseShadeGlsl', () => {
  it("rejects non-Shade GLSL with reason 'not_shade_authored'", () => {
    const result = parseShadeGlsl('void main() { gl_FragColor = vec4(1.0); }');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.reason).toBe('not_shade_authored');
  });

  it('reconstructs a single-block recipe from Shade-emitted GLSL', () => {
    const original: Recipe = {
      version: 1,
      blocks: [
        {
          id: 'b1',
          type: 'ripple',
          enabled: true,
          params: {
            freq: { value: 10, animation: null },
            phase: { value: 0, animation: null },
          },
        },
      ],
      globalTempo: 120,
      canvasAspect: 'square',
    };
    const compiled = compile(original);
    if (!compiled.ok) throw new Error('compile failed');

    const parsed = parseShadeGlsl(compiled.glsl);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error('expected ok');
    expect(parsed.recipe).toEqual(original);
    expect(parsed.unknownBlocks).toEqual([]);
  });

  it('lists unknown block types but still returns the rest', () => {
    const glsl = [
      '// @shade:recipe tempo=120 aspect=square',
      '// @shade:block id="b1" type="palette" params={"colorA":{"value":[0,0,0],"animation":null},"colorB":{"value":[1,1,1],"animation":null}}',
      '// @shade:end b1',
      '// @shade:block id="b2" type="future_block" params={"x":{"value":0,"animation":null}}',
      '// @shade:end b2',
    ].join('\n');
    const parsed = parseShadeGlsl(glsl);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error('expected ok');
    expect(parsed.unknownBlocks).toEqual(['future_block']);
    expect(parsed.recipe.blocks.length).toBe(2);
    expect(parsed.recipe.blocks[1]!.type).toBe('future_block');
  });
});
