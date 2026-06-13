// Stage-2 normalizer — rewrites a dataflow DAG toward canonical form so that
// "wild" / hand-edited GLSL matches the same block patterns the forward
// compiler emits. The doc calls this "the highest-leverage upgrade": a small
// hand-written rewrite set covers the 80% case before reaching for e-graphs.
//
// Properties (see normalize.test.ts):
//   • sound      — rewrites preserve semantics (algebraic identities only),
//   • idempotent — normalize(normalize(x)) === normalize(x),
//   • terminating — each rule strictly shrinks or canonically orders the DAG.

import { Builder, type DAG, type IRNode, type ValueId } from './ir';

function fold(op: string, a: number, c: number): number | null {
  switch (op) {
    case '+': return a + c;
    case '-': return a - c;
    case '*': return a * c;
    case '/': return c === 0 ? null : a / c;
    default: return null;
  }
}

export function normalizeDag(dag: DAG): DAG {
  const b = new Builder();
  const memo = new Map<ValueId, ValueId>();
  const constVal = (id: ValueId): number | null => {
    const n = b.nodes.get(id);
    return n && n.t === 'const' ? n.value : null;
  };

  // Apply local rewrite rules to a node whose children are ALREADY normalized
  // new-DAG ids. Returns a canonical new-DAG id.
  const rewrite = (n: IRNode): ValueId => {
    switch (n.t) {
      case 'binop': {
        const a = constVal(n.a);
        const c = constVal(n.b);
        if (a !== null && c !== null) {
          const r = fold(n.op, a, c);
          if (r !== null) return b.add({ t: 'const', value: r });
        }
        if (n.op === '*') {
          if (c === 1) return n.a;
          if (a === 1) return n.b;
          if (c === 0 || a === 0) return b.add({ t: 'const', value: 0 });
        } else if (n.op === '+') {
          if (c === 0) return n.a;
          if (a === 0) return n.b;
        } else if (n.op === '-') {
          if (c === 0) return n.a;
        } else if (n.op === '/') {
          if (c === 1) return n.a;
        }
        // Commutative ops get a canonical operand order so a+b ≡ b+a.
        let [x, y] = [n.a, n.b];
        if ((n.op === '+' || n.op === '*') && x > y) [x, y] = [y, x];
        return b.add({ t: 'binop', op: n.op, a: x, b: y });
      }
      case 'unary': {
        const c = constVal(n.a);
        if (n.op === '-' && c !== null) return b.add({ t: 'const', value: -c });
        const inner = b.nodes.get(n.a);
        if (n.op === '-' && inner && inner.t === 'unary' && inner.op === '-') return inner.a; // -(-x) → x
        return b.add(n);
      }
      case 'call': {
        if (n.fn === 'pow' && n.args.length === 2) {
          const e = constVal(n.args[1]!);
          if (e === 2) return rewrite({ t: 'binop', op: '*', a: n.args[0]!, b: n.args[0]! }); // pow(x,2)→x*x
          if (e === 1) return n.args[0]!;
          if (e === 0) return b.add({ t: 'const', value: 1 });
        }
        if (n.fn === 'sqrt' && n.args.length === 1) {
          const inner = b.nodes.get(n.args[0]!);
          if (inner && inner.t === 'call' && inner.fn === 'dot' && inner.args.length === 2 && inner.args[0] === inner.args[1]) {
            return b.add({ t: 'call', fn: 'length', args: [inner.args[0]!] }); // sqrt(dot(v,v))→length(v)
          }
        }
        return b.add(n);
      }
      default:
        return b.add(n); // const / input / uniform / swizzle / raw — leaves
    }
  };

  const norm = (id: ValueId): ValueId => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const n = dag.nodes.get(id);
    if (!n) { memo.set(id, id); return id; }
    let rebuilt: IRNode;
    switch (n.t) {
      case 'binop': rebuilt = { t: 'binop', op: n.op, a: norm(n.a), b: norm(n.b) }; break;
      case 'unary': rebuilt = { t: 'unary', op: n.op, a: norm(n.a) }; break;
      case 'call': rebuilt = { t: 'call', fn: n.fn, args: n.args.map(norm) }; break;
      case 'swizzle': rebuilt = { t: 'swizzle', src: norm(n.src), sel: n.sel }; break;
      default: rebuilt = n; break;
    }
    const result = rewrite(rebuilt);
    memo.set(id, result);
    return result;
  };

  const output = norm(dag.output);
  return { nodes: b.nodes, output };
}
