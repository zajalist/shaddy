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
import type {
  BlendMode,
  Card,
  Parameter,
  ParameterValue,
  Recipe,
  ShaderTemplate,
  TypedCard,
  WildcardCard,
} from './types';

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
  /** Insert a deep copy of `cardId` directly after it. Returns the new
   *  card's id, or null if `cardId` wasn't found. */
  duplicateCard: (cardId: string) => string | null;
  reorderCard: (cardId: string, toIndex: number) => void;
  toggleCardEnabled: (cardId: string) => void;

  // Parameter value mutation — same recipe shape, just a new uniform value.
  // Integration layer calls renderer.setUniform on the next animation frame;
  // no recompile needed.
  updateParamValue: (cardId: string, paramKey: string, value: ParameterValue) => void;

  // Per-card composition — these DO change the emitted GLSL shape (wraps the
  // card's body in a blend block) so the integration layer recompiles, same
  // as a structural mutation.
  setAlpha: (cardId: string, alpha: number) => void;
  setBlendMode: (cardId: string, mode: BlendMode) => void;

  // Recipe-level mode toggle — 2D fragment vs 3D raymarched scene. Inserting
  // a 3D card auto-flips this via insertTypedCard.
  setMode: (mode: ShaderTemplate) => void;
};

export const useCardsStore = create<CardsState>((set, get) => ({
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
        alpha: 1,
        blendMode: 'normal',
      };
      const cards = [...s.recipe.cards];
      const idx = atIndex ?? cards.length;
      cards.splice(idx, 0, card);
      // Auto-flip the recipe to 3D mode when a 3D card is inserted into a
      // 2D recipe. The reverse direction is NEVER auto-applied — a user has
      // to explicitly toggle back to 2D (via the mode pill in Properties).
      const nextMode: ShaderTemplate | undefined =
        def.mode === '3d' && s.recipe.mode !== '3d' ? '3d' : s.recipe.mode;
      return { recipe: { ...s.recipe, cards, ...(nextMode ? { mode: nextMode } : {}) } };
    }),

  insertWildcard: (atIndex, rawSource, displayName) =>
    set((s) => {
      const card: WildcardCard = {
        kind: 'wildcard',
        id: generateCardId('w'),
        enabled: true,
        rawSource: rawSource ?? '  // your code here\n  d = 0.5;',
        displayName: displayName ?? null,
        alpha: 1,
        blendMode: 'normal',
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

  duplicateCard: (cardId) => {
    const s = get();
    const srcIdx = s.recipe.cards.findIndex((c) => c.id === cardId);
    if (srcIdx < 0) return null;
    const src = s.recipe.cards[srcIdx];
    if (!src) return null;
    // Deep-clone params (and the params subobjects) so future edits to either
    // card don't bleed across. Wildcard rawSource is a primitive string —
    // structural copy via spread is enough.
    let clone: Card;
    if (src.kind === 'typed') {
      const newParams: Record<string, Parameter> = {};
      for (const [k, p] of Object.entries(src.params)) {
        newParams[k] = { value: p.value, animation: p.animation };
      }
      clone = { ...src, id: generateCardId(), params: newParams };
    } else {
      clone = { ...src, id: generateCardId('w') };
    }
    const cards = [...s.recipe.cards];
    cards.splice(srcIdx + 1, 0, clone);
    set({ recipe: { ...s.recipe, cards } });
    return clone.id;
  },

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

  setAlpha: (cardId, alpha) =>
    set((s) => {
      const clamped = Math.max(0, Math.min(1, alpha));
      return {
        recipe: {
          ...s.recipe,
          cards: s.recipe.cards.map<Card>((c) =>
            (c.id === cardId ? { ...c, alpha: clamped } : c)),
        },
      };
    }),

  setBlendMode: (cardId, mode) =>
    set((s) => ({
      recipe: {
        ...s.recipe,
        cards: s.recipe.cards.map<Card>((c) =>
          (c.id === cardId ? { ...c, blendMode: mode } : c)),
      },
    })),

  setMode: (mode) =>
    set((s) => ({ recipe: { ...s.recipe, mode } })),
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
