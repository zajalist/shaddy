import { describe, expect, it } from 'vitest';
import { reduce, IDLE, type DragCommand, type DragConfig, type DragEvent, type DragState, type DragWorld } from './canvas-drag';
import { rightChildMap, leftParentMap, BW } from './free-canvas-layout';

// The drag reducer is the test surface the imperative handlers never were.
const CFG: DragConfig = { snapTol: 48, doubleClick: 'open' };   // card adapter
const CFG_ANIM: DragConfig = { snapTol: 48, doubleClick: 'select' }; // anim adapter

const world = (items: Array<{ id: string; x: number; y: number }>): DragWorld => {
  const rc = rightChildMap(items);
  return { items, rightChild: rc, leftParent: leftParentMap(items, rc) };
};
const mods = (m: Partial<{ shift: boolean; alt: boolean; double: boolean; meta: boolean }> = {}) => ({ shift: false, alt: false, double: false, meta: false, ...m });
const drive = (w: DragWorld, events: DragEvent[], cfg = CFG) => {
  let state: DragState = IDLE;
  const commands: DragCommand[] = [];
  for (const e of events) { const r = reduce(state, e, w, cfg); state = r.state; commands.push(...r.commands); }
  return { state, commands };
};
const last = <T extends DragCommand['type']>(cmds: DragCommand[], type: T) =>
  [...cmds].reverse().find((c) => c.type === type) as Extract<DragCommand, { type: T }> | undefined;

describe('canvas-drag reducer — clicks', () => {
  it('a press with no drag selects the grabbed block', () => {
    const w = world([{ id: 'a', x: 0, y: 0 }]);
    const { commands } = drive(w, [{ kind: 'down', itemId: 'a', mods: mods(), at: { x: 5, y: 5 } }, { kind: 'up' }]);
    expect(commands).toEqual([{ type: 'select', id: 'a', mods: mods() }]);
  });

  it('a double-click opens for the card adapter, selects for the anim adapter', () => {
    const w = world([{ id: 'a', x: 0, y: 0 }]);
    const down: DragEvent = { kind: 'down', itemId: 'a', mods: mods({ double: true }), at: { x: 5, y: 5 } };
    expect(drive(w, [down, { kind: 'up' }], CFG).commands).toEqual([{ type: 'open', id: 'a', mods: mods({ double: true }) }]);
    expect(drive(w, [down, { kind: 'up' }], CFG_ANIM).commands).toEqual([{ type: 'select', id: 'a', mods: mods({ double: true }) }]);
  });

  it('a shift/⌘ click carries the toggle modifier so the host can multi-select', () => {
    const w = world([{ id: 'a', x: 0, y: 0 }]);
    const sel = drive(w, [{ kind: 'down', itemId: 'a', mods: mods({ shift: true }), at: { x: 5, y: 5 } }, { kind: 'up' }]).commands;
    expect(last(sel, 'select')?.mods.shift).toBe(true);
  });

  it('a move under the threshold is still a click, not a drag', () => {
    const w = world([{ id: 'a', x: 0, y: 0 }]);
    const { commands } = drive(w, [{ kind: 'down', itemId: 'a', mods: mods(), at: { x: 5, y: 5 } }, { kind: 'move', at: { x: 6, y: 6 } }, { kind: 'up' }]);
    expect(commands.find((c) => c.type === 'setPositions')).toBeUndefined();
    expect(last(commands, 'select')?.id).toBe('a');
  });
});

describe('canvas-drag reducer — run selection by modifier', () => {
  // a—b—c snapped (each one stride apart)
  const w = world([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: BW, y: 0 }, { id: 'c', x: 2 * BW, y: 0 }]);
  const movedIds = (cfgMods: ReturnType<typeof mods>, grab = 'b') => {
    const { commands } = drive(w, [{ kind: 'down', itemId: grab, mods: cfgMods, at: { x: 5, y: 5 } }, { kind: 'move', at: { x: 200, y: 305 } }]);
    return Object.keys(last(commands, 'setPositions')!.positions).sort();
  };
  it('plain drag carries the whole connected run', () => { expect(movedIds(mods())).toEqual(['a', 'b', 'c']); });
  it('shift carries just the grabbed block', () => { expect(movedIds(mods({ shift: true }))).toEqual(['b']); });
  it('alt carries the block + its precedents', () => { expect(movedIds(mods({ alt: true }))).toEqual(['a', 'b']); });
  it('double carries the block + its subsequents', () => { expect(movedIds(mods({ double: true }))).toEqual(['b', 'c']); });
});

describe('canvas-drag reducer — drop & regroup', () => {
  it('dropping in open space leaves each block its own run', () => {
    const w = world([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 600, y: 0 }]);
    // drag a a little, staying far from b
    const { commands } = drive(w, [{ kind: 'down', itemId: 'a', mods: mods(), at: { x: 5, y: 5 } }, { kind: 'move', at: { x: 105, y: 305 } }, { kind: 'up' }]);
    const reorder = last(commands, 'reorder')!;
    expect(reorder.runs.map((r) => r.sort()).sort()).toEqual([['a'], ['b']]);
  });

  it('dropping a block flush right of a target snaps + merges them into one run', () => {
    const w = world([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 600, y: 0 }]);
    // move a so its left edge lands on b's right edge (head ≈ b.x + BW = 768)
    const { commands } = drive(w, [{ kind: 'down', itemId: 'a', mods: mods(), at: { x: 5, y: 5 } }, { kind: 'move', at: { x: 773, y: 5 } }, { kind: 'up' }]);
    const reorder = last(commands, 'reorder')!;
    expect(reorder.runs).toEqual([['b', 'a']]); // b then a (a snapped to b's right)
    expect(last(commands, 'setPositions')!.positions.a).toEqual({ x: 600 + BW, y: 0 });
  });

  it('snaps bidirectionally — a run can attach to the LEFT of a target', () => {
    const w = world([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 600, y: 0 }]);
    // move a so its RIGHT edge lands on b's left edge (head ≈ b.x - BW = 432)
    const { commands } = drive(w, [{ kind: 'down', itemId: 'a', mods: mods(), at: { x: 5, y: 5 } }, { kind: 'move', at: { x: 437, y: 5 } }, { kind: 'up' }]);
    const reorder = last(commands, 'reorder')!;
    expect(reorder.runs).toEqual([['a', 'b']]); // a then b (a snapped to b's left)
    expect(last(commands, 'setPositions')!.positions.a).toEqual({ x: 600 - BW, y: 0 });
  });

  it('a CLOSE drop (within the generous tolerance) still snaps', () => {
    const w = world([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 600, y: 0 }]);
    // 40px short of flush-right (768) — outside the tight 22px window, inside 48
    const { commands } = drive(w, [{ kind: 'down', itemId: 'a', mods: mods(), at: { x: 5, y: 5 } }, { kind: 'move', at: { x: 733, y: 5 } }, { kind: 'up' }]);
    expect(last(commands, 'reorder')!.runs).toEqual([['b', 'a']]);
  });
});
