// Recipe → CompiledShader.
//
// The emitted GLSL is the *body* a fragment shader would have — preamble
// (#version, precision, standard uniform decls) is added by the renderer
// before sending to the GL driver. Span line numbers are 1-based and
// relative to the emitted body string; the code-view component adds the
// renderer preamble offset (USER_LINE_OFFSET in renderer/gl/preamble) when
// it renders.
//
// Compiler invariant: same recipe → byte-identical glsl output. The
// reverse parser relies on this — it normalizes the user's source span
// against `span.expectedBody` and decides "still matches" vs "wildcard."

import {
  CARD_LIBRARY_LIST,
  GLSL_HELPERS,
  HELPER_EMISSION_ORDER,
  HELPERS_AFTER_SCENE,
  WILDCARD_DISPLAY_NAME_FALLBACK,
  WILDCARD_FRIENDLY_NAME,
  lookupCardDef,
  resolveHelperClosure,
} from './library';
import { END_MARKER, formatCardMarker } from './markers';
import { formatParameterForDisplay, substitutePlaceholders } from './format';
import type {
  BlendMode,
  Card,
  CardDef,
  CompiledShader,
  ParameterValue,
  Pass,
  PassId,
  Recipe,
  Span,
  TypedCard,
  UniformBinding,
  WildcardCard,
} from './types';
import { PASS_RENDER_ORDER } from './types';

// Standard variables every card snippet can read or write.
const MAIN_PRELUDE = [
  '  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;',
  '  uv.x *= u_resolution.x / u_resolution.y;',
  '  float d = 0.0;',
  '  vec3 col = vec3(0.0);',
];

const MAIN_EPILOGUE = ['  fragColor = vec4(col, 1.0);'];

// Tiny blend-mode helper, emitted once at the top of the helpers block only
// when at least one card uses a non-'normal' blend mode. Each card with a
// non-default composition wraps its body in:
//   { vec3 _pc=col; float _pd=d; <body>; col=mix(_pc, _shadeBlend(_pc, col, MODE), ALPHA); d=mix(_pd,d,ALPHA); }
// where MODE is a small int constant per BlendMode (see BLEND_MODE_CODE).
const BLEND_HELPER_NAME = '_shadeBlend';
const BLEND_HELPER_GLSL = `vec3 ${BLEND_HELPER_NAME}(vec3 base, vec3 over, int mode) {
  if (mode == 1) return base + over;                         // add
  if (mode == 2) return base * over;                         // multiply
  if (mode == 3) return vec3(1.0) - (vec3(1.0) - base) * (vec3(1.0) - over); // screen
  if (mode == 4) return max(base, over);                     // lighten
  if (mode == 5) return min(base, over);                     // darken
  return over;                                               // normal (0)
}`;

const BLEND_MODE_CODE: Record<BlendMode, number> = {
  normal: 0, add: 1, multiply: 2, screen: 3, lighten: 4, darken: 5,
};

function cardAlpha(card: Card): number {
  return card.alpha ?? 1;
}
function cardBlend(card: Card): BlendMode {
  return card.blendMode ?? 'normal';
}
function hasNonDefaultComposition(card: Card): boolean {
  return cardAlpha(card) < 1 || cardBlend(card) !== 'normal';
}

// Re-export for callers that need the marker prefix to set up code-view
// decorations without depending on ./markers directly.
export { END_MARKER } from './markers';

export function compile(recipe: Recipe): CompiledShader {
  return (recipe.mode === '3d') ? compile3d(recipe) : compile2d(recipe);
}

