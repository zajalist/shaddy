// Named reroute — USAGE. A SOURCE card: starts a chain from the value captured
// by a reroute DECLARATION of the same name (ignores any prior input).
//
// Hidden from the palette list: usages are inserted by NAME via the dynamic
// "Reroutes" entries injected into the left palette + ⌘K (one per declared
// reroute), which set `ref` to the chosen name. Special-cased by the compiler
// exactly like reroute-decl — the snippet is never emitted; the compiler emits
// `col = rr_<sanitized ref>;`. A ref with no matching declaration reads the
// pre-declared `rr_*` (initialised to vec3(0.0)), so it never errors.

import type { CardDef } from '../types';

export const REROUTE_USE: CardDef = {
  type: 'reroute_use',
  category: 'effect',
  friendlyName: 'Reroute (use)',
  description: 'Reads a named reroute as a source — the same code as one long chain.',
  icon: '⤻',
  params: {
    ref: { kind: 'text', label: 'route', default: 'route' },
    // Must match the declaration's channel to read the captured value (vec3
    // colour / float distance / vec2 uv). Compile-only.
    channel: {
      kind: 'select', label: 'channel', default: 0,
      options: [
        { value: 0, label: 'colour' },
        { value: 1, label: 'distance' },
        { value: 2, label: 'uv' },
      ],
    },
  },
  // Never emitted — compiler special-cases reroute_use. Placeholder present
  // only to satisfy the registry test.
  snippetTemplate: '// reroute ← {{ref}}',
  // Inserted by name via dynamic palette/⌘K entries, not browsed directly.
  hidden: true,
};
