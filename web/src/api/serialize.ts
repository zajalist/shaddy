// Media-strip for recipes before POSTing to the backend. This duplicates the
// ~15-line stripMedia from design/recipe-url.ts on purpose: api/ may not import
// design/ (module boundary), and the server re-validates the recipe anyway.
// Keep in sync with design/recipe-url.ts if that logic changes.

import type { Card, Recipe } from '@/cards';

function stripMedia(cards: Card[]): Card[] {
  return cards.map((c) => {
    if (c.kind !== 'typed') return c;
    const params = Object.fromEntries(
      Object.entries(c.params).map(([k, p]) => {
        const v = p.value;
        const isDataUrl = typeof v === 'string' && v.startsWith('data:');
        return [k, { value: isDataUrl ? '' : v, animation: p.animation }];
      }),
    );
    return { ...c, params };
  });
}

/** A recipe stripped of non-serialisable / oversized media, ready to publish. */
export function serialisable(recipe: Recipe): Recipe {
  return {
    ...recipe,
    cards: stripMedia(recipe.cards),
    ...(recipe.passes
      ? { passes: recipe.passes.map((p) => ({ ...p, cards: stripMedia(p.cards) })) }
      : {}),
  };
}

/** Convert a `data:image/png;base64,…` URL to a Blob for multipart upload. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head ?? '')?.[1] ?? 'image/png';
  const bin = atob(b64 ?? '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
