import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  _resetCardIdCounter,
  cloneRecipeWithFreshIds,
  generateCardId,
  useCardsStore,
} from './state';
import { STARTER_RECIPES } from './starter-recipes';
import type { Card } from './types';

beforeEach(() => {
  _resetCardIdCounter();
  useCardsStore.setState({ recipe: { canvasAspect: 'square', cards: [] } });
});

afterEach(() => {
  _resetCardIdCounter();
});

describe('generateCardId', () => {
  it('returns monotonically distinct ids', () => {
    const a = generateCardId();
    const b = generateCardId();
    expect(a).not.toBe(b);
  });

  it('honors the prefix argument', () => {
    expect(generateCardId('w')).toMatch(/^w/);
  });
});

describe('useCardsStore — typed cards', () => {
  it('insertTypedCard appends with defaults from the CardDef', () => {
    useCardsStore.getState().insertTypedCard('radial_gradient');
    const card = useCardsStore.getState().recipe.cards[0];
    if (card?.kind !== 'typed') throw new Error('expected typed');
    expect(card.type).toBe('radial_gradient');
    expect(card.params.softness?.value).toBe(1);
  });

  it('insertTypedCard at index inserts at the right place', () => {
    useCardsStore.getState().insertTypedCard('radial_gradient');
    useCardsStore.getState().insertTypedCard('palette');
    useCardsStore.getState().insertTypedCard('ripple', 1);
    const types = useCardsStore.getState().recipe.cards.map((c: Card) =>
      c.kind === 'typed' ? c.type : 'wildcard',
    );
    expect(types).toEqual(['radial_gradient', 'ripple', 'palette']);
  });

  it('insertTypedCard is a no-op for unknown card types', () => {
    useCardsStore.getState().insertTypedCard('nope');
    expect(useCardsStore.getState().recipe.cards.length).toBe(0);
  });

  it('updateParamValue mutates only the targeted param', () => {
    useCardsStore.getState().insertTypedCard('palette');
    const card0 = useCardsStore.getState().recipe.cards[0]!;
    useCardsStore.getState().updateParamValue(card0.id, 'color_a', [1, 0, 0]);
    const next = useCardsStore.getState().recipe.cards[0];
    if (next?.kind !== 'typed') throw new Error('expected typed');
    expect(next.params.color_a?.value).toEqual([1, 0, 0]);
    expect(next.params.color_b?.value).toEqual([0.95, 0.55, 0.28]);
  });

  it('removeCard drops the card', () => {
    useCardsStore.getState().insertTypedCard('radial_gradient');
    useCardsStore.getState().insertTypedCard('palette');
    const target = useCardsStore.getState().recipe.cards[0]!.id;
    useCardsStore.getState().removeCard(target);
    expect(useCardsStore.getState().recipe.cards.length).toBe(1);
    const remaining = useCardsStore.getState().recipe.cards[0];
    if (remaining?.kind !== 'typed') throw new Error('expected typed remaining');
    expect(remaining.type).toBe('palette');
  });

  it('reorderCard moves the card to the new index (clamped)', () => {
    useCardsStore.getState().insertTypedCard('radial_gradient');
    useCardsStore.getState().insertTypedCard('palette');
    useCardsStore.getState().insertTypedCard('vignette');
    const ids = useCardsStore.getState().recipe.cards.map((c) => c.id);
    // Move the first card to the end.
    useCardsStore.getState().reorderCard(ids[0]!, 99);
    const newIds = useCardsStore.getState().recipe.cards.map((c) => c.id);
    expect(newIds).toEqual([ids[1], ids[2], ids[0]]);
  });

  it('toggleCardEnabled flips enabled', () => {
    useCardsStore.getState().insertTypedCard('radial_gradient');
    const id = useCardsStore.getState().recipe.cards[0]!.id;
    expect(useCardsStore.getState().recipe.cards[0]?.enabled).toBe(true);
    useCardsStore.getState().toggleCardEnabled(id);
    expect(useCardsStore.getState().recipe.cards[0]?.enabled).toBe(false);
  });
});

