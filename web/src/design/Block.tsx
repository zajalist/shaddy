import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, DragEventHandler, MouseEventHandler } from 'react';
import type { Card } from '@/cards';
import { lookupCardDef } from '@/cards';
import { CATEGORIES, SHADE, TYPE } from './tokens';
import type { BlockDef, BlockMini } from './tokens';
import { Icon } from './icons';
import { miniForCard } from './card-adapter';

export const BLOCK_W = 168;
export const BLOCK_H = 96;
export const TAB = 9;
const TAB_H = 26;
const RADIUS = 5;

export type BlockEdge = 'flat' | 'notch' | 'tab';
export type BlockVariant = { left?: BlockEdge; right?: BlockEdge };

export function blockPath(W = BLOCK_W, H = BLOCK_H, td = TAB, th = TAB_H, r = RADIUS, variant: BlockVariant = {}) {
  const left = variant.left ?? 'notch';
  const right = variant.right ?? 'tab';
  const tabY1 = (H - th) / 2;
  const tabY2 = (H + th) / 2;
  const parts: string[] = [];
  parts.push(`M ${r} 0`);
  parts.push(`H ${W - r}`);
  parts.push(`Q ${W} 0 ${W} ${r}`);
  if (right === 'tab') {
    parts.push(`V ${tabY1}`);
    parts.push(`L ${W + td} ${tabY1 + 4}`);
    parts.push(`L ${W + td} ${tabY2 - 4}`);
    parts.push(`L ${W} ${tabY2}`);
    parts.push(`V ${H - r}`);
  } else {
    parts.push(`V ${H - r}`);
  }
  parts.push(`Q ${W} ${H} ${W - r} ${H}`);
  parts.push(`H ${r}`);
  parts.push(`Q 0 ${H} 0 ${H - r}`);
  if (left === 'notch') {
    parts.push(`V ${tabY2}`);
    parts.push(`L ${td} ${tabY2 - 4}`);
    parts.push(`L ${td} ${tabY1 + 4}`);
    parts.push(`L 0 ${tabY1}`);
    parts.push(`V ${r}`);
  } else {
    parts.push(`V ${r}`);
  }
  parts.push(`Q 0 0 ${r} 0`);
  parts.push('Z');
  return parts.join(' ');
}

// Mini-slider tuned to fit inside the block's inner content area. No floating
// chip overlapping it — the param-count indicator lives inline with the label.
const MiniSlider = ({
  label, value, animated, paramCount,
}: { label: string; value: number; animated?: boolean; paramCount?: number }) => {
  const [t, setT] = useState(value);
  useEffect(() => {
    if (!animated) return;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const dt = (performance.now() - start) / 1000;
      setT(0.5 + 0.45 * Math.sin(dt * 1.7));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [animated]);
  const v = animated ? t : value;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <span
        style={{
          font: `700 9px ${TYPE.bodyMono}`, color: SHADE.textDim,
          textTransform: 'uppercase', letterSpacing: '0.14em',
          flex: '0 0 auto',
        }}
      >
        {label}
        {paramCount != null && paramCount > 1 && (
          <span style={{ marginLeft: 4, color: SHADE.textFaint, letterSpacing: 0 }}>
            ·{paramCount}
          </span>
        )}
      </span>
      <div
        style={{
          position: 'relative', flex: 1, height: 5,
          background: SHADE.surface3,
          border: `1px solid ${SHADE.border}`,
          borderRadius: 1,
        }}
      >
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: SHADE.border }} />
        <div
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${v * 100}%`,
            background: animated ? SHADE.ember : SHADE.inkLine,
            borderTopLeftRadius: 1, borderBottomLeftRadius: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${v * 100}% - 4px)`, top: -3,
            width: 8, height: 10,
            background: SHADE.surface1,
            border: `1.5px solid ${animated ? SHADE.ember : SHADE.inkLine}`,
            borderRadius: 1,
          }}
        />
      </div>
    </div>
  );
};

const WildcardMini = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span
      style={{
        font: `700 9px ${TYPE.bodyMono}`, color: SHADE.textDim,
        textTransform: 'uppercase', letterSpacing: '0.14em',
      }}
    >
      Custom GLSL
    </span>
    <span style={{ marginLeft: 'auto', font: `700 9px ${TYPE.bodyMono}`, color: SHADE.ember }}>
      {'</>'}
    </span>
  </div>
);

