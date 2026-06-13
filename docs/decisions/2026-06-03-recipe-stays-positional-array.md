# Decision — Recipe stays a positional array (no keyed-store refactor)

**Date:** 2026-06-03
**Status:** accepted
**Driver:** architecture review (`/improve-codebase-architecture`)

## Context

An architecture review flagged the Zustand store (`web/src/cards/state.ts`): its
mutators repeatedly locate a card via `findCardAnyPass` (an O(n) scan) and edit
via `mutateCardInItsPass`, because a `Recipe` is positional arrays
(`Recipe.cards: Card[]`, plus `passes[].cards`). The review proposed changing the
representation to a keyed map — `Record<string, Card>` + a `cardOrder: string[]`
— to make lookups O(1) and "invariants explicit."

## Decision

**We will not change the representation. `Recipe.cards` stays an ordered
`Card[]`.** This decision exists so future reviews do not re-suggest it.

## Why (load-bearing reasons)

1. **Positional order is load-bearing in the compiler, not just the store.**
   Uniform names are `u_card{index}_{param}` where `index` is the card's array
   position (`uniform-names.ts` / `cards/compile.ts`). The emit order, the
   reading-order compile sequence, and the reverse parser's span matching all
   key off array position. A keyed store would still have to derive the ordered
   array for compilation — so the positional model does not go away; it gets
   **duplicated** (map + order array that must stay in lockstep).

2. **`Recipe` is the serialized source of truth.** It round-trips through JSON
   (CONTRACTS.md §3) and now also through the `#r=` share URL. A single ordered
   array serializes unambiguously; a `{cards: map, cardOrder: []}` pair is a
   strictly more fragile wire format (the order array can desync from the keys).

3. **It risks the byte-identical-output + reverse-parse invariants for no
   compiler gain.** Those invariants are pinned by the 160-card round-trip
   oracle and depend on positional indices. Re-basing indices to map keys is
   churn against the project's strongest correctness guarantees.

4. **The perf win is negligible.** Recipes hold dozens of cards, and lookups
   happen on discrete user actions (insert/remove/reorder), never in a hot
   loop. O(n) over ~30 items is free.

## Consequences

- `findCardAnyPass` / `mutateCardInItsPass` stay O(n). Acceptable at this scale.
- If we later want *explicit* store invariants (the review's real concern), the
  cheap move is **assertions/tests over the array** (e.g. "ids are unique",
  "cardOrder ⊆ cards") — not a representation change.
- Related deepenings from the same review WERE adopted (helper-map, uniform-name
  codec, SpanBuilder, FreeCanvasLayout extraction, shadow-`compiler/` deletion,
  CardDef IO contract, seam/CONTRACTS reconciliation). This is the one we
  deliberately declined.
