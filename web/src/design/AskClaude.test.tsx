// Tests for the translate flow in AskClaude.tsx.
//
// The old popover-based tests are gone — the popover was deleted in favour
// of an inline edit-mode flow owned by the CodeDrawer. What remains here is
// the pure data path:
//   1. translateGlslToRecipe shells out to /__claude_ask and returns a
//      validated Recipe.
//   2. Garbage / non-Recipe JSON throws cleanly so the caller can keep the
//      last-good Recipe.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { translateGlslToRecipe, coerceRecipe } from './AskClaude';
import type { Recipe } from '@/cards';

const SAMPLE_GLSL = '#version 300 es\nprecision highp float;\nvoid main(){ fragColor = vec4(1.0); }';

const SAMPLE_RECIPE: Recipe = {
  canvasAspect: 'square',
  mode: '2d',
  cards: [
    {
      kind: 'typed', id: 'c0', type: 'radial_gradient', enabled: true,
      alpha: 1, blendMode: 'normal',
      params: { softness: { value: 0.5, animation: null } },
    },
  ],
};

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('translateGlslToRecipe', () => {
  it('POSTs the prompt to /__claude_ask and parses the returned Recipe JSON', async () => {
    const claudeResponse: Recipe = {
      canvasAspect: 'portrait',
      mode: '2d',
      cards: [
        {
          kind: 'typed', id: '<auto>', type: 'palette', enabled: true,
          alpha: 1, blendMode: 'normal',
          params: { hue: { value: 0.25, animation: null } },
        },
        {
          kind: 'wildcard', id: '<auto>', enabled: true,
          alpha: 1, blendMode: 'normal',
          rawSource: '// raw\ncol.rgb *= 1.2;',
          displayName: 'Brighten',
        },
      ],
    };
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ result: JSON.stringify(claudeResponse) }),
    });

    const result = await translateGlslToRecipe(SAMPLE_GLSL, SAMPLE_RECIPE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/__claude_ask');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string) as { prompt: string; mode: string };
    expect(body.mode).toBe('translate');
    expect(body.prompt).toContain(SAMPLE_GLSL);
    // The current recipe is embedded in the prompt so Claude can use it
    // as a starting point.
    expect(body.prompt).toContain('radial_gradient');

    expect(result.canvasAspect).toBe('portrait');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]?.kind).toBe('typed');
    expect(result.cards[1]?.kind).toBe('wildcard');
  });

  it('strips ```json code fences if Claude wraps the response', async () => {
    const claudeResponse: Recipe = {
      canvasAspect: 'square',
      cards: [],
    };
    const wrapped = '```json\n' + JSON.stringify(claudeResponse) + '\n```';
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ result: wrapped }),
    });

    const result = await translateGlslToRecipe(SAMPLE_GLSL, SAMPLE_RECIPE);
    expect(result.cards).toEqual([]);
    expect(result.canvasAspect).toBe('square');
  });

  it('throws when the server returns a non-OK response', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => JSON.stringify({ error: 'claude exited 1', stderr: 'boom' }),
    });

    await expect(translateGlslToRecipe(SAMPLE_GLSL, SAMPLE_RECIPE)).rejects.toThrow(/claude exited 1/);
  });

  it('throws when Claude returns text that is not JSON', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ result: 'sure! here is a recipe for you' }),
    });

    await expect(translateGlslToRecipe(SAMPLE_GLSL, SAMPLE_RECIPE)).rejects.toThrow(/did not return JSON/);
  });

  it('throws when Claude returns JSON that is not Recipe-shaped (no cards array)', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ result: JSON.stringify({ hello: 'world' }) }),
    });

    await expect(translateGlslToRecipe(SAMPLE_GLSL, SAMPLE_RECIPE)).rejects.toThrow(/does not match the Recipe shape/);
  });

  it('throws when Claude returns an empty response', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ result: '   ' }),
    });

    await expect(translateGlslToRecipe(SAMPLE_GLSL, SAMPLE_RECIPE)).rejects.toThrow(/empty response/);
  });
});

describe('coerceRecipe', () => {
  it('returns null for non-object payloads', () => {
    expect(coerceRecipe(null)).toBeNull();
    expect(coerceRecipe(42)).toBeNull();
    expect(coerceRecipe('hi')).toBeNull();
    expect(coerceRecipe([])).toBeNull();
  });

  it('returns null when cards is missing or not an array', () => {
    expect(coerceRecipe({ canvasAspect: 'square' })).toBeNull();
    expect(coerceRecipe({ cards: 'oops' })).toBeNull();
  });

  it('defaults canvasAspect to "square" and mode to "2d" on missing fields', () => {
    const r = coerceRecipe({ cards: [] });
    expect(r).not.toBeNull();
    expect(r?.canvasAspect).toBe('square');
    expect(r?.mode).toBe('2d');
  });

  it('drops malformed cards but keeps well-formed ones', () => {
    const r = coerceRecipe({
      canvasAspect: 'square',
      cards: [
        { kind: 'typed', id: 'x', type: 'palette', enabled: true, params: { hue: { value: 0.5 } } },
        { kind: 'typed' }, // missing type → dropped
        { kind: 'wildcard', id: 'w', rawSource: '// hi', displayName: 'hi' },
        'garbage', // dropped
      ],
    });
    expect(r?.cards).toHaveLength(2);
    expect(r?.cards[0]?.kind).toBe('typed');
    expect(r?.cards[1]?.kind).toBe('wildcard');
  });

  it('coerces vec3 parameter values from arrays', () => {
    const r = coerceRecipe({
      cards: [{
        kind: 'typed', id: 'c', type: 'palette',
        params: { color: { value: [1, 0.5, 0.25] } },
      }],
    });
    const card = r?.cards[0];
    expect(card?.kind).toBe('typed');
    if (card?.kind === 'typed') {
      expect(card.params.color?.value).toEqual([1, 0.5, 0.25]);
    }
  });
});
