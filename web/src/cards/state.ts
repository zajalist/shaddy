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
  MediaSourceRef,
  Parameter,
  ParameterValue,
  Pass,
  PassId,
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

// ─── Pass helpers (image pass is implicit; A/B/C/D live in recipe.passes) ──

const BUFFER_PASS_NAMES: Record<Exclude<PassId, 'image'>, string> = {
  a: 'Buffer A', b: 'Buffer B', c: 'Buffer C', d: 'Buffer D',
};

/** Read the cards array for `passId` out of a recipe. The image pass reads
 *  from the top-level `recipe.cards`; buffer passes read from
 *  `recipe.passes`. Returns [] when the buffer pass isn't enabled. */
export function getPassCards(recipe: Recipe, passId: PassId): Card[] {
  if (passId === 'image') return recipe.cards;
  return recipe.passes?.find((p) => p.id === passId)?.cards ?? [];
}

/** Return a NEW Recipe with `cards` swapped in for `passId`. For the image
 *  pass this rewrites the top-level `recipe.cards`; for buffer passes it
 *  rewrites the matching entry in `recipe.passes` (the pass must already
 *  exist — use `addBufferPass` first). */
export function setPassCards(recipe: Recipe, passId: PassId, cards: Card[]): Recipe {
  if (passId === 'image') return { ...recipe, cards };
  const passes = recipe.passes ?? [];
  return {
    ...recipe,
    passes: passes.map((p) => (p.id === passId ? { ...p, cards } : p)),
  };
}

/** Return a NEW Recipe with a buffer pass slot enabled. No-op if the slot is
 *  already enabled. The newly-added pass starts with an empty cards array. */
export function addBufferPass(recipe: Recipe, passId: Exclude<PassId, 'image'>): Recipe {
  const passes = recipe.passes ?? [];
  if (passes.some((p) => p.id === passId)) return recipe;
  const next: Pass = { id: passId, name: BUFFER_PASS_NAMES[passId], cards: [] };
  return { ...recipe, passes: [...passes, next] };
}

/** Return a NEW Recipe with the given buffer pass removed. No-op if missing. */
export function removeBufferPass(recipe: Recipe, passId: Exclude<PassId, 'image'>): Recipe {
  if (!recipe.passes) return recipe;
  return { ...recipe, passes: recipe.passes.filter((p) => p.id !== passId) };
}

/** Return a NEW Recipe with the given buffer pass's display name set. */
export function renameBufferPass(
  recipe: Recipe,
  passId: Exclude<PassId, 'image'>,
  name: string,
): Recipe {
  if (!recipe.passes) return recipe;
  return {
    ...recipe,
    passes: recipe.passes.map((p) => (p.id === passId ? { ...p, name } : p)),
  };
}

/** Camera VIEW state (NOT part of the recipe — recipes are content, camera
 *  is viewpoint). Stored as eye/target/up so it maps 1:1 onto the three
 *  `u_cam_*` uniforms the 3D shader template references. The RecipeCanvas
 *  controller derives yaw/pitch on the fly for orbit / free-look math. */
export type CameraVec3 = readonly [number, number, number];
export type CameraView = {
  eye: CameraVec3;
  target: CameraVec3;
  up: CameraVec3;
};

export const DEFAULT_CAMERA: CameraView = {
  eye: [0, 1.2, 4],
  target: [0, 0.5, 0],
  up: [0, 1, 0],
};

export type CardsState = {
  recipe: Recipe;
  /** View-only camera for the 3D preview. Mutated by RecipeCanvas's mouse
   *  / wheel / WASD controller; read by the per-frame uniform pusher. */
  camera: CameraView;
  setCamera: (cam: CameraView) => void;

  /** UI state — which pass the chain editor currently operates on. All
   *  structural mutations (insertTypedCard, removeCard, reorder, …) target
   *  the active pass's cards. 'image' by default. */
  activePassId: PassId;
  setActivePassId: (id: PassId) => void;
  /** Enable a buffer pass slot (A/B/C/D) and switch to it. No-op if the
   *  slot is already enabled (just switches). */
  addBufferPass: (id: Exclude<PassId, 'image'>) => void;
  /** Disable a buffer pass slot. If it was the active one, drops back to
   *  'image'. */
  removeBufferPass: (id: Exclude<PassId, 'image'>) => void;
  /** Rename a buffer pass (UI display string only). */
  renameBufferPass: (id: Exclude<PassId, 'image'>, name: string) => void;

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

  /** Set the live media element for an image/video param. The serialised
   *  `value` (data URL / 'webcam' tag) is updated alongside so the Recipe
   *  stays self-describing. Pass null to clear the source. */
  setParamSource: (
    cardId: string,
    paramKey: string,
    value: ParameterValue,
    sourceRef: MediaSourceRef | null,
  ) => void;

  // Per-card composition — these DO change the emitted GLSL shape (wraps the
  // card's body in a blend block) so the integration layer recompiles, same
  // as a structural mutation.
  setAlpha: (cardId: string, alpha: number) => void;
  setBlendMode: (cardId: string, mode: BlendMode) => void;

  // Recipe-level mode toggle — 2D fragment vs 3D raymarched scene. Inserting
  // a 3D card auto-flips this via insertTypedCard.
  setMode: (mode: ShaderTemplate) => void;
};

