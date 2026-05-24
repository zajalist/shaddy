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
  MediaParamValue,
  MediaSourceRef,
  ColorRgb,
  CardCategory,
  ParamDef,
  CardDef,
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

export { compile, compileMultiPass, uniformNameFor, validateRecipe } from './compile';
export { formatParameterForDisplay, formatParameterAsGlslLiteral, isColor } from './format';
export { reparse, normalizeGlsl, extractDisplayName } from './reparse';

export {
  useCardsStore,
  generateCardId,
  cloneRecipeWithFreshIds,
  DEFAULT_CAMERA,
  getPassCards,
  setPassCards,
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
