// Mobile app — same wiring as DesktopApp, with sheet-based palette + props.
//
// Uses the real cards store + RecipeCanvas for the live preview. PaletteSheet
// adds cards via insertTypedCard; PropsSheet shows the selected card's real
// params via the shared PropertiesPanel (which already understands selectedCard).

import { useEffect, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';

import {
  cloneRecipeWithFreshIds,
  lookupCardDef,
  STARTER_RECIPES,
  useCardsStore,
  type Card,
} from '@/cards';

import { BLOCK_LIB, CATEGORIES, SHADE, TYPE } from './tokens';
import type { BlockDef } from './tokens';
import { Icon, ShadeLogo, ShadeMascot } from './icons';
import { RecipeCanvas } from './RecipeCanvas';
import { DotGridBg, TogglePill } from './components';
import { PropertiesPanel } from './Properties';

const DEFAULT_STARTER_ID = 'sunset';

const MobileTopBar = ({ tempo = 120 }: { tempo?: number }) => (
  <div
    style={{
      height: 52, flex: '0 0 auto',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 12,
      borderBottom: `1px solid ${SHADE.border}`, background: SHADE.bg,
    }}
  >
    <button
      style={{
        width: 32, height: 32, borderRadius: 7, background: 'transparent',
        border: `1px solid ${SHADE.border}`, color: SHADE.textDim,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}
    >
      <Icon name="menu" size={16} color={SHADE.textDim} />
    </button>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <ShadeLogo size={20} />
      <span style={{ font: `600 17px ${TYPE.body}`, letterSpacing: TYPE.trackTight }}>Shaddy</span>
    </div>
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: SHADE.textDim }}>
        <Icon name="metro" size={14} color={SHADE.textDim} />
        <span style={{ font: `500 12px ${TYPE.bodyMono}`, color: SHADE.text }}>{tempo}</span>
      </div>
      <button
        style={{
          width: 32, height: 32, borderRadius: 7, background: 'transparent',
          border: `1px solid ${SHADE.border}`, color: SHADE.textDim,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="dots" size={14} color={SHADE.textDim} />
      </button>
    </div>
  </div>
);

const Sheet = ({ children, onClose }: { children: ReactNode; onClose?: () => void }) => (
  <>
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 5 }} />
    <div
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 6,
        maxHeight: '82%',
        background: SHADE.surface2,
        borderTop: `1px solid ${SHADE.border}`,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', padding: '9px 0 4px' }}>
        <div style={{ width: 44, height: 4, borderRadius: 2, background: SHADE.border }} />
      </div>
      {children}
    </div>
  </>
);

