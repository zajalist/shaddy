// Collect numeric literals and vec3-color spans from a shaderfrog AST, in
// document order, with source positions in `generate(ast)`.
//
// Strategy:
//   1. Walk the AST tree with a `seen` set (the AST has node aliasing — the
//      same logical node can be reachable from multiple parents). For each
//      unique float_constant / int_constant / vec3-call, collect a record.
//   2. Run `generate(ast)` once to get byte-identical source.
//   3. Walk the source with a cursor, locating each record's token text
//      sequentially (indexOf from the cursor). This avoids re-implementing
//      shaderfrog's printer to track offsets ourselves.

import { generate } from '@shaderfrog/glsl-parser';

export type LeafKind =
  | 'float_constant'
  | 'int_constant'
  | 'function_call_vec3_color';

export type Leaf = {
  kind: LeafKind;
  /** Inclusive start offset into `generate(ast)`. */
  start: number;
  /** Exclusive end offset. */
  end: number;
  /** Original token text for numeric leaves; full call text for color spans. */
  text: string;
  /** AST node — caller may mutate `node.token` for round-trip via generate(). */
  node: any;
  /** For vec3-color spans, the three numeric-constant child nodes in order. */
  numericChildren?: any[];
};

type Record =
  | { kind: 'float_constant' | 'int_constant'; node: any; sortKey: number }
  | { kind: 'function_call_vec3_color'; node: any; numericChildren: any[]; sortKey: number };

export function findNumericLeaves(ast: any): Leaf[] {
  if (!ast) return [];

  // ---------- Pass 1: collect unique records in walk-order ----------

  const seen = new Set<any>();
  const records: Record[] = [];
  let nextSortKey = 0;

  const walk = (node: any): void => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    if (typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (node.type === 'float_constant' || node.type === 'int_constant') {
      records.push({ kind: node.type, node, sortKey: nextSortKey++ });
      // Numeric constants have no children of interest.
      return;
    }

    if (node.type === 'function_call') {
      const fnName = _functionName(node);
      const numericArgs = _topLevelNumericArgs(node);
      if (fnName === 'vec3' && numericArgs.length === 3) {
        // Walk the args first (so their float_constant records come before the
        // color span record in document order — feels right for the spec's
        // "every numeric literal in order" semantics).
        for (const k of Object.keys(node)) {
          if (k === 'type' || k === 'whitespace') continue;
          walk(node[k]);
        }
        records.push({
          kind: 'function_call_vec3_color',
          node,
          numericChildren: numericArgs,
          sortKey: nextSortKey++,
        });
        return;
      }
    }

    // Generic descent.
    for (const k of Object.keys(node)) {
      if (k === 'type' || k === 'whitespace') continue;
      walk(node[k]);
    }
  };
  walk(ast);

  // ---------- Pass 2: compute positions via generated source ----------

  let src: string;
  try {
    src = generate(ast);
  } catch {
    return [];
  }

  // For positioning, we need numeric leaves in source order (which is also
  // walk order in this AST, for nodes we care about). Vec3 color spans are
  // positioned via their numeric children, which are already located.

  const numericLocations = new Map<any, { start: number; end: number; text: string }>();
  let cursor = 0;

  for (const r of records) {
    if (r.kind === 'float_constant' || r.kind === 'int_constant') {
      const token = String(r.node.token ?? '');
      const start = src.indexOf(token, cursor);
      if (start === -1) {
        // Shouldn't happen — every numeric in the AST corresponds to text in
        // the generated source. If it does, skip to avoid producing garbage.
        continue;
      }
      const end = start + token.length;
      numericLocations.set(r.node, { start, end, text: token });
      cursor = end;
    }
  }

  // ---------- Pass 3: emit leaves in document order ----------

  const out: Leaf[] = [];
  for (const r of records) {
    if (r.kind === 'float_constant' || r.kind === 'int_constant') {
      const loc = numericLocations.get(r.node);
      if (!loc) continue;
      out.push({ kind: r.kind, start: loc.start, end: loc.end, text: loc.text, node: r.node });
    } else {
      // vec3-color span: from the start of "vec3" preceding the first numeric
      // child, to the matching ")" after the last numeric child.
      const first = numericLocations.get(r.numericChildren[0]);
      const last = numericLocations.get(r.numericChildren[r.numericChildren.length - 1]);
      if (!first || !last) continue;
      const vec3Start = src.lastIndexOf('vec3', first.start);
      const rparen = src.indexOf(')', last.end);
      if (vec3Start === -1 || rparen === -1) continue;
      out.push({
        kind: 'function_call_vec3_color',
        start: vec3Start,
        end: rparen + 1,
        text: src.slice(vec3Start, rparen + 1),
        node: r.node,
        numericChildren: r.numericChildren,
      });
    }
  }

  return out;
}

function _functionName(call: any): string | null {
  const id = call.identifier;
  if (!id) return null;
  // shaderfrog: function-style calls like vec3(...) have:
  //   identifier: { type: 'type_specifier', specifier: { type: 'keyword', token: 'vec3' } }
  if (typeof id?.specifier?.token === 'string') return id.specifier.token;
  if (typeof id?.specifier?.specifier?.token === 'string') return id.specifier.specifier.token;
  if (typeof id?.identifier === 'string') return id.identifier;
  if (typeof id?.identifier?.identifier === 'string') return id.identifier.identifier;
  return null;
}

function _topLevelNumericArgs(call: any): any[] {
  const args = call.args ?? [];
  const list: any[] = Array.isArray(args) ? args : [];
  const out: any[] = [];
  for (const a of list) {
    if (!a || typeof a !== 'object') continue;
    if (a.type === 'float_constant' || a.type === 'int_constant') out.push(a);
  }
  return out;
}

export function generateSource(ast: any): string {
  return generate(ast);
}
