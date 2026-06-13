// Dataflow IR + AST → SSA → DAG lowering for pure straight-line fragment
// shaders. This is the substrate the reverse decompiler matches against
// (see docs/superpowers/specs/2026-05-23-compiler-rework.md and the
// bidirectional-compiler design doc).
//
// Why a DAG and not the AST: variable renaming, statement reordering, and
// inlined-vs-named subexpressions all collapse to the SAME graph once we
// hash-cons. Because the shader is straight-line and pure there is no control
// flow, so SSA degenerates to "last writer wins" — no φ-functions, no
// dominance frontiers (Braun et al., CC 2013, the trivial case).

import { parser } from '@shaderfrog/glsl-parser';

export type ValueId = number;

export type IRNode =
  | { t: 'const'; value: number }
  | { t: 'input'; name: string } // free identifier read before any local write (uv, gl_FragCoord…)
  | { t: 'uniform'; name: string } // free identifier matching /^u_/
  | { t: 'call'; fn: string; args: ValueId[] } // builtin OR constructor (vec2/vec3/vec4…)
  | { t: 'binop'; op: string; a: ValueId; b: ValueId }
  | { t: 'unary'; op: string; a: ValueId }
  | { t: 'swizzle'; src: ValueId; sel: string }
  | { t: 'raw'; key: string }; // opaque escape hatch — a structurally-keyed subtree

export interface DAG {
  nodes: Map<ValueId, IRNode>;
  /** The value written to the fragment output (gl_FragColor / fragColor), or the
   *  last assigned value if no explicit output write was found. */
  output: ValueId;
}

const OUTPUT_NAMES = new Set(['gl_FragColor', 'fragColor']);

type AnyNode = Record<string, unknown>;

/** Strip parser bookkeeping (source locations, whitespace) so structurally
 *  identical subtrees stringify identically — used to key opaque `raw` nodes. */
function structuralKey(node: unknown): string {
  if (node === null || node === undefined) return 'null';
  if (typeof node !== 'object') return JSON.stringify(node);
  if (Array.isArray(node)) return `[${node.map(structuralKey).join(',')}]`;
  const o = node as AnyNode;
  const parts: string[] = [];
  for (const k of Object.keys(o).sort()) {
    if (k === 'location' || k === 'whitespace' || k === 'doc') continue;
    parts.push(`${k}:${structuralKey(o[k])}`);
  }
  return `{${parts.join(',')}}`;
}

export class Builder {
  nodes = new Map<ValueId, IRNode>();
  private intern = new Map<string, ValueId>();
  private next = 0;

  add(node: IRNode): ValueId {
    const key = this.keyOf(node);
    const existing = this.intern.get(key);
    if (existing !== undefined) return existing;
    const id = this.next++;
    this.nodes.set(id, node);
    this.intern.set(key, id);
    return id;
  }

  private keyOf(n: IRNode): string {
    switch (n.t) {
      case 'const': return `c:${n.value}`;
      case 'input': return `i:${n.name}`;
      case 'uniform': return `u:${n.name}`;
      case 'call': return `f:${n.fn}(${n.args.join(',')})`;
      case 'binop': return `b:${n.op}:${n.a},${n.b}`;
      case 'unary': return `n:${n.op}:${n.a}`;
      case 'swizzle': return `s:${n.src}.${n.sel}`;
      case 'raw': return `r:${n.key}`;
    }
  }
}

/** Lower a full fragment-shader source to a dataflow DAG. */
export function lowerGlslToDag(source: string): DAG {
  const ast = parser.parse(source) as { program: unknown[] };
  const fn = ast.program.find(
    (n) => (n as AnyNode).type === 'function' && fnName(n as AnyNode) === 'main',
  ) as AnyNode | undefined;
  const stmts = ((fn?.body as AnyNode | undefined)?.statements as unknown[] | undefined) ?? [];

  const b = new Builder();
  const env = new Map<string, ValueId>();
  let lastAssigned: ValueId | null = null;
  let output: ValueId | null = null;

  const readVar = (name: string): ValueId => {
    const known = env.get(name);
    if (known !== undefined) return known;
    // First read of a free identifier: a uniform (u_*) or an external input.
    const id = name.startsWith('u_') ? b.add({ t: 'uniform', name }) : b.add({ t: 'input', name });
    env.set(name, id);
    return id;
  };

  const lower = (node: unknown): ValueId => {
    const o = node as AnyNode;
    switch (o.type) {
      case 'identifier':
        return readVar(o.identifier as string);
      case 'float_constant':
      case 'int_constant':
        return b.add({ t: 'const', value: Number((o.token as string).replace(/[fF]$/, '')) });
      case 'bool_constant':
        return b.add({ t: 'const', value: o.token === 'true' ? 1 : 0 });
      case 'binary':
        return b.add({ t: 'binop', op: (o.operator as AnyNode).literal as string, a: lower(o.left), b: lower(o.right) });
      case 'unary': {
        const op = (o.operator as AnyNode | undefined)?.literal as string | undefined;
        return b.add({ t: 'unary', op: op ?? '?', a: lower(o.expression) });
      }
      case 'group':
        return lower(o.expression);
      case 'postfix': { // swizzle / member access: expr.sel  (array index falls through to raw)
        const pf = o.postfix as AnyNode | undefined;
        if (pf?.type === 'field_selection') {
          const sel = ((pf.selection as AnyNode)?.identifier as string) ?? structuralKey(pf.selection);
          return b.add({ t: 'swizzle', src: lower(o.expression), sel });
        }
        return b.add({ t: 'raw', key: structuralKey(node) });
      }
      case 'function_call': {
        const fnId = callName(o);
        const args = ((o.args as unknown[] | undefined) ?? [])
          .filter((a) => !isComma(a))
          .map(lower);
        return b.add({ t: 'call', fn: fnId, args });
      }
      default:
        // Anything the canonical subset doesn't model becomes an opaque,
        // structurally-keyed node (the escape hatch in graph form).
        return b.add({ t: 'raw', key: structuralKey(node) });
    }
  };

  for (const stmt of stmts) {
    const s = stmt as AnyNode;
    if (s.type === 'declaration_statement') {
      const dl = s.declaration as AnyNode;
      const decls = (dl?.declarations as unknown[] | undefined) ?? [];
      for (const d of decls) {
        const dn = d as AnyNode;
        const name = ((dn.identifier as AnyNode)?.identifier as string) ?? null;
        if (!name || dn.initializer == null) continue;
        const v = lower(dn.initializer);
        env.set(name, v);
        lastAssigned = v;
      }
    } else if (s.type === 'expression_statement') {
      const expr = s.expression as AnyNode;
      if (expr?.type === 'assignment' && ((expr.operator as AnyNode)?.literal === '=')) {
        const left = expr.left as AnyNode;
        const v = lower(expr.right);
        if (left?.type === 'identifier') {
          const name = left.identifier as string;
          env.set(name, v);
          lastAssigned = v;
          if (OUTPUT_NAMES.has(name)) output = v;
        }
      }
    }
  }

  return { nodes: b.nodes, output: output ?? lastAssigned ?? -1 };
}