function compile2d(recipe: Recipe): CompiledShader {
  const uniformDecls: string[] = [];
  const uniforms: UniformBinding[] = [];

  // ── Pass 1: emit per-card uniform declarations + collect uniform bindings ──
  recipe.cards.forEach((card, cardIndex) => {
    if (card.kind !== 'typed') return;
    const def = lookupCardDef(card.type);
    if (!def) return;
    // In a 2D recipe, 3D cards become no-ops and emit no uniforms — their
    // uniforms are never referenced by the 2D shader template.
    if (def.mode === '3d') return;
    for (const [paramKey, paramDef] of Object.entries(def.params)) {
      const name = uniformNameFor(cardIndex, paramKey);
      const glType = glslTypeForParam(paramDef.kind);
      uniformDecls.push(`uniform ${glType} ${name};`);
      // Image/video/buffer params: value is a string (data URL / 'webcam' /
      // buffer id 'a'..'d'). For media kinds the default may be null →
      // coerce to '' so the binding always carries a ParameterValue. The
      // integration layer reads sourceRef off the live Parameter (or, for
      // 'buffer' kinds, the multi-pass renderer maps the value string to
      // the appropriate FBO texture).
      const fallback: ParameterValue = paramKindFallback(paramDef);
      const value: ParameterValue = card.params[paramKey]?.value ?? fallback;
      uniforms.push({ name, cardId: card.id, paramKey, value });
    }
  });

  // ── Pass 2: collect helper functions referenced by any card ──
  const requestedHelpers = new Set<string>();
  for (const card of recipe.cards) {
    if (card.kind !== 'typed') continue;
    const def = lookupCardDef(card.type);
    if (!def?.helpers) continue;
    // 3D cards' helpers only exist in the 3D compiler path (they reference
    // sdScene which the 2D template doesn't define).
    if (def.mode === '3d') continue;
    for (const h of def.helpers) requestedHelpers.add(h);
  }
  const helperClosure = resolveHelperClosure(requestedHelpers);
  const anyComposition = recipe.cards.some(hasNonDefaultComposition);

  // ── Pass 3: emit the GLSL body, tracking spans line by line ──
  const lines: string[] = [];

  if (uniformDecls.length > 0) {
    lines.push('// === per-card uniforms ===');
    for (const decl of uniformDecls) lines.push(decl);
    lines.push('');
  }

  // Helpers emitted exactly once, in the fixed order so dependents follow
  // their dependencies.
  const emittedHelpers: string[] = [];
  for (const name of HELPER_EMISSION_ORDER) {
    if (!helperClosure.has(name)) continue;
    const body = GLSL_HELPERS[name];
    if (!body) continue;
    emittedHelpers.push(body);
  }
  if (emittedHelpers.length > 0 || anyComposition) {
    lines.push('// === helpers ===');
    for (const body of emittedHelpers) {
      for (const helperLine of body.split('\n')) lines.push(helperLine);
      lines.push('');
    }
    if (anyComposition) {
      for (const helperLine of BLEND_HELPER_GLSL.split('\n')) lines.push(helperLine);
      lines.push('');
    }
  }

  lines.push('void main() {');
  for (const line of MAIN_PRELUDE) lines.push(line);
  lines.push('');

  const spans: Span[] = [];

  recipe.cards.forEach((card, cardIndex) => {
    const markerLine = lines.length + 1; // 1-based
    const cardBodyLines: string[] = [];

    if (card.kind === 'typed') {
      emitTypedCard(card, cardIndex, lines, cardBodyLines);
    } else {
      emitWildcardCard(card, lines, cardBodyLines);
    }

    // If this card composes (alpha < 1 or blend != normal), wrap its body
    // lines in a snapshot/mix block. We do this AFTER emit so the per-card
    // emitter doesn't have to know about composition.
    if (hasNonDefaultComposition(card)) {
      wrapWithComposition(card, lines, cardBodyLines);
    }

    const endLine = lines.length; // 1-based, INCLUSIVE
    spans.push({
      cardId: card.id,
      startLine: markerLine,
      endLine,
      expectedBody: cardBodyLines.join('\n'),
    });
  });

  lines.push(END_MARKER);
  lines.push('');
  for (const line of MAIN_EPILOGUE) lines.push(line);
  lines.push('}');

  return {
    glsl: lines.join('\n'),
    spans,
    uniforms,
  };
}

// ─── 3D compiler — raymarched SDF scene ────────────────────────────────
//
// Recipe.mode === '3d' picks this path. Each typed card with mode:'3d'
// contributes via its Card3DContribution:
//   - sdfExpr     → adds a `d = sdMin/sdSmoothMin(d, <expr>, k)` line to sdScene
//   - domainExpr  → rebinds `p = <expr>` for cards that follow
//   - smoothness  → updates the local `k` variable
//   - material    → updates the global `mat` accumulator the lighting pass reads
//
// Material is global (last-card-wins) and shading is Lambert + ambient +
// soft-shadow — see the report for what's deliberately limited in v1.
//
// 2D cards in a 3D recipe are no-ops (marker + skip-note only), symmetric
// with the 3D-in-2D handling.

