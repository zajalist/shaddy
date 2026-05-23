// The vertical card stack + the "add card" affordance.

import { useState } from 'react';

import { CARD_LIBRARY_LIST } from '../library';
import { useCardsStore } from '../state';
import type { CardCategory, CardDef } from '../types';
import { TypedCardItem, WildcardCardItem } from './CardItem';

const CATEGORY_ORDER: CardCategory[] = ['shape', 'distortion', 'color', 'effect'];

export function CardStack(props: { onEditCode: (cardId: string) => void }) {
  const cards = useCardsStore((s) => s.recipe.cards);
  const total = cards.length;

  return (
    <div className="space-y-2">
      {cards.map((card, index) => {
        if (card.kind === 'wildcard') {
          return (
            <WildcardCardItem
              key={card.id}
              card={card}
              index={index}
              total={total}
              onEditCode={props.onEditCode}
            />
          );
        }
        return <TypedCardItem key={card.id} card={card} index={index} total={total} />;
      })}
      {cards.length === 0 && (
        <div className="text-center text-sm text-neutral-500 py-6">
          empty recipe — add a shape card to get started
        </div>
      )}
      <AddCardMenu />
    </div>
  );
}

function AddCardMenu() {
  const insertTyped = useCardsStore((s) => s.insertTypedCard);
  const insertWild = useCardsStore((s) => s.insertWildcard);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl border-2 border-dashed border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300 transition-colors"
      >
        + add card
      </button>
    );
  }

  const byCategory = new Map<CardCategory, CardDef[]>();
  for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
  for (const def of CARD_LIBRARY_LIST) byCategory.get(def.category)?.push(def);

  return (
    <div className="rounded-xl ring-1 ring-neutral-700 bg-neutral-900 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">add a card</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="close"
          className="text-neutral-500 hover:text-neutral-300"
        >
          ×
        </button>
      </div>
      {CATEGORY_ORDER.map((cat) => {
        const defs = byCategory.get(cat) ?? [];
        if (defs.length === 0) return null;
        return (
          <div key={cat}>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
              {cat}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {defs.map((def) => (
                <button
                  key={def.type}
                  type="button"
                  onClick={() => {
                    insertTyped(def.type);
                    setOpen(false);
                  }}
                  title={def.description}
                  className="px-2 py-1.5 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1.5"
                >
                  <span>{def.icon}</span>
                  <span>{def.friendlyName}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
          custom
        </div>
        <button
          type="button"
          onClick={() => {
            insertWild();
            setOpen(false);
          }}
          className="px-2 py-1.5 text-xs rounded-md bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 flex items-center gap-1.5"
        >
          <span>{'</>'}</span>
          <span>Custom code (wildcard)</span>
        </button>
      </div>
    </div>
  );
}
