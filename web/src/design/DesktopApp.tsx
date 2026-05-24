// Desktop app shell — wired to the real cards store + WebGL renderer.
//
// The chain is recipe.cards from useCardsStore. Selecting a block is local UI
// state (an index into recipe.cards). Param changes flow through
// updateParamValue → compile → RecipeCanvas → renderer.setUniform. Structural
// changes (insert/remove/reorder) recompile the shader via the same hook.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, DragEvent, ReactNode } from 'react';

// Palette of portal-pair colours. The Nth user-inserted portal is rendered
// with PORTAL_PALETTE[N % len] so consecutive row breaks read as distinct
// trails. (Row breaks are now driven by explicit `portal`-type cards the
// user inserts via the "+ portal" button — auto-wrap is gone.)
//
// Deeper than the SHADE category colours so they hold contrast against the
// warm cream chain background — the original gold/pink/blue washed out
// against `bg: #e6e1d6`.
const PORTAL_PALETTE = ['#966B17', '#7d2543', '#13567f', '#4a5610', '#3e2877', '#7d4a13'];

import {
  BUFFER_PASS_IDS,
  cloneRecipeWithFreshIds,
  compile,
  getPassCards,
  lookupCardDef,
  STARTER_RECIPES,
  useCardsStore,
  type Card,
  type PassId,
  type Recipe,
} from '@/cards';
import {
  FRAGMENT_PREAMBLE,
  USER_LINE_OFFSET,
  createRenderer,
  type GLSLError,
  type RendererAPI,
} from '@/renderer';

import { SHADE, TYPE, blockById } from './tokens';
import type { BlockDef } from './tokens';
import { Icon, ShadeMascot } from './icons';
import { Block } from './Block';
import { GlslHighlight } from './GlslHighlight';
import type { BlockVariant } from './Block';
import {
  Palette, TopBar, TogglePill, DotGridBg, CanvasToolBtn, fullscreenBtnStyle,
} from './components';
import { PropertiesPanel } from './Properties';
import { RecipeCanvas } from './RecipeCanvas';
import { BlockEditor } from './BlockEditor';
import { TranslateStatus, translateGlslToRecipe, type TranslateState } from './AskClaude';

const DEFAULT_STARTER_ID = 'sunset';

const DRAG_MIME = 'application/x-shaddy-card';

// Is this card a user-inserted portal marker? Portals split the chain into
// rows in the editor; everything else is a real block.
function isPortalCard(card: Card): boolean {
  return card.kind === 'typed' && card.type === 'portal';
}

