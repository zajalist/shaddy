import { describe, expect, it } from 'vitest';
import { glslFloat, formatParameterAsGlslLiteral } from './format';

// One canonical GLSL float formatter. The byte-identical-output invariant (and
// therefore the reverse round-trip) depends on every emission site spelling the
// same value the same way — see the compiler-review roadmap (float-formatter
// unification). These cases lock that.
describe('glslFloat — single source of truth', () => {
  it('always emits a decimal point (GLSL float, not int)', () => {
    expect(glslFloat(2)).toBe('2.0');
    expect(glslFloat(0)).toBe('0.0');
    expect(glslFloat(-3)).toBe('-3.0');
  });

  it('rounds to 6 fractional digits and trims (deterministic)', () => {
    expect(glslFloat(1 / 3)).toBe('0.333333');
    expect(glslFloat(0.1 + 0.2)).toBe('0.3'); // not 0.30000000000000004
    expect(glslFloat(0.5)).toBe('0.5');
  });

  it('guards non-finite values so we never emit invalid GLSL', () => {
    expect(glslFloat(NaN)).toBe('0.0');
    expect(glslFloat(Infinity)).toBe('0.0');
    expect(glslFloat(-Infinity)).toBe('0.0');
  });

  it('color literals route through the same formatter', () => {
    expect(formatParameterAsGlslLiteral([0.1 + 0.2, 1, 0] as const)).toBe('vec3(0.3, 1.0, 0.0)');
  });
});
