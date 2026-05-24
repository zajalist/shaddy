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
const PORTAL_PALETTE = ['#FCB427', '#B5365E', '#1F7FB8', '#6F7F1A', '#5C3FA8', '#B56A1D'];

import {
  cloneRecipeWithFreshIds,
  compile,
  lookupCardDef,
  reparse,
  STARTER_RECIPES,
  useCardsStore,
  type Card,
  type Recipe,
} from '@/cards';
import { FRAGMENT_PREAMBLE, USER_LINE_OFFSET } from '@/renderer';

import { SHADE, TYPE, blockById } from './tokens';
import type { BlockDef } from './tokens';
import { Icon, ShadeMascot } from './icons';
import { Block, BLOCK_H } from './Block';
import { GlslHighlight } from './GlslHighlight';
import type { BlockVariant } from './Block';
import {
  Palette, TopBar, TogglePill, DotGridBg, CanvasToolBtn, fullscreenBtnStyle,
} from './components';
import { PropertiesPanel } from './Properties';
import { RecipeCanvas } from './RecipeCanvas';
import { BlockEditor } from './BlockEditor';
import { AskClaude } from './AskClaude';

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
        flex: 1, height: 3,
        background: `linear-gradient(90deg, ${color} 0%, ${color}cc 35%, ${color}55 70%, ${color}00 100%)`,
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
        flex: 1, height: 3,
        background: `linear-gradient(90deg, ${color}00 0%, ${color}55 30%, ${color}cc 65%, ${color} 100%)`,
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
const EndCap = ({ onClick }: { onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    title="add a card to the end of the chain  ·  /"
    style={{
      marginLeft: 6, height: BLOCK_H - 12, width: 36,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent',
      border: `1.5px dashed ${SHADE.border}`,
      borderRadius: 6,
      color: SHADE.textDim,
      cursor: 'pointer',
      font: `700 18px ${TYPE.body}`,
      lineHeight: 1,
      padding: 0,
      transition: 'border-color 160ms ease, color 160ms ease, background 160ms ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = SHADE.gold;
      e.currentTarget.style.color = SHADE.gold;
      e.currentTarget.style.background = `${SHADE.gold}15`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = SHADE.border;
      e.currentTarget.style.color = SHADE.textDim;
      e.currentTarget.style.background = 'transparent';
    }}
  >
    +
  </button>
);

// "+ portal" affordance — sits next to the EndCap on the last row. Inserts
// a portal marker card so the next card the user adds lands on a new row.
// Always gold-toned to suggest the gold portal trail it produces.
const PortalCap = ({ onClick }: { onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    title="insert portal (row break)"
    style={{
      marginLeft: 6, height: BLOCK_H - 12, width: 44,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      background: `${SHADE.gold}10`,
      border: `1.5px dashed ${SHADE.gold}`,
      borderRadius: 6,
      color: SHADE.goldDeep,
      cursor: 'pointer',
      font: `700 12px ${TYPE.bodyMono}`,
      letterSpacing: '0.08em',
      lineHeight: 1,
      padding: 0,
      transition: 'border-color 160ms ease, color 160ms ease, background 160ms ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = `${SHADE.gold}28`;
      e.currentTarget.style.borderColor = SHADE.goldDeep;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = `${SHADE.gold}10`;
      e.currentTarget.style.borderColor = SHADE.gold;
    }}
  >
    {/* tiny ring glyph to evoke the portal trail */}
    <span aria-hidden style={{
      width: 11, height: 11, borderRadius: '50%',
      border: `2px solid ${SHADE.gold}`,
      display: 'inline-block',
    }} />
    <span>↵</span>
  </button>
);

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

const CodeDrawer = ({
  expanded, onToggle, glsl, height = 240, onAskClaude, askClaudeBtnRef, askClaudeActive,
}: {
  expanded: boolean;
  onToggle: () => void;
  glsl: string;
  height?: number;
  onAskClaude?: () => void;
  askClaudeBtnRef?: React.RefObject<HTMLButtonElement | null>;
  askClaudeActive?: boolean;
}) => {
  const lineCount = glsl.split('\n').length;
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
          Generated GLSL
        </span>
        <span style={{ font: `500 10.5px ${TYPE.bodyMono}`, color: 'rgba(254,231,199,0.55)', letterSpacing: '0.06em' }}>
          · auto-compile · {lineCount} lines
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            ref={askClaudeBtnRef}
            onClick={(e) => {
              e.stopPropagation();
              onAskClaude?.();
            }}
            title="Ask Claude"
            aria-label="Ask Claude"
            data-testid="ask-claude-button"
            style={{
              width: 28, height: 26, borderRadius: 3,
              background: askClaudeActive ? 'rgba(252,180,39,0.18)' : 'transparent',
              color: askClaudeActive ? SHADE.gold : SHADE.cream,
              border: `1px solid ${askClaudeActive ? 'rgba(252,180,39,0.55)' : 'rgba(254,231,199,0.20)'}`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >
            <Icon
              name="ai-spark"
              size={16}
              color={askClaudeActive ? SHADE.gold : SHADE.cream}
              cream={askClaudeActive ? SHADE.gold : SHADE.cream}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                void navigator.clipboard.writeText(glsl);
              }
            }}
            style={{
              background: 'transparent', color: SHADE.cream,
              border: '1px solid rgba(254,231,199,0.20)', borderRadius: 3,
              padding: '5px 9px', font: `600 10.5px ${TYPE.bodyMono}`,
              letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            copy
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
            <GlslHighlight source={glsl} />
          </pre>
        </div>
      )}
    </div>
  );
};

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
      <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
        <button
          style={{
            width: 30, height: 30, borderRadius: 3,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="play" size={12} color="#fff" />
        </button>
      </div>
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

const PreviewFullscreen = ({ onClose, title }: { onClose: () => void; title: string }) => (
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
      <RecipeCanvas style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', left: 14, top: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <TogglePill active>1920 × 1080</TogglePill>
        <TogglePill active>60 fps</TogglePill>
        <TogglePill>safe area</TogglePill>
        <TogglePill>grid</TogglePill>
      </div>
      <div style={{ position: 'absolute', right: 14, top: 14, display: 'flex', gap: 6 }}>
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
        }}
      >
        <button
          style={{
            width: 46, height: 46, borderRadius: 3,
            background: SHADE.gold,
            border: `1px solid ${SHADE.goldDeep}`,
            color: '#1a1208', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="play" size={16} color="#1a1208" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ font: `700 14px ${TYPE.body}`, color: '#fff' }}>{title}</div>
          <div style={{ font: `500 11px ${TYPE.bodyMono}`, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            120 bpm · 60 fps
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
          }}
        >
          <Icon name="share" size={12} color="#fff" /> Export MP4
        </button>
      </div>
    </div>
  </div>
);

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
  // have the same ordered card ids + types + enabled flags. Param values
  // are deliberately excluded so slider ticks don't churn the stack.
  return recipe.cards
    .map((c) => `${c.id}:${c.kind === 'typed' ? c.type : 'wildcard'}:${c.enabled ? 1 : 0}`)
    .join('|');
}

