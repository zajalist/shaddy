// Zustand store for the Recipe. The Recipe is the source of truth (Q1).
// All cards UI actions mutate through this store; the integration layer
// subscribes, recompiles (throttled), and calls renderer.compile /
// renderer.setUniform per Q5.
//
// The reverse parser is NOT wired through here directly — the integration
// layer calls reparse() and applies the result via setRecipe(). Keeps the
// store unaware of CodeMirror and round-trip timing.

import { create } from 'zustand';

import { lookupCardDef } from './library';
import type { Card, Parameter, ParameterValue, Recipe, TypedCard, WildcardCard } from './types';

let _idCounter = 0;
export function generateCardId(prefix = 'c'): string {
  _idCounter++;
  return `${prefix}${_idCounter.toString(36)}`;
}

/** Reset the id counter. Tests only. */
export function _resetCardIdCounter(): void {
  _idCounter = 0;
}

const EMPTY_RECIPE: Recipe = { canvasAspect: 'square', cards: [] };

export type CardsState = {
  recipe: Recipe;

  // Bulk replace (used by starter recipes, reverse parser, share URL load).
  setRecipe: (recipe: Recipe) => void;

  // Structural mutations — these change the recipe shape; integration layer
  // recompiles the shader on the next throttle tick.
  insertTypedCard: (cardType: string, atIndex?: number) => void;
  insertWildcard: (atIndex?: number, rawSource?: string, displayName?: string | null) => void;
  removeCard: (cardId: string) => void;
  reorderCard: (cardId: string, toIndex: number) => void;
  toggleCardEnabled: (cardId: string) => void;

  // Parameter value mutation — same recipe shape, just a new uniform value.
  // Integration layer calls renderer.setUniform on the next animation frame;
  // no recompile needed.
  updateParamValue: (cardId: string, paramKey: string, value: ParameterValue) => void;
};

export const useCardsStore = create<CardsState>((set) => ({
  recipe: EMPTY_RECIPE,

  setRecipe: (recipe) => set({ recipe }),

  insertTypedCard: (cardType, atIndex) =>
    set((s) => {
      const def = lookupCardDef(cardType);
      if (!def) return s;
      const params: Record<string, Parameter> = {};
      for (const [k, p] of Object.entries(def.params)) {
        params[k] = { value: p.default, animation: null };
      }
      const card: TypedCard = {
        kind: 'typed',
        id: generateCardId(),
        type: cardType,
        enabled: true,
        params,
      };
      const cards = [...s.recipe.cards];
      const idx = atIndex ?? cards.length;
      cards.splice(idx, 0, card);
      return { recipe: { ...s.recipe, cards } };
    }),

  insertWildcard: (atIndex, rawSource, displayName) =>
    set((s) => {
      const card: WildcardCard = {
        kind: 'wildcard',
        id: generateCardId('w'),
        enabled: true,
        rawSource: rawSource ?? '  // your code here\n  d = 0.5;',
        displayName: displayName ?? null,
      };
      const cards = [...s.recipe.cards];
      const idx = atIndex ?? cards.length;
      cards.splice(idx, 0, card);
      return { recipe: { ...s.recipe, cards } };
    }),

  removeCard: (cardId) =>
    set((s) => ({
      recipe: { ...s.recipe, cards: s.recipe.cards.filter((c) => c.id !== cardId) },
    })),

  reorderCard: (cardId, toIndex) =>
    set((s) => {
      const fromIdx = s.recipe.cards.findIndex((c) => c.id === cardId);
      if (fromIdx < 0) return s;
      const cards = [...s.recipe.cards];
      const [card] = cards.splice(fromIdx, 1);
      if (!card) return s;
      const clamped = Math.max(0, Math.min(cards.length, toIndex));
      cards.splice(clamped, 0, card);
      return { recipe: { ...s.recipe, cards } };
    }),

  toggleCardEnabled: (cardId) =>
    set((s) => ({
      recipe: {
        ...s.recipe,
        cards: s.recipe.cards.map((c) => (c.id === cardId ? { ...c, enabled: !c.enabled } : c)),
      },
    })),

  updateParamValue: (cardId, paramKey, value) =>
    set((s) => ({
      recipe: {
        ...s.recipe,
        cards: s.recipe.cards.map<Card>((c) => {
          if (c.id !== cardId || c.kind !== 'typed') return c;
          return {
            ...c,
            params: { ...c.params, [paramKey]: { value, animation: null } },
          };
        }),
      },
    })),
}));

/** Replace every card.id (and any nested ids) with fresh ones. Used when
 *  loading a starter recipe so two loads of the same starter don't share
 *  ids (which would confuse the reverse parser). */
export function cloneRecipeWithFreshIds(recipe: Recipe): Recipe {
  return {
    ...recipe,
    cards: recipe.cards.map((c) => {
      if (c.kind === 'wildcard') return { ...c, id: generateCardId('w') };
      return { ...c, id: generateCardId() };
    }),
  };
}
