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
import { defaultAnimBlock } from './anim-blocks';
import type {
  Animation,
  AnimBlock,
  AnimChain,
  BlendMode,
  Card,
  CardAttribute,
  MacroDef,
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

/** Deep-copy a typed card with a fresh id (params + attributes cloned) — used
 *  when collapsing blocks into a macro and when inserting a saved macro. */
function cloneTyped(card: TypedCard): TypedCard {
  const params: Record<string, Parameter> = {};
  for (const [k, p] of Object.entries(card.params)) {
    params[k] = { value: p.value, animation: p.animation, sourceRef: p.sourceRef ?? null };
  }
  return {
    ...card,
    id: generateCardId(),
    params,
    attributes: card.attributes ? card.attributes.map((a) => ({ ...a })) : undefined,
    macro: card.macro ? { ...card.macro, blocks: card.macro.blocks.map(cloneTyped) } : undefined,
  };
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

/** Unique declared named-reroute names in a cards array, in first-appearance
 *  order. Drives the palette / ⌘K "Reroutes" entries and the canvas affordances
 *  — one insertable USAGE per declared name. */
export function rerouteDeclNames(cards: Card[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of cards) {
    if (c.kind === 'typed' && c.type === 'reroute_decl') {
      const n = String(c.params.name?.value ?? '').trim();
      if (n && !seen.has(n)) { seen.add(n); out.push(n); }
    }
  }
  return out;
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
  /** Insert a typed card from the library at `atIndex` (default: end of the
   *  active pass). Returns the new card's id, or null if the type is unknown. */
  insertTypedCard: (cardType: string, atIndex?: number) => string | null;
  /** Insert a named-reroute USAGE card (a SOURCE that reads the given reroute
   *  name) into the active pass. Powers the palette / ⌘K "Reroutes" entries.
   *  Returns the new card id. */
  insertRerouteUse: (name: string, atIndex?: number) => string;
  /** Insert a named-reroute DECLARATION card (captures the running colour under
   *  `name`) at `atIndex` (default: end). Returns the new card id. */
  insertRerouteDecl: (name: string, atIndex?: number) => string;
  /** Collapse the given cards into a single macro ("function") card in place,
   *  returning the new macro card id (or null if nothing usable was selected). */
  makeMacro: (cardIds: string[], name: string) => string | null;
  /** Insert a macro card from a saved definition. Returns the new card id. */
  insertMacro: (def: MacroDef, atIndex?: number) => string;
  /** Patch a macro card's definition in place (rename, toggle compress, …). */
  updateMacro: (cardId: string, patch: Partial<MacroDef>) => void;
  /** Expand a macro card back into its constituent blocks (ungroup). */
  ungroupMacro: (cardId: string) => void;
  insertWildcard: (atIndex?: number, rawSource?: string, displayName?: string | null) => void;
  removeCard: (cardId: string) => void;
  /** Remove EVERY placed macro card whose macro name matches, across the image
   *  pass and all buffer passes. Used when a macro is deleted from the palette
   *  registry so dangling instances don't linger on the canvas. */
  removeMacrosByName: (name: string) => void;
  /** Insert a deep copy of `cardId` directly after it. Returns the new
   *  card's id, or null if `cardId` wasn't found. */
  duplicateCard: (cardId: string) => string | null;
  reorderCard: (cardId: string, toIndex: number) => void;
  /** Reorder the active pass's cards to match `orderedIds` (the free-move
   *  canvas recomputes this from spatial reading order on drop). Ids not in the
   *  list keep their relative order, appended at the end (defensive). No-op if
   *  the resulting order is identical. */
  setCardOrder: (orderedIds: string[]) => void;
  toggleCardEnabled: (cardId: string) => void;

  // Parameter value mutation — same recipe shape, just a new uniform value.
  // Integration layer calls renderer.setUniform on the next animation frame;
  // no recompile needed.
  updateParamValue: (cardId: string, paramKey: string, value: ParameterValue) => void;

  /** Set (or clear with null) the per-frame animation on a param. Changes the
   *  emitted GLSL shape (the param becomes a u_time-driven local), so it's a
   *  structural recompile; editing the animation's endpoints afterwards is a
   *  cheap live setUniform. */
  setParamAnimation: (cardId: string, paramKey: string, animation: Animation | null) => void;

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

  // Scoped attributes — attach a library card as a per-block modifier. These
  // change the emitted GLSL shape (the host body gets wrapped) so the
  // integration recompiles; attribute PARAM values still push live as uniforms.
  addAttribute: (cardId: string, attrType: string) => void;
  removeAttribute: (cardId: string, attrId: string) => void;
  updateAttributeParam: (cardId: string, attrId: string, paramKey: string, value: ParameterValue) => void;

  // Recipe-level mode toggle — 2D fragment vs 3D raymarched scene. Inserting
  // a 3D card auto-flips this via insertTypedCard.
  setMode: (mode: ShaderTemplate) => void;

  // ── Custom animations (Recipe.animations) ──────────────────────────────
  // A custom animation is a shared AnimChain (a signal built from animation
  // blocks) that params bind to via animation:{type:'custom',ref}. Editing a
  // chain's blocks/params changes the emitted GLSL (recompile); the chain
  // animates live through u_time. See cards/anim-blocks.ts.

  /** Create a fresh animation chain (starter = Time → Oscillate) and bind the
   *  given param to it. Returns the new chain id (or null if the card/param
   *  isn't found). The chain's blocks get fresh ids so the canvas can place them. */
  createCustomAnimation: (cardId: string, paramKey: string) => string | null;
  /** Start a new (unbound) animation chain holding a single block of the given
   *  type — for dragging a block from the palette onto empty canvas. Returns the
   *  new BLOCK's id so the canvas can position it at the drop point. */
  startAnimChain: (blockType: string) => string | null;
  /** Bind an existing chain to a param (reuse). Pass null ref via
   *  setParamAnimation to unbind. */
  bindParamToAnimation: (cardId: string, paramKey: string, chainId: string) => void;
  /** Delete a chain and unbind every param that referenced it, across all passes. */
  removeAnimChain: (chainId: string) => void;
  /** Append an animation block of the given type to a chain. Returns its id. */
  addAnimBlock: (chainId: string, blockType: string) => string | null;
  /** Remove an animation block from a chain. */
  removeAnimBlock: (chainId: string, blockId: string) => void;
  /** Rebuild every animation chain from spatially-snapped runs (the canvas
   *  decides grouping): one chain per run, so an UNSNAPPED block is its own
   *  1-block animation and snapping merges blocks into one. Each `run` is an
   *  ordered list of block ids. Chain ids/names are preserved where a run's
   *  head was already a chain head; param bindings follow each old chain's tail
   *  block into its new chain. */
  setAnimChainsFromRuns: (runs: string[][]) => void;
  /** Update one param value on one animation block (bakes into the chain GLSL). */
  updateAnimBlockParam: (chainId: string, blockId: string, paramKey: string, value: ParameterValue) => void;
  /** Delete animation blocks by id (keyboard delete). Drops chains that become
   *  empty and unbinds params that referenced them. */
  removeAnimBlocks: (blockIds: string[]) => void;
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

  // ── custom-animation helpers (operate on a whole Recipe, all passes) ──
  const allPassIds = (recipe: Recipe): PassId[] =>
    ['image', ...(recipe.passes ?? []).map((p) => p.id)];

  /** Set/clear a param's animation wherever the card lives (any pass). Pure. */
  const setParamAnimInRecipe = (
    recipe: Recipe, cardId: string, paramKey: string, animation: Animation | null,
  ): Recipe => {
    for (const pid of allPassIds(recipe)) {
      const cards = getPassCards(recipe, pid);
      if (!cards.some((c) => c.id === cardId)) continue;
      return setPassCards(recipe, pid, cards.map<Card>((c) =>
        c.id === cardId && c.kind === 'typed'
          ? { ...c, params: { ...c.params, [paramKey]: {
              value: c.params[paramKey]?.value ?? 0,
              animation,
              sourceRef: c.params[paramKey]?.sourceRef ?? null,
            } } }
          : c));
    }
    return recipe;
  };

  /** Clear every custom binding to `chainId` across all passes. Pure. */
  const unbindChainEverywhere = (recipe: Recipe, chainId: string): Recipe => {
    let r = recipe;
    for (const pid of allPassIds(recipe)) {
      r = setPassCards(r, pid, getPassCards(r, pid).map<Card>((c) => {
        if (c.kind !== 'typed') return c;
        let changed = false;
        const params = { ...c.params };
        for (const [k, p] of Object.entries(c.params)) {
          if (p?.animation?.type === 'custom' && p.animation.ref === chainId) {
            params[k] = { ...p, animation: null };
            changed = true;
          }
        }
        return changed ? { ...c, params } : c;
      }));
    }
    return r;
  };

  /** Map one chain in recipe.animations (no-op if absent). Pure. */
  const mapAnimChain = (
    recipe: Recipe, chainId: string, fn: (chain: AnimChain) => AnimChain,
  ): Recipe => ({
    ...recipe,
    animations: (recipe.animations ?? []).map((c) => (c.id === chainId ? fn(c) : c)),
  });

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

  insertTypedCard: (cardType, atIndex) => {
    const s = get();
    const def = lookupCardDef(cardType);
    if (!def) return null;
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
    set({ recipe: nextMode ? { ...baseRecipe, mode: nextMode } : baseRecipe });
    return card.id;
  },

  insertRerouteUse: (name, atIndex) => {
    const s = get();
    const card: TypedCard = {
      kind: 'typed',
      id: generateCardId(),
      type: 'reroute_use',
      enabled: true,
      params: { ref: { value: name, animation: null, sourceRef: null } },
      alpha: 1,
      blendMode: 'normal',
    };
    const cards = [...readActiveCards(s)];
    const idx = atIndex ?? cards.length;
    cards.splice(idx, 0, card);
    set({ recipe: writeActiveCards(s, cards) });
    return card.id;
  },

  insertRerouteDecl: (name, atIndex) => {
    const s = get();
    const card: TypedCard = {
      kind: 'typed',
      id: generateCardId(),
      type: 'reroute_decl',
      enabled: true,
      params: { name: { value: name, animation: null, sourceRef: null } },
      alpha: 1,
      blendMode: 'normal',
    };
    const cards = [...readActiveCards(s)];
    const idx = atIndex ?? cards.length;
    cards.splice(idx, 0, card);
    set({ recipe: writeActiveCards(s, cards) });
    return card.id;
  },

  makeMacro: (cardIds, name) => {
    const s = get();
    const cards = [...readActiveCards(s)];
    const idSet = new Set(cardIds);
    const selected = cards.filter((c) => idSet.has(c.id));
    // v1 only expands plain typed blocks (not markers / reroutes / nested macros).
    const sub = selected.filter((c): c is TypedCard => c.kind === 'typed'
      && c.type !== 'macro' && c.type !== 'portal' && !c.type.startsWith('reroute_'));
    if (sub.length === 0) return null;
    const firstIdx = cards.findIndex((c) => idSet.has(c.id));
    const macroCard: TypedCard = {
      kind: 'typed', id: generateCardId(), type: 'macro', enabled: true, params: {},
      alpha: 1, blendMode: 'normal', macro: { name, blocks: sub.map(cloneTyped) },
    };
    const remaining = cards.filter((c) => !idSet.has(c.id));
    remaining.splice(Math.max(0, firstIdx), 0, macroCard);
    set({ recipe: writeActiveCards(s, remaining) });
    return macroCard.id;
  },

  insertMacro: (def, atIndex) => {
    const s = get();
    const macroCard: TypedCard = {
      kind: 'typed', id: generateCardId(), type: 'macro', enabled: true, params: {},
      alpha: 1, blendMode: 'normal',
      macro: { name: def.name, blocks: def.blocks.map(cloneTyped), compress: def.compress },
    };
    const cards = [...readActiveCards(s)];
    const idx = atIndex ?? cards.length;
    cards.splice(idx, 0, macroCard);
    set({ recipe: writeActiveCards(s, cards) });
    return macroCard.id;
  },

  updateMacro: (cardId, patch) =>
    set((s) => {
      const next = mutateCardInItsPass(s, cardId, (cards) => cards.map((c) =>
        c.id === cardId && c.kind === 'typed' && c.macro
          ? { ...c, macro: { ...c.macro, ...patch } }
          : c));
      return next ? { recipe: next } : s;
    }),

  ungroupMacro: (cardId) =>
    set((s) => {
      const next = mutateCardInItsPass(s, cardId, (cards) => {
        const idx = cards.findIndex((c) => c.id === cardId);
        const card = cards[idx];
        if (idx < 0 || !card || card.kind !== 'typed' || !card.macro) return cards;
        const expanded = card.macro.blocks.map(cloneTyped);
        return [...cards.slice(0, idx), ...expanded, ...cards.slice(idx + 1)];
      });
      return next ? { recipe: next } : s;
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

  removeMacrosByName: (name) =>
    set((s) => {
      const strip = (cards: Card[]): Card[] =>
        cards.filter((c) => !(c.kind === 'typed' && c.type === 'macro' && c.macro?.name === name));
      const recipe = s.recipe;
      const next: Recipe = {
        ...recipe,
        cards: strip(recipe.cards),
        ...(recipe.passes ? { passes: recipe.passes.map((p) => ({ ...p, cards: strip(p.cards) })) } : {}),
      };
      return { recipe: next };
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

  setCardOrder: (orderedIds) =>
    set((s) => {
      const cards = readActiveCards(s);
      const byId = new Map(cards.map((c) => [c.id, c]));
      const seen = new Set<string>();
      const next: Card[] = [];
      for (const id of orderedIds) {
        const c = byId.get(id);
        if (c && !seen.has(id)) { next.push(c); seen.add(id); }
      }
      for (const c of cards) if (!seen.has(c.id)) next.push(c); // keep any unlisted
      if (next.length !== cards.length) return s;
      if (next.every((c, i) => c.id === cards[i]?.id)) return s; // unchanged → no-op
      return { recipe: writeActiveCards(s, next) };
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
                // Keep any animation already on this param — editing the base
                // value shouldn't silently un-animate it.
                animation: prev?.animation ?? null,
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

  setParamAnimation: (cardId, paramKey, animation) =>
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
                value: prev?.value ?? 0,
                animation,
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

  addAttribute: (cardId, attrType) =>
    set((s) => {
      const def = lookupCardDef(attrType);
      if (!def) return s;
      const params: Record<string, Parameter> = {};
      for (const [k, pd] of Object.entries(def.params)) {
        params[k] = { value: pd.default ?? 0, animation: null };
      }
      const attr: CardAttribute = { id: generateCardId('a'), type: attrType, enabled: true, params };
      const next = mutateCardInItsPass(s, cardId, (cards) =>
        cards.map<Card>((c) => (c.id === cardId && c.kind === 'typed'
          ? { ...c, attributes: [...(c.attributes ?? []), attr] }
          : c)));
      return next ? { recipe: next } : s;
    }),

  removeAttribute: (cardId, attrId) =>
    set((s) => {
      const next = mutateCardInItsPass(s, cardId, (cards) =>
        cards.map<Card>((c) => (c.id === cardId && c.kind === 'typed'
          ? { ...c, attributes: (c.attributes ?? []).filter((a) => a.id !== attrId) }
          : c)));
      return next ? { recipe: next } : s;
    }),

  updateAttributeParam: (cardId, attrId, paramKey, value) =>
    set((s) => {
      const next = mutateCardInItsPass(s, cardId, (cards) =>
        cards.map<Card>((c) => {
          if (c.id !== cardId || c.kind !== 'typed') return c;
          return {
            ...c,
            attributes: (c.attributes ?? []).map((a) =>
              a.id !== attrId ? a : { ...a, params: { ...a.params, [paramKey]: { value, animation: null } } }),
          };
        }));
      return next ? { recipe: next } : s;
    }),

  setMode: (mode) =>
    set((s) => ({ recipe: { ...s.recipe, mode } })),

  // ── Custom animations ──
  createCustomAnimation: (cardId, paramKey) => {
    const id = generateCardId('anim');
    let created: string | null = null;
    set((s) => {
      const existing = s.recipe.animations ?? [];
      const chain: AnimChain = {
        id,
        name: `Animation ${existing.length + 1}`,
        blocks: [
          defaultAnimBlock('time', generateCardId('ab')),
          defaultAnimBlock('oscillate', generateCardId('ab')),
        ],
      };
      const withChain: Recipe = { ...s.recipe, animations: [...existing, chain] };
      const next = setParamAnimInRecipe(withChain, cardId, paramKey, { type: 'custom', ref: id });
      if (next === withChain) return s; // card/param not found — don't strand a chain
      created = id;
      return { recipe: next };
    });
    return created;
  },

  startAnimChain: (blockType) => {
    const blockId = generateCardId('ab');
    let created: string | null = null;
    set((s) => {
      const existing = s.recipe.animations ?? [];
      const chain: AnimChain = {
        id: generateCardId('anim'),
        name: `Animation ${existing.length + 1}`,
        blocks: [defaultAnimBlock(blockType, blockId)],
      };
      created = blockId;
      return { recipe: { ...s.recipe, animations: [...existing, chain] } };
    });
    return created;
  },

  bindParamToAnimation: (cardId, paramKey, chainId) =>
    set((s) => {
      if (!(s.recipe.animations ?? []).some((c) => c.id === chainId)) return s;
      return { recipe: setParamAnimInRecipe(s.recipe, cardId, paramKey, { type: 'custom', ref: chainId }) };
    }),

  removeAnimChain: (chainId) =>
    set((s) => {
      const cleared = unbindChainEverywhere(s.recipe, chainId);
      const animations = (cleared.animations ?? []).filter((c) => c.id !== chainId);
      return { recipe: { ...cleared, animations: animations.length ? animations : undefined } };
    }),

  addAnimBlock: (chainId, blockType) => {
    const blockId = generateCardId('ab');
    let added: string | null = null;
    set((s) => {
      if (!(s.recipe.animations ?? []).some((c) => c.id === chainId)) return s;
      added = blockId;
      return {
        recipe: mapAnimChain(s.recipe, chainId, (c) => ({
          ...c, blocks: [...c.blocks, defaultAnimBlock(blockType, blockId)],
        })),
      };
    });
    return added;
  },

  removeAnimBlock: (chainId, blockId) =>
    set((s) => ({
      recipe: mapAnimChain(s.recipe, chainId, (c) => ({
        ...c, blocks: c.blocks.filter((b) => b.id !== blockId),
      })),
    })),

  updateAnimBlockParam: (chainId, blockId, paramKey, value) =>
    set((s) => ({
      recipe: mapAnimChain(s.recipe, chainId, (c) => ({
        ...c,
        blocks: c.blocks.map((b) =>
          b.id === blockId
            ? { ...b, params: { ...b.params, [paramKey]: { value, animation: b.params[paramKey]?.animation ?? null } } }
            : b),
      })),
    })),

  removeAnimBlocks: (blockIds) =>
    set((s) => {
      const all = s.recipe.animations ?? [];
      if (all.length === 0) return s;
      const drop = new Set(blockIds);
      const kept = all
        .map((ch) => ({ ...ch, blocks: ch.blocks.filter((b) => !drop.has(b.id)) }))
        .filter((ch) => ch.blocks.length > 0);
      const remaining = new Set(kept.map((c) => c.id));
      let recipe: Recipe = { ...s.recipe, animations: kept.length ? kept : undefined };
      for (const old of all) if (!remaining.has(old.id)) recipe = unbindChainEverywhere(recipe, old.id);
      return { recipe };
    }),

  setAnimChainsFromRuns: (runs) =>
    set((s) => {
      const old = s.recipe.animations ?? [];
      if (old.length === 0) return s;
      const blockById = new Map<string, AnimBlock>();
      const chainOfBlock = new Map<string, AnimChain>();
      for (const ch of old) for (const b of ch.blocks) { blockById.set(b.id, b); chainOfBlock.set(b.id, ch); }

      const usedIds = new Set<string>();
      const newChains: AnimChain[] = runs
        .map((run, i) => {
          const blocks = run.map((id) => blockById.get(id)).filter((b): b is AnimBlock => !!b);
          if (blocks.length === 0) return null;
          const headChain = chainOfBlock.get(run[0]!);
          const keepId = headChain && !usedIds.has(headChain.id);
          const id = keepId ? headChain!.id : generateCardId('anim');
          usedIds.add(id);
          return { id, name: keepId ? headChain!.name : `Animation ${i + 1}`, blocks };
        })
        .filter((c): c is AnimChain => c !== null);

      // A param bound to an old chain follows that chain's TAIL block into the
      // new chain that now contains it (so bindings survive merge/split).
      const remap = new Map<string, string>();
      for (const oldCh of old) {
        const tailId = oldCh.blocks[oldCh.blocks.length - 1]?.id;
        const nc = tailId ? newChains.find((c) => c.blocks.some((b) => b.id === tailId)) : undefined;
        if (nc && nc.id !== oldCh.id) remap.set(oldCh.id, nc.id);
      }
      let recipe: Recipe = { ...s.recipe, animations: newChains.length ? newChains : undefined };
      if (remap.size) {
        for (const pid of allPassIds(recipe)) {
          recipe = setPassCards(recipe, pid, getPassCards(recipe, pid).map<Card>((c) => {
            if (c.kind !== 'typed') return c;
            let changed = false;
            const params = { ...c.params };
            for (const [k, p] of Object.entries(c.params)) {
              if (p?.animation?.type === 'custom' && remap.has(p.animation.ref)) {
                params[k] = { ...p, animation: { type: 'custom', ref: remap.get(p.animation.ref)! } };
                changed = true;
              }
            }
            return changed ? { ...c, params } : c;
          }));
        }
      }
      return { recipe };
    }),
  };
});

/** Replace every card.id (and any nested ids) with fresh ones. Used when
 *  loading a starter recipe so two loads of the same starter don't share
 *  ids (which would confuse the reverse parser). Applies to buffer passes
 *  too so multi-pass starters round-trip cleanly. */
export function cloneRecipeWithFreshIds(recipe: Recipe): Recipe {
  // Remap custom-animation chain ids first so card params can re-point to the
  // fresh chain ids (the binding survives the clone).
  const chainIdMap = new Map<string, string>();
  for (const ch of recipe.animations ?? []) chainIdMap.set(ch.id, generateCardId('anim'));
  const remapParamAnim = (p: Parameter): Parameter =>
    p.animation?.type === 'custom' && chainIdMap.has(p.animation.ref)
      ? { ...p, animation: { type: 'custom', ref: chainIdMap.get(p.animation.ref)! } }
      : p;
  const freshCards = (cards: Card[]): Card[] =>
    cards.map((c) => {
      const id = c.kind === 'wildcard' ? generateCardId('w') : generateCardId();
      if (c.kind === 'wildcard') return { ...c, id };
      const params: Record<string, Parameter> = {};
      for (const [k, p] of Object.entries(c.params)) params[k] = remapParamAnim(p);
      return { ...c, id, params };
    });
  const out: Recipe = { ...recipe, cards: freshCards(recipe.cards) };
  if (recipe.passes) {
    out.passes = recipe.passes.map((p) => ({ ...p, cards: freshCards(p.cards) }));
  }
  if (recipe.animations) {
    out.animations = recipe.animations.map((ch) => ({
      ...ch,
      id: chainIdMap.get(ch.id)!,
      blocks: ch.blocks.map((b) => ({ ...b, id: generateCardId('ab') })),
    }));
  }
  return out;
}
