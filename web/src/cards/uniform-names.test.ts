import { describe, expect, it } from 'vitest';
import { encodeParam, encodeAttr, encodeAnim, UNIFORM_REF_RE } from './uniform-names';
import { compile } from './compile';
import { reparse } from './reparse';
import type { Animation, Recipe } from './types';

// The name machine is the single authority on compiler uniform names. Its one
// invariant: every name an encoder produces must be recognized by the one
// regex the dangling-uniform guard scans with — so the guard can't drift from
// the scheme the compiler emits. See improve-codebase-architecture #2.
describe('uniform-names — encoders ⇄ recognizer', () => {
  const recognizes = (s: string): boolean => { UNIFORM_REF_RE.lastIndex = 0; return UNIFORM_REF_RE.test(s); };

  it('every encoder output is recognized by UNIFORM_REF_RE', () => {
    expect(recognizes(encodeParam(3, 'size'))).toBe(true);
    expect(recognizes(encodeAttr(3, 1, 'amount'))).toBe(true);
    expect(recognizes(encodeAnim(3, 'size', 'min'))).toBe(true);
    expect(recognizes(encodeAnim(0, 'color_a', 'speed'))).toBe(true);
  });

  it('shapes are exactly the historical scheme', () => {
    expect(encodeParam(3, 'size')).toBe('u_card3_size');
    expect(encodeAttr(3, 1, 'amount')).toBe('u_card3_a1_amount');
    expect(encodeAnim(3, 'size', 'min')).toBe('u_card3_size_min');
  });
});

// The self-contained-bake bonus: when an ANIMATED card becomes a wildcard, the
// captured body's anim local references the endpoint uniforms; baking them as
// literals keeps the wildcard self-contained (no dangling u_card*_min) and still
// animating — without the static u_card3_size being prefix-corrupted.
describe('reparse bake — animated card → wildcard is self-contained', () => {
  it('bakes anim endpoints and leaves no dangling uniform', () => {
    const anim: Animation = { type: 'sine', min: 0.2, max: 0.8, speed: 1.5, phase: 0 };
    const recipe: Recipe = {
      canvasAspect: 'square',
      cards: [{ kind: 'typed', id: 's0', type: 'square', enabled: true, params: { size: { value: 0.3, animation: anim }, edge: { value: 0.02, animation: null } } }],
    };
    const compiled = compile(recipe);
    // Force the card to a wildcard by editing its body (change a constant).
    const edited = compiled.glsl.replace('* 0.5 + 0.5)', '* 0.5 + 0.4)');
    expect(edited).not.toBe(compiled.glsl);
    const res = reparse(recipe, compiled, edited);
    const wc = res.recipe.cards[0];
    expect(wc?.kind).toBe('wildcard');
    const raw = (wc as { rawSource: string }).rawSource;
    // Endpoint uniforms are baked to their literal values…
    expect(raw).toContain('mix(0.2, 0.8,');
    // …and nothing dangling remains.
    UNIFORM_REF_RE.lastIndex = 0;
    expect(UNIFORM_REF_RE.test(raw)).toBe(false);
    // Recompiling the wildcard declares no undeclared u_card refs.
    const out2 = compile(res.recipe);
    const refs = new Set([...out2.glsl.matchAll(/u_card\d+_[a-z0-9_]+/gi)].map((m) => m[0]));
    const decls = new Set([...out2.glsl.matchAll(/uniform \w+ (u_card\d+_[a-z0-9_]+);/gi)].map((m) => m[1]));
    expect([...refs].filter((r) => !decls.has(r))).toEqual([]);
  });
});
