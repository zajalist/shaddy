// Desktop app shell — wired to the real cards store + WebGL renderer.
//
// The chain is recipe.cards from useCardsStore. Selecting a block is local UI
// state (an index into recipe.cards). Param changes flow through
// updateParamValue → compile → RecipeCanvas → renderer.setUniform. Structural
// changes (insert/remove/reorder) recompile the shader via the same hook.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import {
  BUFFER_PASS_IDS,
  cardForLine,
  cloneRecipeWithFreshIds,
  compile,
  getPassCards,
  lookupCardDef,
  STARTER_RECIPES,
  resolveExportSize,
  useCardsStore,
  type AnimBlock,
  type Card,
  type PassId,
  type Recipe,
  type Span,
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
  Palette, TopBar, TogglePill, PALETTE_DND_MIME,
} from './components';
import { AnimLayer } from './AnimLayer';
import { saveMacro, getMacros } from './macro-prefs';
import { decodeRecipeFromHash } from './recipe-url';
import { useCanvasDrag } from './useCanvasDrag';
import {
  BW, SNAP_X, SNAP_Y,
  rightChildMap, leftParentMap, readingOrder,
  type Placed as LayoutPlaced,
} from './free-canvas-layout';
import { PropertiesPanel, DK, type RightTab } from './Properties';
import { RecipeCanvas, type RecipeCanvasHandle } from './RecipeCanvas';

const DEFAULT_STARTER_ID = 'sunset';

// ─── Canvas zoom HUD (bottom-right pill) ─────────────────────────────────
const ZoomBtn = ({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    style={{
      width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent',
      cursor: 'pointer', color: SHADE.textDim,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      font: `600 16px ${TYPE.body}`, lineHeight: 1,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = SHADE.surface3)}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    {children}
  </button>
);
const annotateBtnStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  height: 26, padding: '0 10px', borderRadius: 6, border: 'none', background: 'transparent',
  cursor: 'pointer', color: SHADE.textDim,
  font: `600 10.5px ${TYPE.body}`, letterSpacing: '0.04em',
};
const FitGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9V5a1 1 0 0 1 1-1h4 M20 9V5a1 1 0 0 0-1-1h-4 M4 15v4a1 1 0 0 0 1 1h4 M20 15v4a1 1 0 0 1-1 1h-4" />
  </svg>
);
const RecenterGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
    <circle cx="12" cy="12" r="3.2" /><path d="M12 3v3 M12 18v3 M3 12h3 M18 12h3" />
  </svg>
);

// Comment/post-it resize handles — 4 edges + 4 corners, UE5-style. Edges are
// thin invisible hit strips; corners are visible little grips. Positions are
// relative to the note box (which is position:absolute at the note's x/y).
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const NOTE_HANDLES: Array<{ h: ResizeHandle; cursor: string; corner: boolean; style: CSSProperties }> = [
  { h: 'n', cursor: 'ns-resize', corner: false, style: { left: 10, right: 10, top: -4, height: 8 } },
  { h: 's', cursor: 'ns-resize', corner: false, style: { left: 10, right: 10, bottom: -4, height: 8 } },
  { h: 'e', cursor: 'ew-resize', corner: false, style: { top: 10, bottom: 10, right: -4, width: 8 } },
  { h: 'w', cursor: 'ew-resize', corner: false, style: { top: 10, bottom: 10, left: -4, width: 8 } },
  { h: 'nw', cursor: 'nwse-resize', corner: true, style: { left: -5, top: -5, width: 11, height: 11 } },
  { h: 'ne', cursor: 'nesw-resize', corner: true, style: { right: -5, top: -5, width: 11, height: 11 } },
  { h: 'sw', cursor: 'nesw-resize', corner: true, style: { left: -5, bottom: -5, width: 11, height: 11 } },
  { h: 'se', cursor: 'nwse-resize', corner: true, style: { right: -5, bottom: -5, width: 11, height: 11 } },
];

// Auto-growing comment title — wraps to multiple lines and grows the header
// (which is anchored above the box, so it expands upward, UE5-style) instead of
// clipping. A textarea sized to its content via scrollHeight.
const CommentTitle = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => { const el = ref.current; if (el) { el.style.height = '0px'; el.style.height = `${el.scrollHeight}px`; } };
  useEffect(fit, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      placeholder="Comment"
      onChange={(e) => onChange(e.target.value)}
      onInput={fit}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        flex: 1, minWidth: 90, maxWidth: 320, resize: 'none', overflow: 'hidden',
        background: 'transparent', border: 'none', outline: 'none',
        font: `700 11px ${TYPE.body}`, color: SHADE.text, letterSpacing: '0.04em',
        lineHeight: 1.3, padding: 0, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}
    />
  );
};

