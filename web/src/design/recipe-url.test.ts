import { describe, expect, it } from 'vitest';
import { encodeRecipeToHash, decodeRecipeFromHash } from './recipe-url';
import type { Recipe } from '@/cards';

// Share = a link that restores the exact recipe. The codec must round-trip the
// structure and reject garbage. (Previously Share copied the bare URL and the
// `#r=` format was documented but never implemented.)
describe('recipe ⇄ share URL', () => {
  const recipe: Recipe = {
    canvasAspect: 'landscape',
    mode: '2d',
    cards: [
      { kind: 'typed', id: 's0', type: 'square', enabled: true, params: { size: { value: 0.3, animation: null }, edge: { value: 0.02, animation: null } } },
      { kind: 'typed', id: 'p0', type: 'palette', enabled: true, params: { color_a: { value: [0.1, 0.2, 0.3], animation: null }, color_b: { value: [1, 1, 1], animation: null } } },
    ],
  };

  it('round-trips a recipe through the hash', () => {
    const hash = encodeRecipeToHash(recipe);
    expect(hash.startsWith('r=')).toBe(true);
    const back = decodeRecipeFromHash(`#${hash}`);
    expect(back).toEqual(recipe);
  });

  it('strips inline media data URLs (keeps the link portable)', () => {
    const withImg: Recipe = {
      canvasAspect: 'square',
      cards: [{ kind: 'typed', id: 'm0', type: 'image_input', enabled: true, params: { source: { value: 'data:image/png;base64,AAAA', animation: null } } }],
    };
    const back = decodeRecipeFromHash(`#${encodeRecipeToHash(withImg)}`);
    expect(back).not.toBeNull();
    const card0 = back!.cards[0];
    const v = card0 && card0.kind === 'typed' ? card0.params.source?.value : undefined;
    expect(v).toBe(''); // data URL dropped, not megabytes in the link
  });

  it('returns null for a non-share hash or garbage', () => {
    expect(decodeRecipeFromHash('#section-3')).toBeNull();
    expect(decodeRecipeFromHash('')).toBeNull();
    expect(decodeRecipeFromHash('#r=not-base64!!')).toBeNull();
  });

  it('rejects a recipe referencing an unknown card type', () => {
    const bad = `r=${btoa(unescape(encodeURIComponent(JSON.stringify({ canvasAspect: 'square', cards: [{ kind: 'typed', id: 'x', type: 'no_such_card', enabled: true, params: {} }] }))))}`;
    expect(decodeRecipeFromHash(`#${bad}`)).toBeNull();
  });
});
