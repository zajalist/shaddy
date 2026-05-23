# editor/

**Owner:** zajalist
**Public surface:** [`index.ts`](./index.ts) — see [`../../../CONTRACTS.md`](../../../CONTRACTS.md) §2.

CodeMirror 6 editor for GLSL. Parses with `glsl-parser`, decorates numeric and color literals, exposes recognized patterns (`length(uv - vec2(x,y))`, `vec3(r,g,b)`, `smoothstep(a,b,x)`) so UX can render canvas-side handles.

## Internal layout (private)
- `cm/` — CodeMirror extensions, decorations.
- `parse/` — AST cache, pattern matchers.
- `mutate/` — `replaceLiteral`, the inverse direction.
- `__mocks__/` — plain `<textarea>` fake editor for downstream tests.

## Source is truth
There is no separate "handle state". A drag mutates the source string and re-emits via `onSourceChange`. This is what makes the abstraction honest and what teaches users they're editing GLSL.