const MiniSwatches = ({ values }: { values: string[] }) => (
  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
    {values.map((c, i) => (
      <div
        key={i}
        style={{
          width: 14, height: 10, borderRadius: 1,
          background: c,
          boxShadow: `inset 0 0 0 1px ${SHADE.inkLine}55`,
        }}
      />
    ))}
  </div>
);

const renderMini = (mini: BlockMini, isAnimated: boolean, paramCount?: number) => {
  if (mini.kind === 'slider') {
    return <MiniSlider label={mini.label} value={mini.value} animated={isAnimated} paramCount={paramCount} />;
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ font: `700 9px ${TYPE.bodyMono}`, color: SHADE.textDim, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
        palette
        {paramCount != null && paramCount > 1 && (
          <span style={{ marginLeft: 4, color: SHADE.textFaint, letterSpacing: 0 }}>·{paramCount}</span>
        )}
      </span>
      <MiniSwatches values={mini.values} />
    </div>
  );
};

export type BlockProps = {
  id: string;
  block: BlockDef;
  selected?: boolean;
  snapTarget?: boolean;
  dragging?: boolean;
  variant?: BlockVariant;
  animated?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onDoubleClick?: MouseEventHandler<HTMLDivElement>;
  /** Active-params count shown as a "+N" chip when > 1 */
  paramCount?: number;
  /** Live card from the recipe — when provided, the in-block mini reflects the
   *  card's current first-param value rather than the BlockDef default. */
  card?: Card;
  // ─── drag-and-drop chain reordering ──────────────────────────────────
  /** Makes the block draggable in the chain. */
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDragLeave?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
  /** Visual states driven by the parent's drag tracking. */
  isDragSource?: boolean;
  dropIndicator?: 'left' | 'right' | null;
  // ─── portal indicator (chain wrap) ───────────────────────────────────
  /** When the chain wraps, the rightmost block of a row gets a colored
   *  "exit" portal and the leftmost block of the next row gets a matching
   *  "entry" portal — same color pairs the two sides of the connection
   *  visually. */
  portalSide?: 'exit' | 'enter' | null;
  portalColor?: string | null;
};