// PortalRow — the horizontal gold/pink/blue fade visual that replaces a row
// break. It sits BETWEEN two row segments (one per user-inserted portal)
// and is clickable so the user can select / delete it like any other card.
const PortalRow = ({
  card, color, selected, onClick,
}: {
  card: Card;
  color: string;
  selected: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) => (
  <div
    onClick={onClick}
    title="portal — row break · click to select, ⌫ to delete"
    style={{
      // Sits on its own line by virtue of being a direct child of the
      // column-flex chain container. Stretches to (almost) full width so the
      // trail reads as a long fade rather than a tiny marker.
      alignSelf: 'stretch',
      height: 18,
      margin: '4px 8px 4px 0',
      cursor: 'pointer',
      position: 'relative',
      display: 'flex', alignItems: 'center',
      pointerEvents: 'auto',
      borderRadius: 2,
      outline: selected ? `1.5px dashed ${color}` : 'none',
      outlineOffset: 2,
    }}
    data-portal-id={card.id}
  >
    {/* Exit half — fades out to the right */}
    <div
      aria-hidden
      style={{
        flex: 1, height: 4,
        background: `linear-gradient(90deg, ${color} 0%, ${color}ee 45%, ${color}88 80%, ${color}33 100%)`,
      }}
    />
    {/* Tiny ring at the midpoint to read as a "portal" rather than just a fade */}
    <div
      aria-hidden
      style={{
        width: 12, height: 12, borderRadius: '50%',
        border: `2px solid ${color}`,
        margin: '0 6px',
        background: 'transparent',
        flex: '0 0 auto',
      }}
    />
    {/* Enter half — fades in from the right */}
    <div
      aria-hidden
      style={{
        flex: 1, height: 4,
        background: `linear-gradient(90deg, ${color}33 0%, ${color}88 20%, ${color}ee 55%, ${color} 100%)`,
      }}
    />
  </div>
);

const Chain = ({
  items, selectedIds, onSelect, onOpen, onReorder, onAddCard, onAddPortal,
}: {
  items: Card[];
  /** Multi-selection — every card whose id is in this set renders selected. */
  selectedIds: ReadonlySet<string>;
  /** Called on click; `mode` indicates how the click should affect selection. */
  onSelect?: (i: number, mode: 'replace' | 'toggle') => void;
  onOpen?: (i: number) => void;
  onReorder?: (cardId: string, toIndex: number) => void;
  onAddCard?: () => void;
  onAddPortal?: () => void;
}) => {
  // Native HTML5 DnD — no library. dragSourceId is the card being dragged;
  // hoverIdx + hoverSide drive the dashed-line drop indicator. Computed
  // toIndex on drop accounts for the gap that opens when the source is
  // removed from its original slot.
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null);

  // Group the chain into row segments split on portal cards. Each segment
  // is { startIdx, cards: { card, idx }[] } — indices stay absolute against
  // the recipe.cards array so selection / DnD continue to reference the
  // canonical position.
  type RowSegment = { cards: Array<{ card: Card; idx: number }> };
  type ChainPiece =
    | { kind: 'row'; segIdx: number; segment: RowSegment }
    | { kind: 'portal'; card: Card; idx: number; portalNo: number };

  const pieces = useMemo<ChainPiece[]>(() => {
    const out: ChainPiece[] = [];
    let current: RowSegment = { cards: [] };
    let portalNo = 0;
    let segCount = 0;
    const flush = () => {
      out.push({ kind: 'row', segIdx: segCount, segment: current });
      segCount++;
      current = { cards: [] };
    };
    items.forEach((card, idx) => {
      if (isPortalCard(card)) {
        flush();
        out.push({ kind: 'portal', card, idx, portalNo });
        portalNo++;
      } else {
        current.cards.push({ card, idx });
      }
    });
    // Always flush the trailing segment, even if it's empty — the EndCap
    // for the very last row needs a row to live in. An empty trailing row
    // happens when the chain ends on a portal.
    flush();
    return out;
  }, [items]);

  // The last RowSegment in the pieces list is where the EndCap + portal
  // button render. (There's always at least one row segment thanks to the
  // unconditional final flush.)
  const lastRowSegIdx = useMemo(() => {
    let last = -1;
    pieces.forEach((p) => { if (p.kind === 'row') last = p.segIdx; });
    return last;
  }, [pieces]);

  const handleDragStart = (cardId: string) => (e: DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(DRAG_MIME, cardId);
      e.dataTransfer.setData('text/plain', cardId);
    }
    setDragSourceId(cardId);
  };

  const handleDragOver = (i: number) => (e: DragEvent<HTMLDivElement>) => {
    // ALWAYS preventDefault on dragover for the chain — without it the
    // browser refuses the drop. We can't gate on dragSourceId because React
    // state hasn't settled yet on the first dragover after dragstart, and
    // missing preventDefault on that frame disables the entire drop target.
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const side: 'left' | 'right' = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
    if (hoverIdx !== i || hoverSide !== side) {
      setHoverIdx(i);
      setHoverSide(side);
    }
  };

  const handleDragLeave = () => {
    // No-op — dragenter on the next block resets hoverIdx. Leaving the
    // chain entirely is handled by dragend.
  };

  const handleDrop = (i: number) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const cardId = e.dataTransfer?.getData(DRAG_MIME) || dragSourceId;
    if (!cardId || !onReorder) {
      setDragSourceId(null);
      setHoverIdx(null);
      setHoverSide(null);
      return;
    }
    const fromIdx = items.findIndex((c) => c.id === cardId);
    if (fromIdx < 0) {
      setDragSourceId(null);
      setHoverIdx(null);
      setHoverSide(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const side: 'left' | 'right' = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
    // The reorder() helper splices-out the source first, then inserts at
    // the clamped target index. Compute that target as if the array
    // already had the source removed.
    let target = side === 'left' ? i : i + 1;
    if (fromIdx < target) target -= 1;
    if (target !== fromIdx) onReorder(cardId, target);
    setDragSourceId(null);
    setHoverIdx(null);
    setHoverSide(null);
  };

  const handleDragEnd = () => {
    setDragSourceId(null);
    setHoverIdx(null);
    setHoverSide(null);
  };

  // Outer column scrolls vertically (portal-induced rows) AND horizontally
  // (a single row that overflows the canvas). Inner column lays out rows
  // top-to-bottom; each row is its own nowrap flex strip so cards march
  // off to the right rather than wrapping.
  return (
    <div
      style={{
        // Bounded to the chain area in the parent; overflow shows scrollbars
        // when the chain grows past the visible canvas in either axis.
        flex: 1, minWidth: 0, minHeight: 0,
        overflow: 'auto',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex', flexDirection: 'column',
          gap: 28,
          // width: max-content lets each row's nowrap layout dictate the
          // total width, which is what triggers horizontal scrolling.
          width: 'max-content',
          minWidth: '100%',
          paddingBottom: 4,
        }}
      >
        {pieces.map((piece) => {
          if (piece.kind === 'portal') {
            const color = PORTAL_PALETTE[piece.portalNo % PORTAL_PALETTE.length] ?? '#FCB427';
            return (
              <PortalRow
                key={piece.card.id}
                card={piece.card}
                color={color}
                selected={selectedIds.has(piece.card.id)}
                onClick={(e) => {
                  const toggle = !!(e && (e.shiftKey || e.metaKey || e.ctrlKey));
                  onSelect?.(piece.idx, toggle ? 'toggle' : 'replace');
                }}
              />
            );
          }
          const isLastRow = piece.segIdx === lastRowSegIdx;
          const segCards = piece.segment.cards;
          return (
            <div
              key={`row-${piece.segIdx}`}
              style={{
                display: 'flex', alignItems: 'center', flexWrap: 'nowrap',
                gap: 0,
              }}
            >
              {segCards.map(({ card, idx: i }, posInRow) => {
                const block: BlockDef = card.kind === 'typed'
                  ? blockById(card.type) ?? wildcardBlockFallback()
                  : wildcardBlock(card);
                const paramCount = card.kind === 'typed'
                  ? Object.keys(card.params).length
                  : 1;
                const isSource = dragSourceId === card.id;
                const indicator = hoverIdx === i && !isSource ? hoverSide : null;

                const isRowStart = posInRow === 0;
                const isRowEnd = posInRow === segCards.length - 1;
                const blockVariant: BlockVariant = {
                  left: isRowStart ? 'flat' : 'notch',
                  right: isRowEnd ? 'flat' : 'tab',
                };

                return (
                  <Block
                    key={card.id}
                    id={card.id}
                    block={block}
                    card={card}
                    variant={blockVariant}
                    selected={selectedIds.has(card.id)}
                    paramCount={paramCount}
                    onClick={(e) => {
                      const toggle = !!(e && (e.shiftKey || e.metaKey || e.ctrlKey));
                      onSelect?.(i, toggle ? 'toggle' : 'replace');
                    }}
                    onDoubleClick={() => onOpen?.(i)}
                    draggable
                    onDragStart={handleDragStart(card.id)}
                    onDragOver={handleDragOver(i)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(i)}
                    onDragEnd={handleDragEnd}
                    isDragSource={isSource}
                    dropIndicator={indicator}
                    portalSide={null}
                    portalColor={null}
                  />
                );
              })}
              {isLastRow && (
                <>
                  <EndCap onClick={onAddCard} />
                  <PortalCap onClick={onAddPortal} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function wildcardBlock(card: Extract<Card, { kind: 'wildcard' }>): BlockDef {
  return {
    id: card.id,
    cat: 'effect',
    name: (card.displayName ?? 'Custom code').toUpperCase(),
    icon: '</>',
    mini: { kind: 'slider', label: 'glsl', value: 0.5 },
  };
}

// Used only as a safety net if blockById somehow returns undefined for a
// typed card whose type is missing from the card library — shouldn't happen
// in practice thanks to the Proxy fallback in card-adapter.ts.
function wildcardBlockFallback(): BlockDef {
  return {
    id: '__missing__',
    cat: 'effect',
    name: 'UNKNOWN',
    icon: '?',
    mini: { kind: 'slider', label: '?', value: 0.5 },
  };
}

// "+ add" affordance at the end of the chain. Used to be a dashed arrow
// that just decoratively said "end of chain → output to canvas"; that was
// confusing without doing anything, so it's now a real button that focuses
// the palette search field (same effect as pressing `/`) so the user can
// instantly type a card name and append it.
// "+ card" affordance — sits at the end of the chain. Bold square tile with
// a chunky cartoony plus glyph. Reads as an actionable button at any size.
const ENDCAP_SIZE = 28; // perfect square, kept small so the puzzle chain stays the focal point
const EndCap = ({ onClick }: { onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    title="add a card  ·  /"
    style={{
      marginLeft: 10, height: ENDCAP_SIZE, width: ENDCAP_SIZE,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      background: SHADE.surface1,
      border: `2px solid ${SHADE.inkLine}`,
      borderRadius: 8,
      color: SHADE.inkLine,
      cursor: 'pointer',
      padding: 0,
      boxShadow: `0 2px 0 ${SHADE.inkLine}`,
      transition: 'transform 120ms ease, box-shadow 120ms ease, background 160ms ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = `${SHADE.gold}`;
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = `0 3px 0 ${SHADE.inkLine}`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = SHADE.surface1;
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = `0 2px 0 ${SHADE.inkLine}`;
    }}
    onMouseDown={(e) => {
      e.currentTarget.style.transform = 'translateY(1px)';
      e.currentTarget.style.boxShadow = `0 1px 0 ${SHADE.inkLine}`;
    }}
    onMouseUp={(e) => {
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = `0 3px 0 ${SHADE.inkLine}`;
    }}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'block' }}>
      <rect x="10.4" y="3.6" width="3.2" height="16.8" rx="1.6" fill={SHADE.inkLine} />
      <rect x="3.6" y="10.4" width="16.8" height="3.2" rx="1.6" fill={SHADE.inkLine} />
    </svg>
  </button>
);

// "+ portal" affordance — sits next to the EndCap on the last row. Inserts
// a portal marker card so the next card the user adds lands on a new row.
// Inverted palette of EndCap (light tile, dark glyph → dark tile, cream
// glyph). Reads as a button PAIR with EndCap: same shape, same chunky
// drop-shadow press, opposite tonal weight. The earlier gold-on-gold was
// muddy and yellow-heavy.
const PortalCap = ({ onClick }: { onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    title="insert portal (row break)"
    style={{
      marginLeft: 8, height: ENDCAP_SIZE, width: ENDCAP_SIZE,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: SHADE.inkLine,
      border: `2px solid ${SHADE.inkLine}`,
      borderRadius: 8,
      color: SHADE.cream,
      cursor: 'pointer',
      padding: 0,
      boxShadow: `0 2px 0 #000`,
      transition: 'transform 120ms ease, box-shadow 120ms ease, background 160ms ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = '#3a3833';
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = `0 3px 0 #000`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = SHADE.inkLine;
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = `0 2px 0 #000`;
    }}
    onMouseDown={(e) => {
      e.currentTarget.style.transform = 'translateY(1px)';
      e.currentTarget.style.boxShadow = `0 1px 0 #000`;
    }}
    onMouseUp={(e) => {
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = `0 3px 0 #000`;
    }}
  >
    {/* Portal glyph — classic carriage-return / wrap-down icon. A chunky
        hook that goes RIGHT, DOWN, then LEFT with an arrowhead pointing
        left. Reads as "next line / wrap around" instantly. */}
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'block' }}>
      <path
        d="M19 5 L19 11 Q19 14 16 14 L7 14"
        stroke={SHADE.cream}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M10 10 L6 14 L10 18"
        stroke={SHADE.cream}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  </button>
);

// ─── Pass tabs — chain-editor scope switcher ───────────────────────────
// Sits ABOVE the chain. The active tab tells the chain UI which pass's
// cards to operate on; "+ Add" enables a buffer pass slot. Image is
// always present; A/B/C/D only show if the user has enabled them.
//
// Tab colors mirror the spec: A=blue, B=pink, C=green, D=purple. Active
// tab matches the chain bg (cream) so it visually blends into the chain
// surface — inactive tabs sit one shade darker.
const BUFFER_TAB_COLORS: Record<'a' | 'b' | 'c' | 'd', string> = {
  a: '#13567f', // blue
  b: '#b5365e', // pink
  c: '#4a5610', // green
  d: '#3e2877', // purple
};
const BUFFER_TAB_LABELS: Record<'a' | 'b' | 'c' | 'd', string> = {
  a: 'Buffer A', b: 'Buffer B', c: 'Buffer C', d: 'Buffer D',
};

const PassTabs = ({
  passes,
  activePassId,
  onSelect,
  onAdd,
  onRemove,
  onRename,
}: {
  passes: Array<{ id: PassId; name: string }>;
  activePassId: PassId;
  onSelect: (id: PassId) => void;
  onAdd: (id: 'a' | 'b' | 'c' | 'd') => void;
  onRemove: (id: 'a' | 'b' | 'c' | 'd') => void;
  onRename: (id: 'a' | 'b' | 'c' | 'd', name: string) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ id: 'a' | 'b' | 'c' | 'd'; x: number; y: number } | null>(null);
  const enabledIds = new Set(passes.map((p) => p.id));
  const availableSlots = BUFFER_PASS_IDS.filter((id) => !enabledIds.has(id));

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-end', gap: 2,
        paddingLeft: 4, paddingTop: 2,
        // No bottom border on the strip — the active tab seamlessly
        // continues into the chain below.
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      {passes.map((p) => {
        const active = p.id === activePassId;
        const isBuffer = p.id !== 'image';
        const dotColor = isBuffer ? BUFFER_TAB_COLORS[p.id as 'a' | 'b' | 'c' | 'd'] : SHADE.text;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            onContextMenu={(e) => {
              if (!isBuffer) return;
              e.preventDefault();
              setContextMenu({ id: p.id as 'a' | 'b' | 'c' | 'd', x: e.clientX, y: e.clientY });
            }}
            title={isBuffer
              ? `${p.name} — right-click for rename / remove`
              : 'Image — the final pass that renders to the screen'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 11px 6px',
              border: `1px solid ${SHADE.border}`,
              borderBottom: active ? `1px solid ${SHADE.bg}` : `1px solid ${SHADE.border}`,
              borderTopLeftRadius: 6, borderTopRightRadius: 6,
              background: active ? SHADE.bg : SHADE.surface2,
              color: active ? SHADE.text : SHADE.textDim,
              font: `600 10.5px ${TYPE.body}`,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              marginBottom: active ? -1 : 0,
              transition: 'background 120ms ease, color 120ms ease',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: dotColor,
                opacity: active ? 1 : 0.7,
              }}
            />
            <span>{p.name}</span>
          </button>
        );
      })}
      {availableSlots.length > 0 && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((x) => !x)}
            title="Add a buffer pass"
            style={{
              padding: '5px 10px 6px',
              border: `1px dashed ${SHADE.border}`,
              borderTopLeftRadius: 6, borderTopRightRadius: 6,
              background: 'transparent',
              color: SHADE.textDim,
              font: `600 10.5px ${TYPE.body}`,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            + Add
          </button>
          {menuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                background: SHADE.surface1,
                border: `1px solid ${SHADE.border}`,
                borderRadius: 4,
                boxShadow: `0 4px 14px rgba(0,0,0,0.18)`,
                padding: 4,
                display: 'flex', flexDirection: 'column', gap: 2,
                zIndex: 5,
              }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              {availableSlots.map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    onAdd(id);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: SHADE.text,
                    font: `500 11px ${TYPE.body}`,
                    letterSpacing: '0.06em',
                    textAlign: 'left',
                    minWidth: 110,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: BUFFER_TAB_COLORS[id],
                    }}
                  />
                  {BUFFER_TAB_LABELS[id]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {contextMenu && (
        <div
          role="menu"
          onMouseLeave={() => setContextMenu(null)}
          style={{
            position: 'fixed',
            left: contextMenu.x, top: contextMenu.y,
            background: SHADE.surface1,
            border: `1px solid ${SHADE.border}`,
            borderRadius: 4,
            boxShadow: `0 4px 14px rgba(0,0,0,0.18)`,
            padding: 4,
            display: 'flex', flexDirection: 'column', gap: 2,
            zIndex: 50,
          }}
        >
          <button
            onClick={() => {
              const next = window.prompt('Rename buffer pass', BUFFER_TAB_LABELS[contextMenu.id]);
              if (next && next.trim()) onRename(contextMenu.id, next.trim());
              setContextMenu(null);
            }}
            style={contextMenuItemStyle}
          >Rename</button>
          <button
            onClick={() => {
              onRemove(contextMenu.id);
              setContextMenu(null);
            }}
            style={{ ...contextMenuItemStyle, color: SHADE.catDistort }}
          >Remove buffer</button>
        </div>
      )}
    </div>
  );
};

const contextMenuItemStyle: CSSProperties = {
  padding: '6px 14px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: SHADE.text,
  font: `500 11px ${TYPE.body}`,
  letterSpacing: '0.06em',
  textAlign: 'left',
  minWidth: 140,
};

const BlockCanvas = ({ children, label }: { children?: ReactNode; label: string }) => (
  <div
    style={{
      flex: '1 1 auto', position: 'relative', minHeight: 0,
      background: SHADE.bg, overflow: 'hidden',
    }}
  >
    <DotGridBg />
    <div
      style={{
        position: 'absolute', left: 14, top: 12,
        font: `700 10px ${TYPE.bodyMono}`,
        color: SHADE.textFaint, letterSpacing: '0.22em', textTransform: 'uppercase',
        pointerEvents: 'none',
      }}
    >
      {label}
    </div>
    <div style={{ position: 'absolute', right: 14, top: 10, display: 'flex', gap: 6 }}>
      <CanvasToolBtn icon="search" title="Zoom" />
      <CanvasToolBtn icon="plus" title="Add" />
    </div>
    {children}
  </div>
);

// ─── Editable code drawer ──────────────────────────────────────────────
//
// READ mode: shows the recipe-compiled GLSL, highlighted, copyable.
// EDIT mode: a textarea is overlaid on the highlight. The user types
// freely, then presses Compile / Translate / Discard. The drawer owns:
//   - editSource             — the user's working draft of the GLSL.
//   - editStatus             — READY | EDITED | COMPILED | COMPILE FAILED.
//   - translateStatus        — idle | loading | ok | error.
// `onCompile(userSource)` runs the user's source through a transient
// renderer (allocated on first compile) and returns errors / ok.
// `onTranslate(currentEditedGlsl)` ships the source + last-good recipe
// to Claude and applies the returned Recipe.

type CompileStatus =
  | { kind: 'ready' }
  | { kind: 'edited' }
  | { kind: 'compiled' }
  | { kind: 'translated' }
  | { kind: 'failed'; errors: GLSLError[] };

const CodeDrawer = ({
  expanded, onToggle, glsl, height = 240,
  editMode, onEditModeChange,
  editSource, onEditSourceChange,
  compileStatus,
  translateStatus,
  onCompile, onTranslate, onDiscard,
}: {
  expanded: boolean;
  onToggle: () => void;
  /** Recipe-compiled GLSL (preamble + body). Source of truth in READ mode. */
  glsl: string;
  height?: number;
  editMode: boolean;
  onEditModeChange: (next: boolean) => void;
  /** Draft text the user is editing. Only meaningful when editMode. */
  editSource: string;
  onEditSourceChange: (next: string) => void;
  compileStatus: CompileStatus;
  translateStatus: TranslateState;
  onCompile: () => void;
  onTranslate: () => void;
  onDiscard: () => void;
}) => {
  const displaySource = editMode ? editSource : glsl;
  const lineCount = displaySource.split('\n').length;
  const canTranslate = compileStatus.kind === 'compiled' && translateStatus.kind !== 'loading';
  const isDirty = compileStatus.kind === 'edited';

  return (
    <div
      style={{
        flex: '0 0 auto',
        borderTop: `1px solid ${SHADE.border}`,
        background: SHADE.bg,
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div
        onClick={onToggle}
        style={{
          height: 44, flex: '0 0 auto',
          padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', userSelect: 'none',
          background: SHADE.surface4,
          color: SHADE.cream,
        }}
      >
        <Icon name="chevron" size={12} color={SHADE.cream} rotate={expanded ? 0 : -90} />
        <Icon name="code" size={15} color={SHADE.gold} cream={SHADE.cream} />
        <span
          style={{
            font: `700 11px ${TYPE.body}`,
            color: SHADE.cream, letterSpacing: '0.22em', textTransform: 'uppercase',
          }}
        >
          {editMode ? 'Edit GLSL' : 'Generated GLSL'}
        </span>
        <span style={{ font: `500 10.5px ${TYPE.bodyMono}`, color: 'rgba(254,231,199,0.55)', letterSpacing: '0.06em' }}>
          · {editMode ? 'editable' : 'auto-compile'} · {lineCount} lines
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <CompileChip status={compileStatus} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Toggling INTO edit mode also expands the drawer — the user
              // can't edit what they can't see.
              if (!editMode && !expanded) onToggle();
              onEditModeChange(!editMode);
            }}
            title={editMode ? 'Done editing — return to read mode' : 'Edit GLSL inline'}
            aria-label={editMode ? 'Stop editing' : 'Edit GLSL'}
            data-testid="code-drawer-edit-toggle"
            style={{
              width: 28, height: 26, borderRadius: 3,
              background: editMode ? 'rgba(252,180,39,0.18)' : 'transparent',
              color: editMode ? SHADE.gold : SHADE.cream,
              border: `1px solid ${editMode ? 'rgba(252,180,39,0.55)' : 'rgba(254,231,199,0.20)'}`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >
            <PencilIcon size={14} color={editMode ? SHADE.gold : SHADE.cream} />
          </button>
          <button
            title="Copy GLSL to clipboard"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                void navigator.clipboard.writeText(displaySource);
              }
            }}
            style={{
              width: 28, height: 26, borderRadius: 3,
              background: 'transparent',
              border: '1px solid rgba(254,231,199,0.20)',
              color: SHADE.cream, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >
            {/* Charismatic copy icon — two slightly tilted card-corners
                stacked. Back card is dimmer, front card has a chunky bite
                taken out of one corner so it reads as "duplicate" /
                "make a copy of this thing", not "clipboard". */}
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'block' }}>
              {/* back card — tilted, dim */}
              <rect
                x="3.4" y="6" width="12" height="14" rx="2.4"
                fill="none" stroke={SHADE.cream} strokeWidth="1.8"
                opacity="0.55"
                transform="rotate(-3 9.4 13)"
              />
              {/* front card — solid, slight tilt the other way, with a
                  cut corner that nods at clipboard / page-fold convention */}
              <path
                d="M9 4 H17 L20.4 7.4 V18 A2 2 0 0 1 18.4 20 H9 A2 2 0 0 1 7 18 V6 A2 2 0 0 1 9 4 Z"
                fill={SHADE.cream}
                transform="rotate(3 13.7 12)"
              />
              {/* the folded corner highlight on the front card */}
              <path
                d="M17 4 V7.4 H20.4"
                fill="none" stroke="rgba(26,18,8,0.55)" strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round"
                transform="rotate(3 13.7 12)"
              />
            </svg>
          </button>
          <button
            title="Open fullscreen"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 28, height: 26, borderRadius: 3,
              border: '1px solid rgba(254,231,199,0.20)',
              background: 'transparent', color: SHADE.cream, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9V4H9 M20 9V4H15 M4 15V20H9 M20 15V20H15" />
            </svg>
          </button>
        </div>
      </div>
      {expanded && (
        <div
          style={{
            height, flex: '0 0 auto',
            borderTop: `1px solid ${SHADE.border}`,
            background: SHADE.surface4,
            padding: '12px 0',
            overflow: 'auto',
            display: 'flex',
            font: `500 12.5px ${TYPE.bodyMono}`,
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              paddingRight: 14, paddingLeft: 14,
              color: SHADE.textFaint, textAlign: 'right',
              borderRight: `1px solid ${SHADE.border}`,
              marginRight: 14, userSelect: 'none',
            }}
          >
            {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <pre style={{ margin: 0, color: SHADE.cream, whiteSpace: 'pre', paddingRight: 14, minWidth: 0, flex: 1 }}>
            <GlslHighlight
              source={displaySource}
              editable={editMode}
              onSourceChange={onEditSourceChange}
            />
          </pre>
        </div>
      )}
      {expanded && editMode && (
        <div
          style={{
            flex: '0 0 auto',
            borderTop: `1px solid ${SHADE.border}`,
            background: SHADE.surface4,
            color: SHADE.cream,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}
        >
          <button
            onClick={onCompile}
            data-testid="code-drawer-compile"
            disabled={!isDirty && compileStatus.kind !== 'failed'}
            style={{
              ...drawerActionStyle,
              opacity: !isDirty && compileStatus.kind !== 'failed' ? 0.55 : 1,
              cursor: !isDirty && compileStatus.kind !== 'failed' ? 'not-allowed' : 'pointer',
            }}
          >
            Compile
          </button>
          <button
            onClick={onTranslate}
            data-testid="code-drawer-translate"
            disabled={!canTranslate}
            style={{
              ...drawerActionStyle,
              background: canTranslate ? SHADE.gold : 'transparent',
              color: canTranslate ? '#1a1208' : SHADE.cream,
              borderColor: canTranslate ? SHADE.goldDeep : 'rgba(254,231,199,0.20)',
              opacity: canTranslate ? 1 : 0.55,
              cursor: canTranslate ? 'pointer' : 'not-allowed',
            }}
          >
            Translate to cards
          </button>
          <button
            onClick={onDiscard}
            data-testid="code-drawer-discard"
            style={drawerActionStyle}
          >
            Discard edits
          </button>
          <TranslateStatus state={translateStatus} />
          <span style={{ marginLeft: 'auto', font: `500 10px ${TYPE.bodyMono}`, color: 'rgba(254,231,199,0.45)' }}>
            edit → compile → translate · failures keep the last-good recipe
          </span>
        </div>
      )}
    </div>
  );
};

// CompileChip — the small inline status pill that rides along in the
// drawer header. Goes READY → EDITED → COMPILED → TRANSLATED (or
// COMPILE FAILED: N). Colour-coded to make state legible at a glance.
const CompileChip = ({ status }: { status: CompileStatus }) => {
  let label = 'READY';
  let bg = 'rgba(254,231,199,0.10)';
  let border = 'rgba(254,231,199,0.25)';
  let color: string = SHADE.cream;
  let testid = 'compile-chip-ready';
  if (status.kind === 'edited') {
    label = 'EDITED';
    bg = 'rgba(252,180,39,0.18)';
    border = 'rgba(252,180,39,0.55)';
    color = SHADE.gold;
    testid = 'compile-chip-edited';
  } else if (status.kind === 'compiled') {
    label = 'COMPILED ✓';
    bg = 'rgba(111,127,26,0.20)';
    border = 'rgba(111,127,26,0.55)';
    color = '#c7d96b';
    testid = 'compile-chip-compiled';
  } else if (status.kind === 'translated') {
    label = 'TRANSLATED';
    bg = 'rgba(111,127,26,0.20)';
    border = 'rgba(111,127,26,0.55)';
    color = '#c7d96b';
    testid = 'compile-chip-translated';
  } else if (status.kind === 'failed') {
    label = `COMPILE FAILED: ${status.errors.length} error${status.errors.length === 1 ? '' : 's'}`;
    bg = 'rgba(181, 54, 94, 0.18)';
    border = 'rgba(181, 54, 94, 0.55)';
    color = '#FFB7C5';
    testid = 'compile-chip-failed';
  }
  const title = status.kind === 'failed'
    ? status.errors.slice(0, 4).map((e) => `L${e.line}: ${e.message}`).join('\n')
    : undefined;
  return (
    <span
      data-testid={testid}
      title={title}
      style={{
        padding: '3px 8px', borderRadius: 3,
        background: bg, border: `1px solid ${border}`, color,
        font: `700 9.5px ${TYPE.bodyMono}`, letterSpacing: '0.08em',
      }}
    >
      {label}
    </span>
  );
};

const drawerActionStyle: CSSProperties = {
  background: 'transparent',
  color: SHADE.cream,
  border: '1px solid rgba(254,231,199,0.20)',
  borderRadius: 3,
  padding: '6px 12px',
  font: `600 11px ${TYPE.body}`,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const PencilIcon = ({ size = 14, color = '#fff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21 L8 20 L21 7 L17 3 L4 16 Z" />
    <path d="M14 6 L18 10" />
  </svg>
);

const PreviewPanel = ({
  blocks = 0, tempo = 120, onFullscreen,
}: { blocks?: number; tempo?: number; onFullscreen?: () => void }) => (
  <div
    style={{
      flex: '0 0 auto',
      background: SHADE.surface2,
      borderBottom: `1px solid ${SHADE.border}`,
      display: 'flex', flexDirection: 'column',
    }}
  >
    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon name="record" size={13} color={SHADE.ember} />
      <span
        style={{
          font: `700 10.5px ${TYPE.body}`,
          color: SHADE.text, letterSpacing: '0.18em', textTransform: 'uppercase',
        }}
      >
        Preview
      </span>
      <span style={{ marginLeft: 'auto', font: `500 10px ${TYPE.bodyMono}`, color: SHADE.textDim }}>
        {tempo} bpm · {blocks} blocks
      </span>
      <button title="Open fullscreen" onClick={onFullscreen} style={fullscreenBtnStyle}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9V4H9 M20 9V4H15 M4 15V20H9 M20 15V20H15" />
        </svg>
      </button>
    </div>
    <div
      style={{
        margin: '0 14px 12px', borderRadius: 3, overflow: 'hidden',
        border: `1px solid ${SHADE.inkLine}`,
        aspectRatio: '1 / 1', position: 'relative', background: '#000',
      }}
    >
      <RecipeCanvas style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', left: 8, top: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <TogglePill active>1080²</TogglePill>
        <TogglePill active>60 fps</TogglePill>
      </div>
      {/* Play button removed — animations always run; the affordance suggested
          a paused state that never exists. */}
    </div>
  </div>
);

const RightColumn = ({
  width = 304, selectedCard, selectedIndex, blocks = 0, tempo = 120, onFullscreen,
}: {
  width?: number;
  selectedCard: Card | null;
  selectedIndex: number;
  blocks?: number;
  tempo?: number;
  onFullscreen?: () => void;
}) => (
  <div
    style={{
      width, flex: '0 0 auto',
      background: SHADE.surface2,
      borderLeft: `1px solid ${SHADE.border}`,
      display: 'flex', flexDirection: 'column',
      minHeight: 0, overflow: 'hidden',
    }}
  >
    <PreviewPanel blocks={blocks} tempo={tempo} onFullscreen={onFullscreen} />
    <PropertiesPanel selectedCard={selectedCard} selectedIndex={selectedIndex} />
  </div>
);

const FullscreenChromeBtn = ({ children, title, onClick }: { children: ReactNode; title: string; onClick?: () => void }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: 32, height: 32, borderRadius: 3,
      background: 'rgba(0,0,0,0.45)',
      border: '1px solid rgba(255,255,255,0.15)',
      color: '#fff', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }}
  >
    {children}
  </button>
);

// Fullscreen preview with real screenshot / record / pan-zoom wiring.
// Pan-zoom is applied as a CSS transform on the wrapper around RecipeCanvas
// — never on the canvas element itself, because that would tickle the
// ResizeObserver and resize the WebGL drawing buffer. Pointer events on the
// canvas still propagate to RecipeCanvas's mousemove handler, so u_mouse
// continues to track the cursor while the user pans.
const PreviewFullscreen = ({ onClose, title }: { onClose: () => void; title: string }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasOuterRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ tx: 0, ty: 0, scale: 1 });
  const [recording, setRecording] = useState(false);
  const [recElapsedMs, setRecElapsedMs] = useState(0);
  const [flash, setFlash] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);
  const recTickRef = useRef<number | null>(null);
  // Pan state: middle-button OR space+drag.
  const spaceDownRef = useRef(false);
  const panningRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

  // Find the underlying WebGL canvas inside our wrapper. Used by screenshot
  // and record — both need the raw HTMLCanvasElement, not the wrapping div.
  const getCanvas = (): HTMLCanvasElement | null => {
    const root = canvasOuterRef.current;
    if (!root) return null;
    return root.querySelector('canvas');
  };

  // Quick visible flash overlay after a screenshot fires.
  const triggerFlash = () => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);
  };

  const handleScreenshot = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shaddy-${tsTag()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      triggerFlash();
    }, 'image/png');
  }, []);

  const handleStartRecord = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas || typeof canvas.captureStream !== 'function') return;
    const stream = canvas.captureStream(60);
    // Prefer VP9 for size, fall back to default webm encoder.
    const opts: MediaRecorderOptions = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? { mimeType: 'video/webm;codecs=vp9' }
      : MediaRecorder.isTypeSupported('video/webm')
        ? { mimeType: 'video/webm' }
        : {};
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, opts);
    } catch {
      return;
    }
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shaddy-${tsTag()}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      for (const t of stream.getTracks()) t.stop();
    };
    recorder.start();
    recorderRef.current = recorder;
    recStartRef.current = performance.now();
    setRecElapsedMs(0);
    setRecording(true);
    const tick = () => {
      setRecElapsedMs(performance.now() - recStartRef.current);
      recTickRef.current = window.setTimeout(tick, 250);
    };
    recTickRef.current = window.setTimeout(tick, 250);
  }, []);

  const handleStopRecord = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') r.stop();
    recorderRef.current = null;
    if (recTickRef.current !== null) {
      clearTimeout(recTickRef.current);
      recTickRef.current = null;
    }
    setRecording(false);
  }, []);

  const handleToggleRecord = useCallback(() => {
    if (recording) handleStopRecord();
    else handleStartRecord();
  }, [recording, handleStartRecord, handleStopRecord]);

  // Cleanup on unmount — ensures a record-in-progress finalises and
  // downloads if the user hits Escape mid-take.
  useEffect(() => () => {
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') r.stop();
    if (recTickRef.current !== null) clearTimeout(recTickRef.current);
  }, []);

  const reset = useCallback(() => setTransform({ tx: 0, ty: 0, scale: 1 }), []);

  // Keyboard: R resets, space tracks for pan-via-space-drag. Escape close
  // is handled by DesktopApp's global handler — we only register R/space.
  useEffect(() => {
    const isTextTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTextTarget(e.target)) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        reset();
        return;
      }
      if (e.key === ' ') {
        spaceDownRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') spaceDownRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [reset]);

  // Wheel zoom around the cursor. Attached as non-passive so we can call
  // preventDefault to stop the page from scrolling sideways under us.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      setTransform((cur) => {
        const dir = e.deltaY < 0 ? 1 : -1;
        const factor = dir > 0 ? 1.1 : 1 / 1.1;
        const nextScale = clamp(cur.scale * factor, 0.25, 8);
        const real = nextScale / cur.scale;
        // Zoom around the cursor: keep the world point under the cursor
        // fixed by adjusting tx/ty proportionally.
        const tx = cx - (cx - cur.tx) * real;
        const ty = cy - (cy - cur.ty) * real;
        return { tx, ty, scale: nextScale };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel as EventListener);
  }, []);

  // Pan: middle-mouse OR space+left. Pointer events on the wrapper here
  // are deliberately distinct from the canvas's own pointermove handler —
  // we install on the wrapper so the inner canvas continues to drive
  // u_mouse unaffected.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const middle = e.button === 1;
    const spaceLeft = e.button === 0 && spaceDownRef.current;
    if (!middle && !spaceLeft) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    panningRef.current = {
      startX: e.clientX, startY: e.clientY,
      tx: transform.tx, ty: transform.ty,
    };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = panningRef.current;
    if (!p) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    setTransform((cur) => ({ ...cur, tx: p.tx + dx, ty: p.ty + dy }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panningRef.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      panningRef.current = null;
    }
  };

  const recSeconds = Math.floor(recElapsedMs / 1000);
  const recLabel = `${Math.floor(recSeconds / 60)}:${String(recSeconds % 60).padStart(2, '0')}`;

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(15, 18, 26, 0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, zIndex: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '90%', height: '90%',
          background: '#000',
          border: `1px solid ${SHADE.inkLine}`,
          borderRadius: 3, overflow: 'hidden',
        }}
      >
        {/* Pan/zoom container — owns the wheel listener and the pointer
            capture for middle/space drag. The transform sits on
            canvasOuterRef so the canvas's CSS size never changes (which
            would trigger the renderer's ResizeObserver and resize the
            GL buffer, wrecking the zoom). */}
        <div
          ref={wrapperRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: 'absolute', inset: 0,
            cursor: panningRef.current ? 'grabbing' : 'default',
            overflow: 'hidden',
          }}
        >
          <div
            ref={canvasOuterRef}
            style={{
              position: 'absolute', inset: 0,
              transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
              transformOrigin: '50% 50%',
              willChange: 'transform',
            }}
          >
            <RecipeCanvas style={{ position: 'absolute', inset: 0 }} />
          </div>
        </div>

        {/* Screenshot flash overlay */}
        {flash && (
          <div
            style={{
              position: 'absolute', inset: 0,
              background: '#fff',
              opacity: 0.85,
              pointerEvents: 'none',
              animation: 'shaddyFlashFade 160ms ease-out forwards',
            }}
          />
        )}
        <style>{`
          @keyframes shaddyFlashFade { from { opacity: 0.85; } to { opacity: 0; } }
          @keyframes shaddyRecPulse { 0% { box-shadow: 0 0 0 0 rgba(229, 60, 60, 0.7); } 70% { box-shadow: 0 0 0 8px rgba(229, 60, 60, 0); } 100% { box-shadow: 0 0 0 0 rgba(229, 60, 60, 0); } }
        `}</style>

        <div style={{ position: 'absolute', left: 14, top: 14, display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'none' }}>
          <TogglePill active>1920 × 1080</TogglePill>
          <TogglePill active>60 fps</TogglePill>
          <TogglePill>safe area</TogglePill>
          <TogglePill>grid</TogglePill>
        </div>
        <div style={{ position: 'absolute', right: 14, top: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
          <div
            title={`${transform.scale.toFixed(2)}x  ·  R to reset`}
            style={{
              padding: '0 10px', height: 28, display: 'flex', alignItems: 'center',
              borderRadius: 3,
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              font: `600 11px ${TYPE.bodyMono}`,
              letterSpacing: '0.08em',
              backdropFilter: 'blur(6px)',
            }}
          >
            {transform.scale.toFixed(2)}x
          </div>
          <FullscreenChromeBtn title="Reset zoom / 1:1  (R)" onClick={reset}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12 A9 9 0 1 0 6 5.5 M3 5 V11 H9" />
            </svg>
          </FullscreenChromeBtn>
          <FullscreenChromeBtn title="Screenshot (PNG)" onClick={handleScreenshot}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7 H7 L9 5 H15 L17 7 H21 V19 H3 Z" />
              <circle cx="12" cy="13" r="3.4" />
            </svg>
          </FullscreenChromeBtn>
          <button
            title={recording ? `Stop recording (${recLabel})` : 'Record WebM (60fps)'}
            onClick={handleToggleRecord}
            style={{
              width: recording ? 78 : 32, height: 32, borderRadius: 3,
              background: recording ? '#e53c3c' : 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              backdropFilter: 'blur(6px)',
              transition: 'width 160ms ease, background 160ms ease',
              animation: recording ? 'shaddyRecPulse 1.4s ease-out infinite' : undefined,
              font: `700 11px ${TYPE.bodyMono}`,
              letterSpacing: '0.06em',
              padding: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r={recording ? 6 : 7} />
            </svg>
            {recording && <span>{recLabel}</span>}
          </button>
          <FullscreenChromeBtn title="Exit fullscreen" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 4H4V9 M15 4H20V9 M9 20H4V15 M15 20H20V15" />
            </svg>
          </FullscreenChromeBtn>
        </div>
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: 18,
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.75) 100%)',
            display: 'flex', alignItems: 'center', gap: 14,
            pointerEvents: 'none',
          }}
        >
          {/* Play button removed — animations always run; the affordance
              suggested a paused state that never exists. */}
          <div style={{ flex: 1 }}>
            <div style={{ font: `700 14px ${TYPE.body}`, color: '#fff' }}>{title}</div>
            <div style={{ font: `500 11px ${TYPE.bodyMono}`, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              120 bpm · 60 fps · scroll to zoom · middle-drag or space-drag to pan · R reset
            </div>
          </div>
          <button
            style={{
              background: 'rgba(255,255,255,0.08)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 3, padding: '9px 14px',
              font: `600 11px ${TYPE.body}`,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
              pointerEvents: 'auto',
            }}
          >
            <Icon name="share" size={12} color="#fff" /> Export MP4
          </button>
        </div>
      </div>
    </div>
  );
};

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

