import { describe, expect, it } from 'vitest';
import {
  GLSL_HELPERS,
  HELPER_DEPS,
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

  it('HELPER_EMISSION_ORDER covers every helper in GLSL_HELPERS', () => {
    // Catches "added a new helper but forgot to add it to the emission order"
    // — the resolver would include it in the closure but the emitter would
    // skip it, producing a broken shader with a missing function call.
    expect([...HELPER_EMISSION_ORDER].sort()).toEqual(Object.keys(GLSL_HELPERS).sort());
  });

  it('every name referenced in HELPER_DEPS exists in GLSL_HELPERS', () => {
    // Catches typos like `noise: ['hahs']` — the resolver would silently
    // ignore the bad name and emit GLSL that references an undefined function.
    for (const [parent, deps] of Object.entries(HELPER_DEPS)) {
      expect(GLSL_HELPERS).toHaveProperty(parent);
      for (const d of deps) {
        expect(GLSL_HELPERS).toHaveProperty(d);
      }
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
