// cards/ — public surface. See CONTRACTS.md §3 (Cards).
//
// The Recipe is the source of truth for what's on the canvas. Everything
// downstream — the emitted GLSL, the cards UI, the code view — is a
// projection. The reverse direction (code edits → recipe delta) lands so
// the user can drop into the GLSL and have it stay in sync.

export type {
  Recipe,
  Card,
  TypedCard,
  WildcardCard,
  Parameter,
  ParameterValue,
  ColorRgb,
  CardCategory,
  ParamDef,
  CardDef,
  Span,
  UniformBinding,
  CompiledShader,
  ReparseEvent,
  ReparseResult,
} from './types';

export { MARKER_PREFIX, END_MARKER } from './markers';
