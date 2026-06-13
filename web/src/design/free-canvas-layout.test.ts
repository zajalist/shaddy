import { describe, expect, it } from 'vitest';
import {
  BW, rightChildMap, leftParentMap, runFrom, wholeStack, precedentsRun, runForMode, readingOrder,
  type Placed,
} from './free-canvas-layout';

// The Chain's spatial logic — adjacency, run-traversal, and the reading-order
// that becomes the Recipe's compile order — used to be buried inside a 2,900-
// line React component with no test seam. Now it's pure and pinned here.

// A horizontal stack a→b→c on row y=100, plus a detached d on row y=200.
const stack = (): Placed[] => [
  { id: 'a', x: 0, y: 100 },
  { id: 'b', x: BW, y: 100 },
  { id: 'c', x: BW * 2, y: 100 },
  { id: 'd', x: 0, y: 200 },
];

describe('free-canvas-layout', () => {
  it('rightChildMap links one-stride same-row neighbours; ignores far / off-row', () => {
    const rc = rightChildMap(stack());
    expect(rc.a).toBe('b');
    expect(rc.b).toBe('c');
    expect(rc.c).toBeNull();       // tail
    expect(rc.d).toBeNull();       // different row
  });

  it('snaps within tolerance, not beyond', () => {
    expect(rightChildMap([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: BW + 10, y: 0 }]).a).toBe('b'); // 10 < SNAP_X
    expect(rightChildMap([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: BW + 40, y: 0 }]).a).toBeNull(); // 40 > SNAP_X
    expect(rightChildMap([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: BW, y: 50 }]).a).toBeNull();     // 50 > SNAP_Y row gap
  });

  it('leftParentMap is the inverse of rightChildMap', () => {
    const list = stack();
    const rc = rightChildMap(list);
    const lp = leftParentMap(list, rc);
    expect(lp.b).toBe('a');
    expect(lp.c).toBe('b');
    expect(lp.a).toBeUndefined(); // a head has no left parent
  });

  it('runFrom / wholeStack / precedentsRun walk the chain', () => {
    const list = stack();
    const rc = rightChildMap(list);
    const lp = leftParentMap(list, rc);
    expect(runFrom('b', rc)).toEqual(['b', 'c']);
    expect(wholeStack('b', rc, lp)).toEqual(['a', 'b', 'c']);
    expect(precedentsRun('c', lp)).toEqual(['a', 'b', 'c']);
  });

  it('runForMode carries the right set per modifier', () => {
    const list = stack();
    const rc = rightChildMap(list);
    const lp = leftParentMap(list, rc);
    expect(runForMode('b', 'single', rc, lp)).toEqual(['b']);
    expect(runForMode('b', 'subsequents', rc, lp)).toEqual(['b', 'c']);
    expect(runForMode('b', 'precedents', rc, lp)).toEqual(['a', 'b']);
    expect(runForMode('b', 'whole', rc, lp)).toEqual(['a', 'b', 'c']);
  });

  it('readingOrder: stack heads top→bottom / left→right, then each right-chain', () => {
    // Two stacks: top row a→b, bottom row d (head), plus a lone c far right top.
    const list: Placed[] = [
      { id: 'b', x: BW, y: 100 },
      { id: 'a', x: 0, y: 100 },
      { id: 'd', x: 0, y: 300 },
      { id: 'c', x: BW * 5, y: 100 }, // separate top-row head, further right
    ];
    // Heads sorted by (y,x): a(0,100), c(840,100), d(0,300). a's chain = a,b.
    expect(readingOrder(list)).toEqual(['a', 'b', 'c', 'd']);
  });
});