function fnName(fnNode: AnyNode): string | null {
  // function → prototype → header → name
  const proto = fnNode.prototype as AnyNode | undefined;
  const header = proto?.header as AnyNode | undefined;
  const name = header?.name as AnyNode | undefined;
  return (name?.identifier as string) ?? null;
}

function callName(call: AnyNode): string {
  const id = call.identifier as AnyNode | undefined;
  if (!id) return '?';
  if (id.type === 'type_specifier') {
    // The specifier IS the type node: a `keyword` (builtin, has .token) or a
    // `type_name`/identifier (user type, has .identifier).
    const spec = id.specifier as AnyNode | undefined;
    return (spec?.token as string) ?? (spec?.identifier as string) ?? '?';
  }
  if (id.type === 'identifier') return (id.identifier as string) ?? '?';
  return (id.token as string) ?? (id.identifier as string) ?? '?';
}

function isComma(node: unknown): boolean {
  const o = node as AnyNode;
  return o?.type === 'literal' && o?.literal === ',';
}

/** Canonical structural serialization of a DAG — an id-INDEPENDENT
 *  S-expression rooted at the output. Two DAGs that are structurally equal
 *  (modulo variable names, whitespace, inlined-vs-named subexpressions, dead
 *  nodes, AND commutative operand order) produce byte-identical strings. This
 *  is the equality oracle for the IR/normalizer/round-trip tests. */
export function dagToString(dag: DAG): string {
  return canonStr(dag, dag.output, new Map());
}

function canonStr(dag: DAG, id: ValueId, memo: Map<ValueId, string>): string {
  const cached = memo.get(id);
  if (cached !== undefined) return cached;
  const n = dag.nodes.get(id);
  let s: string;
  if (!n) s = '_';
  else switch (n.t) {
    case 'const': s = String(n.value); break;
    case 'input': s = `in:${n.name}`; break;
    case 'uniform': s = `u:${n.name}`; break;
    case 'swizzle': s = `${canonStr(dag, n.src, memo)}.${n.sel}`; break;
    case 'unary': s = `(${n.op}${canonStr(dag, n.a, memo)})`; break;
    case 'call': s = `${n.fn}(${n.args.map((a) => canonStr(dag, a, memo)).join(',')})`; break;
    case 'binop': {
      const a = canonStr(dag, n.a, memo);
      const c = canonStr(dag, n.b, memo);
      if (n.op === '+' || n.op === '*') {
        const [x, y] = a <= c ? [a, c] : [c, a]; // commutative → canonical order
        s = `(${x}${n.op}${y})`;
      } else s = `(${a}${n.op}${c})`;
      break;
    }
    case 'raw': s = `raw(${n.key})`; break;
  }
  memo.set(id, s);
  return s;
}

/** The set of value ids reachable from the output — i.e. live nodes. Dead
 *  assignments (a var written then overwritten before any read) drop out. */
export function reachable(dag: DAG): Set<ValueId> {
  const seen = new Set<ValueId>();
  const stack: ValueId[] = [dag.output];
  while (stack.length) {
    const id = stack.pop()!;
    if (id < 0 || seen.has(id)) continue;
    seen.add(id);
    const n = dag.nodes.get(id);
    if (!n) continue;
    if (n.t === 'call') stack.push(...n.args);
    else if (n.t === 'binop') stack.push(n.a, n.b);
    else if (n.t === 'unary') stack.push(n.a);
    else if (n.t === 'swizzle') stack.push(n.src);
  }
  return seen;
}