const MAIN_3D_HEAD = [
  '  vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * 2.0;',
  '  g_material = G_MATERIAL_INIT;',
  '  vec3 ro = u_cam_eye;',
  '  vec3 ta = u_cam_target;',
  '  vec3 ww = normalize(ta - ro);',
  '  vec3 uu = normalize(cross(ww, u_cam_up));',
  '  vec3 vv = cross(uu, ww);',
  '  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.6 * ww);',
  '  float t = 0.0;',
  '  bool hit = false;',
  '  for (int i = 0; i < 128; i++) {',
  '    vec3 p = ro + rd * t;',
  '    float dh = sdScene(p);',
  '    if (dh < 0.001) { hit = true; break; }',
  '    t += dh;',
  '    if (t > 30.0) break;',
  '  }',
  '  vec3 col = vec3(0.15, 0.18, 0.25);',
  '  float d = 0.0;',
  '  if (hit) {',
  '    vec3 p = ro + rd * t;',
  '    vec3 n = sceneNormal3(p);',
  '    vec3 ld = normalize(vec3(0.5, 1.0, 0.6));',
  '    float lambert = max(0.1, dot(n, ld));',
  '    float shadow = softShadow3(p + n * 0.01, ld, 0.02, 8.0, 0.08);',
  '    col = g_material * lambert * shadow + vec3(0.05);',
  '    d = t;',
  '  }',
];

