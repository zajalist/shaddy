// cards/ — public surface. See CONTRACTS.md §3 (Cards).
//
// The Recipe is the source of truth for what's on the canvas. Everything
// downstream — the emitted GLSL, the cards UI, the code view — is a
// projection. The reverse direction (code edits → recipe delta) lands so
// the user can drop into the GLSL and have it stay in sync.

export type {
  Recipe,
  Card,
  CardAttribute,
  TypedCard,
  MacroDef,
  WildcardCard,
  Parameter,
  ParameterValue,
  MediaParamValue,
  MediaSourceRef,
  ColorRgb,
  CardCategory,
  Register,
  CardIO,
  ParamDef,
  CardDef,
  Animation,
  AnimChain,
  AnimBlock,
  AnimBlockDef,
  Span,
  UniformBinding,
  CompiledShader,
  ReparseEvent,
  ReparseResult,
  BlendMode,
  Card3DContribution,
  ShaderTemplate,
  Pass,
  PassId,
} from './types';

export { BLEND_MODES, BUFFER_PASS_IDS, PASS_RENDER_ORDER } from './types';

export { MARKER_PREFIX, END_MARKER } from './markers';

export { compile, compileMultiPass, uniformNameFor, validateRecipe, cardForLine, cardIO } from './compile';
export { formatParameterForDisplay, formatParameterAsGlslLiteral, isColor } from './format';
export { reparse, normalizeGlsl, extractDisplayName } from './reparse';
// Per-param animation factories the inspector UI uses to seed/re-key an
// Animation. Part of the public surface so the design/ layer doesn't reach past
// the cards/ index into ./anim.
export { defaultFloatAnimation, defaultColorAnimation, reKeyAnimation } from './anim';
// Custom-animation block library (the AnimChain building blocks) — exposed so
// the inspector ∼-menu, the canvas, and the Animation palette tab can list,
// instantiate, and fold animation blocks without reaching past this index.
export {
  ANIM_BLOCKS,
  ANIM_BLOCK_LIST,
  animLocalName as animChainLocalName,
  foldAnimChain,
  animChainHelpers,
  defaultAnimBlock,
} from './anim-blocks';

export {
  useCardsStore,
  generateCardId,
  cloneRecipeWithFreshIds,
  DEFAULT_CAMERA,
  getPassCards,
  setPassCards,
  rerouteDeclNames,
  addBufferPass,
  removeBufferPass,
  renameBufferPass,
} from './state';
export type { CardsState, CameraView, CameraVec3 } from './state';

export { STARTER_RECIPES } from './starter-recipes';
export type { StarterRecipe } from './starter-recipes';

export {
  CARD_LIBRARY,
  CARD_LIBRARY_LIST,
  lookupCardDef,
  PALETTE,
  RADIAL_GRADIENT,
  RIPPLE,
  VIGNETTE,
  WILDCARD_DISPLAY_NAME_FALLBACK,
  WILDCARD_FRIENDLY_NAME,
  WILDCARD_ICON,
  WILDCARD_TYPE,
} from './library';
