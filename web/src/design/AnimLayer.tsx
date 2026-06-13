// AnimLayer — renders custom-animation chains on the composer canvas.
//
// Anim blocks reuse the SAME building blocks as 2D/3D blocks: the <Block>
// component (just a cyan 'anim' species + a round connector so they only mate
// with their own kind) and the free-canvas-layout helpers (adjacency → variant,
// readingOrder → fold order). This file is thin glue: positioning + drag +
// the anim-specific link lines / output binding. Params are edited in the right
// inspector, exactly like composer blocks (select → onSelectAnim).

import React, { useEffect, useRef, useState } from 'react';

import { lookupCardDef, useCardsStore } from '@/cards';
import type { AnimBlock, Card } from '@/cards';
import { Block, BLOCK_H } from './Block';
import { animBlockToBlockDef } from './card-adapter';
import { BW, SNAP_X, rightChildMap, leftParentMap, type Placed as LayoutPlaced } from './free-canvas-layout';
import { useCanvasDrag } from './useCanvasDrag';
import { SHADE, TYPE } from './tokens';

type XY = { x: number; y: number };

const ORIGIN_X = 80;
const ROW_Y0 = 360; // first chain's default row (below the composer blocks)
const ROW_STEP = 150;

/** Link line meets a driven composer block at its bottom edge, centred. */
const cardAnchor = (p: XY): XY => ({ x: p.x + BW / 2, y: p.y + BLOCK_H });