function compile3d(recipe: Recipe): CompiledShader {
  const uniformDecls: string[] = [];
  const uniforms: UniformBinding[] = [];

  // Camera uniforms — driven from view state (not the recipe). Declared
  // ahead of per-card uniforms so the standard 3D head can reference them.
  // The renderer auto-binds these every frame from the camera controller in
  // RecipeCanvas; defaults match the original hard-coded eye/target/up.
  uniformDecls.push('uniform vec3 u_cam_eye;');
  uniformDecls.push('uniform vec3 u_cam_target;');
  uniformDecls.push('uniform vec3 u_cam_up;');

  // ── Pass 1: uniform decls + bindings (3D cards only) + find last material ──
  let materialExpr = 'vec3(0.85, 0.7, 0.45)';
  recipe.cards.forEach((card, cardIndex) => {
    if (card.kind !== 'typed') return;
    const def = lookupCardDef(card.type);
    if (!def || def.mode !== '3d') return;
    for (const [paramKey, paramDef] of Object.entries(def.params)) {
      const name = uniformNameFor(cardIndex, paramKey);
      const glType = glslTypeForParam(paramDef.kind);
      uniformDecls.push(`uniform ${glType} ${name};`);
      const fallback: ParameterValue = paramKindFallback(paramDef);
      const value: ParameterValue = card.params[paramKey]?.value ?? fallback;
      uniforms.push({ name, cardId: card.id, paramKey, value });
    }
    if (def.contribution3d?.material !== undefined) {
      materialExpr = substitutePlaceholders(def.contribution3d.material, (paramKey) => {
        if (!(paramKey in def.params)) {
          throw new Error(
            `[cards.compile] card "${def.type}" references unknown placeholder {{${paramKey}}}`,
          );
        }
        return uniformNameFor(cardIndex, paramKey);
      });
    }
  });

  // ── Pass 2: helper closure — always include the raymarch core ──
  const requestedHelpers = new Set<string>([
    'sdMin', 'sdSmoothMin', 'sceneNormal3', 'softShadow3',
  ]);
  for (const card of recipe.cards) {
    if (card.kind !== 'typed') continue;
    const def = lookupCardDef(card.type);
    if (def?.mode !== '3d' || !def.helpers) continue;
    for (const h of def.helpers) requestedHelpers.add(h);
  }
  const helperClosure = resolveHelperClosure(requestedHelpers);

  // ── Pass 3: emit the GLSL body ──
  const lines: string[] = [];

  if (uniformDecls.length > 0) {
    lines.push('// === per-card uniforms ===');
    for (const decl of uniformDecls) lines.push(decl);
    lines.push('');
  }

  // Helpers BEFORE sdScene — emit primitives + sdMin/sdSmoothMin first so
  // sdScene can reference them. sceneNormal3 + softShadow3 reference sdScene
  // so they MUST come after.
  const helpersBefore: string[] = [];
  const helpersAfter: string[] = [];
  for (const name of HELPER_EMISSION_ORDER) {
    if (!helperClosure.has(name)) continue;
    const body = GLSL_HELPERS[name];
    if (!body) continue;
    if (HELPERS_AFTER_SCENE.has(name)) helpersAfter.push(body);
    else helpersBefore.push(body);
  }

  if (helpersBefore.length > 0) {
    lines.push('// === helpers ===');
    for (const body of helpersBefore) {
      for (const helperLine of body.split('\n')) lines.push(helperLine);
      lines.push('');
    }
  }

  // ── Emit sdScene() — walk 3D cards in order, accumulating sdf/domain/
  //    smoothness contributions. Each card's body lines live inside sdScene
  //    so spans cover the actual GLSL they contribute. ──
  const spans: Span[] = [];

  lines.push('vec3 g_material = vec3(0.85, 0.7, 0.45);');
  lines.push('');
  lines.push('float sdScene(vec3 p) {');
  lines.push('  float d = 1e9;');
  lines.push('  float k = 0.0;');
  lines.push('');

  // Pre-pass: drop a marker + body for EVERY card (so the code view still
  // shows them in order); 2D cards get a no-op note inside sdScene.
  recipe.cards.forEach((card, cardIndex) => {
    const markerLine = lines.length + 1;
    const cardBodyLines: string[] = [];

    if (card.kind === 'typed') {
      emit3dTypedCard(card, cardIndex, lines, cardBodyLines);
    } else {
      emitWildcardCard(card, lines, cardBodyLines);
    }

    const endLine = lines.length;
    spans.push({
      cardId: card.id,
      startLine: markerLine,
      endLine,
      expectedBody: cardBodyLines.join('\n'),
    });
  });

  lines.push('  return d;');
  lines.push('}');
  lines.push('');

  if (helpersAfter.length > 0) {
    for (const body of helpersAfter) {
      for (const helperLine of body.split('\n')) lines.push(helperLine);
      lines.push('');
    }
  }

  lines.push('void main() {');
  for (const line of MAIN_3D_HEAD) {
    // Substitute the material expression resolved by Pass 1 into the
    // standard main() head template.
    lines.push(line.replace('G_MATERIAL_INIT', materialExpr));
  }
  lines.push('');
  lines.push(END_MARKER);
  lines.push('');
  lines.push('  fragColor = vec4(col, 1.0);');
  lines.push('}');

  return {
    glsl: lines.join('\n'),
    spans,
    uniforms,
  };
}

