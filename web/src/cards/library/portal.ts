// Portal — a no-op marker card that breaks the visual chain into a new row
// inside the editor. Compiles to a single GLSL comment so it contributes no
// behaviour; the compiler/reverse-parser pipeline treats it like any other
// typed card (it has a span, an id, etc.) and the desktop chain UI special-
// cases it to render the existing gold/pink/blue horizontal fade visual
// instead of a block.
//
// Param count is zero on purpose. library.test.ts's placeholder assertion is
// loosened to allow zero-param marker cards like this.

import type { CardDef } from '../types';

export const PORTAL: CardDef = {
  type: 'portal',
  // Category is arbitrary — the UI never lists portal in the palette; it's
  // inserted only via the dedicated "+ portal" button next to the EndCap.
  // Park it under 'effect' so it sits in the existing taxonomy without
  // implying anything about shape/colour/distortion.
  category: 'effect',
  friendlyName: 'Portal',
  description:
    'Visual chain wrap — breaks the chain into a new row in the editor. Compiles to no shader code.',
  icon: '🌀',
  params: {},
  // A bare comment so the compiler's per-card body line is non-empty (keeps
  // the span machinery happy) but contributes zero GLSL behaviour. The
  // compiler additionally short-circuits portal emission so the marker
  // comment + this body line are all that hits the source.
  snippetTemplate: '// portal — row break for the visual chain editor',
};