const Chain = ({
  items, selectedIds, onSelect, onOpen, onSetOrder, onInsertCard, onAddReroute, onSelectIds, onMakeMacro, lockedId = null,
}: {
  items: Card[];
  /** Multi-selection — every card whose id is in this set renders selected. */
  selectedIds: ReadonlySet<string>;
  /** The F-locked (pinned-in-preview) card id — that block shows a padlock. */
  lockedId?: string | null;
  /** Called on click; `mode` indicates how the click should affect selection. */
  onSelect?: (i: number, mode: 'replace' | 'toggle') => void;
  onOpen?: (i: number) => void;
  /** Reorder the recipe to this id sequence (free-move canvas → reading order). */
  onSetOrder?: (orderedIds: string[]) => void;
  /** Insert a library card by type, returning its new id (for palette drops). */
  onInsertCard?: (type: string, atIndex?: number) => string | null;
  /** Insert a named reroute declaration at an index, returning its new id. */
  onAddReroute?: (name: string, atIndex: number) => string | null;
  /** Replace the selection with these ids (marquee group-select / deselect). */
  onSelectIds?: (ids: string[]) => void;
  /** Collapse these cards into a named macro block. Returns the new macro id. */
  onMakeMacro?: (cardIds: string[], name: string) => string | null;
}) => {
  // Free-move canvas — pointer-based drag (NOT HTML5 DnD). The drag mechanics
  // (run-selection, snap, drop-reorder) live in the shared `useCanvasDrag` hook
  // (wired below); draggingIds / snapTargetId just drive the visuals.
  const [draggingIds, setDraggingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [snapTargetId, setSnapTargetId] = useState<string | null>(null);

  // ── Figma-style pan/zoom camera (reuses the proven fullscreen math) ──
  // The chain rows live on a transformed world surface; chrome (tabs, hints)
  // stays fixed because it's outside this component.
  const vpRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState({ x: 0, y: 0, scale: 1 });
  const [panning, setPanning] = useState(false);
  const camRef = useRef(cam);
  camRef.current = cam;
  const panRef = useRef<{ sx: number; sy: number; x: number; y: number } | null>(null);
  const spaceRef = useRef(false);
  // Marquee (rubber-band) group-select — left-drag on empty canvas.
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const marqueeRef = useRef<{ x0: number; y0: number; x1: number; y1: number; moved: boolean } | null>(null);

  // ── Free-move puzzle blocks (no rows) ───────────────────────────────
  // Every block lives at its own (x,y); blocks snap edge-to-edge into stacks
  // when dropped near each other (~snap tolerance). Compile order (recipe.cards)
  // follows the spatial READING ORDER (top→bottom, left→right), recomputed on
  // every drop — so where you place a block IS where it sits in the chain.
  // Cross-canvas links are named reroutes, never wires. Positions are editor
  // state keyed by card id; posLive mirrors them for reads inside handlers.
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const posLive = useRef(pos);
  posLive.current = pos;
  // Animation blocks live in the same `pos` map (keyed by their own ids) so
  // comments + multi-select can include them alongside cards.
  const animChainsForCanvas = useCardsStore((s) => s.recipe.animations) ?? [];
  const animBlockIds = new Set(animChainsForCanvas.flatMap((c) => c.blocks.map((b) => b.id)));

  // ── Comments — UE5-style group boxes (select + C) + post-it notes (N) ──
  // Annotation layer in editor state (not part of the recipe). Group boxes sit
  // BEHIND blocks and drag their members along; post-its float above.
  type Note = { id: string; kind: 'group' | 'postit'; x: number; y: number; w: number; h: number; text: string; color: string; members: string[] };
  const [notes, setNotes] = useState<Note[]>([]);
  const noteSeq = useRef(0);
  const noteDragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; members: Record<string, { x: number; y: number }> } | null>(null);
  // Latest closures for the C / N / M shortcuts, so the (once-bound) key
  // listener never fires a stale handler.
  const commentKeysRef = useRef<{ group: () => void; postit: () => void; macro: () => void }>({ group: () => {}, postit: () => {}, macro: () => {} });

  const reset = useCallback(() => setCam({ x: 0, y: 0, scale: 1 }), []);
  const fit = useCallback(() => {
    // Free-floating chains have no single content box — return to the home view.
    setCam({ x: 32, y: 24, scale: 1 });
  }, []);
  const zoomBy = useCallback((factor: number) => {
    const vp = vpRef.current;
    const ax = vp ? vp.clientWidth / 2 : 0;
    const ay = vp ? vp.clientHeight / 2 : 0;
    setCam((cur) => {
      const ns = clamp(cur.scale * factor, 0.2, 3);
      const real = ns / cur.scale;
      return { x: ax - (ax - cur.x) * real, y: ay - (ay - cur.y) * real, scale: ns };
    });
  }, []);

  // Wheel zoom-to-cursor (non-passive so we can preventDefault page scroll).
  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setCam((cur) => {
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const ns = clamp(cur.scale * factor, 0.2, 3);
        const real = ns / cur.scale;
        return { x: cx - (cx - cur.x) * real, y: cy - (cy - cur.y) * real, scale: ns };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel as EventListener);
  }, []);

  // Keys: space = pan modifier; R reset; Shift+1 fit; 0 = 100%.
  useEffect(() => {
    const isText = (el: EventTarget | null): boolean =>
      el instanceof HTMLElement &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    const kd = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isText(e.target)) { spaceRef.current = true; return; }
      if (isText(e.target)) return;
      if (e.metaKey || e.ctrlKey) return; // leave copy/paste etc. alone
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); reset(); }
      else if (e.key === '1' && e.shiftKey) { e.preventDefault(); fit(); }
      else if (e.key === '0') { e.preventDefault(); setCam((c) => ({ ...c, scale: 1 })); }
      else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); commentKeysRef.current.group(); }
      else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); commentKeysRef.current.postit(); }
      else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); commentKeysRef.current.macro(); }
    };
    const ku = (e: KeyboardEvent) => { if (e.key === ' ') spaceRef.current = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [reset, fit]);

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = e.button === 2 || e.button === 1 || (e.button === 0 && spaceRef.current);
    if (pan) {
      e.preventDefault();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
      panRef.current = { sx: e.clientX, sy: e.clientY, x: camRef.current.x, y: camRef.current.y };
      setPanning(true);
      return;
    }
    if (e.button === 0) {
      // Left-drag on EMPTY canvas → marquee group-select (blocks stop the event
      // via stopPropagation, so this only fires on empty space).
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
      const w = screenToWorld(e.clientX, e.clientY);
      marqueeRef.current = { x0: w.x, y0: w.y, x1: w.x, y1: w.y, moved: false };
      setMarquee({ x: w.x, y: w.y, w: 0, h: 0 });
    }
  };
  const onCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = panRef.current;
    if (p) { setCam((c) => ({ ...c, x: p.x + (e.clientX - p.sx), y: p.y + (e.clientY - p.sy) })); return; }
    const m = marqueeRef.current;
    if (m) {
      const w = screenToWorld(e.clientX, e.clientY);
      m.x1 = w.x; m.y1 = w.y; m.moved = true;
      setMarquee({ x: Math.min(m.x0, w.x), y: Math.min(m.y0, w.y), w: Math.abs(w.x - m.x0), h: Math.abs(w.y - m.y0) });
    }
  };
  const onCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panRef.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      panRef.current = null;
      setPanning(false);
      return;
    }
    const m = marqueeRef.current;
    if (m) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      marqueeRef.current = null;
      setMarquee(null);
      if (!m.moved) { onSelectIds?.([]); return; } // click on empty → deselect
      const rx0 = Math.min(m.x0, m.x1); const ry0 = Math.min(m.y0, m.y1);
      const rx1 = Math.max(m.x0, m.x1); const ry1 = Math.max(m.y0, m.y1);
      const inRect = (x: number, y: number) => x < rx1 && x + BW > rx0 && y < ry1 && y + 96 > ry0;
      const ids = placed.filter((pl) => inRect(pl.p.x, pl.p.y)).map((pl) => pl.id);
      const animIds = [...animBlockIds].filter((id) => { const p = pos[id]; return p != null && inRect(p.x, p.y); });
      onSelectIds?.([...ids, ...animIds]);
    }
  };

  // ── Free-move layout + snapping (pure logic in ./free-canvas-layout) ──
  const defaultPos = (i: number): { x: number; y: number } => ({ x: 64 + i * BW, y: 104 });
  const posOf = (card: Card, i: number): { x: number; y: number } => pos[card.id] ?? defaultPos(i);

  type Placed = { id: string; card: Card; i: number; p: { x: number; y: number } };
  const placed: Placed[] = items.map((card, i) => ({ id: card.id, card, i, p: posOf(card, i) }));
  // Reduced view the pure layout functions operate on.
  const layout: LayoutPlaced[] = placed.map((pl) => ({ id: pl.id, x: pl.p.x, y: pl.p.y }));

  const rightChild = rightChildMap(layout);
  const leftParent = leftParentMap(layout, rightChild);

  // Reading-order compile sequence, recomputed from final positions on drop.
  const computeOrder = (getPos: (c: Card, i: number) => { x: number; y: number }): string[] =>
    readingOrder(items.map((card, i) => { const p = getPos(card, i); return { id: card.id, x: p.x, y: p.y }; }));

  // ── drag a block FROM the palette and drop it on the canvas ─────────
  const screenToWorld = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = vpRef.current?.getBoundingClientRect();
    const cam = camRef.current;
    const s = cam.scale || 1;
    const sx = clientX - (rect?.left ?? 0);
    const sy = clientY - (rect?.top ?? 0);
    return { x: (sx - cam.x) / s, y: (sy - cam.y) / s };
  };

  // The composer's block drag — the SAME unified canvas-drag as anim blocks.
  // Card adapter: 'open' opens the inspector, shift/⌘-click toggles selection,
  // and the dropped reading ORDER routes to setCardOrder.
  const cardDrag = useCanvasDrag({
    currentItems: () => placed.map((pl) => ({ id: pl.id, x: pl.p.x, y: pl.p.y })),
    config: { snapTol: SNAP_X * 2.2, doubleClick: 'open' },
    screenToWorld,
    onSetPositions: (positions) => setPos((p) => ({ ...p, ...positions })),
    onSnapHint: setSnapTargetId,
    onDraggingChange: (ids) => setDraggingIds(new Set(ids)),
    onSelect: (id, mods) => { const i = items.findIndex((c) => c.id === id); if (i >= 0) onSelect?.(i, (mods.shift || mods.meta) ? 'toggle' : 'replace'); },
    onOpen: (id) => { const i = items.findIndex((c) => c.id === id); if (i >= 0) onOpen?.(i); },
    onReorder: ({ order }) => { if (order.join('|') !== items.map((c) => c.id).join('|')) onSetOrder?.(order); },
  });

  const onCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes(PALETTE_DND_MIME)) return;
    e.preventDefault(); // required, else the browser refuses the drop
    e.dataTransfer.dropEffect = 'copy';
  };
  const onCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const type = e.dataTransfer.getData(PALETTE_DND_MIME);
    if (!type || !onInsertCard) return;
    e.preventDefault();
    const w = screenToWorld(e.clientX, e.clientY);
    const dropX = w.x - BW / 2;
    const dropY = w.y - 48;

    // Animation blocks are their own species: dropping near an existing chain
    // ADDS the block to that chain (flush after its tail); dropping on empty
    // canvas starts a fresh chain. They never snap into a composer stack.
    if (type.startsWith('anim:')) {
      const blockType = type.slice(5);
      const st = useCardsStore.getState();
      const animations = st.recipe.animations ?? [];
      let nearChain: string | null = null;
      let nearD = Infinity;
      let rightmost: { x: number; y: number } | null = null;
      for (const ch of animations) {
        const ps = ch.blocks.map((b) => posLive.current[b.id]).filter(Boolean) as Array<{ x: number; y: number }>;
        if (ps.length === 0) continue;
        const chMinD = Math.min(...ps.map((p) => Math.hypot(p.x + BW / 2 - w.x, p.y - w.y)));
        if (chMinD < nearD) { nearD = chMinD; nearChain = ch.id; rightmost = ps.reduce((a, b) => (b.x > a.x ? b : a), ps[0]!); }
      }
      if (nearChain && rightmost && nearD <= 180) {
        const r = rightmost;
        const bid = st.addAnimBlock(nearChain, blockType);
        if (bid) setPos((p) => ({ ...p, [bid]: { x: r.x + BW, y: r.y } }));
      } else {
        const bid = st.startAnimChain(blockType);
        if (bid) setPos((p) => ({ ...p, [bid]: { x: dropX, y: dropY } }));
      }
      return;
    }

    const id = onInsertCard(type);
    if (!id) return;
    // Snap to a nearby stack tail (a block with no right child) if the drop
    // lands near its right tab — so reroutes / macros / cards dragged from the
    // palette click into the chain instead of floating free. Generous
    // tolerance because a drop is a coarser gesture than a drag.
    const tail = placed.find((pl) =>
      !rightChild[pl.id]
      && Math.abs(pl.p.y - dropY) <= SNAP_Y * 2
      && (pl.p.x + BW) - dropX <= SNAP_X * 2.5
      && dropX - (pl.p.x + BW) <= SNAP_X * 2.5);
    setPos((p) => {
      const next = { ...p };
      for (const pl of placed) next[pl.id] = pl.p; // freeze so nothing jumps
      next[id] = tail ? { x: tail.p.x + BW, y: tail.p.y } : { x: dropX, y: dropY };
      return next;
    });
  };

  // ── "add reroute" affordance on long chains ─────────────────────────
  // A stack of ≥ this many blocks gets a small teal capture-button at its tail
  // — the low-friction way to tap a long chain's output into a named reroute.
  const REROUTE_HINT_MIN = 6;
  const stacks: Array<{ ids: string[]; tail: Placed }> = [];
  for (const a of placed) {
    if (leftParent[a.id]) continue; // only stack heads start a walk
    const ids: string[] = []; const seen = new Set<string>();
    let cur: string | null = a.id;
    while (cur && !seen.has(cur)) { ids.push(cur); seen.add(cur); cur = rightChild[cur] ?? null; }
    const tail = placed.find((p) => p.id === ids[ids.length - 1]);
    if (tail) stacks.push({ ids, tail });
  }
  const addRerouteAtTail = (tail: Placed): void => {
    if (!onAddReroute) return;
    const existing = new Set<string>();
    for (const c of items) if (c.kind === 'typed' && c.type === 'reroute_decl') existing.add(String(c.params.name?.value ?? ''));
    let n = 1; let name = 'route';
    while (existing.has(name)) { n += 1; name = `route${n}`; }
    const tailIndex = items.findIndex((c) => c.id === tail.id);
    const id = onAddReroute(name, tailIndex + 1);
    if (id) setPos((p) => {
      const next = { ...p };
      for (const pl of placed) next[pl.id] = pl.p; // freeze so nothing jumps
      next[id] = { x: tail.p.x + BW, y: tail.p.y };
      return next;
    });
  };

  // ── comment handlers (wired to the C / N shortcuts above) ───────────
  const makeGroupComment = (): void => {
    // Selected cards AND animation blocks (both keyed in the `pos` map).
    const sel: Array<{ id: string; x: number; y: number }> = [
      ...placed.filter((p) => selectedIds.has(p.id)).map((p) => ({ id: p.id, x: p.p.x, y: p.p.y })),
      ...[...selectedIds].filter((id) => animBlockIds.has(id) && pos[id]).map((id) => ({ id, x: pos[id]!.x, y: pos[id]!.y })),
    ];
    if (sel.length === 0) {
      // No selection → drop an empty comment box at the viewport centre so the
      // toolbar button always does something (select blocks first to wrap them).
      const rect = vpRef.current?.getBoundingClientRect();
      const w = screenToWorld((rect?.left ?? 0) + (vpRef.current?.clientWidth ?? 400) / 2, (rect?.top ?? 0) + (vpRef.current?.clientHeight ?? 400) / 2);
      const id = `note${noteSeq.current++}`;
      setNotes((ns) => [...ns, { id, kind: 'group', x: w.x - 170, y: w.y - 70, w: 340, h: 150, text: '', color: SHADE.gold, members: [] }]);
      return;
    }
    const minX = Math.min(...sel.map((s) => s.x)) - 16;
    const minY = Math.min(...sel.map((s) => s.y)) - 42;
    const maxX = Math.max(...sel.map((s) => s.x + BW)) + 16;
    const maxY = Math.max(...sel.map((s) => s.y + 96)) + 16;
    const id = `note${noteSeq.current++}`;
    setNotes((ns) => [...ns, { id, kind: 'group', x: minX, y: minY, w: maxX - minX, h: maxY - minY, text: '', color: SHADE.gold, members: sel.map((s) => s.id) }]);
  };
  const makePostit = (): void => {
    const rect = vpRef.current?.getBoundingClientRect();
    const w = screenToWorld((rect?.left ?? 0) + (vpRef.current?.clientWidth ?? 400) / 2, (rect?.top ?? 0) + (vpRef.current?.clientHeight ?? 400) / 2);
    const id = `note${noteSeq.current++}`;
    setNotes((ns) => [...ns, { id, kind: 'postit', x: w.x - 84, y: w.y - 60, w: 168, h: 120, text: '', color: '#E7D7A3', members: [] }]);
  };
  const makeMacroFromSelection = (): void => {
    if (!onMakeMacro) return;
    const ids = placed.filter((p) => selectedIds.has(p.id)).map((p) => p.id);
    if (ids.length === 0) return;
    const n = items.filter((c) => c.kind === 'typed' && c.type === 'macro').length + 1;
    onMakeMacro(ids, `Macro ${n}`);
  };
  commentKeysRef.current = { group: makeGroupComment, postit: makePostit, macro: makeMacroFromSelection };

  const onNoteHandleDown = (note: Note) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
    const members: Record<string, { x: number; y: number }> = {};
    if (note.kind === 'group') {
      for (const mid of note.members) {
        const card = placed.find((pl) => pl.id === mid);
        if (card) members[mid] = card.p;
        else if (pos[mid]) members[mid] = pos[mid]!; // animation block
      }
    }
    noteDragRef.current = { id: note.id, sx: e.clientX, sy: e.clientY, ox: note.x, oy: note.y, members };
  };
  const onNoteHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = noteDragRef.current;
    if (!d) return;
    const s = camRef.current.scale || 1;
    const dx = (e.clientX - d.sx) / s; const dy = (e.clientY - d.sy) / s;
    setNotes((ns) => ns.map((n) => (n.id === d.id ? { ...n, x: d.ox + dx, y: d.oy + dy } : n)));
    if (Object.keys(d.members).length) {
      setPos((p) => { const next = { ...p }; for (const [id, o] of Object.entries(d.members)) next[id] = { x: o.x + dx, y: o.y + dy }; return next; });
    }
  };
  const onNoteHandleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = noteDragRef.current;
    if (!d) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    noteDragRef.current = null;

    const memberIds = Object.keys(d.members);
    if (memberIds.length === 0) return; // post-it (no members) → nothing to snap

    // Final member positions from the original snapshot + total drag delta
    // (reliable even if the last move's setPos hasn't flushed yet).
    const s = camRef.current.scale || 1;
    const ddx = (e.clientX - d.sx) / s; const ddy = (e.clientY - d.sy) / s;
    const memberSet = new Set(memberIds);
    const finalPos: Record<string, { x: number; y: number }> = {};
    for (const pl of placed) finalPos[pl.id] = pl.p;
    for (const [id, o] of Object.entries(d.members)) finalPos[id] = { x: o.x + ddx, y: o.y + ddy };

    // Snap: find the smallest correction that aligns a moved member's tab/notch
    // with a non-member block on the same row, then shift the whole group +
    // comment box by it — so dragging a comment back clicks its blocks into the
    // neighbouring chain again instead of floating a few px off.
    let best: { dx: number; dy: number; dist: number } | null = null;
    const consider = (dx: number, dy: number) => {
      if (Math.abs(dx) > SNAP_X || Math.abs(dy) > SNAP_Y) return;
      const dist = Math.hypot(dx, dy);
      if (!best || dist < best.dist) best = { dx, dy, dist };
    };
    for (const id of memberIds) {
      const mp = finalPos[id]!;
      for (const ob of placed) {
        if (memberSet.has(ob.id)) continue;
        const op = finalPos[ob.id]!;
        consider((op.x + BW) - mp.x, op.y - mp.y); // member to the right of other
        consider(op.x - (mp.x + BW), op.y - mp.y); // other to the right of member
      }
    }
    if (best) {
      const b: { dx: number; dy: number } = best;
      for (const id of memberIds) { const p = finalPos[id]!; finalPos[id] = { x: p.x + b.dx, y: p.y + b.dy }; }
      setNotes((ns) => ns.map((n) => (n.id === d.id ? { ...n, x: n.x + b.dx, y: n.y + b.dy } : n)));
    }
    setPos(finalPos);
    const order = computeOrder((c, idx) => finalPos[c.id] ?? defaultPos(idx));
    if (order.join('|') !== items.map((c) => c.id).join('|')) onSetOrder?.(order);
  };

  // Raise a note above its siblings (so overlapping comments stay individually
  // grabbable / resizable — the buried one can be lifted to the front).
  const bringNoteToFront = (id: string): void => setNotes((ns) => {
    const i = ns.findIndex((n) => n.id === id);
    if (i < 0 || i === ns.length - 1) return ns;
    const copy = ns.slice();
    const [it] = copy.splice(i, 1);
    if (it) copy.push(it);
    return copy;
  });

  // ── manual comment resize (UE5-style edge/corner handles, no auto-fit) ──
  const noteResizeRef = useRef<{ id: string; handle: ResizeHandle; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number } | null>(null);
  const onNoteResizeDown = (note: Note, handle: ResizeHandle) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    bringNoteToFront(note.id);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
    noteResizeRef.current = { id: note.id, handle, sx: e.clientX, sy: e.clientY, ox: note.x, oy: note.y, ow: note.w, oh: note.h };
  };
  const onNoteResizeMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const d = noteResizeRef.current;
    if (!d) return;
    const s = camRef.current.scale || 1;
    const dx = (e.clientX - d.sx) / s; const dy = (e.clientY - d.sy) / s;
    const MIN_W = 96; const MIN_H = 60;
    setNotes((ns) => ns.map((n) => {
      if (n.id !== d.id) return n;
      let x = d.ox; let y = d.oy; let w = d.ow; let h = d.oh;
      if (d.handle.includes('e')) w = Math.max(MIN_W, d.ow + dx);
      if (d.handle.includes('s')) h = Math.max(MIN_H, d.oh + dy);
      if (d.handle.includes('w')) { w = Math.max(MIN_W, d.ow - dx); x = d.ox + (d.ow - w); }
      if (d.handle.includes('n')) { h = Math.max(MIN_H, d.oh - dy); y = d.oy + (d.oh - h); }
      return { ...n, x, y, w, h };
    }));
  };
  const onNoteResizeUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!noteResizeRef.current) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    noteResizeRef.current = null;
  };
  // The 8 resize handles for a note: invisible edge hit-strips + thin
  // corner BRACKETS (two borders hugging the box's rounded corner). Far
  // cleaner than filled squares, especially on the small post-its.
  const noteResizers = (n: Note): ReactNode => NOTE_HANDLES.map((hd) => (
    <div
      key={hd.h}
      onPointerDown={onNoteResizeDown(n, hd.h)}
      onPointerMove={onNoteResizeMove}
      onPointerUp={onNoteResizeUp}
      style={{ position: 'absolute', pointerEvents: 'auto', cursor: hd.cursor, zIndex: 4, ...hd.style }}
    >
      {hd.corner && (
        <div
          style={{
            position: 'absolute', inset: 2, pointerEvents: 'none', opacity: 0.85,
            borderTop: hd.h.includes('n') ? `2px solid ${n.color}` : undefined,
            borderBottom: hd.h.includes('s') ? `2px solid ${n.color}` : undefined,
            borderLeft: hd.h.includes('w') ? `2px solid ${n.color}` : undefined,
            borderRight: hd.h.includes('e') ? `2px solid ${n.color}` : undefined,
            borderTopLeftRadius: hd.h === 'nw' ? 5 : 0,
            borderTopRightRadius: hd.h === 'ne' ? 5 : 0,
            borderBottomLeftRadius: hd.h === 'sw' ? 5 : 0,
            borderBottomRightRadius: hd.h === 'se' ? 5 : 0,
          }}
        />
      )}
    </div>
  ));
  const setNoteText = (id: string, text: string): void => setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, text } : n)));
  const deleteNote = (id: string): void => setNotes((ns) => ns.filter((n) => n.id !== id));

  return (
    <div
      ref={vpRef}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onDragOver={onCanvasDragOver}
      onDrop={onCanvasDrop}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        flex: 1, minWidth: 0, minHeight: 0,
        position: 'relative', overflow: 'hidden',
        background: SHADE.bg, // opaque so only our panning grid shows here
        pointerEvents: 'auto',
        cursor: panning ? 'grabbing' : 'default',
      }}
    >
      {/* Panning grid — moves & scales with the camera (infinite-canvas feel). */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${SHADE.border} 1px, transparent 1px), linear-gradient(90deg, ${SHADE.border} 1px, transparent 1px)`,
          backgroundSize: `${32 * cam.scale}px ${32 * cam.scale}px, ${32 * cam.scale}px ${32 * cam.scale}px`,
          backgroundPosition: `${cam.x}px ${cam.y}px, ${cam.x}px ${cam.y}px`,
          opacity: 0.32,
        }}
      />
      {/* World surface — free-floating chains + portal wires (Gaea model). */}
      <div
        ref={worldRef}
        style={{
          position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`,
          willChange: 'transform', width: 4000, height: 3000,
        }}
      >
        {/* Comments — group boxes (behind blocks) + post-it notes (above). */}
        {notes.map((n) => n.kind === 'group' ? (
          <div
            key={n.id}
            onPointerDown={(e) => { bringNoteToFront(n.id); onNoteHandleDown(n)(e); }}
            onPointerMove={onNoteHandleMove}
            onPointerUp={onNoteHandleUp}
            style={{
              position: 'absolute', left: n.x, top: n.y, width: n.w, height: n.h, zIndex: 0,
              borderRadius: 11, border: `1.5px solid ${n.color}`, background: `${n.color}14`,
              // Whole box is a drag surface (move from anywhere). Member blocks
              // render ABOVE this (later in DOM, same stacking level) so they
              // still receive their own clicks; only empty box area drags.
              pointerEvents: 'auto', cursor: 'grab',
            }}
          >
            {/* Header sits ABOVE the box (anchored to its top edge) and hugs
                its content, so it grows UPWARD and wraps to multiple lines as
                the title gets long (UE5-style) — and two overlapping comments
                expose separate grab pills at their own corners. */}
            <div
              onPointerDown={(e) => { bringNoteToFront(n.id); onNoteHandleDown(n)(e); }}
              onPointerMove={onNoteHandleMove}
              onPointerUp={onNoteHandleUp}
              style={{
                position: 'absolute', left: -1.5, bottom: '100%', marginBottom: 1,
                pointerEvents: 'auto', display: 'flex', alignItems: 'flex-start', gap: 6,
                maxWidth: Math.max(160, n.w + 2), padding: '4px 5px 4px 10px', background: `${n.color}38`,
                borderRadius: '8px 8px 8px 0', cursor: 'grab',
              }}
            >
              <CommentTitle value={n.text} onChange={(t) => setNoteText(n.id, t)} />
              <button type="button" title="Delete comment" onPointerDown={(e) => e.stopPropagation()} onClick={() => deleteNote(n.id)}
                style={{ flex: '0 0 auto', width: 17, height: 17, lineHeight: 0, border: 'none', borderRadius: 4, background: 'transparent', color: SHADE.textDim, cursor: 'pointer', font: `400 15px ${TYPE.body}` }}>×</button>
            </div>
            {noteResizers(n)}
          </div>
        ) : (
          <div
            key={n.id}
            style={{
              position: 'absolute', left: n.x, top: n.y, width: n.w, height: n.h, zIndex: 2,
              borderRadius: 6, background: n.color, border: `1px solid ${SHADE.inkLine}33`,
              boxShadow: '0 5px 12px -5px rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div
              onPointerDown={(e) => { bringNoteToFront(n.id); onNoteHandleDown(n)(e); }}
              onPointerMove={onNoteHandleMove}
              onPointerUp={onNoteHandleUp}
              style={{ height: 18, flex: '0 0 auto', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 3px', background: 'rgba(0,0,0,0.06)' }}
            >
              <button type="button" title="Delete note" onPointerDown={(e) => e.stopPropagation()} onClick={() => deleteNote(n.id)}
                style={{ width: 15, height: 15, lineHeight: 0, border: 'none', borderRadius: 3, background: 'transparent', color: '#6b5e38', cursor: 'pointer', font: `400 14px ${TYPE.body}` }}>×</button>
            </div>
            <textarea
              value={n.text}
              onChange={(e) => setNoteText(n.id, e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="note…"
              style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none', padding: '4px 8px 8px', font: `500 12px ${TYPE.body}`, color: '#3a3320' }}
            />
            {noteResizers(n)}
          </div>
        ))}
        {/* Free-move puzzle blocks — each at its own (x,y); drag any block (it
            carries the run snapped after it). Snapped neighbours interlock via
            notch/tab; floating singletons read flat on both ends. */}
        {placed.map(({ card, p }) => {
          const block: BlockDef = card.kind === 'typed'
            ? blockById(card.type) ?? wildcardBlockFallback()
            : wildcardBlock(card);
          const blockVariant: BlockVariant = {
            left: leftParent[card.id] ? 'notch' : 'flat',
            right: rightChild[card.id] ? 'tab' : 'flat',
          };
          const isDragging = draggingIds.has(card.id);
          return (
            <div
              key={card.id}
              style={{ position: 'absolute', left: p.x, top: p.y, zIndex: isDragging ? 60 : 1, cursor: 'grab', touchAction: 'none' }}
              onPointerDown={(e) => { if (!spaceRef.current) cardDrag.onPointerDown(card.id)(e); }}
              onPointerMove={cardDrag.onPointerMove}
              onPointerUp={cardDrag.onPointerUp}
            >
              <Block
                id={card.id}
                block={block}
                card={card}
                variant={blockVariant}
                selected={selectedIds.has(card.id)}
                snapTarget={snapTargetId === card.id}
                dragging={isDragging}
                locked={lockedId === card.id}
              />
            </div>
          );
        })}
        {/* Custom-animation chains — a distinct cyan species on the same
            surface; binds drive composer blocks (link lines + badges). */}
        <AnimLayer
          cards={items}
          cardBox={(id) => placed.find((pl) => pl.id === id)?.p ?? null}
          pos={pos}
          setPos={setPos}
          screenToWorld={screenToWorld}
          selectedIds={selectedIds}
          onSelectAnim={(blockId) => onSelectIds?.(blockId ? [blockId] : [])}
        />
        {/* Long-chain affordance: a tail capture-button on stacks ≥ 6 blocks
            (hidden once the tail is already a reroute declaration). */}
        {onAddReroute && stacks
          .filter((st) => st.ids.length >= REROUTE_HINT_MIN
            && !((items.find((c) => c.id === st.tail.id) as Extract<Card, { kind: 'typed' }> | undefined)?.type === 'reroute_decl'))
          .map((st) => (
            <RerouteAddButton
              key={`rr-add-${st.tail.id}`}
              x={st.tail.p.x + BW + 6}
              y={st.tail.p.y + 26}
              onClick={() => addRerouteAtTail(st.tail)}
            />
          ))}
        {/* Marquee group-select rectangle */}
        {marquee && (
          <div
            aria-hidden
            style={{
              position: 'absolute', left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h,
              zIndex: 45, pointerEvents: 'none', borderRadius: 2,
              border: `1px solid ${SHADE.borderHi}`, background: `${SHADE.borderHi}1f`,
            }}
          />
        )}
      </div>
      {/* Annotate toolbar — bottom-left pill. Discoverable buttons for the
          C / N comment shortcuts (stopPropagation so they don't start a
          marquee). Comment wraps the selection, or drops an empty box. */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', left: 10, bottom: 10, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 2,
          padding: 3, borderRadius: 9,
          background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
          boxShadow: '0 4px 14px -5px rgba(0,0,0,0.22)',
        }}
      >
        <button
          type="button"
          title="Comment (C) — wraps the selected blocks, or drops an empty box"
          onClick={makeGroupComment}
          style={annotateBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = SHADE.surface3)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SHADE.gold} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16h-7l-4 3.2V16H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 5Z" />
            <path d="M8 9.5h8 M8 12.5h5" />
          </svg>
          Comment
        </button>
        <span style={{ width: 1, height: 16, background: SHADE.border, margin: '0 2px' }} />
        <button
          type="button"
          title="Post-it (N) — a free sticky note on the canvas"
          onClick={makePostit}
          style={annotateBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = SHADE.surface3)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span aria-hidden style={{ width: 9, height: 9, background: '#E7D7A3', borderRadius: 1.5, boxShadow: 'inset -3px -3px 0 rgba(0,0,0,0.08)' }} />
          Post-it
        </button>
      </div>
      {/* Zoom HUD — bottom-right pill. Stop pointer events from reaching the
          canvas handler: otherwise pressing a button starts a marquee and
          setPointerCapture steals the gesture, so the button click never
          completes (the "zoom HUD does nothing" bug). */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', right: 10, bottom: 10, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 1,
          padding: 3, borderRadius: 9,
          background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
          boxShadow: '0 4px 14px -5px rgba(0,0,0,0.22)',
        }}
      >
        <ZoomBtn title="Zoom out" onClick={() => zoomBy(1 / 1.2)}>−</ZoomBtn>
        <button
          type="button"
          onClick={() => setCam((c) => ({ ...c, scale: 1 }))}
          title="Reset zoom to 100%"
          style={{
            minWidth: 46, height: 26, padding: '0 4px', border: 'none', background: 'transparent',
            cursor: 'pointer', color: SHADE.textDim, font: `600 11px ${TYPE.bodyMono}`,
          }}
        >
          {Math.round(cam.scale * 100)}%
        </button>
        <ZoomBtn title="Zoom in" onClick={() => zoomBy(1.2)}>+</ZoomBtn>
        <span style={{ width: 1, height: 16, background: SHADE.border, margin: '0 3px' }} />
        <ZoomBtn title="Fit to view (Shift+1)" onClick={fit}><FitGlyph /></ZoomBtn>
        <ZoomBtn title="Reset (R)" onClick={reset}><RecenterGlyph /></ZoomBtn>
      </div>
    </div>
  );
};

// Minimal teal capture-button shown at the tail of long stacks (≥6 blocks).
// Flat, dashed, no glow — appears only contextually, not a persistent fixture.
const RerouteAddButton = ({ x, y, onClick }: { x: number; y: number; onClick: () => void }) => {
  const [h, setH] = useState(false);
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      title="Capture this chain's output as a named reroute"
      style={{
        position: 'absolute', left: x, top: y, width: 50, height: 44,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        background: h ? `${SHADE.reroute}1f` : SHADE.surface1,
        border: `1.5px dashed ${SHADE.reroute}`, borderRadius: 9,
        color: SHADE.rerouteDeep, cursor: 'pointer', padding: 0,
        transition: 'background 140ms ease',
      }}
    >
      <span style={{ font: `700 16px ${TYPE.body}`, color: SHADE.reroute, lineHeight: 1 }}>⤺</span>
      <span style={{ font: `700 7px ${TYPE.bodyMono}`, letterSpacing: '0.16em', textTransform: 'uppercase' }}>reroute</span>
    </button>
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

// Flat inline glyphs for the pass tabs (no CSS dots): the Image pass reads as a
// little screen, buffer passes as stacked layers. Stroke-only, tinted per tab.
const TabGlyph = ({ kind, color, dim = false }: { kind: 'image' | 'buffer'; color: string; dim?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', opacity: dim ? 0.75 : 1 }} aria-hidden>
    {kind === 'image' ? (
      <>
        <rect x="3" y="4" width="18" height="13" rx="1.6" />
        <path d="M9 20h6 M12 17v3" />
      </>
    ) : (
      <>
        <path d="M12 3 21 8 12 13 3 8 12 3Z" />
        <path d="M3 13 12 18 21 13" />
      </>
    )}
  </svg>
);

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
            <TabGlyph kind={isBuffer ? 'buffer' : 'image'} color={dotColor} dim={!active} />
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
                  <TabGlyph kind="buffer" color={BUFFER_TAB_COLORS[id]} />
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
    {/* No fixed grid here — the only grid is the figma-style panning grid
        inside the chain viewport, so the tiling stays consistent at all zooms. */}
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
    {children}
  </div>
);

// ─── Editable code drawer ──────────────────────────────────────────────
//
// READ mode: shows the recipe-compiled GLSL, highlighted, copyable.
// EDIT mode: a textarea is overlaid on the highlight. The user types
// freely, then presses Compile / Discard. The drawer owns:
//   - editSource             — the user's working draft of the GLSL.
//   - editStatus             — READY | EDITED | COMPILED | COMPILE FAILED.
// `onCompile(userSource)` runs the user's source through a transient
// renderer (allocated on first compile) and returns errors / ok.

type CompileStatus =
  | { kind: 'ready' }
  | { kind: 'edited' }
  | { kind: 'compiled' }
  | { kind: 'failed'; errors: GLSLError[] };

const CodeDrawer = ({
  expanded, onToggle, glsl, height = 240,
  editMode, onEditModeChange,
  editSource, onEditSourceChange,
  compileStatus,
  onCompile, onDiscard,
  errorContext,
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
  onCompile: () => void;
  onDiscard: () => void;
  /** Spans + name resolver so compile errors can name the offending card. */
  errorContext?: ErrorContext;
}) => {
  const displaySource = editMode ? editSource : glsl;
  const lineCount = displaySource.split('\n').length;
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <CompileChip status={compileStatus} errorContext={errorContext} />
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
            title="Open fullscreen (Shift+F)"
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
            onClick={onDiscard}
            data-testid="code-drawer-discard"
            style={drawerActionStyle}
          >
            Discard edits
          </button>
          <span style={{ marginLeft: 'auto', font: `500 10px ${TYPE.bodyMono}`, color: 'rgba(254,231,199,0.45)' }}>
            edit → compile · failures keep the last-good recipe
          </span>
        </div>
      )}
    </div>
  );
};