function tsTag(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const EmptyHero = () => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 22,
        padding: '22px 28px 22px 22px',
        border: `1.5px dashed ${SHADE.borderHi}`,
        borderRadius: 4,
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(6px)',
        maxWidth: 620,
      }}
    >
      <ShadeMascot size={72} />
      <div>
        <div
          style={{
            font: `700 28px ${TYPE.display}`, color: SHADE.text,
            letterSpacing: TYPE.trackTighter, lineHeight: 1.05,
          }}
        >
          Click a block to start.
        </div>
        <div
          style={{
            font: `400 14px ${TYPE.body}`,
            color: SHADE.textDim, marginTop: 8, lineHeight: 1.5,
          }}
        >
          Begin with a <span style={{ color: SHADE.catShape, fontWeight: 600 }}>shape</span>, then snap on{' '}
          <span style={{ color: SHADE.catDistort, fontWeight: 600 }}>distortions</span>,{' '}
          <span style={{ color: SHADE.catColor, fontWeight: 600 }}>colors</span>, and{' '}
          <span style={{ color: SHADE.catEffect, fontWeight: 600 }}>effects</span>.
        </div>
      </div>
    </div>
  </div>
);

// Structural undo/redo for the recipe. We push a snapshot onto the past
// stack each time a structural mutation happens (insert / remove /
// reorder) — slider drags don't push (would be noisy). Capped at 50.
const UNDO_LIMIT = 50;

