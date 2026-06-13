// Named reroute — DECLARATION. Taps the running colour and stores it under a
// user-given name, so a USAGE card elsewhere can read it back without a wire
// crossing the canvas (Unreal-style named reroutes).
//
// Like PORTAL this is special-cased by the compiler (see emitTypedCard): the
// snippetTemplate below is NEVER substituted/emitted — the compiler emits
// `rr_<sanitized name> = col;` directly and pre-declares every `rr_*` at the
// top of main(). The `{{name}}` placeholder exists only so the library test's
// "every declared param is referenced" rule passes; it documents intent.

import type { CardDef } from '../types';

export const REROUTE_DECL: CardDef = {
  type: 'reroute_decl',
  category: 'effect',
  friendlyName: 'Reroute',
  description:
    'Captures the chain output under a name. Drop a usage of that name anywhere (⌘K / palette) to read it back — no wires.',
  icon: '⤺',
  params: {
    name: { kind: 'text', label: 'name', default: 'route' },
    // Which pipeline register to capture. Compile-only: the compiler reads it to
    // pick the rr_ var's type (vec3/float/vec2) and the register it taps. A use
    // must pick the SAME channel as its declaration to read the captured value.
    channel: {
      kind: 'select', label: 'channel', default: 0,
      options: [
        { value: 0, label: 'colour' },   // col (default — byte-identical legacy)
        { value: 1, label: 'distance' }, // d
        { value: 2, label: 'uv' },       // uv
      ],
    },
  },
  // Never emitted — the compiler special-cases reroute_decl. Present only to
  // satisfy the registry test (params must be referenced by a placeholder).
  snippetTemplate: '// reroute → {{name}}',
};