export const useCardsStore = create<CardsState>((set, get) => {
  // ── per-action helpers — operate on the active-pass cards array ──
  // The active pass is always 'image' unless the user has switched tabs in
  // the chain editor. Reading/writing through these helpers means all the
  // existing structural / param mutations work for buffer passes without
  // duplicating each action body.

  const readActiveCards = (s: CardsState): Card[] =>
    getPassCards(s.recipe, s.activePassId);

  const writeActiveCards = (s: CardsState, cards: Card[]): Recipe =>
    setPassCards(s.recipe, s.activePassId, cards);

  /** Locate `cardId` across ALL passes (image + buffers). Returns the pass
   *  id, the index inside that pass's cards array, and the card itself.
   *  Used by mutations whose cardId reference may target any pass — e.g.
   *  updateParamValue gets called from RecipeCanvas's reverse parser even
   *  while the user is editing a different tab. */
  const findCardAnyPass = (
    s: CardsState,
    cardId: string,
  ): { passId: PassId; idx: number; card: Card } | null => {
    const imageIdx = s.recipe.cards.findIndex((c) => c.id === cardId);
    if (imageIdx >= 0) {
      return { passId: 'image', idx: imageIdx, card: s.recipe.cards[imageIdx]! };
    }
    for (const p of s.recipe.passes ?? []) {
      const idx = p.cards.findIndex((c) => c.id === cardId);
      if (idx >= 0) return { passId: p.id, idx, card: p.cards[idx]! };
    }
    return null;
  };

  /** Mutate the cards of WHICHEVER pass contains `cardId`. The mutator is a
   *  pure (cards) → cards function. No-op when the id isn't found. */
  const mutateCardInItsPass = (
    s: CardsState,
    cardId: string,
    mutator: (cards: Card[]) => Card[],
  ): Recipe | null => {
    const located = findCardAnyPass(s, cardId);
    if (!located) return null;
    const cards = getPassCards(s.recipe, located.passId);
    return setPassCards(s.recipe, located.passId, mutator(cards));
  };

  return {
  recipe: EMPTY_RECIPE,
  camera: DEFAULT_CAMERA,
  setCamera: (camera) => set({ camera }),

  activePassId: 'image',
  setActivePassId: (id) => set({ activePassId: id }),

  addBufferPass: (id) =>
    set((s) => ({
      recipe: addBufferPass(s.recipe, id),
      activePassId: id,
    })),

  removeBufferPass: (id) =>
    set((s) => ({
      recipe: removeBufferPass(s.recipe, id),
      activePassId: s.activePassId === id ? 'image' : s.activePassId,
    })),

  renameBufferPass: (id, name) =>
    set((s) => ({ recipe: renameBufferPass(s.recipe, id, name) })),

  setRecipe: (recipe) =>
    set((s) => {
      // If the active pass was a buffer that no longer exists in the new
      // recipe, fall back to 'image'.
      const stillExists =
        s.activePassId === 'image'
        || (recipe.passes?.some((p) => p.id === s.activePassId) ?? false);
      return { recipe, activePassId: stillExists ? s.activePassId : 'image' };
    }),

  insertTypedCard: (cardType, atIndex) =>
    set((s) => {
      const def = lookupCardDef(cardType);
      if (!def) return s;
      const params: Record<string, Parameter> = {};
      for (const [k, p] of Object.entries(def.params)) {
        // Image/video params accept `null` as a default (no media yet); the
        // Parameter.value type is ParameterValue (non-null), so coerce to
        // empty string. The integration layer treats '' as "no media set".
        let v: ParameterValue;
        if (p.kind === 'image' || p.kind === 'video') {
          v = p.default ?? '';
        } else if (p.kind === 'buffer') {
          // Buffer-ref params: the default is the literal buffer id ('a'..'d').
          // Stored as a string so the Recipe round-trips through JSON.
          v = p.default;
        } else {
          v = p.default;
        }
        params[k] = { value: v, animation: null, sourceRef: null };
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
      const cards = [...readActiveCards(s)];
      const idx = atIndex ?? cards.length;
      cards.splice(idx, 0, card);
      // Auto-flip the recipe to 3D mode when a 3D card is inserted into a
      // 2D recipe. The reverse direction is NEVER auto-applied — a user has
      // to explicitly toggle back to 2D (via the mode pill in Properties).
      const nextMode: ShaderTemplate | undefined =
        def.mode === '3d' && s.recipe.mode !== '3d' ? '3d' : s.recipe.mode;
      const baseRecipe = writeActiveCards(s, cards);
      return {
        recipe: nextMode ? { ...baseRecipe, mode: nextMode } : baseRecipe,
      };
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
      const cards = [...readActiveCards(s)];
      const idx = atIndex ?? cards.length;
      cards.splice(idx, 0, card);
      return { recipe: writeActiveCards(s, cards) };
    }),

  removeCard: (cardId) =>
    set((s) => {
      const next = mutateCardInItsPass(s, cardId, (cards) =>
        cards.filter((c) => c.id !== cardId));
      return next ? { recipe: next } : s;
    }),

  duplicateCard: (cardId) => {
    const s = get();
    const located = findCardAnyPass(s, cardId);
    if (!located) return null;
    const src = located.card;
    // Deep-clone params (and the params subobjects) so future edits to either
    // card don't bleed across. Wildcard rawSource is a primitive string —
    // structural copy via spread is enough.
    let clone: Card;
    if (src.kind === 'typed') {
      const newParams: Record<string, Parameter> = {};
      for (const [k, p] of Object.entries(src.params)) {
        newParams[k] = { value: p.value, animation: p.animation, sourceRef: p.sourceRef ?? null };
      }
      clone = { ...src, id: generateCardId(), params: newParams };
    } else {
      clone = { ...src, id: generateCardId('w') };
    }
    const cards = [...getPassCards(s.recipe, located.passId)];
    cards.splice(located.idx + 1, 0, clone);
    set({ recipe: setPassCards(s.recipe, located.passId, cards) });
    return clone.id;
  },

  reorderCard: (cardId, toIndex) =>
    set((s) => {
      const located = findCardAnyPass(s, cardId);
      if (!located) return s;
      const cards = [...getPassCards(s.recipe, located.passId)];
      const [card] = cards.splice(located.idx, 1);
      if (!card) return s;
      const clamped = Math.max(0, Math.min(cards.length, toIndex));
      cards.splice(clamped, 0, card);
      return { recipe: setPassCards(s.recipe, located.passId, cards) };
    }),

  toggleCardEnabled: (cardId) =>
    set((s) => {
      const next = mutateCardInItsPass(s, cardId, (cards) =>
        cards.map((c) => (c.id === cardId ? { ...c, enabled: !c.enabled } : c)));
      return next ? { recipe: next } : s;
    }),

  updateParamValue: (cardId, paramKey, value) =>
    set((s) => {
      const next = mutateCardInItsPass(s, cardId, (cards) =>
        cards.map<Card>((c) => {
          if (c.id !== cardId || c.kind !== 'typed') return c;
          const prev = c.params[paramKey];
          return {
            ...c,
            params: {
              ...c.params,
              [paramKey]: {
                value,
                animation: null,
                // Preserve any live media source already attached so a
                // non-media param edit on the SAME card doesn't blow away
                // an uploaded image / opened webcam.
                sourceRef: prev?.sourceRef ?? null,
              },
            },
          };
        }));
      return next ? { recipe: next } : s;
    }),

  setParamSource: (cardId, paramKey, value, sourceRef) =>
    set((s) => {
      const next = mutateCardInItsPass(s, cardId, (cards) =>
        cards.map<Card>((c) => {
          if (c.id !== cardId || c.kind !== 'typed') return c;
          return {
            ...c,
            params: {
              ...c.params,
              [paramKey]: { value, animation: null, sourceRef },
            },
          };
        }));
      return next ? { recipe: next } : s;
    }),

  setAlpha: (cardId, alpha) =>
    set((s) => {
      const clamped = Math.max(0, Math.min(1, alpha));
      const next = mutateCardInItsPass(s, cardId, (cards) =>
        cards.map<Card>((c) => (c.id === cardId ? { ...c, alpha: clamped } : c)));
      return next ? { recipe: next } : s;
    }),

  setBlendMode: (cardId, mode) =>
    set((s) => {
      const next = mutateCardInItsPass(s, cardId, (cards) =>
        cards.map<Card>((c) => (c.id === cardId ? { ...c, blendMode: mode } : c)));
      return next ? { recipe: next } : s;
    }),

  setMode: (mode) =>
    set((s) => ({ recipe: { ...s.recipe, mode } })),
  };
});

/** Replace every card.id (and any nested ids) with fresh ones. Used when
 *  loading a starter recipe so two loads of the same starter don't share
 *  ids (which would confuse the reverse parser). Applies to buffer passes
 *  too so multi-pass starters round-trip cleanly. */
export function cloneRecipeWithFreshIds(recipe: Recipe): Recipe {
  const freshCards = (cards: Card[]): Card[] =>
    cards.map((c) => {
      if (c.kind === 'wildcard') return { ...c, id: generateCardId('w') };
      return { ...c, id: generateCardId() };
    });
  const out: Recipe = { ...recipe, cards: freshCards(recipe.cards) };
  if (recipe.passes) {
    out.passes = recipe.passes.map((p) => ({ ...p, cards: freshCards(p.cards) }));
  }
  return out;
}
