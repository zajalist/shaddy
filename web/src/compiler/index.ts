// Dataflow optimization IR — public surface.
//
// This is the ONLY thing left of the old parked "compiler rework": a dataflow
// DAG the live cards/ compiler does NOT have, kept as the substrate for a
// future GLSL-optimisation pass (e.g. deep macro constant-fold / CSE). The rest
// of that rewrite — a second Recipe/Animation/markers/format/helpers/blocks and
// a bidirectional decompiler — duplicated and drifted from cards/ with zero app
// consumers, so it was removed (git history has it if ever needed).
//
//   lowerGlslToDag(src) → a hash-consed dataflow DAG (CSE for free; straight-
//                         line pure GLSL only)
//   normalizeDag(dag)   → constant-fold + algebraic identities
//   dagToString(dag)    → canonical, id-independent S-expression (equality
//                         oracle: two DAGs equal modulo renaming/whitespace/
//                         commutativity produce byte-identical strings)
//   reachable(dag)      → the live node set (dead-code view)
//
// NOT wired into the app. When the macro-fold work lands it should consume this
// from cards/ via a thin adapter, not the other way round.

export { lowerGlslToDag, dagToString, reachable, Builder } from './ir';
export type { DAG, IRNode, ValueId } from './ir';
export { normalizeDag } from './normalize';