export function AnimLayer({
  cards, cardBox, pos, setPos, screenToWorld, selectedIds, onSelectAnim,
}: {
  cards: Card[];
  cardBox: (id: string) => XY | null;
  pos: Record<string, XY>;
  setPos: React.Dispatch<React.SetStateAction<Record<string, XY>>>;
  screenToWorld: (cx: number, cy: number) => XY;
  selectedIds: ReadonlySet<string>;
  onSelectAnim: (blockId: string | null) => void;
}) {
  const chains = useCardsStore((s) => s.recipe.animations) ?? [];
  const setAnimChainsFromRuns = useCardsStore((s) => s.setAnimChainsFromRuns);
  const bindParamToAnimation = useCardsStore((s) => s.bindParamToAnimation);

  const defPos = (ci: number, bi: number): XY => ({ x: ORIGIN_X + bi * BW, y: ROW_Y0 + ci * ROW_STEP });

  type APlaced = { id: string; block: AnimBlock; chainId: string; ci: number; bi: number; isTail: boolean; p: XY };
  const placed: APlaced[] = chains.flatMap((ch, ci) => ch.blocks.map((block, bi) => ({
    id: block.id, block, chainId: ch.id, ci, bi,
    isTail: bi === ch.blocks.length - 1,
    p: pos[block.id] ?? defPos(ci, bi),
  })));

  // Persist default positions into the shared map so drag/snap know them.
  useEffect(() => {
    setPos((pp) => {
      let changed = false;
      const next = { ...pp };
      chains.forEach((ch, ci) => ch.blocks.forEach((b, bi) => {
        if (next[b.id] == null) { next[b.id] = { x: ORIGIN_X + bi * BW, y: ROW_Y0 + ci * ROW_STEP }; changed = true; }
      }));
      return changed ? next : pp;
    });
  }, [chains, setPos]);

  // Adjacency → notch/tab variant, using the SAME pure logic as composer blocks.
  const layout: LayoutPlaced[] = placed.map((a) => ({ id: a.id, x: a.p.x, y: a.p.y }));
  const rightChild = rightChildMap(layout);
  const leftParent = leftParentMap(layout, rightChild);

  // ── block drag — the UNIFIED canvas-drag (run-selection + snap + regroup),
  //    shared with composer blocks via useCanvasDrag. The anim adapter routes
  //    'open' → select and the dropped RUNS straight to setAnimChainsFromRuns
  //    (an unsnapped block = its own animation; snapping merges). ──
  const [draggingIds, setDraggingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [snapId, setSnapId] = useState<string | null>(null);
  const drag = useCanvasDrag({
    currentItems: () => placed.map((a) => ({ id: a.id, x: a.p.x, y: a.p.y })),
    config: { snapTol: SNAP_X * 2.2, doubleClick: 'select' },
    screenToWorld,
    onSetPositions: (positions) => setPos((pp) => ({ ...pp, ...positions })),
    onSnapHint: setSnapId,
    onDraggingChange: (ids) => setDraggingIds(new Set(ids)),
    onSelect: onSelectAnim,
    onReorder: ({ runs }) => setAnimChainsFromRuns(runs),
  });

  // ── output-dot drag → bind a composer block's first float param ──
  // The first animatable (float) param of a card, with its label, or null.
  const bindTargetOf = (card: Card): { key: string; label: string } | null => {
    if (card.kind !== 'typed') return null;
    const def = lookupCardDef(card.type);
    const entry = def && Object.entries(def.params).find(([, pd]) => pd.kind === 'float');
    return entry ? { key: entry[0], label: entry[1].label } : null;
  };
  const cardUnder = (w: XY): { card: Card; box: XY } | null => {
    for (const c of cards) {
      const box = cardBox(c.id);
      if (box && w.x >= box.x && w.x <= box.x + BW && w.y >= box.y && w.y <= box.y + BLOCK_H) return { card: c, box };
    }
    return null;
  };

  const bindRef = useRef<{ chainId: string } | null>(null);
  const [bindLine, setBindLine] = useState<{ from: XY; to: XY } | null>(null);
  // The candidate block currently under the dragged edge (drives the highlight,
  // the lock-on line, and the "→ drive <slider>" hint).
  const [bindHover, setBindHover] = useState<{ cardId: string; box: XY; label: string } | null>(null);
  const onDotDown = (chainId: string, from: XY) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* noop */ }
    bindRef.current = { chainId };
    setBindLine({ from, to: from });
  };
  const onDotMove = (from: XY) => (e: React.PointerEvent) => {
    if (!bindRef.current) return;
    const w = screenToWorld(e.clientX, e.clientY);
    const under = cardUnder(w);
    const target = under ? bindTargetOf(under.card) : null;
    if (under && target) {
      setBindHover({ cardId: under.card.id, box: under.box, label: target.label });
      setBindLine({ from, to: cardAnchor(under.box) }); // lock onto the block
    } else {
      setBindHover(null);
      setBindLine({ from, to: w });
    }
  };
  const onDotUp = () => {
    const b = bindRef.current; if (!b) return;
    bindRef.current = null;
    const hover = bindHover;
    setBindLine(null);
    setBindHover(null);
    if (!hover) return;
    const card = cards.find((c) => c.id === hover.cardId);
    const target = card ? bindTargetOf(card) : null;
    if (card && target) bindParamToAnimation(card.id, target.key, b.chainId);
  };

  // Driven composer blocks per chain (for the link lines + badges).
  const drivenByChain = new Map<string, string[]>();
  for (const c of cards) {
    if (c.kind !== 'typed') continue;
    for (const p of Object.values(c.params)) {
      if (p?.animation?.type === 'custom') {
        const list = drivenByChain.get(p.animation.ref) ?? [];
        if (!list.includes(c.id)) list.push(c.id);
        drivenByChain.set(p.animation.ref, list);
      }
    }
  }

  // Chain tail (rightmost block) → top-centre = output dot + link origin.
  const tailTop = (ci: number, chainId: string): { tail: XY; block: AnimBlock } | null => {
    const chain = chains.find((c) => c.id === chainId);
    if (!chain || chain.blocks.length === 0) return null;
    const ps = chain.blocks.map((b, i) => ({ b, p: pos[b.id] ?? defPos(ci, i) }));
    const t = ps.reduce((acc, cur) => (cur.p.x > acc.p.x ? cur : acc), ps[0]!);
    return { tail: { x: t.p.x + BW / 2, y: t.p.y }, block: t.b };
  };

  const links: Array<{ from: XY; to: XY; key: string }> = [];
  const badges: XY[] = [];
  const dots: Array<{ chainId: string; p: XY }> = [];
  chains.forEach((chain, ci) => {
    const tt = tailTop(ci, chain.id);
    if (!tt) return;
    dots.push({ chainId: chain.id, p: tt.tail });
    for (const cardId of drivenByChain.get(chain.id) ?? []) {
      const box = cardBox(cardId);
      if (!box) continue;
      links.push({ from: tt.tail, to: cardAnchor(box), key: `${chain.id}->${cardId}` });
      badges.push({ x: box.x + BW / 2 - 6, y: box.y + BLOCK_H - 6 });
    }
  });

  return (
    <>
      {/* link lines + drag-bind rubber band (behind the blocks) */}
      <svg width={4000} height={3000} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 0, overflow: 'visible' }} aria-hidden>
        {links.map((l) => {
          const my = (l.from.y + l.to.y) / 2;
          return <path key={l.key} d={`M ${l.from.x} ${l.from.y} C ${l.from.x} ${my}, ${l.to.x} ${my}, ${l.to.x} ${l.to.y}`}
            fill="none" stroke={SHADE.anim} strokeWidth={1.6} strokeOpacity={0.85} />;
        })}
        {bindLine && (() => {
          const my = (bindLine.from.y + bindLine.to.y) / 2;
          const d = `M ${bindLine.from.x} ${bindLine.from.y} C ${bindLine.from.x} ${my}, ${bindLine.to.x} ${my}, ${bindLine.to.x} ${bindLine.to.y}`;
          return <path d={d} fill="none" stroke={SHADE.anim} strokeWidth={bindHover ? 2.4 : 1.8} strokeDasharray={bindHover ? undefined : '5 5'} strokeLinecap="round" />;
        })()}
        {bindLine && bindHover && <circle cx={bindLine.to.x} cy={bindLine.to.y} r={5} fill={SHADE.anim} />}
      </svg>

      {/* drag-to-bind candidate highlight + "drive <slider>" hint */}
      {bindHover && (
        <>
          <div aria-hidden style={{ position: 'absolute', left: bindHover.box.x - 3, top: bindHover.box.y - 3, width: BW + 6, height: BLOCK_H + 6, borderRadius: 11, border: `2px solid ${SHADE.anim}`, background: `${SHADE.anim}14`, boxShadow: `0 0 0 3px ${SHADE.anim}22`, zIndex: 6, pointerEvents: 'none' }} />
          <div aria-hidden style={{ position: 'absolute', left: bindHover.box.x + BW / 2, top: bindHover.box.y + BLOCK_H + 9, transform: 'translateX(-50%)', zIndex: 6, pointerEvents: 'none', whiteSpace: 'nowrap', padding: '3px 9px', borderRadius: 12, background: SHADE.anim, color: '#fff', font: `700 10px ${TYPE.body}`, letterSpacing: '0.02em' }}>drive {bindHover.label}</div>
        </>
      )}

      {/* bottom-centre badge on driven composer blocks */}
      {badges.map((b, i) => (
        <div key={`badge-${i}`} aria-hidden title="driven by a custom animation"
          style={{ position: 'absolute', left: b.x, top: b.y, width: 13, height: 13, borderRadius: 7, zIndex: 3, background: SHADE.anim, border: `1.5px solid ${SHADE.surface1}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M3 12q3-6 6 0t6 0 6 0" /></svg>
        </div>
      ))}

      {/* anim chain name tags */}
      {chains.map((chain, ci) => {
        const head = chain.blocks[0] ? (pos[chain.blocks[0]!.id] ?? defPos(ci, 0)) : null;
        if (!head) return null;
        return (
          <div key={`tag-${chain.id}`} style={{ position: 'absolute', left: head.x, top: head.y - 19, zIndex: 4, font: `700 10px ${TYPE.body}`, letterSpacing: '0.05em', color: SHADE.animDeep, textTransform: 'uppercase', pointerEvents: 'none' }}>{chain.name}</div>
        );
      })}

      {/* the blocks — rendered through the real <Block> component */}
      {placed.map((a) => {
        const def = animBlockToBlockDef(a.block);
        const variant = { left: (leftParent[a.id] ? 'notch' : 'flat') as 'notch' | 'flat', right: (rightChild[a.id] ? 'tab' : 'flat') as 'tab' | 'flat' };
        return (
          <div key={a.id} style={{ position: 'absolute', left: a.p.x, top: a.p.y, zIndex: draggingIds.has(a.id) ? 60 : 1, cursor: 'grab', touchAction: 'none' }}
            onPointerDown={drag.onPointerDown(a.id)} onPointerMove={drag.onPointerMove} onPointerUp={drag.onPointerUp}>
            <Block id={a.id} block={def} accent={SHADE.anim} connector="round" variant={variant}
              selected={selectedIds.has(a.id)} snapTarget={snapId === a.id} dragging={draggingIds.has(a.id)} />
          </div>
        );
      })}

      {/* output dots on each chain's tail block (top-centre); drag onto a block to bind */}
      {dots.map((d) => (
        <div key={`dot-${d.chainId}`} title="Drag onto a block to drive its first slider"
          onPointerDown={onDotDown(d.chainId, d.p)} onPointerMove={onDotMove(d.p)} onPointerUp={onDotUp}
          style={{ position: 'absolute', left: d.p.x - 6.5, top: d.p.y - 6.5, width: 13, height: 13, borderRadius: 7, background: SHADE.anim, border: `2px solid ${SHADE.surface1}`, cursor: 'crosshair', touchAction: 'none', zIndex: 5 }} />
      ))}
    </>
  );
}