// CompileChip — the small inline status pill that rides along in the
// drawer header. Goes READY → EDITED → COMPILED (or
// COMPILE FAILED: N). Colour-coded to make state legible at a glance.
type ErrorContext = { spans: Span[]; nameOf: (cardId: string) => string };
const CompileChip = ({ status, errorContext }: { status: CompileStatus; errorContext?: ErrorContext }) => {
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
  } else if (status.kind === 'failed') {
    label = `COMPILE FAILED: ${status.errors.length} error${status.errors.length === 1 ? '' : 's'}`;
    bg = 'rgba(181, 54, 94, 0.18)';
    border = 'rgba(181, 54, 94, 0.55)';
    color = '#FFB7C5';
    testid = 'compile-chip-failed';
  }
  const title = status.kind === 'failed'
    ? status.errors.slice(0, 4).map((e) => {
        // Re-anchor the raw driver line to its card when a span covers it, so
        // the user sees "Swirl — L42: …" instead of a bare generated line.
        const span = errorContext ? cardForLine(errorContext.spans, e.line) : null;
        const who = span ? `${errorContext!.nameOf(span.cardId)} · ` : '';
        return `${who}L${e.line}: ${e.message}`;
      }).join('\n')
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

// The preview aspect follows the recipe's output aspect so what you frame is
// what you export.
const ASPECT_LABEL: Record<string, string> = {
  square: '1080²', portrait: '1080×1920', landscape: '1920×1080',
};
const ASPECT_RATIO_LABEL: Record<string, string> = {
  square: '1:1', portrait: '9:16', landscape: '16:9',
};
const ASPECT_ORDER = ['square', 'portrait', 'landscape'] as const;