function structuralFingerprint(recipe: Recipe): string {
  // Two recipes are structurally equivalent for undo purposes if they
  // have the same ordered card ids + types + enabled flags across every
  // pass. Param values are deliberately excluded so slider ticks don't
  // churn the stack.
  const passFp = (cards: Recipe['cards']) =>
    cards
      .map((c) => `${c.id}:${c.kind === 'typed' ? c.type : 'wildcard'}:${c.enabled ? 1 : 0}`)
      .join('|');
  const parts = [`image:${passFp(recipe.cards)}`];
  for (const p of recipe.passes ?? []) {
    parts.push(`${p.id}:${passFp(p.cards)}`);
  }
  return parts.join('//');
}

export const DesktopApp = () => {
  const recipe = useCardsStore((s) => s.recipe);
  const setRecipe = useCardsStore((s) => s.setRecipe);
  const activePassId = useCardsStore((s) => s.activePassId);
  const setActivePassId = useCardsStore((s) => s.setActivePassId);
  const addBufferPassAction = useCardsStore((s) => s.addBufferPass);
  const removeBufferPassAction = useCardsStore((s) => s.removeBufferPass);
  const renameBufferPassAction = useCardsStore((s) => s.renameBufferPass);
  // The chain UI operates on whichever pass is active. For the image pass
  // this stays bit-identical to the old behaviour (recipe.cards).
  const activeCards = getPassCards(recipe, activePassId);
  const tabPasses: Array<{ id: PassId; name: string }> = [
    { id: 'image', name: 'Image' },
    ...(recipe.passes ?? []).map((p) => ({ id: p.id, name: p.name })),
  ];

  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Multi-selection — a set of card ids. Single-card paths read the lone id
  // when size === 1. Plain clicks replace; Shift / Cmd / Ctrl clicks toggle.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editorIdx, setEditorIdx] = useState<number | null>(null);

  // ─── Editable code drawer state ────────────────────────────────────
  // The drawer owns three pieces of state: editMode (toggle), editSource
  // (the user's draft GLSL), and compileStatus/translateStatus (chip).
  // editSource only diverges from the recipe-derived GLSL while editMode is
  // on; toggling off resets it.
  const [editMode, setEditMode] = useState(false);
  const [editSource, setEditSource] = useState<string>('');
  const [compileStatus, setCompileStatus] = useState<CompileStatus>({ kind: 'ready' });
  const [translateStatus, setTranslateStatus] = useState<TranslateState>({ kind: 'idle' });

  // Selection helpers shared across keyboard, mouse, and bulk-action code paths.
  const replaceSelection = useCallback((cardId: string | null) => {
    setSelectedIds(cardId ? new Set([cardId]) : new Set());
  }, []);
  const toggleSelection = useCallback((cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const handleSelect = useCallback(
    (idx: number, mode: 'replace' | 'toggle') => {
      const s = useCardsStore.getState();
      const cards = getPassCards(s.recipe, s.activePassId);
      const card = cards[idx];
      if (!card) return;
      if (mode === 'toggle') toggleSelection(card.id);
      else replaceSelection(card.id);
    },
    [replaceSelection, toggleSelection],
  );

  // ─── undo / redo stacks ────────────────────────────────────────────
  const pastRef = useRef<Recipe[]>([]);
  const futureRef = useRef<Recipe[]>([]);
  const lastStructRef = useRef<string>(structuralFingerprint(recipe));
  // When we restore from undo/redo, we don't want the watcher below to
  // push that restored recipe back onto the past stack.
  const isRestoringRef = useRef(false);

  // Watch for structural changes and snapshot the prior recipe.
  useEffect(() => {
    const fp = structuralFingerprint(recipe);
    if (fp === lastStructRef.current) return;
    if (!isRestoringRef.current) {
      // The recipe we want to *return to* on undo is the one that was
      // current before this change — but at this point we only have the
      // new one. We approximate by snapshotting whatever the store had
      // most recently; since the store has already moved on, we instead
      // snapshot the *previous* fingerprint's recipe via a closure on
      // the last seen recipe.
      const prev = lastRecipeRef.current;
      if (prev) {
        pastRef.current.push(prev);
        if (pastRef.current.length > UNDO_LIMIT) pastRef.current.shift();
        futureRef.current = [];
      }
    }
    lastStructRef.current = fp;
    isRestoringRef.current = false;
  }, [recipe]);

  // Mirror the current recipe so the snapshot above has access to the
  // "before" value when a structural change is detected.
  const lastRecipeRef = useRef<Recipe>(recipe);
  useEffect(() => { lastRecipeRef.current = recipe; }, [recipe]);

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(lastRecipeRef.current);
    if (futureRef.current.length > UNDO_LIMIT) futureRef.current.shift();
    isRestoringRef.current = true;
    setRecipe(prev);
  }, [setRecipe]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(lastRecipeRef.current);
    if (pastRef.current.length > UNDO_LIMIT) pastRef.current.shift();
    isRestoringRef.current = true;
    setRecipe(next);
  }, [setRecipe]);

  // Load a starter recipe once on first mount if the store is empty (so the
  // app boots with something to play with — matches AppShell).
  useEffect(() => {
    if (recipe.cards.length === 0) {
      const starter = STARTER_RECIPES.find((s) => s.id === DEFAULT_STARTER_ID) ?? STARTER_RECIPES[0];
      if (starter) {
        // Starter load shouldn't be undoable — mark as restoring so the
        // watcher skips snapshotting.
        isRestoringRef.current = true;
        setRecipe(cloneRecipeWithFreshIds(starter.recipe));
      }
    }
    // Intentionally one-shot: only seed when the recipe is empty on mount.
  }, []);

  // Compile recipe → GLSL for the code drawer (the renderer itself compiles
  // separately inside RecipeCanvas).
  const compiled = useMemo(() => compile(recipe), [recipe]);
  const wrappedGlsl = useMemo(
    () => `${FRAGMENT_PREAMBLE}\n${compiled.glsl}`,
    [compiled.glsl],
  );

  // Mirror the live recipe so the translate flow can hand Claude the
  // last-good Recipe alongside the edited GLSL.
  const recipeRef = useRef(recipe);
  useEffect(() => { recipeRef.current = recipe; }, [recipe]);

  // ─── Compile validator (transient offscreen renderer) ─────────────
  // The on-screen RecipeCanvas owns its own renderer and we can't touch
  // it (boundary rule), so we lazily allocate a parallel "validator"
  // renderer the first time Compile is pressed. It mounts onto an
  // offscreen 1×1 div, never renders anything visible, and just gets its
  // compile() called to check the user's edited GLSL.
  const validatorRef = useRef<RendererAPI | null>(null);
  const validatorHostRef = useRef<HTMLDivElement | null>(null);
  const ensureValidator = useCallback((): RendererAPI | null => {
    if (validatorRef.current) return validatorRef.current;
    if (typeof document === 'undefined') return null;
    try {
      const host = document.createElement('div');
      host.style.position = 'absolute';
      host.style.width = '1px';
      host.style.height = '1px';
      host.style.opacity = '0';
      host.style.pointerEvents = 'none';
      host.style.left = '-9999px';
      host.style.top = '-9999px';
      document.body.appendChild(host);
      const r = createRenderer();
      r.mount(host);
      r.resize(1, 1);
      validatorRef.current = r;
      validatorHostRef.current = host;
      return r;
    } catch {
      // No WebGL context (test/CI/headless) — caller treats null as
      // "can't compile; assume ok" and lets translate proceed.
      return null;
    }
  }, []);
  useEffect(() => () => {
    // Tear down on unmount so we don't leak a WebGL context.
    if (validatorHostRef.current) {
      validatorHostRef.current.remove();
      validatorHostRef.current = null;
    }
    validatorRef.current = null;
  }, []);

  // Entering edit mode → seed the draft with the current recipe's GLSL
  // and reset chip state. Leaving edit mode (regardless of how) clears
  // the draft so re-entering picks up the latest recipe.
  useEffect(() => {
    if (editMode) {
      setEditSource(wrappedGlsl);
      setCompileStatus({ kind: 'ready' });
      setTranslateStatus({ kind: 'idle' });
    } else {
      setEditSource('');
    }
    // Intentionally one-shot per editMode flip — subsequent recipe changes
    // while editing must NOT clobber the user's in-progress edits, so the
    // dep on `wrappedGlsl` is deliberately omitted.
  }, [editMode]);

  // The user typed into the textarea — mark dirty. We keep the previous
  // failure visible (chip stays red on `failed`) until they actually press
  // Compile again, which feels closer to "I see what I broke" than an
  // immediate jump back to EDITED.
  const handleEditSourceChange = useCallback((next: string) => {
    setEditSource(next);
    setCompileStatus((cur) => (cur.kind === 'failed' ? cur : { kind: 'edited' }));
    setTranslateStatus({ kind: 'idle' });
  }, []);

  // Compile button → strip the preamble (renderer adds it itself), run
  // through the validator renderer, surface ok / error count.
  const handleCompile = useCallback(() => {
    const body = editSource.split('\n').slice(USER_LINE_OFFSET).join('\n');
    const r = ensureValidator();
    if (!r) {
      // No WebGL — best-effort: treat as compiled so the user can still
      // try Translate. Better UX than blocking the flow in a non-GL env.
      setCompileStatus({ kind: 'compiled' });
      return;
    }
    const result = r.compile(body);
    if (result.ok) {
      setCompileStatus({ kind: 'compiled' });
    } else {
      setCompileStatus({ kind: 'failed', errors: result.errors });
    }
  }, [editSource, ensureValidator]);

  // Translate button → ship the edited GLSL + last-good recipe to Claude.
  // On success we apply the returned Recipe through cloneRecipeWithFreshIds
  // so any "<auto>" placeholder ids get replaced, and the chip flips to
  // TRANSLATED. On failure we keep the existing recipe untouched.
  const handleTranslate = useCallback(async () => {
    if (compileStatus.kind !== 'compiled') return;
    setTranslateStatus({ kind: 'loading' });
    try {
      const newRecipe = await translateGlslToRecipe(editSource, recipeRef.current);
      setRecipe(cloneRecipeWithFreshIds(newRecipe));
      setTranslateStatus({ kind: 'ok' });
      setCompileStatus({ kind: 'translated' });
      // Leave edit mode — the drawer now shows the new recipe's GLSL,
      // which may differ from what the user typed if Claude collapsed or
      // expanded any cards.
      setEditMode(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTranslateStatus({ kind: 'error', message });
    }
  }, [compileStatus, editSource, setRecipe]);

  const handleDiscardEdits = useCallback(() => {
    setEditSource(wrappedGlsl);
    setCompileStatus({ kind: 'ready' });
    setTranslateStatus({ kind: 'idle' });
  }, [wrappedGlsl]);

  // Prune selectedIds for cards that no longer exist (after removal / undo /
  // recipe swap, or after a pass-tab switch) and clamp the editor index.
  useEffect(() => {
    const liveIds = new Set(activeCards.map((c) => c.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (liveIds.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
    if (editorIdx != null && editorIdx >= activeCards.length) {
      setEditorIdx(null);
    }
  }, [activeCards, editorIdx]);

  // Focus the palette search input. Used by both the "/" keyboard shortcut
  // and the EndCap "+" button — defined at component scope so both call
  // sites share the same impl.
  const focusPaletteSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      'input[placeholder="search blocks"]',
    );
    if (input) {
      input.focus();
      input.select?.();
    }
  }, []);

  // ─── global keyboard shortcuts ──────────────────────────────────────
  // Skip if the user is typing in an input/textarea/contentEditable, with
  // one exception: Esc always works.
  useEffect(() => {
    const isTextTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Esc — always active (closes modal / clears selection).
      if (e.key === 'Escape') {
        if (editorIdx != null) {
          e.preventDefault();
          setEditorIdx(null);
          return;
        }
        if (fullscreen) {
          e.preventDefault();
          setFullscreen(false);
          return;
        }
        clearSelection();
        return;
      }

      const textTarget = isTextTarget(e.target);

      // Cmd/Ctrl+K — focus search even from text fields.
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        focusPaletteSearch();
        return;
      }

      // Undo / redo always active outside text fields.
      if (meta && (e.key === 'z' || e.key === 'Z')) {
        if (textTarget) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // Cmd/Ctrl+D — duplicate currently-selected card(s). Always active
      // outside text fields. Duplicates each selected card in chain-order;
      // the new clones land immediately after the original, and the new
      // selection becomes the freshly-cloned ids.
      if (meta && (e.key === 'd' || e.key === 'D')) {
        if (textTarget) return;
        if (selectedIds.size === 0) return;
        e.preventDefault();
        const state = useCardsStore.getState();
        const cards = getPassCards(state.recipe, state.activePassId);
        // Iterate in chain-order for deterministic placement.
        const ordered = cards.filter((c) => selectedIds.has(c.id));
        const newIds: string[] = [];
        for (const c of ordered) {
          const newId = state.duplicateCard(c.id);
          if (newId) newIds.push(newId);
        }
        if (newIds.length > 0) setSelectedIds(new Set(newIds));
        return;
      }

      if (textTarget) return;

      // ← / → — move selection across the chain. Always collapses any
      // multi-selection down to a single id (matches the requested behaviour).
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const s = useCardsStore.getState();
        const cards = getPassCards(s.recipe, s.activePassId);
        if (cards.length === 0) return;
        e.preventDefault();
        // Anchor on the current single selection (or the first id of a
        // multi-selection in chain-order) — falls back to 0.
        let anchorIdx = -1;
        for (let i = 0; i < cards.length; i++) {
          if (selectedIds.has(cards[i]!.id)) { anchorIdx = i; break; }
        }
        const delta = e.key === 'ArrowLeft' ? -1 : +1;
        const nextIdx = anchorIdx < 0
          ? 0
          : Math.max(0, Math.min(cards.length - 1, anchorIdx + delta));
        const nextCard = cards[nextIdx];
        if (nextCard) setSelectedIds(new Set([nextCard.id]));
        return;
      }

      // Delete / Backspace — remove every selected block.
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size === 0) return;
        e.preventDefault();
        const state = useCardsStore.getState();
        // Snapshot ids first — the store mutates underneath us as we delete.
        const ids = Array.from(selectedIds);
        for (const id of ids) state.removeCard(id);
        setSelectedIds(new Set());
        return;
      }

      // Enter — open the editor for the (single) selected block.
      if (e.key === 'Enter') {
        if (selectedIds.size !== 1) return;
        const s = useCardsStore.getState();
        const cards = getPassCards(s.recipe, s.activePassId);
        const onlyId = [...selectedIds][0]!;
        const idx = cards.findIndex((c) => c.id === onlyId);
        if (idx >= 0) {
          e.preventDefault();
          setEditorIdx(idx);
        }
        return;
      }

      // / — focus palette search.
      if (e.key === '/') {
        e.preventDefault();
        focusPaletteSearch();
        return;
      }

      // F — toggle wow-mode fullscreen.
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setFullscreen((x) => !x);
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, editorIdx, fullscreen, undo, redo, focusPaletteSearch, clearSelection]);

  const blocksCount = activeCards.length;
  // Single-card paths read the lone id when exactly one is selected.
  // Properties / preview-title degrade to "global" when ≥2 are selected.
  const singleSelectedId = selectedIds.size === 1 ? [...selectedIds][0]! : null;
  const singleSelectedIdx = singleSelectedId
    ? activeCards.findIndex((c) => c.id === singleSelectedId)
    : -1;
  const selectedCard: Card | null =
    singleSelectedIdx >= 0 ? activeCards[singleSelectedIdx]! : null;
  const editorCard: Card | null =
    editorIdx != null && editorIdx < activeCards.length ? activeCards[editorIdx]! : null;

  // Bulk-action handlers — used by the multi-select chip in the chain and
  // (optionally) by the Properties panel surface in a future tweak.
  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    const state = useCardsStore.getState();
    const ids = Array.from(selectedIds);
    for (const id of ids) state.removeCard(id);
    setSelectedIds(new Set());
  }, [selectedIds]);
  const handleBulkDuplicate = useCallback(() => {
    if (selectedIds.size === 0) return;
    const state = useCardsStore.getState();
    const cards = getPassCards(state.recipe, state.activePassId);
    const ordered = cards.filter((c) => selectedIds.has(c.id));
    const newIds: string[] = [];
    for (const c of ordered) {
      const newId = state.duplicateCard(c.id);
      if (newId) newIds.push(newId);
    }
    if (newIds.length > 0) setSelectedIds(new Set(newIds));
  }, [selectedIds]);

  const previewTitle = selectedCard && selectedCard.kind === 'typed'
    ? (lookupCardDef(selectedCard.type)?.friendlyName ?? selectedCard.type)
    : `Recipe · ${blocksCount} block${blocksCount === 1 ? '' : 's'}`;

  // Row count = portals + 1 (each portal opens a new row).
  const portalCount = activeCards.reduce(
    (n, c) => n + (c.kind === 'typed' && c.type === 'portal' ? 1 : 0),
    0,
  );
  const rowCount = portalCount + 1;
  const blockCount = blocksCount - portalCount;
  const passLabel = activePassId === 'image' ? 'IMAGE' : `BUFFER ${activePassId.toUpperCase()}`;
  const label = blocksCount === 0
    ? `CHAIN · ${passLabel} · empty`
    : `CHAIN · ${passLabel} · ${rowCount} row${rowCount === 1 ? '' : 's'} · ${blockCount} block${blockCount === 1 ? '' : 's'}`;

  const containerStyle: CSSProperties = {
    width: '100vw', height: '100vh', background: SHADE.bg, color: SHADE.text,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    font: `400 13px ${TYPE.body}`, position: 'relative',
  };

  return (
    <div style={containerStyle}>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <Palette />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          <BlockCanvas label={label}>
            {/* Chain-pass tabs — always visible (even on empty recipes so
                the user can switch between Image / Buffer A / etc before
                inserting any cards). Sits between the canvas label strip
                and the chain itself. */}
            <div
              style={{
                position: 'absolute', left: 56, right: 32, top: 40,
                pointerEvents: 'auto',
              }}
            >
              <PassTabs
                passes={tabPasses}
                activePassId={activePassId}
                onSelect={setActivePassId}
                onAdd={addBufferPassAction}
                onRemove={removeBufferPassAction}
                onRename={renameBufferPassAction}
              />
            </div>
            {blocksCount === 0 ? (
              <EmptyHero />
            ) : (
              <div
                style={{
                  // Bounded box for the chain area. The Chain itself owns
                  // its scrollbars; the kbd hint + divider live in a fixed
                  // strip below so they don't move when rows accumulate.
                  position: 'absolute', left: 56, right: 32, top: 76, bottom: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'stretch',
                  minHeight: 0,
                  pointerEvents: 'none',
                }}
              >
                <Chain
                  items={activeCards}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onOpen={setEditorIdx}
                  onReorder={(cardId, toIndex) => useCardsStore.getState().reorderCard(cardId, toIndex)}
                  onAddCard={focusPaletteSearch}
                  onAddPortal={() => useCardsStore.getState().insertTypedCard('portal')}
                />
                <div
                  style={{
                    flex: '0 0 auto',
                    marginTop: 12, height: 1,
                    borderTop: `1px dashed ${SHADE.border}`, opacity: 0.6,
                  }}
                />
                <div
                  style={{
                    flex: '0 0 auto',
                    marginTop: 6, paddingBottom: 8,
                    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                    font: `500 9.5px ${TYPE.bodyMono}`,
                    color: SHADE.textFaint, letterSpacing: '0.18em', textTransform: 'uppercase',
                  }}
                >
                  <span>
                    ← → select  ·  shift+click multi  ·  ⌫ delete  ·  enter edit  ·  drag to reorder  ·  / search  ·  f fullscreen  ·  ⌘z undo  ·  ⌘d duplicate  ·  + portal for new row
                  </span>
                  {selectedIds.size >= 2 && (
                    <span
                      style={{
                        pointerEvents: 'auto',
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '4px 10px',
                        background: `${SHADE.gold}1f`,
                        border: `1px solid ${SHADE.gold}`,
                        borderRadius: 999,
                        color: SHADE.goldDeep,
                        letterSpacing: '0.10em',
                      }}
                    >
                      <span>{selectedIds.size} selected</span>
                      <button
                        type="button"
                        onClick={handleBulkDuplicate}
                        title="Duplicate selected (⌘D)"
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: SHADE.goldDeep, font: `600 9.5px ${TYPE.bodyMono}`,
                          letterSpacing: '0.10em', textTransform: 'uppercase', padding: 0,
                        }}
                      >
                        dup
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        title="Delete selected (⌫)"
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: SHADE.catDistort, font: `600 9.5px ${TYPE.bodyMono}`,
                          letterSpacing: '0.10em', textTransform: 'uppercase', padding: 0,
                        }}
                      >
                        del
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        title="Clear selection (Esc)"
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: SHADE.textDim, font: `600 9.5px ${TYPE.bodyMono}`,
                          letterSpacing: '0.10em', textTransform: 'uppercase', padding: 0,
                        }}
                      >
                        clear
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </BlockCanvas>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <CodeDrawer
              expanded={drawerExpanded}
              onToggle={() => setDrawerExpanded((x) => !x)}
              glsl={wrappedGlsl}
              height={300}
              editMode={editMode}
              onEditModeChange={setEditMode}
              editSource={editSource}
              onEditSourceChange={handleEditSourceChange}
              compileStatus={compileStatus}
              translateStatus={translateStatus}
              onCompile={handleCompile}
              onTranslate={() => { void handleTranslate(); }}
              onDiscard={handleDiscardEdits}
            />
          </div>
        </div>
        <RightColumn
          selectedCard={selectedCard}
          selectedIndex={singleSelectedIdx}
          blocks={blocksCount}
          tempo={120}
          onFullscreen={() => setFullscreen(true)}
        />
        {fullscreen && <PreviewFullscreen title={previewTitle} onClose={() => setFullscreen(false)} />}
        {editorCard && (
          <BlockEditor
            card={editorCard}
            onClose={() => setEditorIdx(null)}
          />
        )}
      </div>
    </div>
  );
};