export const Block = ({
  id, block, selected = false, snapTarget = false, dragging = false,
  variant = {}, animated, onClick, onDoubleClick, paramCount = 1, card,
  draggable, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  isDragSource = false, dropIndicator = null,
  portalSide = null, portalColor = null,
}: BlockProps) => {
  const cat = CATEGORIES[block.cat];
  const path = blockPath(BLOCK_W, BLOCK_H, TAB, TAB_H, RADIUS, variant);
  const totalW = BLOCK_W + (variant.right === 'flat' ? 0 : TAB);
  const sliderAnimated = block.mini.kind === 'slider' ? block.mini.animated : undefined;
  const isAnimated = animated ?? sliderAnimated ?? false;

  // Wildcard card → show a code badge as the mini, ignoring BlockDef.mini.
  const isWildcard = card?.kind === 'wildcard';
  const liveMini: BlockMini = (() => {
    if (!card || card.kind !== 'typed') return block.mini;
    const def = lookupCardDef(card.type);
    if (!def) return block.mini;
    return miniForCard(def, card);
  })();

  // ─── pulse on param updates ─────────────────────────────────────────
  // Subscribing parents pass the live `card` — when its params object
  // identity changes (any value tick), flash the border. Skip the very
  // first mount via the ref guard so loading a recipe doesn't fire 12
  // pulses at once.
  const [pulseAt, setPulseAt] = useState(0);
  const lastParamsRef = useRef<unknown>(card?.kind === 'typed' ? card.params : null);
  const mountedRef = useRef(false);
  useEffect(() => {
    const next = card?.kind === 'typed' ? card.params : null;
    if (!mountedRef.current) {
      mountedRef.current = true;
      lastParamsRef.current = next;
      return;
    }
    if (next !== lastParamsRef.current) {
      lastParamsRef.current = next;
      setPulseAt(Date.now());
    }
  }, [card?.kind === 'typed' ? card.params : null]);
  const pulseActive = pulseAt !== 0 && Date.now() - pulseAt < 220;
  useEffect(() => {
    if (!pulseActive) return;
    const t = window.setTimeout(() => setPulseAt(0), 220);
    return () => window.clearTimeout(t);
  }, [pulseAt, pulseActive]);

  const fill = SHADE.surface1;
  const baseStroke = selected ? SHADE.inkLine : SHADE.border;
  const stroke = pulseActive ? SHADE.ember : baseStroke;
  const strokeWidth = selected || pulseActive ? 1.6 : 1;

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: totalW, height: BLOCK_H,
    flex: '0 0 auto',
    cursor: draggable ? 'grab' : 'pointer',
    transform: dragging ? 'scale(1.04)' : 'none',
    transition: 'transform 220ms cubic-bezier(.2,.7,.2,1.2)',
    opacity: isDragSource ? 0.5 : 1,
  };

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={containerStyle}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {dropIndicator === 'left' && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: -2, top: 4, bottom: 4, width: 0,
            borderLeft: `4px dashed ${SHADE.ember}`,
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
      )}
      {dropIndicator === 'right' && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: -2, top: 4, bottom: 4, width: 0,
            borderRight: `4px dashed ${SHADE.ember}`,
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
      )}
      {portalSide === 'exit' && portalColor && (
        // Outgoing portal — a horizontal colour streak that fades OUT past
        // the right edge of this block. The matching block on the next row
        // has a mirrored fade-IN streak in the same colour, so the eye
        // reads them as one continuous trail that crossed the row break.
        <div
          aria-hidden
          title="chain continues on the next row → same colour fades back in on the other side"
          style={{
            position: 'absolute',
            right: -56, top: '50%', transform: 'translateY(-50%)',
            width: 56, height: 3,
            background: `linear-gradient(90deg, ${portalColor} 0%, ${portalColor}cc 35%, ${portalColor}55 70%, ${portalColor}00 100%)`,
            pointerEvents: 'none', zIndex: 4,
          }}
        />
      )}
      {portalSide === 'enter' && portalColor && (
        // Incoming portal — the trail emerges from the left of this block,
        // matching the same colour that faded out of the previous row.
        <div
          aria-hidden
          title="continued from the previous row's exit portal of the same colour"
          style={{
            position: 'absolute',
            left: -56, top: '50%', transform: 'translateY(-50%)',
            width: 56, height: 3,
            background: `linear-gradient(90deg, ${portalColor}00 0%, ${portalColor}55 30%, ${portalColor}cc 65%, ${portalColor} 100%)`,
            pointerEvents: 'none', zIndex: 4,
          }}
        />
      )}
      <svg
        width={totalW + 2} height={BLOCK_H + 2}
        viewBox={`-1 -1 ${totalW + 2} ${BLOCK_H + 2}`}
        style={{ position: 'absolute', inset: '-1px 0 0 0', overflow: 'visible', pointerEvents: 'none' }}
      >
        <path
          d={path} fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          style={{ transition: 'stroke 200ms ease-out, stroke-width 200ms ease-out' }}
        />
        <clipPath id={`clip-${id}`}>
          <path d={path} />
        </clipPath>
        <rect x="0" y="0" width={BLOCK_W} height="4" fill={cat.color} clipPath={`url(#clip-${id})`} />
        {snapTarget && (
          <path d={path} fill="none" stroke={SHADE.ember} strokeWidth="2" />
        )}
      </svg>

      <div
        style={{
          position: 'absolute',
          left: TAB + 11, right: 10,
          top: 9, bottom: 8,
          display: 'flex', flexDirection: 'column',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <div
            style={{
              width: 22, height: 22, borderRadius: 3,
              background: `${cat.color}1c`,
              border: `1px solid ${cat.color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flex: '0 0 auto',
            }}
          >
            <Icon name={block.icon} size={13} color={cat.color} />
          </div>
          <span
            style={{
              font: `600 11.5px ${TYPE.body}`,
              color: SHADE.text,
              letterSpacing: '0.04em',
            }}
          >
            {block.name}
          </span>
          {isAnimated && (
            <span
              style={{
                marginLeft: 'auto',
                font: `600 8.5px ${TYPE.bodyMono}`,
                color: SHADE.ember,
                letterSpacing: '0.16em',
              }}
            >
              ANIM
            </span>
          )}
        </div>
        {/* mini slider — full inner width; param count lives inline with the label */}
        <div style={{ marginTop: 'auto', marginBottom: 4 }}>
          {isWildcard
            ? <WildcardMini />
            : renderMini(liveMini, isAnimated, paramCount)}
        </div>
      </div>
    </div>
  );
};
