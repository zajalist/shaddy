import { test } from 'vitest';
import type { Card, Recipe } from '@/cards';
import { encodeRecipeToHash } from './recipe-url';

const P = (v: number | readonly [number, number, number]) => ({ value: v, animation: null });
let _i = 0;
const card = (type: string, params: Record<string, number | readonly [number, number, number]> = {}): Card => ({
  kind: 'typed', id: `g${_i++}`, type, enabled: true,
  params: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, P(v)])),
});
const recipe = (cards: Card[]): Recipe => ({ cards, canvasAspect: 'landscape', mode: '3d' });
const lit = [card('material_color_3d', { r: 0.8, g: 0.5, b: 0.32 }), card('sun_3d'), card('sky_3d')];

const DEMOS: Record<string, Card[]> = {
  mandelbulb: [card('mandelbulb_3d', { power: 8, size: 1.2 }), ...lit],
  menger: [card('menger_fold_3d', { size: 1.1 }), ...lit],
  apollonian: [card('apollonian_fold_3d', { scale: 1.25, size: 1.3 }), ...lit],
  sierpinski: [card('sierpinski_fold_3d', { scale: 2, size: 1.4 }), ...lit],
};

test('emit fractal demo hashes', () => {
  for (const [name, cards] of Object.entries(DEMOS)) {
    // eslint-disable-next-line no-console
    console.log(`FRACHASH ${name} http://localhost:5174/design#${encodeRecipeToHash(recipe(cards))}`);
  }
});
