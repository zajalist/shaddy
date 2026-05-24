// The vertical card stack + the "add card" affordance.

import { useState } from 'react';

import { CARD_LIBRARY_LIST } from '../library';
import { useCardsStore } from '../state';
import type { CardCategory, CardDef } from '../types';
import { TypedCardItem, WildcardCardItem } from './CardItem';
import { CardIcon, CategoryIcon, Glyph } from './icons';

const CATEGORY_ORDER: CardCategory[] = ['shape', 'distortion', 'color', 'effect'];

const CATEGORY_BG: Record<CardCategory, string> = {
  shape: 'bg-mustard',
  distortion: 'bg-cobalt text-paper',
  color: 'bg-coral',
  effect: 'bg-mint',
};

export function CardStack(props: { onEditCode: (cardId: string) => void }) {
  const cards = useCardsStore((s) => s.recipe.cards);
  const total = cards.length;

  return (
    <div className="space-y-3">
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
        <div className="rounded-lg border-2 border-dashed border-ink/40 py-10 px-5 text-center bg-paper-2/60">
          <div className="font-display font-extrabold text-3xl text-ink mb-1.5">An empty canvas!</div>
          <div className="text-[13px] text-mute font-medium">
            Add a shape card below to begin composing.
          </div>
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
  const [activeCat, setActiveCat] = useState<CardCategory>('shape');

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full py-4 rounded-lg border-2 border-dashed border-ink bg-paper-2 hover:bg-paper-3 transition-colors flex items-center justify-center gap-2.5 hover-wiggle"
      >
        <span className="w-7 h-7 rounded-full grid place-items-center bg-ink text-paper">
          <Glyph.Plus size={14} />
        </span>
        <span className="text-[13px] text-ink font-bold uppercase tracking-[0.14em]">
          New card
        </span>
      </button>
    );
  }

  const byCategory = new Map<CardCategory, CardDef[]>();
  for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
  for (const def of CARD_LIBRARY_LIST) byCategory.get(def.category)?.push(def);
  const visible = byCategory.get(activeCat) ?? [];

  return (
    <div className="rounded-lg border-ink bg-paper-3 p-3 pop-in shadow-chunk">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-extrabold text-[18px] text-ink leading-none">
          Card library
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="close"
          className="w-7 h-7 grid place-items-center rounded border-2 border-ink bg-paper-2 text-ink hover:bg-coral hover:text-paper transition-colors"
        >
          <Glyph.X size={13} />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1.5 mb-3">
        {CATEGORY_ORDER.map((cat) => {
          const active = cat === activeCat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase tracking-[0.12em] font-mono font-bold rounded border-2 border-ink transition-all ${
                active
                  ? `${CATEGORY_BG[cat]} text-ink translate-y-0`
                  : 'bg-paper-2 text-ink hover:bg-paper translate-y-0'
              }`}
              style={active ? { boxShadow: '2px 2px 0 0 var(--color-ink)' } : undefined}
            >
              <CategoryIcon category={cat} size={12} />
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto scroll-chunk pr-1">
        {visible.map((def) => (
          <button
            key={def.type}
            type="button"
            onClick={() => {
              insertTyped(def.type);
              setOpen(false);
            }}
            title={def.description}
            className="group text-left p-2.5 rounded-md border-2 border-ink bg-paper-2 hover:bg-paper transition-all hover:-translate-y-[1px] active:translate-y-[1px]"
            style={{ boxShadow: '2px 2px 0 0 var(--color-ink)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-7 h-7 grid place-items-center rounded border-2 border-ink ${CATEGORY_BG[def.category]} shrink-0`}
              >
                <CardIcon type={def.type} size={14} />
              </span>
              <span className="text-[12.5px] text-ink truncate font-semibold">
                {def.friendlyName}
              </span>
            </div>
            <div className="text-[10.5px] text-mute leading-snug line-clamp-2 font-mono">
              {def.description}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          insertWild();
          setOpen(false);
        }}
        className="mt-3 w-full py-2.5 rounded-md border-2 border-ink bg-lavender hover:bg-lavender-soft text-ink transition-all hover:-translate-y-[1px] active:translate-y-[1px] flex items-center justify-center gap-2"
        style={{ boxShadow: '2px 2px 0 0 var(--color-ink)' }}
      >
        <Glyph.Brackets size={15} />
        <span className="text-[12px] font-bold uppercase tracking-[0.12em]">
          Custom GLSL · wildcard
        </span>
      </button>
    </div>
  );
}