function emit3dTypedCard(
  card: TypedCard,
  cardIndex: number,
  out: string[],
  bodyOut: string[],
): void {
  // Portal — same treatment as in 2D: marker + comment, no shader effect.
  if (card.type === 'portal') {
    out.push(
      formatCardMarker({
        cardId: card.id,
        friendlyName: 'Portal',
        alpha: card.alpha,
        blend: card.blendMode,
      }),
    );
    const body = '  // portal — visual chain wrap (no shader effect)';
    out.push(body);
    bodyOut.push(body);
    return;
  }

  const def = lookupCardDef(card.type);
  if (!def) {
    out.push(formatCardMarker({
      cardId: card.id,
      friendlyName: `Unknown (${card.type})`,
      alpha: card.alpha,
      blend: card.blendMode,
    }));
    const note = `  // unknown card type: ${card.type}`;
    out.push(note);
    bodyOut.push(note);
    return;
  }

  // 2D card in a 3D recipe → marker + skip-note, no contribution.
  if (def.mode !== '3d' || !def.contribution3d) {
    out.push(formatCardMarker({
      cardId: card.id,
      friendlyName: def.friendlyName,
      paramDisplays: buildParamDisplays(def, card),
      alpha: card.alpha,
      blend: card.blendMode,
    }));
    const note = `  // ${def.type} — 2D card, no effect in 3D recipe`;
    out.push(note);
    bodyOut.push(note);
    return;
  }

  out.push(
    formatCardMarker({
      cardId: card.id,
      friendlyName: def.friendlyName,
      paramDisplays: buildParamDisplays(def, card),
      alpha: card.alpha,
      blend: card.blendMode,
    }),
  );

  const sub = (template: string): string => substitutePlaceholders(template, (paramKey) => {
    if (!(paramKey in def.params)) {
      throw new Error(
        `[cards.compile] card "${def.type}" references unknown placeholder {{${paramKey}}}`,
      );
    }
    return uniformNameFor(cardIndex, paramKey);
  });

  const contrib = def.contribution3d;
  const pushBody = (line: string): void => {
    out.push(line);
    bodyOut.push(line);
  };

  if (contrib.sdfExpr) {
    // d = sdSmoothMin(d, <expr>, k); — uses k=0 → hard min via the helper.
    pushBody(`  d = sdSmoothMin(d, ${sub(contrib.sdfExpr)}, k);`);
  } else if (contrib.domainExpr) {
    // Rebind p for subsequent contributions. Stays inside sdScene's scope.
    pushBody(`  p = ${sub(contrib.domainExpr)};`);
  } else if (contrib.smoothness !== undefined) {
    pushBody(`  k = ${sub(contrib.smoothness)};`);
  } else if (contrib.material !== undefined) {
    // Material is global — the file-scope g_material is assigned in main()
    // because GLSL ES global initializers must be constants (no uniform
    // refs). Pass-1 already walked all 3D cards and resolved the LAST
    // material expression, which compile3d substitutes into MAIN_3D_HEAD.
    // This card's body is just a marker note. Documented limitation:
    // material is global, not per-surface.
    pushBody(`  // ${def.type} — global material (last material card wins)`);
  } else {
    pushBody(`  // ${def.type} — 3D card without a recognized contribution`);
  }
}

// ─── Per-card emitters ─────────────────────────────────────────────────

function emitTypedCard(
  card: TypedCard,
  cardIndex: number,
  out: string[],
  bodyOut: string[],
): void {
  // Portal — purely a visual chain-wrap marker. Emits the card marker line
  // (so reparse can still see it as a known card) plus a single comment so
  // the span has a non-empty body. Zero params → no uniforms, no helpers.
  if (card.type === 'portal') {
    out.push(
      formatCardMarker({
        cardId: card.id,
        friendlyName: 'Portal',
        alpha: card.alpha,
        blend: card.blendMode,
      }),
    );
    const body = '  // portal — visual chain wrap (no shader effect)';
    out.push(body);
    bodyOut.push(body);
    return;
  }

  const def = lookupCardDef(card.type);
  if (!def) {
    // Defensive — recipe references a card type we no longer have. Render
    // as a wildcard-style marker so the user at least sees the cardId.
    out.push(formatCardMarker({
      cardId: card.id,
      friendlyName: `Unknown (${card.type})`,
      alpha: card.alpha,
      blend: card.blendMode,
    }));
    const note = `  // unknown card type: ${card.type}`;
    out.push(note);
    bodyOut.push(note);
    return;
  }

  // 3D card in a 2D recipe → emit a marker + skip-note so the user sees the
  // card exists in source but the shader stays clean. (The 3D compiler path
  // is the symmetric counterpart for 2D cards.)
  if (def.mode === '3d') {
    out.push(formatCardMarker({
      cardId: card.id,
      friendlyName: def.friendlyName,
      alpha: card.alpha,
      blend: card.blendMode,
    }));
    const note = `  // ${def.type} — 3D card, no effect in 2D recipe`;
    out.push(note);
    bodyOut.push(note);
    return;
  }

  out.push(
    formatCardMarker({
      cardId: card.id,
      friendlyName: def.friendlyName,
      paramDisplays: buildParamDisplays(def, card),
      alpha: card.alpha,
      blend: card.blendMode,
    }),
  );

  const snippet = substitutePlaceholders(def.snippetTemplate, (paramKey) => {
    if (!(paramKey in def.params)) {
      // CardDef bug — placeholder references a non-existent param. Fail
      // loudly at compile so authoring mistakes surface in tests.
      throw new Error(
        `[cards.compile] card "${def.type}" references unknown placeholder {{${paramKey}}}`,
      );
    }
    return uniformNameFor(cardIndex, paramKey);
  });

  for (const snippetLine of snippet.split('\n')) {
    const indented = `  ${snippetLine}`;
    out.push(indented);
    bodyOut.push(indented);
  }
}