// Ratio as a w/h number for container-query letterboxing.
const ASPECT_NUM: Record<string, number> = {
  square: 1, portrait: 9 / 16, landscape: 16 / 9,
};

// The preview is a tall "hero" stage (Gaea/DCC-style): a generous fixed-height
// viewport that the render letterboxes inside — so a landscape recipe doesn't
// shrink to a thin band. Sizing is pure CSS via container-query units (cqw/cqh),
// so any aspect fits the largest box centred in the stage with no JS measuring.
const PreviewPanel = ({
  blocks = 0, tempo = 120, onFullscreen, previewUpToId, onFpsChange,
}: {
  blocks?: number; tempo?: number; onFullscreen?: () => void;
  previewUpToId?: string | null;
  onFpsChange?: (fps: number) => void;
}) => {
  const aspect = useCardsStore((s) => s.recipe.canvasAspect);
  const setRecipe = useCardsStore((s) => s.setRecipe);
  const r = ASPECT_NUM[aspect] ?? 16 / 9;
  const canvasRef = useRef<RecipeCanvasHandle>(null);
  const cycleAspect = () => {
    const rec = useCardsStore.getState().recipe;
    const idx = ASPECT_ORDER.indexOf(rec.canvasAspect as typeof ASPECT_ORDER[number]);
    const next = ASPECT_ORDER[(idx + 1) % ASPECT_ORDER.length] ?? 'square';
    setRecipe({ ...rec, canvasAspect: next });
  };
  // Live FPS poll — the Canvas tab footer surfaces it via onFpsChange.
  useEffect(() => {
    if (!onFpsChange) return;
    const tick = () => onFpsChange(canvasRef.current?.getFps() ?? 0);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [onFpsChange]);
  // tempo + blocks are not surfaced in the minimal header (block count already
  // lives in the chain tabs); kept in the signature for the call sites.
  void tempo;
  void blocks;
  return (
    <div
      style={{
        flex: '0 0 auto',
        height: 'clamp(300px, 42vh, 460px)',
        background: DK.panel,
        borderBottom: `1px solid ${DK.divider}`,
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}
    >
      {/* viewport title strip — slim DCC scene header with live controls */}
      <div
        style={{
          flex: '0 0 auto',
          padding: '0 9px 0 13px', height: 32,
          display: 'flex', alignItems: 'center', gap: 9,
          background: DK.raised, borderBottom: `1px solid ${DK.divider}`,
        }}
      >
        <span style={{ font: `700 9px ${TYPE.bodyMono}`, color: DK.dim, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          Preview
        </span>

        <span style={{ marginLeft: 'auto' }} />

        {/* aspect selector — click to cycle 1:1 → 9:16 → 16:9. The glyph is a
            crisp frame drawn at the actual output proportions. */}
        <button
          onClick={cycleAspect}
          title={`Output ${ASPECT_LABEL[aspect]} — click to cycle aspect`}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, height: 24,
            padding: '0 9px', borderRadius: 5,
            background: DK.well, border: `1px solid ${DK.border}`,
            color: DK.text, cursor: 'pointer', transition: 'border-color 120ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = DK.borderHi)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = DK.border)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <rect
              x={aspect === 'portrait' ? 7.5 : aspect === 'landscape' ? 3 : 5}
              y={aspect === 'landscape' ? 7.5 : aspect === 'portrait' ? 3 : 5}
              width={aspect === 'portrait' ? 9 : aspect === 'landscape' ? 18 : 14}
              height={aspect === 'landscape' ? 9 : aspect === 'portrait' ? 18 : 14}
              rx="2"
            />
          </svg>
          <span style={{ font: `600 10px ${TYPE.bodyMono}`, color: DK.text, letterSpacing: '0.08em' }}>
            {ASPECT_RATIO_LABEL[aspect] ?? '16:9'}
          </span>
        </button>

        <button
          title="Open fullscreen (Shift+F)"
          onClick={onFullscreen}
          style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${DK.border}`, background: DK.well, color: DK.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 120ms ease' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = DK.borderHi)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = DK.border)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9V4H9 M20 9V4H15 M4 15V20H9 M20 15V20H15" />
          </svg>
        </button>
      </div>
      {/* stage — deep well, centred letterboxed frame, soft inner vignette */}
      <div
        style={{
          flex: '1 1 auto', minHeight: 0, position: 'relative',
          containerType: 'size',
          background: DK.well,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 0 70px rgba(0,0,0,0.55)',
        }}
      >
        <div
          style={{
            position: 'relative', overflow: 'hidden', borderRadius: 3,
            border: `1px solid ${DK.borderHi}`, background: '#000',
            boxShadow: '0 6px 22px -8px rgba(0,0,0,0.7)',
            width: `min(calc(100cqw - 28px), calc((100cqh - 28px) * ${r}))`,
            height: `min(calc((100cqw - 28px) / ${r}), calc(100cqh - 28px))`,
          }}
        >
          <RecipeCanvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} previewUpToId={previewUpToId} />
        </div>
      </div>
    </div>
  );
};

const RightColumn = ({
  width = 392, selectedCard, selectedIndex, selectedCards, selectedAnim, blocks = 0, tempo = 120, onFullscreen, tab, onTabChange,
  previewUpToId,
}: {
  width?: number;
  selectedCard: Card | null;
  selectedIndex: number;
  selectedCards?: Card[];
  selectedAnim?: { chainId: string; block: AnimBlock } | null;
  blocks?: number;
  tempo?: number;
  onFullscreen?: () => void;
  tab: RightTab;
  onTabChange: (t: RightTab) => void;
  previewUpToId?: string | null;
}) => {
  const [fps, setFps] = useState(0);
  return (
  <div
    style={{
      width, flex: '0 0 auto',
      background: DK.panel,
      borderLeft: `1px solid ${DK.border}`,
      display: 'flex', flexDirection: 'column',
      minHeight: 0, overflow: 'hidden',
    }}
  >
    <PreviewPanel blocks={blocks} tempo={tempo} onFullscreen={onFullscreen} previewUpToId={previewUpToId} onFpsChange={setFps} />
    <PropertiesPanel selectedCard={selectedCard} selectedIndex={selectedIndex} selectedCards={selectedCards} selectedAnim={selectedAnim} tab={tab} onTabChange={onTabChange} fps={fps} />
  </div>
  );
};

// Warm-glass chrome button — matches the editor's dark instrument chrome
// (SHADE.cream on a translucent charcoal), with a gold edge on hover. Reads
// cleanly over any artwork. `active` gives it the gold "engaged" look.
const FullscreenChromeBtn = ({
  children, title, onClick, active = false, width = 32,
}: { children: ReactNode; title: string; onClick?: () => void; active?: boolean; width?: number }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width, height: 32, borderRadius: 6, padding: 0,
        background: active ? SHADE.gold : hover ? 'rgba(40,38,34,0.82)' : 'rgba(20,19,17,0.62)',
        border: `1px solid ${active ? SHADE.goldDeep : hover ? 'rgba(254,231,199,0.4)' : 'rgba(254,231,199,0.16)'}`,
        color: active ? '#1a1208' : SHADE.cream,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        backdropFilter: 'blur(8px) saturate(140%)',
        WebkitBackdropFilter: 'blur(8px) saturate(140%)',
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
        font: `700 11px ${TYPE.bodyMono}`, letterSpacing: '0.06em',
      }}
    >
      {children}
    </button>
  );
};

// Fullscreen preview with real screenshot / record / pan-zoom wiring.
// Pan-zoom is applied as a CSS transform on the wrapper around RecipeCanvas
// — never on the canvas element itself, because that would tickle the
// ResizeObserver and resize the WebGL drawing buffer. Pointer events on the
// canvas still propagate to RecipeCanvas's mousemove handler, so u_mouse
// continues to track the cursor while the user pans.
const PreviewFullscreen = ({ onClose, title }: { onClose: () => void; title: string }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasOuterRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<RecipeCanvasHandle>(null);
  const [transform, setTransform] = useState({ tx: 0, ty: 0, scale: 1 });
  const [recording, setRecording] = useState(false);
  const [recElapsedMs, setRecElapsedMs] = useState(0);
  const [flash, setFlash] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);
  const recTickRef = useRef<number | null>(null);
  const [fps, setFps] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [showSafe, setShowSafe] = useState(false);
  // Live export resolution label (reflects aspect + export long-edge setting).
  const { recipe: liveRecipe, canvas: liveCanvas } = useCardsStore.getState();
  const exportSize = resolveExportSize(liveRecipe.canvasAspect, liveCanvas.exportLongEdge);
  // Pan state: middle-button OR space+drag.
  const spaceDownRef = useRef(false);
  const panningRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

  // Find the underlying WebGL canvas inside our wrapper. Used by screenshot
  // and record — both need the raw HTMLCanvasElement, not the wrapping div.
  const getCanvas = (): HTMLCanvasElement | null => canvasRef.current?.getCanvas() ?? null;

  useEffect(() => {
    const tick = () => {
      setFps(canvasRef.current?.getFps() ?? 0);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Quick visible flash overlay after a screenshot fires.
  const triggerFlash = () => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);
  };

  const handleScreenshot = useCallback(() => {
    const handle = canvasRef.current;
    if (!handle) return;
    const { recipe, canvas } = useCardsStore.getState();
    const { width, height } = resolveExportSize(recipe.canvasAspect, canvas.exportLongEdge);
    void handle.snapshotPng(width, height, { alpha: canvas.transparentExport }).then((url) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `shaddy-${tsTag()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      triggerFlash();
    });
  }, []);

  const handleStartRecord = useCallback(() => {
    const handle = canvasRef.current;
    const canvas = getCanvas();
    if (!handle || !canvas || typeof canvas.captureStream !== 'function') return;
    const { recipe, canvas: canvasSettings } = useCardsStore.getState();
    const { width, height } = resolveExportSize(recipe.canvasAspect, canvasSettings.exportLongEdge);
    const prevWidth = canvas.width;
    const prevHeight = canvas.height;
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      handle.resize(prevWidth, prevHeight);
    };
    handle.resize(width, height);
    let stream: MediaStream;
    try {
      stream = canvas.captureStream(60);
    } catch {
      restore();
      return;
    }
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
      restore();
      return;
    }
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      restore();
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
            <RecipeCanvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
          </div>
        </div>

        {/* Rule-of-thirds grid overlay (composition aid). */}
        {showGrid && (
          <div aria-hidden style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage:
              'linear-gradient(to right, rgba(254,231,199,0.28) 1px, transparent 1px),'
              + 'linear-gradient(to bottom, rgba(254,231,199,0.28) 1px, transparent 1px)',
            backgroundPosition: '33.333% 0, 0 33.333%',
            backgroundSize: '33.333% 33.333%',
            mixBlendMode: 'difference',
          }} />
        )}
        {/* Title-safe / action-safe guides (90% / 80% insets). */}
        {showSafe && (
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'difference' }}>
            <div style={{ position: 'absolute', inset: '5%', border: '1px solid rgba(254,231,199,0.4)' }} />
            <div style={{ position: 'absolute', inset: '10%', border: '1px dashed rgba(254,231,199,0.3)' }} />
          </div>
        )}

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

        <div style={{ position: 'absolute', left: 14, top: 14, display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'auto' }}>
          <TogglePill active>{exportSize.width} × {exportSize.height}</TogglePill>
          <TogglePill active>{fps > 0 ? `${fps} fps` : '— fps'}</TogglePill>
          <TogglePill active={showSafe} onClick={() => setShowSafe((v) => !v)}>safe area</TogglePill>
          <TogglePill active={showGrid} onClick={() => setShowGrid((v) => !v)}>grid</TogglePill>
        </div>
        <div style={{ position: 'absolute', right: 14, top: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
          <div
            title={`${transform.scale.toFixed(2)}x  ·  R to reset`}
            style={{
              padding: '0 11px', height: 32, display: 'flex', alignItems: 'center',
              borderRadius: 6,
              background: 'rgba(20,19,17,0.62)',
              border: '1px solid rgba(254,231,199,0.16)',
              color: SHADE.cream,
              font: `700 11px ${TYPE.bodyMono}`,
              letterSpacing: '0.06em',
              backdropFilter: 'blur(8px) saturate(140%)',
              WebkitBackdropFilter: 'blur(8px) saturate(140%)',
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
              width: recording ? 78 : 32, height: 32, borderRadius: 6,
              background: recording ? '#e53c3c' : 'rgba(20,19,17,0.62)',
              border: `1px solid ${recording ? '#e53c3c' : 'rgba(254,231,199,0.16)'}`,
              color: recording ? '#fff' : SHADE.cream, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              backdropFilter: 'blur(8px) saturate(140%)',
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
            <div style={{ font: `500 11px ${TYPE.bodyMono}`, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
              {fps > 0 ? `${fps} fps · ` : ''}scroll to zoom · middle / space-drag to pan · R reset · ⇧F or Esc to exit
            </div>
          </div>
          <button
            onClick={handleToggleRecord}
            title={recording ? 'Stop recording and save the video' : 'Record the canvas to a video file'}
            style={{
              background: recording ? '#e53c3c' : `linear-gradient(180deg, ${SHADE.gold} 0%, ${SHADE.goldDeep} 100%)`,
              color: recording ? '#fff' : '#1a1208',
              border: `1px solid ${recording ? '#e53c3c' : SHADE.goldDeep}`,
              borderRadius: 6, padding: '9px 16px',
              font: `700 11px ${TYPE.body}`,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              pointerEvents: 'auto',
              boxShadow: recording ? undefined : '0 1px 0 rgba(255,255,255,0.18) inset',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              {recording ? <rect x="6" y="6" width="12" height="12" rx="1.5" /> : <circle cx="12" cy="12" r="7" />}
            </svg>
            {recording ? `Stop · ${recLabel}` : 'Record video'}
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

const EmptyHero = () => {
  const presets = STARTER_RECIPES.filter((s) => s.preset);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex', flexDirection: 'column', gap: 18,
          padding: '22px 26px',
          border: `1.5px dashed ${SHADE.borderHi}`,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(6px)',
          maxWidth: 660,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
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
        {presets.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 14, borderTop: `1px solid ${SHADE.border}` }}>
            <span style={{ font: `600 10px ${TYPE.bodyMono}`, color: SHADE.textFaint, letterSpacing: '0.16em', textTransform: 'uppercase', marginRight: 2 }}>
              or a preset
            </span>
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.description}
                onClick={() => {
                  useCardsStore.getState().setRecipe(cloneRecipeWithFreshIds(p.recipe));
                }}
                style={{
                  padding: '6px 12px', borderRadius: 999,
                  background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
                  color: SHADE.text, cursor: 'pointer',
                  font: `600 11px ${TYPE.body}`, letterSpacing: '0.01em',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

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
  // Restore a shared recipe from the URL (#r=…) once on mount, so a Share link
  // opens the exact composition it encoded. setRecipe is a stable store action.
  useEffect(() => {
    const shared = decodeRecipeFromHash(window.location.hash);
    if (shared) setRecipe(cloneRecipeWithFreshIds(shared));
  }, [setRecipe]);
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
  // Gaea-style preview lock: when set, the preview stays pinned to this card's
  // cumulative output (press F on a block to lock/unlock). Otherwise the
  // preview follows the current selection.
  const [previewLockId, setPreviewLockId] = useState<string | null>(null);
  // Multi-selection — a set of card ids. Single-card paths read the lone id
  // when size === 1. Plain clicks replace; Shift / Cmd / Ctrl clicks toggle.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  // Right-bar tab: 'block' inspector vs 'canvas' global settings. Selecting /
  // double-clicking a block focuses the 'block' tab (the inspector is the
  // single editing surface — no separate modal).
  const [rightTab, setRightTab] = useState<RightTab>('block');

  // ─── Editable code drawer state ────────────────────────────────────
  // The drawer owns three pieces of state: editMode (toggle), editSource
  // (the user's draft GLSL), and compileStatus (chip).
  // editSource only diverges from the recipe-derived GLSL while editMode is
  // on; toggling off resets it.
  const [editMode, setEditMode] = useState(false);
  const [editSource, setEditSource] = useState<string>('');
  const [compileStatus, setCompileStatus] = useState<CompileStatus>({ kind: 'ready' });

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
    // If the URL carries a shared recipe (#r=…), the hash effect above loads
    // it — don't seed a starter over it. (Both effects run in the same commit
    // with `recipe` still empty in this closure, so we must check the hash,
    // not recipe.cards.length, to avoid clobbering the shared recipe.)
    if (decodeRecipeFromHash(window.location.hash)) return;
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

  // Compile the ACTIVE pass → GLSL for the code drawer, so each buffer (Image,
  // A, B…) shows and edits its own code (Shadertoy-style). The renderer itself
  // compiles separately inside RecipeCanvas.
  const activeRecipe = useMemo(
    () => (activePassId === 'image' ? recipe : { ...recipe, cards: activeCards }),
    [recipe, activePassId, activeCards],
  );
  const compiled = useMemo(() => compile(activeRecipe), [activeRecipe]);
  const wrappedGlsl = useMemo(
    () => `${FRAGMENT_PREAMBLE}\n${compiled.glsl}`,
    [compiled.glsl],
  );

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
      // "can't compile; assume ok".
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
  }, []);

  // Compile button → strip the preamble (renderer adds it itself), run
  // through the validator renderer, surface ok / error count.
  const handleCompile = useCallback(() => {
    const body = editSource.split('\n').slice(USER_LINE_OFFSET).join('\n');
    const r = ensureValidator();
    if (!r) {
      // No WebGL — best-effort: treat as compiled so the user can still
      // Better UX than blocking the flow in a non-GL env.
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

  const handleDiscardEdits = useCallback(() => {
    setEditSource(wrappedGlsl);
    setCompileStatus({ kind: 'ready' });
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
  }, [activeCards]);

  // Focus the palette search input — bound to the "/" keyboard shortcut so
  // the user can jump straight to typing a card name.
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

      // Esc — always active (exits fullscreen / clears selection).
      if (e.key === 'Escape') {
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

      // Delete / Backspace — remove every selected block (cards AND anim blocks).
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size === 0) return;
        e.preventDefault();
        const state = useCardsStore.getState();
        // Snapshot ids first — the store mutates underneath us as we delete.
        const ids = Array.from(selectedIds);
        const animIds = new Set((state.recipe.animations ?? []).flatMap((c) => c.blocks.map((b) => b.id)));
        const animDel = ids.filter((id) => animIds.has(id));
        for (const id of ids) if (!animIds.has(id)) state.removeCard(id);
        if (animDel.length > 0) state.removeAnimBlocks(animDel);
        setSelectedIds(new Set());
        return;
      }

      // Enter — focus the Block inspector for the (single) selected block.
      if (e.key === 'Enter') {
        if (selectedIds.size !== 1) return;
        e.preventDefault();
        setRightTab('block');
        return;
      }

      // / — focus palette search.
      if (e.key === '/') {
        e.preventDefault();
        focusPaletteSearch();
        return;
      }

      // Shift+F — toggle the fullscreen preview (plain F is preview-lock).
      if (e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setFullscreen((v) => !v);
        return;
      }

      // F — lock / unlock the preview to the selected block (Gaea-style pin).
      if (!e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        const sel = selectedIds.size === 1 ? [...selectedIds][0]! : null;
        setPreviewLockId((cur) => (cur && (cur === sel || !sel) ? null : sel));
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, fullscreen, undo, redo, focusPaletteSearch, clearSelection]);

  const blocksCount = activeCards.length;
  // Single-card paths read the lone id when exactly one is selected.
  // Properties / preview-title degrade to "global" when ≥2 are selected.
  const singleSelectedId = selectedIds.size === 1 ? [...selectedIds][0]! : null;
  const singleSelectedIdx = singleSelectedId
    ? activeCards.findIndex((c) => c.id === singleSelectedId)
    : -1;
  const selectedCard: Card | null =
    singleSelectedIdx >= 0 ? activeCards[singleSelectedIdx]! : null;
  const selectedCards: Card[] = activeCards.filter((c) => selectedIds.has(c.id));

  // If the lone selection is an ANIMATION block (not a card), resolve it so the
  // SAME right inspector edits its params (reusing the composer block flow).
  const selectedAnim: { chainId: string; block: AnimBlock } | null = (() => {
    if (!singleSelectedId || selectedCard) return null;
    for (const ch of recipe.animations ?? []) {
      const block = ch.blocks.find((b) => b.id === singleSelectedId);
      if (block) return { chainId: ch.id, block };
    }
    return null;
  })();

  // Double-clicking a block selects it and focuses the Block inspector tab
  // (the inspector is the single editing surface — there's no separate modal).
  const handleOpenBlock = useCallback((idx: number) => {
    const card = activeCards[idx];
    if (card) {
      setSelectedIds(new Set([card.id]));
      setRightTab('block');
    }
  }, [activeCards]);

  // When any block(s) become selected, surface the inspector (single or batch).
  useEffect(() => {
    if (selectedIds.size >= 1) setRightTab('block');
  }, [selectedIds]);

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

  // Gaea-style step preview — a pinned (F-locked) block overrides selection;
  // otherwise the current selection drives what the preview renders up to.
  const previewUpToId = previewLockId ?? singleSelectedId;
  // Drop a stale lock if its block was removed.
  useEffect(() => {
    if (previewLockId && !activeCards.some((c) => c.id === previewLockId)) setPreviewLockId(null);
  }, [previewLockId, activeCards]);

  // Auto-select a newly-added block so the preview/inspector follow it —
  // UNLESS you're focused on a locked block (then keep your selection there).
  const prevCardIdsRef = useRef<Set<string>>(new Set(activeCards.map((c) => c.id)));
  useEffect(() => {
    const cur = new Set(activeCards.map((c) => c.id));
    const prev = prevCardIdsRef.current;
    const added = activeCards.filter((c) => !prev.has(c.id));
    prevCardIdsRef.current = cur;
    if (added.length !== 1) return;
    if (previewLockId && singleSelectedId === previewLockId) return; // stay on the locked block
    setSelectedIds(new Set([added[0]!.id]));
  }, [activeCards, previewLockId, singleSelectedId]);

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
                pointerEvents: 'auto', zIndex: 6,
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
                  lockedId={previewLockId}
                  onSelect={handleSelect}
                  onOpen={handleOpenBlock}
                  onSetOrder={(ids) => useCardsStore.getState().setCardOrder(ids)}
                  onInsertCard={(payload) => {
                    // Palette drop payload dispatch: `macro:<name>` inserts a
                    // saved macro, `reroute:<name>` inserts a reroute usage,
                    // `anim:<blockType>` starts a new animation chain (returns
                    // the block id to position), anything else is a card type.
                    const st = useCardsStore.getState();
                    if (payload.startsWith('macro:')) {
                      const def = getMacros().find((m) => m.name === payload.slice(6));
                      return def ? st.insertMacro(def) : null;
                    }
                    if (payload.startsWith('reroute:')) {
                      return st.insertRerouteUse(payload.slice(8));
                    }
                    if (payload.startsWith('anim:')) {
                      return st.startAnimChain(payload.slice(5));
                    }
                    return st.insertTypedCard(payload);
                  }}
                  onAddReroute={(name, atIndex) => useCardsStore.getState().insertRerouteDecl(name, atIndex)}
                  onSelectIds={(ids) => setSelectedIds(new Set(ids))}
                  onMakeMacro={(ids, name) => {
                    const id = useCardsStore.getState().makeMacro(ids, name);
                    if (id) {
                      const st = useCardsStore.getState();
                      const card = getPassCards(st.recipe, st.activePassId).find((c) => c.id === id);
                      if (card?.kind === 'typed' && card.macro) saveMacro(card.macro);
                      setSelectedIds(new Set([id]));
                    }
                    return id;
                  }}
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
                    ← → select  ·  shift+click multi  ·  ⌫ delete  ·  enter edit  ·  drag to reorder  ·  / search  ·  f lock preview  ·  ⌘z undo  ·  ⌘d duplicate
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
              onCompile={handleCompile}
              onDiscard={handleDiscardEdits}
              errorContext={{
                spans: compiled.spans,
                nameOf: (cardId) => {
                  const c = activeCards.find((x) => x.id === cardId) ?? recipe.cards.find((x) => x.id === cardId);
                  if (!c) return 'card';
                  if (c.kind === 'wildcard') return c.displayName ?? 'Custom code';
                  if (c.type === 'macro') return c.macro?.name ?? 'Macro';
                  return lookupCardDef(c.type)?.friendlyName ?? c.type;
                },
              }}
            />
          </div>
        </div>
        <RightColumn
          selectedCard={selectedCard}
          selectedIndex={singleSelectedIdx}
          selectedCards={selectedCards}
          selectedAnim={selectedAnim}
          blocks={blocksCount}
          tempo={120}
          onFullscreen={() => setFullscreen(true)}
          tab={rightTab}
          onTabChange={setRightTab}
          previewUpToId={previewUpToId}
        />
        {fullscreen && <PreviewFullscreen title={previewTitle} onClose={() => setFullscreen(false)} />}
      </div>
    </div>
  );
};