describe('useCardsStore — composition', () => {
  it('insertTypedCard populates alpha: 1 and blendMode: "normal"', () => {
    useCardsStore.getState().insertTypedCard('radial_gradient');
    const card = useCardsStore.getState().recipe.cards[0];
    if (card?.kind !== 'typed') throw new Error('expected typed');
    expect(card.alpha).toBe(1);
    expect(card.blendMode).toBe('normal');
  });

  it('insertWildcard populates alpha: 1 and blendMode: "normal"', () => {
    useCardsStore.getState().insertWildcard(undefined, '  d = 0.7;');
    const card = useCardsStore.getState().recipe.cards[0];
    if (card?.kind !== 'wildcard') throw new Error('expected wildcard');
    expect(card.alpha).toBe(1);
    expect(card.blendMode).toBe('normal');
  });

  it('setAlpha clamps to [0,1] and mutates the targeted card', () => {
    useCardsStore.getState().insertTypedCard('radial_gradient');
    const id = useCardsStore.getState().recipe.cards[0]!.id;
    useCardsStore.getState().setAlpha(id, 0.42);
    expect(useCardsStore.getState().recipe.cards[0]?.alpha).toBe(0.42);
    useCardsStore.getState().setAlpha(id, 2);
    expect(useCardsStore.getState().recipe.cards[0]?.alpha).toBe(1);
    useCardsStore.getState().setAlpha(id, -3);
    expect(useCardsStore.getState().recipe.cards[0]?.alpha).toBe(0);
  });

  it('setBlendMode mutates the targeted card', () => {
    useCardsStore.getState().insertTypedCard('radial_gradient');
    const id = useCardsStore.getState().recipe.cards[0]!.id;
    useCardsStore.getState().setBlendMode(id, 'screen');
    expect(useCardsStore.getState().recipe.cards[0]?.blendMode).toBe('screen');
  });
});

describe('useCardsStore — wildcards', () => {
  it('insertWildcard creates a wildcard with the given rawSource', () => {
    useCardsStore.getState().insertWildcard(undefined, '  d = 0.7;');
    const card = useCardsStore.getState().recipe.cards[0];
    if (card?.kind !== 'wildcard') throw new Error('expected wildcard');
    expect(card.rawSource).toBe('  d = 0.7;');
    expect(card.id).toMatch(/^w/);
  });
});

describe('cloneRecipeWithFreshIds', () => {
  it('replaces every card.id but keeps everything else', () => {
    const cloned = cloneRecipeWithFreshIds(STARTER_RECIPES[0]!.recipe);
    const origIds = STARTER_RECIPES[0]!.recipe.cards.map((c) => c.id);
    const newIds = cloned.cards.map((c) => c.id);
    expect(newIds).not.toEqual(origIds);
    // Same types/params otherwise.
    for (let i = 0; i < cloned.cards.length; i++) {
      const o = STARTER_RECIPES[0]!.recipe.cards[i]!;
      const n = cloned.cards[i]!;
      expect(n.kind).toBe(o.kind);
      if (o.kind === 'typed' && n.kind === 'typed') expect(n.type).toBe(o.type);
    }
  });
});

describe('STARTER_RECIPES', () => {
  it('ships at least 3 starters', () => {
    expect(STARTER_RECIPES.length).toBeGreaterThanOrEqual(3);
  });

  it('every starter compiles', async () => {
    const { compile } = await import('./compile');
    for (const s of STARTER_RECIPES) {
      expect(() => compile(s.recipe)).not.toThrow();
    }
  });
});