function emitWildcardCard(card: WildcardCard, out: string[], bodyOut: string[]): void {
  const friendlyName = card.displayName ?? WILDCARD_DISPLAY_NAME_FALLBACK;
  out.push(formatCardMarker({
    cardId: card.id,
    friendlyName,
    alpha: card.alpha,
    blend: card.blendMode,
  }));
  // Wildcard rawSource is emitted verbatim (no indentation injection — the
  // user is responsible for their own formatting inside a wildcard span).
  if (card.rawSource.length > 0) {
    for (const rawLine of card.rawSource.split('\n')) {
      out.push(rawLine);
      bodyOut.push(rawLine);
    }
  }
}

/** Mutate `out` (and `bodyOut`) in place: take the already-emitted card body
 *  lines off the tail and re-emit them inside an alpha/blend composition
 *  block. Both `out` (full source buffer) and `bodyOut` (this card's body
 *  for span.expectedBody) get the same wrapped lines. */
function wrapWithComposition(card: Card, out: string[], bodyOut: string[]): void {
  // Snapshot the body lines we just wrote (still in both buffers), then pop
  // them off so we can re-emit wrapped.
  const popCount = bodyOut.length;
  const innerLines = bodyOut.slice();
  out.splice(out.length - popCount, popCount);
  bodyOut.length = 0;

  const alpha = cardAlpha(card);
  const blend = cardBlend(card);
  const alphaLit = glslLit(alpha);
  const modeLit = String(BLEND_MODE_CODE[blend]);

  const push = (s: string): void => {
    out.push(s);
    bodyOut.push(s);
  };
  push('  {');
  push('    vec3 _prev_col = col;');
  push('    float _prev_d = d;');
  for (const line of innerLines) {
    // Already 2-space indented from the emitter; add another indent step so
    // the body reads as a clear scoped block.
    push(`  ${line}`);
  }
  push(`    col = mix(_prev_col, ${BLEND_HELPER_NAME}(_prev_col, col, ${modeLit}), ${alphaLit});`);
  push(`    d = mix(_prev_d, d, ${alphaLit});`);
  push('  }');
}

function glslLit(n: number): string {
  const s = Number(n.toFixed(6)).toString();
  return s.includes('.') ? s : `${s}.0`;
}

// ─── Helpers ───────────────────────────────────────────────────────────

export function uniformNameFor(cardIndex: number, paramKey: string): string {
  return `u_card${cardIndex}_${paramKey}`;
}

/** GL type for a given ParamDef.kind. Image + video + buffer params are
 *  textures bound through the runtime's sampler2D path. */
function glslTypeForParam(
  kind: 'float' | 'color' | 'select' | 'image' | 'video' | 'buffer',
): string {
  if (kind === 'color') return 'vec3';
  if (kind === 'image' || kind === 'video' || kind === 'buffer') return 'sampler2D';
  return 'float';
}

function buildParamDisplays(def: CardDef, card: TypedCard): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [paramKey, paramDef] of Object.entries(def.params)) {
    const fallback: ParameterValue = paramKindFallback(paramDef);
    const value: ParameterValue = card.params[paramKey]?.value ?? fallback;
    out[paramKey] = formatParameterForDisplay(value);
  }
  return out;
}

/** Resolve the fallback ParameterValue when a card's params object doesn't
 *  yet have an entry for `paramKey` (e.g. recipe was authored before a card
 *  added a new param). Image/video kinds use '' for a null default; buffer
 *  kinds carry the buffer id literal; everything else uses the numeric/RGB
 *  default. */
