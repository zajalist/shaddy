// Wildcard is a structural escape hatch, not a typed CardDef. It has no
// parameters and no snippet template — its `rawSource` is emitted verbatim
// between markers. The cards UI renders it with a peek of the raw GLSL and
// a "→ Edit code" affordance that jumps to its span in the code view.

export const WILDCARD_TYPE = 'wildcard';
export const WILDCARD_FRIENDLY_NAME = 'Custom code';
export const WILDCARD_DISPLAY_NAME_FALLBACK = 'Custom code';
export const WILDCARD_ICON = '</>';
