import { describe, expect, it } from 'vitest';
import {
  GLSL_HELPERS,
  HELPER_EMISSION_ORDER,
  resolveHelperClosure,
} from './helpers';

describe('GLSL_HELPERS', () => {
  it('declares each of the 5 helpers from the handoff', () => {
    for (const name of ['noise', 'voronoi', 'hsv2rgb', 'hash', 'rotate2d']) {
      expect(GLSL_HELPERS).toHaveProperty(name);
      expect(GLSL_HELPERS[name]!.length).toBeGreaterThan(0);
    }
  });

  it('every name in HELPER_EMISSION_ORDER has a body', () => {
    for (const name of HELPER_EMISSION_ORDER) {
      expect(GLSL_HELPERS).toHaveProperty(name);
    }
  });
});

describe('resolveHelperClosure', () => {
  it('expands transitive deps (noise depends on hash)', () => {
    const closure = resolveHelperClosure(['noise']);
    expect(closure.has('noise')).toBe(true);
    expect(closure.has('hash')).toBe(true);
  });

  it('voronoi pulls in hash', () => {
    const closure = resolveHelperClosure(['voronoi']);
    expect(closure.has('hash')).toBe(true);
  });

  it('ignores unknown helper names', () => {
    const closure = resolveHelperClosure(['no_such_helper', 'hash']);
    expect(closure.has('hash')).toBe(true);
    expect(closure.has('no_such_helper')).toBe(false);
  });
});