export const DesktopApp = () => {
  const recipe = useCardsStore((s) => s.recipe);
  const setRecipe = useCardsStore((s) => s.setRecipe);

  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Multi-selection — a set of card ids. Single-card paths read the lone id
  // when size === 1. Plain clicks replace; Shift / Cmd / Ctrl clicks toggle.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editorIdx, setEditorIdx] = useState<number | null>(null);
  const [askClaudeOpen, setAskClaudeOpen] = useState(false);
  const askClaudeBtnRef = useRef<HTMLButtonElement | null>(null);

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
      const cards = useCardsStore.getState().recipe.cards;
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

  // Ask-Claude: the popover hands back a full wrapped GLSL source. Strip
  // the preamble (matches reparse.ts's expectation — it operates on the
  // body only) and route through the same reverse parser the CodeView
  // uses. If markers were preserved, this turns the rewrite into either
  // a no-op or a card→wildcard transition for whichever cards diverged.
  const compiledRef = useRef(compiled);
  const recipeRef = useRef(recipe);
  useEffect(() => {
    compiledRef.current = compiled;
    recipeRef.current = recipe;
  }, [compiled, recipe]);

  const handleAskClaudeReplace = useCallback((newWrappedGlsl: string) => {
    const lines = newWrappedGlsl.split('\n');
    const body = lines.slice(USER_LINE_OFFSET).join('\n');
    const result = reparse(recipeRef.current, compiledRef.current, body);
    if (!result.syntaxPending) {
      setRecipe(result.recipe);
    }
  }, [setRecipe]);

  // Prune selectedIds for cards that no longer exist (after removal / undo /
  // recipe swap) and clamp the editor index. Done in one effect — both
  // depend on recipe.cards.
  useEffect(() => {
    const liveIds = new Set(recipe.cards.map((c) => c.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (liveIds.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
    if (editorIdx != null && editorIdx >= recipe.cards.length) {
      setEditorIdx(null);
    }
  }, [recipe.cards, editorIdx]);

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
        const cards = state.recipe.cards;
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
        const cards = useCardsStore.getState().recipe.cards;
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
        const cards = useCardsStore.getState().recipe.cards;
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

  const blocksCount = recipe.cards.length;
  // Single-card paths read the lone id when exactly one is selected.
  // Properties / preview-title degrade to "global" when ≥2 are selected.
  const singleSelectedId = selectedIds.size === 1 ? [...selectedIds][0]! : null;
  const singleSelectedIdx = singleSelectedId
    ? recipe.cards.findIndex((c) => c.id === singleSelectedId)
    : -1;
  const selectedCard: Card | null =
    singleSelectedIdx >= 0 ? recipe.cards[singleSelectedIdx]! : null;
  const editorCard: Card | null =
    editorIdx != null && editorIdx < recipe.cards.length ? recipe.cards[editorIdx]! : null;

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
    const cards = state.recipe.cards;
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
  const portalCount = recipe.cards.reduce(
    (n, c) => n + (c.kind === 'typed' && c.type === 'portal' ? 1 : 0),
    0,
  );
  const rowCount = portalCount + 1;
  const blockCount = blocksCount - portalCount;
  const label = blocksCount === 0
    ? 'CHAIN · empty'
    : `CHAIN · ${rowCount} row${rowCount === 1 ? '' : 's'} · ${blockCount} block${blockCount === 1 ? '' : 's'}`;

  const containerStyle: CSSProperties = {
    width: '100vw', height: '100vh', background: SHADE.bg, color: SHADE.text,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    font: `400 13px ${TYPE.body}`, position: 'relative',
  };

  return (
    <div style={containerStyle}>
      <TopBar tempo={120} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <Palette />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          <BlockCanvas label={label}>
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
                  items={recipe.cards}
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
              onAskClaude={() => setAskClaudeOpen((o) => !o)}
              askClaudeBtnRef={askClaudeBtnRef}
              askClaudeActive={askClaudeOpen}
            />
            <AskClaude
              open={askClaudeOpen}
              glsl={wrappedGlsl}
              onClose={() => setAskClaudeOpen(false)}
              onReplace={handleAskClaudeReplace}
              anchorRef={askClaudeBtnRef}
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
