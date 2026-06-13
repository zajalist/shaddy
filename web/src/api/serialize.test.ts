import { describe, expect, it } from 'vitest';

import { dataUrlToBlob, serialisable } from './serialize';

describe('serialisable', () => {
  it('strips data-URL media values but preserves structure', () => {
    const recipe = {
      mode: '2d',
      canvasAspect: 'square',
      cards: [
        {
          id: 'c1',
          kind: 'typed',
          type: 'image',
          params: {
            src: { value: 'data:image/png;base64,AAAA', animation: null },
            scale: { value: 2, animation: null },
          },
        },
        { id: 'c2', kind: 'wildcard', glsl: 'x' },
      ],
    } as never;

    const out = serialisable(recipe) as unknown as {
      mode: string;
      cards: Array<{ kind: string; params: Record<string, { value: unknown }> }>;
    };
    expect(out.mode).toBe('2d');
    expect(out.cards).toHaveLength(2);
    const [c0, c1] = out.cards as unknown as [
      { params: { src: { value: unknown }; scale: { value: unknown } } },
      { kind: string },
    ];
    expect(c0.params.src.value).toBe(''); // stripped
    expect(c0.params.scale.value).toBe(2); // preserved
    expect(c1.kind).toBe('wildcard'); // non-typed untouched
  });

  it('strips media inside buffer passes too', () => {
    const recipe = {
      cards: [],
      passes: [
        {
          id: 'a',
          cards: [
            {
              id: 'p1',
              kind: 'typed',
              type: 'image',
              params: { src: { value: 'data:image/png;base64,ZZ', animation: null } },
            },
          ],
        },
      ],
    } as never;
    const out = serialisable(recipe) as unknown as {
      passes: [{ cards: [{ params: { src: { value: unknown } } }] }];
    };
    expect(out.passes[0].cards[0].params.src.value).toBe('');
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a png data URL into a typed Blob', () => {
    const blob = dataUrlToBlob('data:image/png;base64,iVBORw0KGgo=');
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });
});
