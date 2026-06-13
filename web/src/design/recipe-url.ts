// Recipe ⇄ shareable URL. The recipe rides in `window.location.hash` as
// `#r=<base64(JSON)>` so a link restores the whole composition with no backend.
// Heavy media param values (uploaded-image / video data URLs) are stripped so
// the link stays portable — the structure (cards, params, passes, aspect, mode)
// travels; an uploaded photo does not.

import type { Recipe, Card } from '@/cards';
import { validateRecipe } from '@/cards';

const HASH_PREFIX = 'r=';

function stripMedia(cards: Card[]): Card[] {
  return cards.map((c) => {
    if (c.kind !== 'typed') return c;
    const params = Object.fromEntries(
      Object.entries(c.params).map(([k, p]) => {
        const v = p.value;
        const isDataUrl = typeof v === 'string' && v.startsWith('data:');
        // Drop the live source ref (an HTMLElement — not serialisable) and any
        // inline data-URL value (too big for a URL); keep tags like 'webcam'.
        return [k, { value: isDataUrl ? '' : v, animation: p.animation }];
      }),
    );
    return { ...c, params };
  });
}

/** A recipe stripped of non-serialisable / oversized media, ready to encode. */
function serialisable(recipe: Recipe): Recipe {
  return {
    ...recipe,
    cards: stripMedia(recipe.cards),
    ...(recipe.passes ? { passes: recipe.passes.map((p) => ({ ...p, cards: stripMedia(p.cards) })) } : {}),
  };
}

/** `r=<base64 utf-8 JSON>` — the hash payload (without the leading `#`). */
export function encodeRecipeToHash(recipe: Recipe): string {
  const json = JSON.stringify(serialisable(recipe));
  const b64 = btoa(unescape(encodeURIComponent(json))); // UTF-8 safe base64
  return `${HASH_PREFIX}${b64}`;
}

/** Decode a `#r=…` hash back to a Recipe, or null if absent / invalid. */
export function decodeRecipeFromHash(hash: string): Recipe | null {
  const h = hash.replace(/^#/, '');
  if (!h.startsWith(HASH_PREFIX)) return null;
  try {
    const json = decodeURIComponent(escape(atob(h.slice(HASH_PREFIX.length))));
    const recipe = JSON.parse(json) as Recipe;
    if (!recipe || !Array.isArray(recipe.cards)) return null;
    if (validateRecipe(recipe).length > 0) return null; // unknown card types → reject
    return recipe;
  } catch {
    return null;
  }
}

/** The full shareable URL for a recipe (origin + path + encoded hash). */
export function recipeShareUrl(recipe: Recipe): string {
  return `${window.location.origin}${window.location.pathname}#${encodeRecipeToHash(recipe)}`;
}
