// Free-move puzzle-block layout — the PURE spatial logic of the Chain canvas,
// lifted out of DesktopApp so it can be reasoned about and tested without React.
//
// Blocks live at free (x,y). Two blocks are adjacent when one sits ~one stride
// to the other's right on the same row; adjacency forms left→right "stacks".
// The compile order of a Recipe is the spatial READING ORDER of its blocks
// (stack heads top→bottom / left→right, then each stack's right-chain) — so
// where you drop a block IS where it lands in the chain. This module owns that
// rule (previously duplicated between the canvas UI and the compiler's intent).

/** Block stride: the right tab overlaps the next block's left notch. */
export const BW = 168;
/** Horizontal snap tolerance to a block's right tab. */
export const SNAP_X = 22;
/** Vertical snap tolerance (the same-row test). */
export const SNAP_Y = 30;

/** A block reduced to what layout needs: an id + its top-left position. */
export type Placed = { id: string; x: number; y: number };
export type DragMode = 'whole' | 'subsequents' | 'single' | 'precedents';
/** id → the id immediately to its right (or null). */
export type Adjacency = Record<string, string | null>;

/** B is A's right-neighbour when it sits one stride to A's right on the same
 *  row; ties broken by the closest. */
export function rightChildMap(list: ReadonlyArray<Placed>): Adjacency {
  const rc: Adjacency = {};
  for (const a of list) {
    let best: { id: string; dx: number } | null = null;
    for (const b of list) {
      if (b.id === a.id) continue;
      if (Math.abs(b.y - a.y) > SNAP_Y) continue;
      const dx = b.x - (a.x + BW);
      if (Math.abs(dx) <= SNAP_X && (!best || Math.abs(dx) < Math.abs(best.dx))) best = { id: b.id, dx };
    }
    rc[a.id] = best?.id ?? null;
  }
  return rc;
}

/** Inverse of rightChildMap: id → the id immediately to its LEFT (first wins). */
export function leftParentMap(list: ReadonlyArray<Placed>, rightChild: Adjacency): Adjacency {
  const lp: Adjacency = {};
  for (const a of list) {
    const c = rightChild[a.id];
    if (c && lp[c] == null) lp[c] = a.id;
  }
  return lp;
}

/** A block + its right-descendants (the run from this block to the tail). */
export function runFrom(id: string, rc: Adjacency): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let cur: string | null = id;
  while (cur && !seen.has(cur)) { out.push(cur); seen.add(cur); cur = rc[cur] ?? null; }
  return out;
}

/** The whole connected line: walk to the stack head, then collect head→tail. */
export function wholeStack(id: string, rc: Adjacency, lp: Adjacency): string[] {
  let head = id;
  const seen = new Set<string>();
  while (lp[head] && !seen.has(head)) { seen.add(head); head = lp[head]!; }
  return runFrom(head, rc);
}

/** This block + its precedents (stack head … this block, inclusive). */
export function precedentsRun(id: string, lp: Adjacency): string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur: string | null = id;
  while (cur && !seen.has(cur)) { chain.push(cur); seen.add(cur); cur = lp[cur] ?? null; }
  return chain.reverse();
}

/** Which blocks a grab carries, by modifier. */
export function runForMode(id: string, mode: DragMode, rc: Adjacency, lp: Adjacency): string[] {
  return mode === 'single' ? [id]
    : mode === 'subsequents' ? runFrom(id, rc)
      : mode === 'precedents' ? precedentsRun(id, lp)
        : wholeStack(id, rc, lp);
}

/** The reading-order compile sequence for a set of placed blocks: stack heads
 *  ordered top→bottom / left→right, then each stack's right-chain. A trailing
 *  defensive pass appends anything unreached (cycle safety). */
export function readingOrder(list: ReadonlyArray<Placed>): string[] {
  const rc = rightChildMap(list);
  const lp = leftParentMap(list, rc);
  const heads = list.filter((a) => lp[a.id] == null).slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const order: string[] = [];
  const seen = new Set<string>();
  for (const h of heads) {
    let cur: string | null = h.id;
    while (cur && !seen.has(cur)) { order.push(cur); seen.add(cur); cur = rc[cur] ?? null; }
  }
  for (const a of list) if (!seen.has(a.id)) order.push(a.id);
  return order;
}

/** The snapped RUNS: each maximal left→right chain is one run; an unsnapped
 *  block is its own 1-element run. This is the grouping the canvas derives from
 *  positions — cards consume the flat reading order, anim chains consume one
 *  chain per run (an unsnapped anim block = its own animation). */
export function runsOf(list: ReadonlyArray<Placed>): string[][] {
  const rc = rightChildMap(list);
  const lp = leftParentMap(list, rc);
  const seen = new Set<string>();
  const runs: string[][] = [];
  for (const a of list) {
    if (lp[a.id] != null) continue; // only run heads start a walk
    const run: string[] = [];
    let cur: string | null = a.id;
    while (cur && !seen.has(cur)) { run.push(cur); seen.add(cur); cur = rc[cur] ?? null; }
    runs.push(run);
  }
  for (const a of list) if (!seen.has(a.id)) { runs.push([a.id]); seen.add(a.id); } // cycle safety
  return runs;
}

export type SnapHit = { id: string; side: 'right' | 'left' };
/** The nearest block a dragged run of length `runLen` (its head at `head`) can
 *  click into. `right` = the run attaches AFTER the target; `left` = the run's
 *  tail attaches before it. Bidirectional + caller-supplied tolerance — the one
 *  snap policy shared by both canvas-block species. */
export function nearestSnap(
  list: ReadonlyArray<Placed>,
  head: { x: number; y: number },
  runLen: number,
  exclude: ReadonlySet<string>,
  snapX: number,
  snapY: number,
): SnapHit | null {
  const tailX = head.x + BW * runLen;
  let best: { id: string; side: 'right' | 'left'; dist: number } | null = null;
  for (const a of list) {
    if (exclude.has(a.id)) continue;
    if (Math.abs(a.y - head.y) > snapY) continue;
    const dRight = Math.abs((a.x + BW) - head.x);
    if (dRight <= snapX && (!best || dRight < best.dist)) best = { id: a.id, side: 'right', dist: dRight };
    const dLeft = Math.abs(a.x - tailX);
    if (dLeft <= snapX && (!best || dLeft < best.dist)) best = { id: a.id, side: 'left', dist: dLeft };
  }
  return best ? { id: best.id, side: best.side } : null;
}