function paramKindFallback(paramDef: CardDef['params'][string]): ParameterValue {
  if (paramDef.kind === 'image' || paramDef.kind === 'video') {
    return paramDef.default ?? '';
  }
  if (paramDef.kind === 'buffer') return paramDef.default;
  return paramDef.default;
}

/** Quick sanity check used by tests: every card type referenced by a recipe
 *  exists in CARD_LIBRARY (or is `wildcard`). */
export function validateRecipe(recipe: Recipe): string[] {
  const out: string[] = [];
  const known = new Set(CARD_LIBRARY_LIST.map((c) => c.type));
  for (const card of recipe.cards) {
    if (card.kind === 'wildcard') continue;
    if (!known.has(card.type)) out.push(`unknown card type: ${card.type}`);
  }
  return out;
}

void WILDCARD_FRIENDLY_NAME; // re-exported via cards/index; referenced so tree-shaking can't drop it under strict imports

// ─── Multi-pass compiler ───────────────────────────────────────────────
//
// A multi-pass recipe has one CompiledShader per enabled pass. The render
// order is fixed: A → B → C → D → Image (PASS_RENDER_ORDER). Earlier passes
// write into their own offscreen FBO (ping-pong'd to support same-pass
// feedback), and later passes can sample any earlier pass's output via
// `sampler2D` uniforms named `u_buffer_{a,b,c,d}` — the renderer binds the
// last-completed frame's texture into those slots before drawing.
//
// Wiring sample_buffer_* cards:
//   - The cards declare a `buffer` ParamDef whose `value` is the literal
//     buffer id ('a'..'d'). The compiler emits a per-card `sampler2D`
//     uniform exactly like image/video params.
//   - The renderer reads the uniform binding's string value to know WHICH
//     buffer texture to bind to that uniform's texture unit.
//
// Ping-pong (same-pass feedback): each buffer pass owns TWO FBOs and swaps
// every frame. When a card inside buffer-A samples buffer A, it gets the
// PREVIOUS frame's output (the "read" FBO) while the pass writes into the
// other FBO (the "write" FBO). The renderer enforces this at bind time —
// the compiler doesn't need any special-case marker.

export type CompiledPass = {
  id: PassId;
  /** Display name from the source pass — useful for the renderer when
   *  logging compile failures per pass. */
  name: string;
  /** Compiled shader for this pass. */
  shader: CompiledShader;
};

export type CompiledMultiPass = {
  /** In render order (A → B → C → D → Image), filtered to passes the recipe
   *  actually has cards/enables for. The Image pass is always present. */
  passes: CompiledPass[];
};

/** Compile a recipe into N shaders — one per enabled pass — in the order
 *  the renderer should execute them (PASS_RENDER_ORDER). A single-pass
 *  recipe (no `recipe.passes` field) yields exactly one CompiledPass for
 *  'image', which is bit-identical to what `compile(recipe)` returns. */
export function compileMultiPass(recipe: Recipe): CompiledMultiPass {
  const enabledBufferPasses = new Map<PassId, Pass>();
  for (const p of recipe.passes ?? []) {
    if (p.id === 'image') continue; // image is sourced from recipe.cards
    enabledBufferPasses.set(p.id, p);
  }

  const passes: CompiledPass[] = [];
  for (const id of PASS_RENDER_ORDER) {
    if (id === 'image') {
      passes.push({ id: 'image', name: 'Image', shader: compile(recipe) });
      continue;
    }
    const pass = enabledBufferPasses.get(id);
    if (!pass) continue; // buffer pass not enabled — skip
    // A buffer pass compiles like a sub-recipe whose `cards` are its own.
    // Inherit canvasAspect + mode from the parent recipe so 3D-in-buffer
    // pass works the same as 3D-in-image. We do NOT carry along the
    // parent's passes (a buffer pass doesn't get to recurse).
    const subRecipe: Recipe = {
      canvasAspect: recipe.canvasAspect,
      cards: pass.cards,
      ...(pass.mode ?? recipe.mode ? { mode: pass.mode ?? recipe.mode } : {}),
    };
    passes.push({ id, name: pass.name, shader: compile(subRecipe) });
  }
  return { passes };
}
