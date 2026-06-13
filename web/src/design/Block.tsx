import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, DragEventHandler, MouseEventHandler } from 'react';
import type { Card } from '@/cards';
import { CATEGORIES, SHADE, TYPE } from './tokens';
import type { BlockDef } from './tokens';
import { Icon } from './icons';
import { MacroIcon } from './macro-icons';

export const BLOCK_W = 168;
export const BLOCK_H = 96;
export const TAB = 9;
const TAB_H = 26;
const RADIUS = 5;

export type BlockEdge = 'flat' | 'notch' | 'tab';
export type BlockVariant = { left?: BlockEdge; right?: BlockEdge };

/** The puzzle silhouette. `connector` picks the tab/notch SHAPE so different
 *  block species read as distinct AND can't visually mate across species:
 *   - 'classic' — the trapezoidal tab used by 2D/3D/reroute/macro blocks
 *   - 'round'   — a semicircular tab/notch, used by animation blocks */
export type BlockConnector = 'classic' | 'round';
export function blockPath(W = BLOCK_W, H = BLOCK_H, td = TAB, th = TAB_H, r = RADIUS, variant: BlockVariant = {}, connector: BlockConnector = 'classic') {
  const left = variant.left ?? 'notch';
  const right = variant.right ?? 'tab';
  const tabY1 = (H - th) / 2;
  const tabY2 = (H + th) / 2;
  const ry = th / 2;
  const parts: string[] = [];
  parts.push(`M ${r} 0`);
  parts.push(`H ${W - r}`);
  parts.push(`Q ${W} 0 ${W} ${r}`);
  if (right === 'tab') {
    parts.push(`V ${tabY1}`);
    if (connector === 'round') parts.push(`A ${td} ${ry} 0 0 1 ${W} ${tabY2}`); // bulge right
    else parts.push(`L ${W + td} ${tabY1 + 4}`, `L ${W + td} ${tabY2 - 4}`, `L ${W} ${tabY2}`);
    parts.push(`V ${H - r}`);
  } else {
    parts.push(`V ${H - r}`);
  }
  parts.push(`Q ${W} ${H} ${W - r} ${H}`);
  parts.push(`H ${r}`);
  parts.push(`Q 0 ${H} 0 ${H - r}`);
  if (left === 'notch') {
    parts.push(`V ${tabY2}`);
    if (connector === 'round') parts.push(`A ${td} ${ry} 0 0 0 0 ${tabY1}`); // bite in (mirror of the tab)
    else parts.push(`L ${td} ${tabY2 - 4}`, `L ${td} ${tabY1 + 4}`, `L 0 ${tabY1}`);
    parts.push(`V ${r}`);
  } else {
    parts.push(`V ${r}`);
  }
  parts.push(`Q 0 0 ${r} 0`);
  parts.push('Z');
  return parts.join(' ');
}

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
  /** Live card from the recipe — drives the ANIM badge + the param pulse. */
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
  /** This block is pinned in the preview (F-lock) — shows a gold padlock. */
  locked?: boolean;
  /** Override the category colour to render a distinct block SPECIES (e.g.
   *  animation blocks in cyan). When set, the block chrome uses this colour. */
  accent?: string;
  /** Connector silhouette — 'round' marks a species (animation blocks) whose
   *  tabs/notches only mate with their own kind. Defaults to 'classic'. */
  connector?: BlockConnector;
};