describe('useCardsStore — custom animations', () => {
  const st = () => useCardsStore.getState();
  const seedSquare = () => {
    st().insertTypedCard('square');
    return st().recipe.cards[0]!.id;
  };
  const customRefOf = (cardId: string, paramKey: string) => {
    const card = st().recipe.cards.find((c) => c.id === cardId);
    const anim = card?.kind === 'typed' ? card.params[paramKey]?.animation : null;
    return anim?.type === 'custom' ? anim.ref : null;
  };

  it('createCustomAnimation creates a Time→Oscillate chain and binds the param', () => {
    const id = seedSquare();
    const chainId = st().createCustomAnimation(id, 'size');
    expect(chainId).toBeTruthy();
    const chains = st().recipe.animations ?? [];
    expect(chains).toHaveLength(1);
    expect(chains[0]!.blocks.map((b) => b.type)).toEqual(['time', 'oscillate']);
    expect(customRefOf(id, 'size')).toBe(chainId);
  });

  it('bindParamToAnimation reuses one chain across two params', () => {
    const a = seedSquare();
    st().insertTypedCard('square');
    const b = st().recipe.cards[1]!.id;
    const chainId = st().createCustomAnimation(a, 'size')!;
    st().bindParamToAnimation(b, 'size', chainId);
    expect(customRefOf(a, 'size')).toBe(chainId);
    expect(customRefOf(b, 'size')).toBe(chainId);
    expect(st().recipe.animations).toHaveLength(1); // still one shared chain
  });

  it('addAnimBlock / removeAnimBlock edit the chain', () => {
    const id = seedSquare();
    const chainId = st().createCustomAnimation(id, 'size')!;
    const remapId = st().addAnimBlock(chainId, 'remap')!;
    expect((st().recipe.animations ?? [])[0]!.blocks.map((b) => b.type)).toEqual(['time', 'oscillate', 'remap']);

    st().removeAnimBlock(chainId, remapId);
    expect((st().recipe.animations ?? [])[0]!.blocks.map((b) => b.type)).toEqual(['time', 'oscillate']);
  });

  it('updateAnimBlockParam bakes a new value into a block', () => {
    const id = seedSquare();
    const chainId = st().createCustomAnimation(id, 'size')!;
    const osc = (st().recipe.animations ?? [])[0]!.blocks[1]!;
    st().updateAnimBlockParam(chainId, osc.id, 'speed', 3.5);
    const after = (st().recipe.animations ?? [])[0]!.blocks[1]!;
    expect(after.params.speed?.value).toBe(3.5);
  });

  it('removeAnimChain deletes the chain and unbinds every param', () => {
    const id = seedSquare();
    const chainId = st().createCustomAnimation(id, 'size')!;
    st().removeAnimChain(chainId);
    expect(st().recipe.animations).toBeUndefined();
    expect(customRefOf(id, 'size')).toBeNull();
  });

  it('setAnimChainsFromRuns splits a chain and rebinds to the tail block', () => {
    const id = seedSquare();
    st().createCustomAnimation(id, 'size'); // Time→Oscillate, bound to size
    const blocks = (st().recipe.animations ?? [])[0]!.blocks.map((b) => b.id);
    st().setAnimChainsFromRuns([[blocks[0]!], [blocks[1]!]]); // unsnap → two animations
    const chains = st().recipe.animations ?? [];
    expect(chains).toHaveLength(2);
    // the binding followed the old chain's TAIL block into its new chain
    const tailChain = chains.find((c) => c.blocks.some((b) => b.id === blocks[1]))!;
    expect(customRefOf(id, 'size')).toBe(tailChain.id);
  });

  it('setAnimChainsFromRuns merges singletons into one animation', () => {
    seedSquare();
    const a = st().startAnimChain('time')!;
    const b = st().startAnimChain('oscillate')!;
    expect(st().recipe.animations).toHaveLength(2);
    st().setAnimChainsFromRuns([[a, b]]); // snap together → one animation
    const chains = st().recipe.animations ?? [];
    expect(chains).toHaveLength(1);
    expect(chains[0]!.blocks.map((bl) => bl.type)).toEqual(['time', 'oscillate']);
  });

  it('startAnimChain creates an unbound single-block chain (palette drop)', () => {
    const blockId = st().startAnimChain('noise');
    expect(blockId).toBeTruthy();
    const chains = st().recipe.animations ?? [];
    expect(chains).toHaveLength(1);
    expect(chains[0]!.blocks).toHaveLength(1);
    expect(chains[0]!.blocks[0]!.type).toBe('noise');
    expect(chains[0]!.blocks[0]!.id).toBe(blockId);
  });

  it('cloneRecipeWithFreshIds remaps the binding to the fresh chain id', () => {
    const id = seedSquare();
    st().createCustomAnimation(id, 'size');
    const cloned = cloneRecipeWithFreshIds(st().recipe);
    const newChainId = cloned.animations![0]!.id;
    const card = cloned.cards[0]!;
    const ref = card.kind === 'typed' && card.params.size?.animation?.type === 'custom'
      ? card.params.size.animation.ref : null;
    expect(ref).toBe(newChainId); // ref points at the cloned chain, not the original
  });
});