const PaletteSheet = ({ onClose }: { onClose: () => void }) => {
  const insertTypedCard = useCardsStore((s) => s.insertTypedCard);
  const [activeCat, setActiveCat] = useState<keyof typeof CATEGORIES>('shape');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const blocks: BlockDef[] = (q.length > 0
    ? BLOCK_LIB.filter((b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q))
    : BLOCK_LIB.filter((b) => b.cat === activeCat));

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 18px 12px' }}>
        <span style={{ font: `600 18px ${TYPE.body}`, color: SHADE.text, letterSpacing: TYPE.trackTight }}>Block library</span>
        <span style={{ marginLeft: 10, font: `500 11px ${TYPE.bodyMono}`, color: SHADE.textDim }}>
          {BLOCK_LIB.length} blocks
        </span>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto', width: 30, height: 30, borderRadius: 7,
            background: 'transparent', border: `1px solid ${SHADE.border}`,
            color: SHADE.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Icon name="close" size={14} color={SHADE.textDim} />
        </button>
      </div>
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
            borderRadius: 10, padding: '11px 13px',
          }}
        >
          <Icon name="search" size={15} color={SHADE.textDim} />
          <input
            type="text"
            placeholder="search blocks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: SHADE.text, font: `500 14px ${TYPE.body}`, minWidth: 0,
            }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '4px 16px 14px', overflowX: 'auto' }}>
        {(Object.entries(CATEGORIES) as Array<[keyof typeof CATEGORIES, (typeof CATEGORIES)[keyof typeof CATEGORIES]]>).map(([k, c]) => {
          const active = k === activeCat && q.length === 0;
          return (
            <button
              key={k}
              onClick={() => { setActiveCat(k); setQuery(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto',
                padding: '9px 14px',
                borderRadius: 999,
                background: active ? c.color : SHADE.surface1,
                border: `1px solid ${active ? c.color : SHADE.border}`,
                color: active ? SHADE.bg : SHADE.text,
                font: `600 12.5px ${TYPE.body}`,
                letterSpacing: '-0.005em',
                cursor: 'pointer',
              }}
            >
              <Icon name={c.icon} size={14} color={active ? SHADE.bg : c.color} cream={active ? SHADE.bg : SHADE.cream} />
              {c.label}
            </button>
          );
        })}
      </div>
      <div
        style={{
          padding: '2px 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10, flex: 1, overflowY: 'auto', minHeight: 0,
        }}
      >
        {blocks.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '24px 0', textAlign: 'center',
              color: SHADE.textDim, font: `500 13px ${TYPE.body}`,
            }}
          >
            No blocks match.
          </div>
        )}
        {blocks.map((b) => {
          const cat = CATEGORIES[b.cat];
          return (
            <button
              key={b.id}
              onClick={() => { insertTypedCard(b.id); onClose(); }}
              style={{
                background: SHADE.surface1,
                border: `1px solid ${SHADE.border}`,
                borderRadius: 12,
                padding: '12px 10px 12px',
                display: 'flex', flexDirection: 'column', gap: 10,
                position: 'relative', overflow: 'hidden',
                textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3.5, background: cat.color }} />
              <div
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${cat.color}1a`,
                  border: `1px solid ${cat.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name={b.icon} size={22} color={cat.color} />
              </div>
              <div>
                <div style={{ font: `600 12px ${TYPE.body}`, letterSpacing: '-0.005em', color: SHADE.text }}>
                  {b.name}
                </div>
                <div style={{ font: `500 9.5px ${TYPE.bodyMono}`, color: SHADE.textDim, letterSpacing: '0.08em', marginTop: 2, textTransform: 'uppercase' }}>
                  {b.mini.kind === 'slider' ? b.mini.label : 'palette'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
};

const PropsSheet = ({
  selectedCard, selectedIndex, onClose,
}: {
  selectedCard: Card | null;
  selectedIndex: number;
  onClose: () => void;
}) => (
  <Sheet onClose={onClose}>
    <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px 0' }}>
      <span style={{ font: `600 15px ${TYPE.body}`, color: SHADE.text, letterSpacing: TYPE.trackTight }}>
        {selectedCard
          ? (selectedCard.kind === 'typed'
              ? (lookupCardDef(selectedCard.type)?.friendlyName ?? selectedCard.type)
              : (selectedCard.displayName ?? 'Custom code'))
          : 'Properties'}
      </span>
      <button
        onClick={onClose}
        style={{
          marginLeft: 'auto', width: 30, height: 30, borderRadius: 7,
          background: 'transparent', border: `1px solid ${SHADE.border}`,
          color: SHADE.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
      >
        <Icon name="close" size={14} color={SHADE.textDim} />
      </button>
    </div>
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PropertiesPanel selectedCard={selectedCard} selectedIndex={selectedIndex} />
    </div>
  </Sheet>
);

const MOBILE_DRAG_MIME = 'application/x-shaddy-card';

export const MobileApp = () => {
  const recipe = useCardsStore((s) => s.recipe);
  const setRecipe = useCardsStore((s) => s.setRecipe);
  const removeCard = useCardsStore((s) => s.removeCard);
  const reorderCard = useCardsStore((s) => s.reorderCard);
  const [sheet, setSheet] = useState<'none' | 'palette' | 'props'>('none');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null);

  // First-mount starter recipe.
  useEffect(() => {
    if (recipe.cards.length === 0) {
      const starter = STARTER_RECIPES.find((s) => s.id === DEFAULT_STARTER_ID) ?? STARTER_RECIPES[0];
      if (starter) setRecipe(cloneRecipeWithFreshIds(starter.recipe));
    }
    // Intentionally one-shot: only seed when the recipe is empty on mount.
  }, []);

  useEffect(() => {
    if (selectedIdx >= recipe.cards.length) {
      setSelectedIdx(recipe.cards.length === 0 ? -1 : recipe.cards.length - 1);
    }
  }, [recipe.cards.length, selectedIdx]);

  const selectedCard: Card | null =
    selectedIdx >= 0 && selectedIdx < recipe.cards.length ? recipe.cards[selectedIdx]! : null;

  const isEmpty = recipe.cards.length === 0;

  return (
    <div
      style={{
        width: '100vw', height: '100vh', background: SHADE.bg, color: SHADE.text,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        font: `400 13px ${TYPE.body}`, position: 'relative',
      }}
    >
      <MobileTopBar />
      <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative', background: '#000' }}>
        <RecipeCanvas style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <TogglePill active>1080²</TogglePill>
          <TogglePill active>60 fps</TogglePill>
        </div>
      </div>
      <div style={{ height: 12, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: SHADE.bg }}>
        <div style={{ width: 38, height: 4, borderRadius: 2, background: SHADE.border }} />
      </div>
      <div style={{ height: 196, flex: '0 0 auto', background: SHADE.bg, position: 'relative' }}>
        <DotGridBg />
        <div
          style={{
            position: 'absolute', left: 14, top: 8,
            font: `600 9.5px ${TYPE.body}`,
            color: SHADE.textFaint, letterSpacing: '0.18em', textTransform: 'uppercase',
          }}
        >
          CHAIN · {isEmpty ? 'empty' : `${recipe.cards.length} block${recipe.cards.length === 1 ? '' : 's'}`}
        </div>
        {isEmpty ? (
          <div style={{ position: 'absolute', inset: '28px 16px 60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px 10px 10px',
                border: `1.5px dashed ${SHADE.borderHi}`,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <ShadeMascot size={48} />
              <div>
                <div style={{ font: `600 15px ${TYPE.body}`, color: SHADE.text, letterSpacing: TYPE.trackTight }}>
                  Tap to add a block
                </div>
                <div style={{ font: `400 12px ${TYPE.body}`, color: SHADE.textDim, marginTop: 2 }}>
                  Start with a <span style={{ color: SHADE.catShape, fontWeight: 600 }}>shape</span>.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              position: 'absolute', inset: '28px 12px 60px',
              overflowX: 'auto', overflowY: 'hidden',
              display: 'flex', alignItems: 'center', gap: 8,
              paddingLeft: 4, paddingRight: 4,
            }}
          >
            {recipe.cards.map((card, i) => {
              const def = card.kind === 'typed' ? lookupCardDef(card.type) : null;
              const friendly = def?.friendlyName
                ?? (card.kind === 'wildcard' ? (card.displayName ?? 'Custom') : card.type);
              const catKey: keyof typeof CATEGORIES = (() => {
                if (card.kind === 'wildcard') return 'effect';
                if (!def) return 'effect';
                if (def.category === 'distortion') return 'distort';
                return def.category;
              })();
              const cat = CATEGORIES[catKey];
              const active = i === selectedIdx;
              const isSource = dragSourceId === card.id;
              const indicator = hoverIdx === i && !isSource ? hoverSide : null;
              const onChipDragStart = (e: DragEvent<HTMLButtonElement>) => {
                if (e.dataTransfer) {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData(MOBILE_DRAG_MIME, card.id);
                  e.dataTransfer.setData('text/plain', card.id);
                }
                setDragSourceId(card.id);
              };
              const onChipDragOver = (e: DragEvent<HTMLButtonElement>) => {
                if (!dragSourceId) return;
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                const rect = e.currentTarget.getBoundingClientRect();
                const side: 'left' | 'right' = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
                setHoverIdx(i);
                setHoverSide(side);
              };
              const onChipDrop = (e: DragEvent<HTMLButtonElement>) => {
                e.preventDefault();
                const cardId = e.dataTransfer?.getData(MOBILE_DRAG_MIME) || dragSourceId;
                if (cardId) {
                  const fromIdx = recipe.cards.findIndex((c) => c.id === cardId);
                  if (fromIdx >= 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const side: 'left' | 'right' = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
                    let target = side === 'left' ? i : i + 1;
                    if (fromIdx < target) target -= 1;
                    if (target !== fromIdx) reorderCard(cardId, target);
                  }
                }
                setDragSourceId(null);
                setHoverIdx(null);
                setHoverSide(null);
              };
              const onChipDragEnd = () => {
                setDragSourceId(null);
                setHoverIdx(null);
                setHoverSide(null);
              };
              return (
                <button
                  key={card.id}
                  onClick={() => { setSelectedIdx(i); setSheet('props'); }}
                  draggable
                  onDragStart={onChipDragStart}
                  onDragOver={onChipDragOver}
                  onDrop={onChipDrop}
                  onDragEnd={onChipDragEnd}
                  style={{
                    flex: '0 0 auto',
                    minWidth: 84, height: 84, padding: '8px 10px',
                    borderRadius: 10,
                    background: active ? SHADE.surface3 : SHADE.surface1,
                    border: `1.5px solid ${active ? SHADE.inkLine : SHADE.border}`,
                    display: 'flex', flexDirection: 'column', gap: 6,
                    cursor: 'grab', textAlign: 'left',
                    position: 'relative', overflow: 'hidden',
                    opacity: isSource ? 0.5 : 1,
                    transition: 'transform 200ms cubic-bezier(.2,.7,.2,1.2), opacity 150ms',
                    boxShadow: indicator === 'left'
                      ? `inset 4px 0 0 ${SHADE.ember}`
                      : indicator === 'right'
                        ? `inset -4px 0 0 ${SHADE.ember}`
                        : 'none',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cat.color }} />
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: `${cat.color}1c`,
                      border: `1px solid ${cat.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 4,
                    }}
                  >
                    <Icon name={card.kind === 'wildcard' ? '</>' : (def?.icon ?? '?')} size={16} color={cat.color} />
                  </div>
                  <span
                    style={{
                      font: `600 10.5px ${TYPE.body}`, color: SHADE.text,
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {friendly}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: 56, borderTop: `1px solid ${SHADE.border}`,
            background: SHADE.bg,
            display: 'flex', padding: '0 12px', gap: 8, alignItems: 'center',
          }}
        >
          <button
            onClick={() => setSheet('palette')}
            style={{
              flex: 1, height: 40, borderRadius: 9,
              background: SHADE.gold, color: '#1a1208',
              border: `1px solid ${SHADE.goldDeep}`,
              font: `600 13.5px ${TYPE.body}`,
              letterSpacing: '-0.005em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              cursor: 'pointer',
              boxShadow: `0 1px 0 ${SHADE.cream}66 inset`,
            }}
          >
            <Icon name="plus" size={15} color="#1a1208" /> Add block
          </button>
          <button
            onClick={() => setSheet('props')}
            disabled={!selectedCard}
            style={{
              width: 110, height: 40, borderRadius: 9,
              background: SHADE.surface1, color: selectedCard ? SHADE.text : SHADE.textFaint,
              border: `1px solid ${SHADE.border}`,
              font: `500 12.5px ${TYPE.body}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: selectedCard ? 'pointer' : 'default',
              opacity: selectedCard ? 1 : 0.55,
            }}
          >
            <Icon name="menu" size={13} color={SHADE.textDim} /> props
          </button>
          {selectedCard && (
            <button
              onClick={() => removeCard(selectedCard.id)}
              title="Remove selected"
              style={{
                width: 40, height: 40, borderRadius: 9,
                background: SHADE.surface1, color: SHADE.textDim,
                border: `1px solid ${SHADE.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icon name="trash" size={15} color={SHADE.textDim} />
            </button>
          )}
        </div>
      </div>
      {sheet === 'palette' && <PaletteSheet onClose={() => setSheet('none')} />}
      {sheet === 'props' && (
        <PropsSheet
          selectedCard={selectedCard}
          selectedIndex={selectedIdx}
          onClose={() => setSheet('none')}
        />
      )}
    </div>
  );
};
