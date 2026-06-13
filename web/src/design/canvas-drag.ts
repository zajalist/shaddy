// canvas-drag — the PURE drag state-machine for canvas blocks (cards + anim
// blocks). It owns run-selection, snap, and drop-reorder by orchestrating the
// pure helpers in free-canvas-layout. React-free, so it IS the test surface for
// the drag — the imperative glue that previously hid the bugs (and diverged
// between the composer and the anim layer) now lives in one tested place. The
// thin `useCanvasDrag` hook wires DOM pointer events to this reducer; the host
// owns the shared `pos` map and interprets the emitted commands.
//
// All coordinates are WORLD space — the hook converts screen→world once and the
// reducer never knows about the camera. See CONTEXT.md ("drag reducer").

import {
  BW, SNAP_X, SNAP_Y,
  runForMode, readingOrder, runsOf, nearestSnap,
  type Adjacency, type DragMode, type Placed,
} from './free-canvas-layout';

export type XY = { x: number; y: number };
/** shift/alt/double drive the drag run-mode; shift/meta also mean toggle-select
 *  on a click (the host resolves that from the `select` command's mods). */
export type DragMods = { shift: boolean; alt: boolean; double: boolean; meta: boolean };

/** Pointer events, already in world coordinates. */
export type DragEvent =
  | { kind: 'down'; itemId: string; mods: DragMods; at: XY }
  | { kind: 'move'; at: XY }
  | { kind: 'up' };

/** The world snapshot the host supplies each event: every canvas block of THIS
 *  species at its current position, plus the adjacency (from free-canvas-layout). */
export type DragWorld = { items: Placed[]; rightChild: Adjacency; leftParent: Adjacency };

export type DragConfig = {
  /** Generous, bidirectional snap-detection tolerance — the unified policy. */
  snapTol: number;
  /** A double-click WITHOUT a drag opens (cards) or just selects (anim blocks). */
  doubleClick: 'open' | 'select';
};

export type DragState =
  | { phase: 'idle' }
  | { phase: 'pressed'; ids: string[]; orig: Record<string, XY>; start: XY; mods: DragMods; headId: string }
  | { phase: 'dragging'; ids: string[]; orig: Record<string, XY>; start: XY; mods: DragMods; headId: string; cur: XY };

export const IDLE: DragState = { phase: 'idle' };

/** Commands the host interprets: position writes, transient visual hints, and
 *  the semantic outcomes (select / open / reorder). */
export type DragCommand =
  | { type: 'setPositions'; positions: Record<string, XY> }
  | { type: 'snapHint'; id: string | null }
  /** The blocks currently being dragged (the whole run) — empty when none. */
  | { type: 'dragging'; ids: string[] }
  | { type: 'select'; id: string; mods: DragMods }
  | { type: 'open'; id: string; mods: DragMods }
  | { type: 'reorder'; order: string[]; runs: string[][] };

/** World-space distance before a press becomes a drag (vs a click). */
const MOVE_THRESHOLD = 3;

function modeOf(mods: DragMods): DragMode {
  return mods.shift ? 'single' : mods.alt ? 'precedents' : mods.double ? 'subsequents' : 'whole';
}

/** The one transition function. Pure: (state, event, world, config) → (state, commands). */
export function reduce(
  state: DragState,
  event: DragEvent,
  world: DragWorld,
  config: DragConfig,
): { state: DragState; commands: DragCommand[] } {
  switch (event.kind) {
    case 'down': {
      const ids = runForMode(event.itemId, modeOf(event.mods), world.rightChild, world.leftParent);
      const orig: Record<string, XY> = {};
      for (const it of world.items) if (ids.includes(it.id)) orig[it.id] = { x: it.x, y: it.y };
      return { state: { phase: 'pressed', ids, orig, start: event.at, mods: event.mods, headId: event.itemId }, commands: [] };
    }

    case 'move': {
      if (state.phase === 'idle') return { state, commands: [] };
      const dist = Math.hypot(event.at.x - state.start.x, event.at.y - state.start.y);
      if (state.phase === 'pressed' && dist < MOVE_THRESHOLD) return { state, commands: [] };
      const dx = event.at.x - state.start.x;
      const dy = event.at.y - state.start.y;
      const positions: Record<string, XY> = {};
      for (const id of state.ids) { const o = state.orig[id]!; positions[id] = { x: o.x + dx, y: o.y + dy }; }
      const head = positions[state.ids[0]!]!;
      const snap = nearestSnap(world.items, head, state.ids.length, new Set(state.ids), config.snapTol, SNAP_Y);
      const justStarted = state.phase === 'pressed';
      const next: DragState = { phase: 'dragging', ids: state.ids, orig: state.orig, start: state.start, mods: state.mods, headId: state.headId, cur: event.at };
      const commands: DragCommand[] = [{ type: 'setPositions', positions }, { type: 'snapHint', id: snap?.id ?? null }];
      if (justStarted) commands.push({ type: 'dragging', ids: state.ids });
      return { state: next, commands };
    }

    case 'up': {
      if (state.phase === 'idle') return { state: IDLE, commands: [] };
      if (state.phase === 'pressed') {
        // A press without a drag = a click. Double-click opens (cards) or just
        // selects (anim) per config; a single click selects the grabbed block.
        const cmd: DragCommand = state.mods.double && config.doubleClick === 'open'
          ? { type: 'open', id: state.headId, mods: state.mods }
          : { type: 'select', id: state.headId, mods: state.mods };
        return { state: IDLE, commands: [cmd] };
      }
      // Drop: place the run (flush onto a snap target if any), then derive the
      // new spatial grouping — `order` (cards) and `runs` (anim chains).
      const dx = state.cur.x - state.start.x;
      const dy = state.cur.y - state.start.y;
      const ids = state.ids;
      const idSet = new Set(ids);
      const final: Record<string, XY> = {};
      for (const it of world.items) final[it.id] = idSet.has(it.id) ? { x: state.orig[it.id]!.x + dx, y: state.orig[it.id]!.y + dy } : { x: it.x, y: it.y };
      const head = final[ids[0]!]!;
      const snap = nearestSnap(world.items, head, ids.length, idSet, config.snapTol, SNAP_Y);
      if (snap) {
        const tgt = world.items.find((i) => i.id === snap.id)!;
        const shift = BW * ids.length;
        if (snap.side === 'right') {
          for (const it of world.items) {
            if (idSet.has(it.id) || it.id === tgt.id) continue;
            if (Math.abs(it.y - tgt.y) <= SNAP_Y && it.x > tgt.x + SNAP_X) final[it.id] = { x: it.x + shift, y: it.y };
          }
          ids.forEach((id, k) => { final[id] = { x: tgt.x + BW * (k + 1), y: tgt.y }; });
        } else {
          for (const it of world.items) {
            if (idSet.has(it.id) || it.id === tgt.id) continue;
            if (Math.abs(it.y - tgt.y) <= SNAP_Y && it.x < tgt.x - SNAP_X) final[it.id] = { x: it.x - shift, y: it.y };
          }
          ids.forEach((id, k) => { final[id] = { x: tgt.x - BW * (ids.length - k), y: tgt.y }; });
        }
      }
      const placedFinal: Placed[] = world.items.map((it) => ({ id: it.id, x: final[it.id]!.x, y: final[it.id]!.y }));
      return {
        state: IDLE,
        commands: [
          { type: 'setPositions', positions: final },
          { type: 'snapHint', id: null },
          { type: 'dragging', ids: [] },
          { type: 'reorder', order: readingOrder(placedFinal), runs: runsOf(placedFinal) },
        ],
      };
    }
  }
}
