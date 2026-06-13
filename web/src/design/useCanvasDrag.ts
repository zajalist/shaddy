// useCanvasDrag — the thin React wiring between DOM pointer events and the pure
// `canvas-drag` reducer. It holds the reducer's transient drag state, converts
// screen→world once, tracks double-click timing (the one impure bit), snapshots
// the world at grab time, and executes the reducer's commands through the host's
// callbacks. It owns NO positions — the host keeps the shared `pos` map. Both
// canvas-block species (cards, anim blocks) use this same hook; they differ only
// in the callbacks they pass. See CONTEXT.md ("useCanvasDrag").

import { useRef } from 'react';
import type React from 'react';

import { reduce, IDLE, type DragCommand, type DragConfig, type DragMods, type DragState, type DragWorld, type XY } from './canvas-drag';
import { leftParentMap, rightChildMap, type Placed } from './free-canvas-layout';

const DBL_MS = 350;

export type CanvasDragHandlers = {
  onPointerDown: (id: string) => (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
};

export function useCanvasDrag(opts: {
  /** Live positions of THIS species' blocks (read from the shared pos map). */
  currentItems: () => Placed[];
  config: DragConfig;
  screenToWorld: (clientX: number, clientY: number) => XY;
  onSetPositions: (positions: Record<string, XY>) => void;
  onSnapHint: (id: string | null) => void;
  /** The blocks being dragged (the whole run); empty array when the drag ends. */
  onDraggingChange: (ids: string[]) => void;
  onSelect: (id: string, mods: DragMods) => void;
  /** Only the card adapter passes this; the anim adapter routes 'open' → select. */
  onOpen?: (id: string, mods: DragMods) => void;
  onReorder: (r: { order: string[]; runs: string[][] }) => void;
}): CanvasDragHandlers {
  const stateRef = useRef<DragState>(IDLE);
  const worldRef = useRef<DragWorld | null>(null);
  // Last click (release without a drag), for double-click detection. Cleared on
  // a drag so a quick re-grab isn't mistaken for a double-click.
  const lastClickRef = useRef<{ id: string; t: number } | null>(null);

  const apply = (commands: DragCommand[]): void => {
    for (const c of commands) {
      switch (c.type) {
        case 'setPositions': opts.onSetPositions(c.positions); break;
        case 'snapHint': opts.onSnapHint(c.id); break;
        // A drag-start (id set) clears the last click so a quick re-grab can't
        // be mistaken for a double-click.
        case 'dragging': opts.onDraggingChange(c.ids); if (c.ids.length) lastClickRef.current = null; break;
        case 'select': opts.onSelect(c.id, c.mods); lastClickRef.current = { id: c.id, t: Date.now() }; break;
        case 'open': (opts.onOpen ? opts.onOpen : opts.onSelect)(c.id, c.mods); lastClickRef.current = { id: c.id, t: Date.now() }; break;
        case 'reorder': opts.onReorder({ order: c.order, runs: c.runs }); break;
      }
    }
  };

  const step = (event: Parameters<typeof reduce>[1]): void => {
    if (!worldRef.current) return;
    const r = reduce(stateRef.current, event, worldRef.current, opts.config);
    stateRef.current = r.state;
    apply(r.commands);
  };

  const onPointerDown = (id: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* noop */ }
    const items = opts.currentItems();
    const rc = rightChildMap(items);
    worldRef.current = { items, rightChild: rc, leftParent: leftParentMap(items, rc) };
    const lc = lastClickRef.current;
    const double = !!lc && lc.id === id && Date.now() - lc.t < DBL_MS;
    step({ kind: 'down', itemId: id, mods: { shift: e.shiftKey, alt: e.altKey, double, meta: e.metaKey || e.ctrlKey }, at: opts.screenToWorld(e.clientX, e.clientY) });
  };

  const onPointerMove = (e: React.PointerEvent): void => {
    if (!worldRef.current || stateRef.current.phase === 'idle') return;
    step({ kind: 'move', at: opts.screenToWorld(e.clientX, e.clientY) });
  };

  const onPointerUp = (e: React.PointerEvent): void => {
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    step({ kind: 'up' });
    worldRef.current = null;
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}