export const Block = ({
  id, block, selected = false, snapTarget = false, dragging = false,
  variant = {}, animated, onClick, onDoubleClick, card,
  draggable, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  isDragSource = false, dropIndicator = null,
  portalSide = null, portalColor = null, locked = false,
  accent, connector = 'classic',
}: BlockProps) => {
  const cat = CATEGORIES[block.cat];
  const accentColor = accent ?? cat.color;
  // Named reroute → render as a distinctive bold name banner (same silhouette,
  // so it still snaps) instead of the icon + mini layout. `name` is the live
  // `name`/`ref` text param; declaration = filled teal, usage = teal outline.
  const rr = card?.kind === 'typed' && (card.type === 'reroute_decl' || card.type === 'reroute_use')
    ? {
        isDecl: card.type === 'reroute_decl',
        name: String(
          (card.type === 'reroute_decl' ? card.params.name?.value : card.params.ref?.value) ?? '',
        ) || '—',
      }
    : null;
  // Macro ("function" block) → indigo banner with the macro name + sub-count.
  const mc = card?.kind === 'typed' && card.type === 'macro'
    ? { name: card.macro?.name || 'Macro', count: card.macro?.blocks.length ?? 0, icon: card.macro?.icon }
    : null;
  const path = blockPath(BLOCK_W, BLOCK_H, TAB, TAB_H, RADIUS, variant, connector);
  const totalW = BLOCK_W + (variant.right === 'flat' ? 0 : TAB);
  // A real per-param animation lights up the block's ANIM badge.
  const hasAnimatedParam = card?.kind === 'typed'
    && Object.values(card.params).some((p) => p?.animation != null);
  const isAnimated = hasAnimatedParam || (animated ?? false);

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

  const fill = rr ? (rr.isDecl ? SHADE.reroute : SHADE.surface1) : mc ? SHADE.macro : SHADE.surface1;
  const baseStroke = rr ? SHADE.rerouteDeep : mc ? SHADE.macroDeep : accent ? accent : selected ? SHADE.inkLine : SHADE.border;
  const stroke = locked ? SHADE.gold : pulseActive ? SHADE.ember : baseStroke;
  const strokeWidth = locked ? 2 : (rr || mc) ? 2 : accent ? 1.5 : selected || pulseActive ? 1.6 : 1;

  // CSS width = BLOCK_W only. The tab (right protrusion) is part of the SVG
  // path which has overflow:visible, so it bleeds past the container's CSS
  // box into the next block's notch area. Result: adjacent blocks visually
  // INTERLOCK like puzzle pieces instead of sitting in their own bounding
  // boxes with the tab floating in dead space between them.
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: BLOCK_W, height: BLOCK_H,
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
      {locked && (
        <div
          aria-hidden
          title="Locked in preview (press F to unlock)"
          style={{
            position: 'absolute', right: 8, top: 8, zIndex: 4,
            width: 16, height: 16, borderRadius: 4,
            background: SHADE.gold,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="9" height="10" viewBox="0 0 24 24" fill="none" stroke="#1a1208" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
      )}
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
        <rect x="0" y="0" width={BLOCK_W} height="4" fill={rr ? SHADE.rerouteDeep : mc ? SHADE.macroDeep : accentColor} clipPath={`url(#clip-${id})`} />
        {snapTarget && (
          <path d={path} fill="none" stroke={SHADE.ember} strokeWidth="2" />
        )}
      </svg>

      {rr ? (
        <div
          style={{
            position: 'absolute', inset: 0, paddingLeft: TAB + 6, paddingRight: 8,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, pointerEvents: 'none',
          }}
        >
          <span
            style={{
              font: `700 8px ${TYPE.bodyMono}`, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: rr.isDecl ? `${SHADE.cream}cc` : SHADE.reroute,
            }}
          >
            {rr.isDecl ? 'Reroute' : 'Use'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, maxWidth: '100%' }}>
            <span style={{ font: `700 16px ${TYPE.body}`, lineHeight: 1, flex: '0 0 auto', color: rr.isDecl ? SHADE.cream : SHADE.reroute }}>
              {rr.isDecl ? '⤺' : '⤻'}
            </span>
            <span
              style={{
                font: `800 15px ${TYPE.body}`, letterSpacing: '0.02em',
                color: rr.isDecl ? SHADE.cream : SHADE.rerouteDeep,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {rr.name}
            </span>
          </div>
        </div>
      ) : mc ? (
        <div
          style={{
            position: 'absolute', inset: 0, paddingLeft: TAB + 6, paddingRight: 8,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, pointerEvents: 'none',
          }}
        >
          <span style={{ font: `700 8px ${TYPE.bodyMono}`, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${SHADE.cream}cc` }}>
            Macro · {mc.count}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, maxWidth: '100%' }}>
            <span style={{ display: 'flex', alignItems: 'center', lineHeight: 0, flex: '0 0 auto' }}><MacroIcon name={mc.icon} size={16} color={SHADE.cream} strokeWidth={2} /></span>
            <span style={{ font: `800 15px ${TYPE.body}`, letterSpacing: '0.02em', color: SHADE.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {mc.name}
            </span>
          </div>
        </div>
      ) : (
      <div
        style={{
          position: 'absolute',
          left: TAB + 11, right: 10,
          top: 9, bottom: 8,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Block face = icon + name only. Params are edited in the right
            inspector, never exposed as sliders on the block. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22, height: 22, borderRadius: 3,
              background: `${accentColor}1c`,
              border: `1px solid ${accentColor}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flex: '0 0 auto',
            }}
          >
            <Icon name={block.icon} size={13} color={accentColor} />
          </div>
          <span
            style={{
              font: `600 11.5px ${TYPE.body}`,
              color: SHADE.text,
              letterSpacing: '0.04em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {block.name}
          </span>
          {isAnimated && (
            <span
              title="This block has animated parameters"
              style={{
                marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3,
                font: `700 8px ${TYPE.bodyMono}`,
                color: SHADE.ember, letterSpacing: '0.16em',
                padding: '1px 5px', borderRadius: 3,
                background: `${SHADE.ember}1c`, border: `1px solid ${SHADE.ember}40`,
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={SHADE.ember} strokeWidth="2.4" strokeLinecap="round"><path d="M3 12q3-6 6 0t6 0 6 0" /></svg>
              ANIM
            </span>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
