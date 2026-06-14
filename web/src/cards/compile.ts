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
  WILDCARD_DISPLAY_NAME_FALLBACK,
  WILDCARD_FRIENDLY_NAME,
  lookupCardDef,
  orderedHelpers,
  resolveHelperClosure,
} from './library';
import { END_MARKER, formatCardMarker } from './markers';
import { formatParameterForDisplay, substitutePlaceholders, glslFloat } from './format';
import { emitAnimLocal, animLocalName, animUniforms, animHelpers } from './anim';
import { animLocalName as animChainLocal, foldAnimChain, animChainHelpers } from './anim-blocks';
import { encodeParam, encodeAttr, UNIFORM_REF_RE } from './uniform-names';
import type {
  AnimChain,
  BlendMode,
  Card,
  CardAttribute,
  CardCategory,
  CardDef,
  CardIO,
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

/** The custom-animation chains a recipe's params actually bind to (via
 *  `animation: { type: 'custom', ref }`), in `recipe.animations` order. Orphan
 *  refs (chain deleted) are dropped — only existing chains are returned, so
 *  only they fold to a per-frame local. Empty when there are no custom
 *  animations, keeping the byte-identical invariant intact for old recipes. */
function collectReferencedAnimChains(recipe: Recipe): AnimChain[] {
  const all = recipe.animations ?? [];
  if (all.length === 0) return [];
  const byId = new Map(all.map((c) => [c.id, c]));
  const refd = new Set<string>();
  for (const card of recipe.cards) {
    if (card.kind === 'typed') {
      for (const p of Object.values(card.params)) {
        if (p?.animation?.type === 'custom' && byId.has(p.animation.ref)) refd.add(p.animation.ref);
      }
    } else if (card.kind === 'wildcard') {
      // A typed card hand-edited into a wildcard keeps its `_anim_<id>` text but
      // loses its typed params. Keep the chain's local alive if the raw source
      // still names it, so the reference doesn't dangle (blank preview).
      for (const c of all) {
        if (!refd.has(c.id) && card.rawSource.includes(animChainLocal(c.id))) refd.add(c.id);
      }
    }
  }
  return all.filter((c) => refd.has(c.id));
}

function compile2d(recipe: Recipe): CompiledShader {
  const uniformDecls: string[] = [];
  const uniforms: UniformBinding[] = [];

  // Custom-animation context. `animChainIds` = every chain that EXISTS (so a
  // bound param resolves to its local; an orphan ref falls back to a static
  // uniform). `referencedChains` = the subset actually bound by ≥1 param —
  // only those fold to a per-frame local. Empty for any recipe without custom
  // animations, so the byte-identical invariant is untouched.
  const animChainIds = new Set((recipe.animations ?? []).map((c) => c.id));
  const referencedChains = collectReferencedAnimChains(recipe);

  // ── Pass 1: emit per-card uniform declarations + collect uniform bindings ──
  recipe.cards.forEach((card, cardIndex) => {
    if (card.kind !== 'typed') return;
    if (card.enabled === false) return; // muted → no uniforms (see Pass 3)
    const def = lookupCardDef(card.type);
    if (!def) return;
    // In a 2D recipe, 3D cards become no-ops and emit no uniforms — their
    // uniforms are never referenced by the 2D shader template.
    if (def.mode === '3d') return;
    for (const [paramKey, paramDef] of Object.entries(def.params)) {
      // 'text' params (reroute names) are inlined into the GLSL as identifiers,
      // never wired as uniforms — skip them here.
      if (paramDef.kind === 'text') continue;
      // Repeat's `scope` is compile-only — it picks the tiling reach at build
      // time and is never referenced by the shader, so it gets no uniform.
      if (card.type === 'repeat' && paramKey === 'scope') continue;
      // Reroute `channel` is compile-only (picks the rr_ var's type/register).
      if ((card.type === 'reroute_decl' || card.type === 'reroute_use') && paramKey === 'channel') continue;
      const anim = card.params[paramKey]?.animation;
      // Bound to a custom animation chain: the chain folds to a global local
      // with baked params, so this param needs NO uniform. (An orphan ref —
      // chain deleted — falls through to the static uniform below.)
      if (anim?.type === 'custom') {
        if (paramDef.kind === 'float' && animChainIds.has(anim.ref)) continue;
      } else if (anim && (paramDef.kind === 'float' || paramDef.kind === 'color')) {
        // Built-in animated float/colour param: emit its endpoint uniforms
        // (min/max/speed/…) carrying the Animation's current values, instead of
        // the single static uniform. The snippet references a per-frame local.
        for (const au of animUniforms(cardIndex, paramKey, anim)) {
          uniformDecls.push(`uniform ${au.glType} ${au.name};`);
          uniforms.push({ name: au.name, cardId: card.id, paramKey: au.paramKey, value: au.value });
        }
        continue;
      }
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
    // Scoped attribute uniforms — one set per wired attribute. paramKey is
    // namespaced so it never collides with the host card's own params.
    for (const { attr, attrIndex, adef } of wiredAttrs(card)) {
      for (const [paramKey, paramDef] of Object.entries(adef.params)) {
        const name = attrUniformNameFor(cardIndex, attrIndex, paramKey);
        const glType = glslTypeForParam(paramDef.kind);
        uniformDecls.push(`uniform ${glType} ${name};`);
        const fallback: ParameterValue = paramKindFallback(paramDef);
        const value: ParameterValue = attr.params[paramKey]?.value ?? fallback;
        uniforms.push({ name, cardId: card.id, paramKey: `a${attrIndex}_${paramKey}`, value });
      }
    }
  });

  // ── Dangling-uniform guard ──
  // A wildcard body can reference u_card*/u_buffer* names this build no longer
  // declares (a hand-edited wildcard, or a sampler the typed→wildcard bake
  // couldn't inline). Declare a benign fallback for each so the shader still
  // links instead of failing on an undeclared identifier (which blanks the
  // preview). Added to the uniform block here — BEFORE Pass 3 records spans —
  // so card span line numbers are unaffected.
  for (const decl of collectDanglingUniformFallbacks(recipe.cards, uniformDecls)) {
    uniformDecls.push(decl);
  }

  // ── Pass 2: collect helper functions referenced by any card ──
  const requestedHelpers = new Set<string>();
  for (const card of recipe.cards) {
    if (card.kind !== 'typed') continue;
    if (card.enabled === false) continue; // muted → no helpers
    // Macro cards have no def of their own; pull helpers from their sub-blocks
    // (their GLSL is inline-expanded into the macro body).
    if (card.type === 'macro') {
      for (const sub of card.macro?.blocks ?? []) {
        const sdef = lookupCardDef(sub.type);
        if (sdef && sdef.mode !== '3d' && sdef.helpers) for (const h of sdef.helpers) requestedHelpers.add(h);
      }
      continue;
    }
    const def = lookupCardDef(card.type);
    // 3D cards' helpers only exist in the 3D compiler path.
    if (def && def.mode !== '3d' && def.helpers) {
      for (const h of def.helpers) requestedHelpers.add(h);
    }
    // Animated params may need helpers too (noise → noise2 + its deps).
    if (def && def.mode !== '3d') {
      for (const p of Object.values(card.params)) {
        if (p?.animation) for (const h of animHelpers(p.animation)) requestedHelpers.add(h);
      }
    }
    // Wired attribute helpers (uv-transform distortions may pull helpers too).
    for (const { adef } of wiredAttrs(card)) {
      if (adef.helpers) for (const h of adef.helpers) requestedHelpers.add(h);
    }
  }
  // Custom animation chains pull their own block helpers (e.g. Noise → noise2).
  for (const chain of referencedChains) {
    for (const h of animChainHelpers(chain)) requestedHelpers.add(h);
  }
  const helperClosure = resolveHelperClosure(requestedHelpers);
  const anyComposition = recipe.cards.some(hasNonDefaultComposition);

  // ── Repeat wrap planning ──
  // A Repeat card placed after a shape tiles that shape. Because the engine is
  // a single linear uv→d→col pass, "after" is realised by wrapping the
  // preceding shape body in `{ vec2 _rep_uv = uv; uv = <tile>; <body>; uv =
  // _rep_uv; }`. Here we precompute, per card index, the tile statements that
  // should wrap it (a shape can be tiled by more than one downstream Repeat).
  const repeatWrapByIndex = collectRepeatWraps(recipe.cards);

  // ── Pass 3: emit the GLSL body, tracking spans line by line ──
  const lines: string[] = [];

  if (uniformDecls.length > 0) {
    lines.push('// === per-card uniforms ===');
    for (const decl of uniformDecls) lines.push(decl);
    lines.push('');
  }

  // Helpers emitted exactly once, in derived dependency order.
  const emittedHelpers = orderedHelpers(helperClosure).map((h) => h.body);
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

  // Pre-declare every named-reroute var (declarations AND usages) up front so
  // a usage whose ref has no matching declaration reads vec3(0.0) instead of
  // an undeclared-variable error. These lines live OUTSIDE any card span.
  const rerouteDecls = collectRerouteDecls(recipe.cards);
  if (rerouteDecls.length > 0) {
    lines.push('  // === named reroutes ===');
    for (const decl of rerouteDecls) lines.push(decl);
    lines.push('');
  }

  // Fold every referenced custom-animation chain into one per-frame local
  // (`_anim_<id>`), declared up front so any bound param's snippet can read it.
  // Like the reroute decls, these lines live OUTSIDE any card span.
  if (referencedChains.length > 0) {
    lines.push('  // === animations ===');
    for (const chain of referencedChains) {
      for (const declLine of foldAnimChain(chain)) lines.push(declLine);
    }
    lines.push('');
  }

  const spans: Span[] = [];

  recipe.cards.forEach((card, cardIndex) => {
    const emit = new CardEmit();

    if (card.enabled === false) {
      // Muted card: emit the marker + a single note so the span stays 1:1 with
      // recipe.cards (reparse hard-fails on marker-count divergence) but the
      // card contributes nothing to uv/d/col. Its uniforms/helpers were already
      // skipped in Pass 1/2; we also skip repeat/composition wraps here.
      emitDisabledCard(card, emit);
    } else {
      if (card.kind === 'typed') {
        emitTypedCard(card, cardIndex, emit, animChainIds);
      } else {
        emitWildcardCard(card, emit);
      }

      // If a downstream Repeat tiles this (shape) card, wrap its body in a
      // tiled-uv save/restore block. Inner to composition so the composition
      // snapshot brackets the tiled result.
      const tiles = repeatWrapByIndex.get(cardIndex);
      if (tiles && tiles.length > 0) {
        wrapWithRepeat(tiles, emit);
      }

      // If this card composes (alpha < 1 or blend != normal), wrap its body
      // lines in a snapshot/mix block. We do this AFTER emit so the per-card
      // emitter doesn't have to know about composition.
      if (hasNonDefaultComposition(card)) {
        wrapWithComposition(card, emit);
      }
    }

    spans.push(emit.flush(card.id, lines));
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

// ─── 3D compiler — composable raymarched scene ─────────────────────────
//
// Recipe.mode === '3d' picks this path. The raymarcher is BUILT FROM BLOCKS:
//   surfaces/CSG  — sdfExpr / domainExpr / smoothness → sdScene()
//   camera        — camEye / camTarget / camFov
//   texturing     — albedoExpr (vec3 from hit p, normal n)
//   lighting      — light (statements accumulating into `lcol`; may call g_sky)
//   sky/background — sky (vec3 from ray dir rd)
//   material      — legacy flat albedo (last wins)
// compile3d collects these and assembles main(). Defaults reproduce the prior
// fixed Lambert+shadow shade, so old 3D recipes render identically.
//
// 2D cards in a 3D recipe are no-ops (marker + skip-note only).

// Default shade used when no `light` block is present (matches the old head).
const DEFAULT_3D_SHADE = [
  '    vec3 ld = normalize(vec3(0.5, 1.0, 0.6));',
  '    lcol = alb * max(0.1, dot(n, ld)) * softShadow3(p + n * 0.01, ld, 0.02, 8.0, 0.08) + vec3(0.05);',
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

  // ── Pass 1: uniform decls + bindings (3D cards only) + collect the
  //    composable camera / shading / texturing / sky contributions ──
  let materialExpr = 'vec3(0.85, 0.7, 0.45)';
  let albedoExpr: string | null = null;
  let skyExpr = 'vec3(0.15, 0.18, 0.25)';
  let camEye = 'u_cam_eye';
  let camTarget = 'u_cam_target';
  let camFov = '1.6';
  const lights: string[] = [];
  recipe.cards.forEach((card, cardIndex) => {
    if (card.kind !== 'typed') return;
    if (card.enabled === false) return; // muted → no uniforms / no contribution
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
    const c = def.contribution3d;
    if (!c) return;
    const sub3 = (tpl: string): string => substitutePlaceholders(tpl, (paramKey) => {
      if (!(paramKey in def.params)) {
        throw new Error(`[cards.compile] card "${def.type}" references unknown placeholder {{${paramKey}}}`);
      }
      return uniformNameFor(cardIndex, paramKey);
    });
    if (c.material !== undefined) materialExpr = sub3(c.material);
    if (c.albedoExpr !== undefined) albedoExpr = sub3(c.albedoExpr);
    if (c.sky !== undefined) skyExpr = sub3(c.sky);
    if (c.camEye !== undefined) camEye = sub3(c.camEye);
    if (c.camTarget !== undefined) camTarget = sub3(c.camTarget);
    if (c.camFov !== undefined) camFov = sub3(c.camFov);
    if (c.light !== undefined) lights.push(sub3(c.light));
  });

  // Dangling-uniform guard (same as the 2D path) — keep wildcard refs linkable.
  for (const decl of collectDanglingUniformFallbacks(recipe.cards, uniformDecls)) {
    uniformDecls.push(decl);
  }

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

  // Helpers split by phase: 'pre' helpers (primitives + sdMin/sdSmoothMin)
  // emit before sdScene; 'post' helpers (sceneNormal3 + softShadow3) reference
  // sdScene by name so they MUST come after it.
  const helpersBefore: string[] = [];
  const helpersAfter: string[] = [];
  for (const h of orderedHelpers(helperClosure)) {
    (h.phase === 'post' ? helpersAfter : helpersBefore).push(h.body);
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
    const emit = new CardEmit();
    if (card.enabled === false) {
      emitDisabledCard(card, emit);
    } else if (card.kind === 'typed') {
      emit3dTypedCard(card, cardIndex, emit);
    } else {
      emitWildcardCard(card, emit);
    }
    spans.push(emit.flush(card.id, lines));
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

  // Sky / background as a function of ray dir — used for misses AND for fresnel
  // reflections inside lighting blocks.
  lines.push(`vec3 g_sky(vec3 rd) { return ${skyExpr}; }`);
  lines.push('');

  // Assemble main() from the collected camera / shading / texturing pieces.
  const albedo = albedoExpr ?? 'g_material';
  const shadeLines = lights.length > 0
    ? lights.flatMap((stmt) => stmt.split('\n').map((l) => '    ' + l.trim()))
    : DEFAULT_3D_SHADE;
  lines.push('void main() {');
  lines.push('  vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * 2.0;');
  lines.push(`  g_material = ${materialExpr};`);
  lines.push(`  vec3 ro = ${camEye};`);
  lines.push(`  vec3 ta = ${camTarget};`);
  lines.push('  vec3 ww = normalize(ta - ro);');
  lines.push('  vec3 uu = normalize(cross(ww, u_cam_up));');
  lines.push('  vec3 vv = cross(uu, ww);');
  lines.push(`  vec3 rd = normalize(uv.x * uu + uv.y * vv + (${camFov}) * ww);`);
  lines.push('  float t = 0.0;');
  lines.push('  bool hit = false;');
  lines.push('  for (int i = 0; i < 128; i++) {');
  lines.push('    vec3 p = ro + rd * t;');
  lines.push('    float dh = sdScene(p);');
  lines.push('    if (dh < 0.0008) { hit = true; break; }');
  lines.push('    t += dh * 0.7;'); // under-relax so height-field surfaces don't overshoot
  lines.push('    if (t > 60.0) break;');
  lines.push('  }');
  lines.push('  vec3 col = g_sky(rd);');
  lines.push('  float d = 0.0;');
  lines.push('  if (hit) {');
  lines.push('    vec3 p = ro + rd * t;');
  lines.push('    vec3 n = sceneNormal3(p);');
  lines.push(`    vec3 alb = ${albedo};`);
  lines.push('    vec3 lcol = vec3(0.0);');
  for (const l of shadeLines) lines.push(l);
  lines.push('    col = lcol;');
  lines.push('    d = t;');
  lines.push('  }');
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

/** The scratch pad a single card emits into. Its marker line + body lines
 *  accumulate HERE (never written to the shared output during emission), so the
 *  two-buffer lockstep the old `(out, bodyOut)` pattern relied on can't be
 *  broken — there is only one buffer. `wrap` brackets the body in place (no
 *  splice surgery on the shared output), and `flush` stamps the marker + body
 *  into the output exactly once, returning the card's Span. */
class CardEmit {
  private markerLine = '';
  private hasMarker = false;
  private bodyLines: string[] = [];

  /** The card's marker line — the Span's first line; NOT part of the body. */
  marker(line: string): void { this.markerLine = line; this.hasMarker = true; }

  /** Append one body line (recorded into span.expectedBody). */
  line(s: string): void { this.bodyLines.push(s); }

  /** Bracket the current body in open/close lines, re-indenting the existing
   *  body one step (default 2 spaces). Pure surgery on THIS card's buffer. */
  wrap(open: readonly string[], close: readonly string[], indent = '  '): void {
    const inner = this.bodyLines.map((l) => indent + l);
    this.bodyLines = [...open, ...inner, ...close];
  }

  /** Stamp marker + body into `out` and return the card's Span. */
  flush(cardId: string, out: string[]): Span {
    const startLine = out.length + 1; // 1-based — the marker's line
    if (this.hasMarker) out.push(this.markerLine);
    for (const l of this.bodyLines) out.push(l);
    return { cardId, startLine, endLine: out.length, expectedBody: this.bodyLines.join('\n') };
  }
}

function emit3dTypedCard(card: TypedCard, cardIndex: number, emit: CardEmit): void {
  // Portal — same treatment as in 2D: marker + comment, no shader effect.
  if (card.type === 'portal') {
    emit.marker(formatCardMarker({ cardId: card.id, friendlyName: 'Portal', alpha: card.alpha, blend: card.blendMode }));
    emit.line('  // portal — visual chain wrap (no shader effect)');
    return;
  }

  const def = lookupCardDef(card.type);
  if (!def) {
    emit.marker(formatCardMarker({ cardId: card.id, friendlyName: `Unknown (${card.type})`, alpha: card.alpha, blend: card.blendMode }));
    emit.line(`  // unknown card type: ${card.type}`);
    return;
  }

  // 2D card in a 3D recipe → marker + skip-note, no contribution.
  if (def.mode !== '3d' || !def.contribution3d) {
    emit.marker(formatCardMarker({ cardId: card.id, friendlyName: def.friendlyName, paramDisplays: buildParamDisplays(def, card), alpha: card.alpha, blend: card.blendMode }));
    emit.line(`  // ${def.type} — 2D card, no effect in 3D recipe`);
    return;
  }

  emit.marker(formatCardMarker({ cardId: card.id, friendlyName: def.friendlyName, paramDisplays: buildParamDisplays(def, card), alpha: card.alpha, blend: card.blendMode }));

  const sub = (template: string): string => substitutePlaceholders(template, (paramKey) => {
    if (!(paramKey in def.params)) {
      throw new Error(`[cards.compile] card "${def.type}" references unknown placeholder {{${paramKey}}}`);
    }
    return uniformNameFor(cardIndex, paramKey);
  });

  const contrib = def.contribution3d;
  if (contrib.sdfExpr) {
    // d = sdSmoothMin(d, <expr>, k); — uses k=0 → hard min via the helper.
    emit.line(`  d = sdSmoothMin(d, ${sub(contrib.sdfExpr)}, k);`);
  } else if (contrib.domainExpr) {
    // Rebind p for subsequent contributions. Stays inside sdScene's scope.
    emit.line(`  p = ${sub(contrib.domainExpr)};`);
  } else if (contrib.smoothness !== undefined) {
    emit.line(`  k = ${sub(contrib.smoothness)};`);
  } else if (contrib.material !== undefined) {
    // Material is global — assigned in main() (Pass 1 resolved the last expr).
    emit.line(`  // ${def.type} — global material (last material card wins)`);
  } else if (contrib.albedoExpr !== undefined) {
    emit.line(`  // ${def.type} — surface texture / albedo (applied in shading)`);
  } else if (contrib.light !== undefined) {
    emit.line(`  // ${def.type} — light contribution (applied in shading)`);
  } else if (contrib.sky !== undefined) {
    emit.line(`  // ${def.type} — sky / background (applied in g_sky)`);
  } else if (contrib.camEye !== undefined || contrib.camTarget !== undefined || contrib.camFov !== undefined) {
    emit.line(`  // ${def.type} — camera (applied in main)`);
  } else {
    emit.line(`  // ${def.type} — 3D card without a recognized contribution`);
  }
}

// ─── Per-card emitters ─────────────────────────────────────────────────

function emitTypedCard(
  card: TypedCard,
  cardIndex: number,
  emit: CardEmit,
  animChainIds: ReadonlySet<string> = new Set(),
): void {
  // Portal — purely a visual chain-wrap marker. Emits the card marker line
  // (so reparse can still see it as a known card) plus a single comment so
  // the span has a non-empty body. Zero params → no uniforms, no helpers.
  if (card.type === 'portal') {
    emit.marker(formatCardMarker({ cardId: card.id, friendlyName: 'Portal', alpha: card.alpha, blend: card.blendMode }));
    emit.line('  // portal — visual chain wrap (no shader effect)');
    return;
  }

  // Repeat — a compile-time control card. It tiles the PRECEDING shape(s)
  // rather than mutating uv forward, so the user authors it AFTER the shape
  // (matching the shape → distortion → colour → effect pipeline). The actual
  // tiling is injected into the wrapped shapes' bodies by compile2d; here the
  // card emits only its marker + a note so its own span stays a no-op.
  if (card.type === 'repeat') {
    const rdef = lookupCardDef('repeat');
    emit.marker(formatCardMarker({
      cardId: card.id,
      friendlyName: rdef?.friendlyName ?? 'Repeat',
      paramDisplays: rdef ? buildParamDisplays(rdef, card) : undefined,
      alpha: card.alpha,
      blend: card.blendMode,
    }));
    emit.line('  // repeat — tiles the preceding shape(s); see the wrapped shape body');
    return;
  }

  // Named reroutes — special-cased like portal. A DECLARATION assigns the
  // running colour to its named `rr_*` var (pre-declared at the top of main);
  // a USAGE reads that var as a source. The CardDef.snippetTemplate is never
  // substituted — we emit the one line directly so it's deterministic and
  // round-trips through reparse.
  if (card.type === 'reroute_decl' || card.type === 'reroute_use') {
    const isDecl = card.type === 'reroute_decl';
    const rdef = lookupCardDef(card.type);
    const raw = card.params[isDecl ? 'name' : 'ref']?.value;
    const id = sanitizeRerouteId(typeof raw === 'string' ? raw : '');
    const ch = rerouteChannelOf(card);
    const v = rerouteVarName(id, ch);
    const reg = REROUTE_CHANNEL[ch].reg;
    emit.marker(formatCardMarker({
      cardId: card.id,
      friendlyName: rdef?.friendlyName ?? (isDecl ? 'Reroute' : 'Reroute (use)'),
      alpha: card.alpha,
      blend: card.blendMode,
    }));
    // decl taps the register into the var; use reads the var back into it.
    emit.line(isDecl ? `  ${v} = ${reg};` : `  ${reg} = ${v};`);
    return;
  }

  // Macro — a "function" block that inline-expands to its sub-blocks' GLSL,
  // with each sub-block's params baked as literal constants (so the body is
  // self-contained and constant-foldable). One marker / one span per macro,
  // so reparse still sees it as a single card.
  if (card.type === 'macro') {
    emit.marker(formatCardMarker({
      cardId: card.id,
      friendlyName: card.macro?.name || 'Macro',
      alpha: card.alpha,
      blend: card.blendMode,
    }));
    const lines: string[] = [];
    for (const sub of card.macro?.blocks ?? []) {
      const sdef = lookupCardDef(sub.type);
      // v1: only plain typed blocks expand — skip markers, nested macros, 3D.
      if (!sdef || sdef.mode === '3d') continue;
      if (sub.type === 'portal' || sub.type === 'macro' || sub.type.startsWith('reroute_')) continue;
      let snippet: string;
      try {
        snippet = substitutePlaceholders(sdef.snippetTemplate, (k) => {
          const pd = sdef.params[k];
          const v = sub.params[k]?.value ?? (pd ? paramKindFallback(pd) : 0);
          return glslLiteral(v, pd?.kind);
        });
      } catch { continue; }
      for (const ln of snippet.split('\n')) lines.push(`  ${ln}`);
    }
    const raw = lines.length > 0 ? lines : ['  // (empty macro)'];
    const bodyLines = card.macro?.compress ? compressMacroLines(raw) : raw;
    for (const ln of bodyLines) emit.line(ln);
    return;
  }

  const def = lookupCardDef(card.type);
  if (!def) {
    // Defensive — recipe references a card type we no longer have. Render
    // as a wildcard-style marker so the user at least sees the cardId.
    emit.marker(formatCardMarker({ cardId: card.id, friendlyName: `Unknown (${card.type})`, alpha: card.alpha, blend: card.blendMode }));
    emit.line(`  // unknown card type: ${card.type}`);
    return;
  }

  // 3D card in a 2D recipe → emit a marker + skip-note so the user sees the
  // card exists in source but the shader stays clean. (The 3D compiler path
  // is the symmetric counterpart for 2D cards.)
  if (def.mode === '3d') {
    emit.marker(formatCardMarker({ cardId: card.id, friendlyName: def.friendlyName, alpha: card.alpha, blend: card.blendMode }));
    emit.line(`  // ${def.type} — 3D card, no effect in 2D recipe`);
    return;
  }

  emit.marker(formatCardMarker({
    cardId: card.id,
    friendlyName: def.friendlyName,
    paramDisplays: buildParamDisplays(def, card),
    alpha: card.alpha,
    blend: card.blendMode,
  }));

  const snippet = substitutePlaceholders(def.snippetTemplate, (paramKey) => {
    if (!(paramKey in def.params)) {
      // CardDef bug — placeholder references a non-existent param. Fail
      // loudly at compile so authoring mistakes surface in tests.
      throw new Error(
        `[cards.compile] card "${def.type}" references unknown placeholder {{${paramKey}}}`,
      );
    }
    // Animated float/colour params resolve to their per-frame local instead of
    // the static uniform (the local is declared just above the snippet).
    const anim = card.params[paramKey]?.animation;
    const pkind = def.params[paramKey]?.kind;
    // Bound to a custom chain: resolve to the shared chain local `_anim_<id>`
    // (declared once up front). Orphan ref or non-float → static uniform.
    if (anim?.type === 'custom') {
      if (pkind === 'float' && animChainIds.has(anim.ref)) return animChainLocal(anim.ref);
      return uniformNameFor(cardIndex, paramKey);
    }
    if (anim && (pkind === 'float' || pkind === 'color')) {
      return animLocalName(cardIndex, paramKey);
    }
    return uniformNameFor(cardIndex, paramKey);
  });

  // Per-frame locals for this card's animated params — declared before the
  // snippet (and before any attr block) so they're in scope wherever the
  // snippet reads them. Part of the card's body, so they round-trip.
  for (const [paramKey, paramDef] of Object.entries(def.params)) {
    const anim = card.params[paramKey]?.animation;
    // Custom-chain params read the shared `_anim_<id>` local — no per-card
    // local to emit here. Only built-in animations emit a per-card local.
    if (anim && anim.type !== 'custom' && (paramDef.kind === 'float' || paramDef.kind === 'color')) {
      emit.line(`  ${emitAnimLocal(cardIndex, paramKey, anim)}`);
    }
  }

  // Scoped uv-transform attributes: save uv, apply each attribute's
  // transform, run the host body against the transformed uv, then restore so
  // downstream cards see the original coordinate. The whole thing stays one
  // span body, so the composition wrap (if any) snapshots col/d around it.
  const attrs = wiredAttrs(card);
  if (attrs.length > 0) {
    emit.line('  { vec2 _attr_uv = uv;');
    for (const { attrIndex, adef } of attrs) {
      const asnippet = substitutePlaceholders(adef.snippetTemplate, (paramKey) => {
        if (!(paramKey in adef.params)) {
          throw new Error(
            `[cards.compile] attribute "${adef.type}" references unknown placeholder {{${paramKey}}}`,
          );
        }
        return attrUniformNameFor(cardIndex, attrIndex, paramKey);
      });
      emit.line(`    // attr · ${adef.friendlyName}`);
      for (const aline of asnippet.split('\n')) emit.line(`    ${aline}`);
    }
    for (const snippetLine of snippet.split('\n')) emit.line(`    ${snippetLine}`);
    emit.line('    uv = _attr_uv;');
    emit.line('  }');
    return;
  }

  for (const snippetLine of snippet.split('\n')) {
    emit.line(`  ${snippetLine}`);
  }
}

/** Emit a muted (enabled:false) card: its marker + a single note. Keeps the
 *  span 1:1 with recipe.cards while contributing zero GLSL. Used by both the 2D
 *  and 3D paths. */
function emitDisabledCard(card: Card, emit: CardEmit): void {
  const name = card.kind === 'typed'
    ? (lookupCardDef(card.type)?.friendlyName ?? card.macro?.name ?? card.type)
    : (card.displayName ?? WILDCARD_DISPLAY_NAME_FALLBACK);
  emit.marker(formatCardMarker({ cardId: card.id, friendlyName: name, alpha: card.alpha, blend: card.blendMode }));
  emit.line(`  // ${name} — disabled`);
}

function emitWildcardCard(card: WildcardCard, emit: CardEmit): void {
  const friendlyName = card.displayName ?? WILDCARD_DISPLAY_NAME_FALLBACK;
  emit.marker(formatCardMarker({ cardId: card.id, friendlyName, alpha: card.alpha, blend: card.blendMode }));
  // Wildcard rawSource is emitted verbatim (no indentation injection — the
  // user is responsible for their own formatting inside a wildcard span).
  if (card.rawSource.length > 0) {
    for (const rawLine of card.rawSource.split('\n')) emit.line(rawLine);
  }
}

/** Bracket the card's body in an alpha/blend composition block: snapshot
 *  col/d, run the body, then mix back. Pure list surgery on the card's scratch
 *  pad — no splicing of the shared output. */
function wrapWithComposition(card: Card, emit: CardEmit): void {
  const alphaLit = glslFloat(cardAlpha(card));
  const modeLit = String(BLEND_MODE_CODE[cardBlend(card)]);
  emit.wrap(
    ['  {', '    vec3 _prev_col = col;', '    float _prev_d = d;'],
    [
      `    col = mix(_prev_col, ${BLEND_HELPER_NAME}(_prev_col, col, ${modeLit}), ${alphaLit});`,
      `    d = mix(_prev_d, d, ${alphaLit});`,
      '  }',
    ],
  );
}

/** Plan which cards a Repeat tiles. Returns a map cardIndex → tile statements
 *  (GLSL `uv = …;` lines) to inject before that card's body. A Repeat with
 *  scope 'all' (1) tiles every shape card before it; scope 'direct' (0,
 *  default) tiles only the contiguous shape run immediately preceding it. The
 *  tile statement references the Repeat's own count uniforms so dragging the
 *  count still updates live. */
function collectRepeatWraps(cards: Recipe['cards']): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const repeatDef = lookupCardDef('repeat');
  if (!repeatDef) return out;
  // Repeat tiles cards that produce the distance field. Asking the IO contract
  // ("writes 'd'") instead of `category === 'shape'` is byte-identical today
  // (only shape cards write d) but states the real intent and lets a non-shape
  // card opt in by declaring its io.
  const writesDistance = (c: Card): boolean => {
    if (c.kind !== 'typed') return false;
    const def = lookupCardDef(c.type);
    return def ? cardIO(def).writes.includes('d') : false;
  };

  cards.forEach((card, ri) => {
    if (card.kind !== 'typed' || card.type !== 'repeat') return;
    if (card.enabled === false) return; // muted repeat tiles nothing
    const tileStmt = substitutePlaceholders(repeatDef.snippetTemplate, (k) =>
      uniformNameFor(ri, k),
    );
    const scope = Number(card.params.scope?.value ?? 0);
    const targets: number[] = [];
    if (scope === 1) {
      for (let j = 0; j < ri; j++) { const c = cards[j]; if (c && writesDistance(c)) targets.push(j); }
    } else {
      for (let j = ri - 1; j >= 0; j--) {
        const c = cards[j];
        if (c && writesDistance(c)) targets.push(j);
        else break;
      }
    }
    for (const t of targets) {
      const arr = out.get(t) ?? [];
      arr.push(tileStmt);
      out.set(t, arr);
    }
  });
  return out;
}

/** Bracket the card's body in a tiled-uv block (save uv → apply each tile →
 *  body → restore uv). Pure list surgery on the card's scratch pad. */
function wrapWithRepeat(tiles: string[], emit: CardEmit): void {
  const open = ['  { vec2 _rep_uv = uv;'];
  for (const tile of tiles) {
    for (const tl of tile.split('\n')) open.push(`    ${tl.trim()}`);
  }
  emit.wrap(open, ['    uv = _rep_uv;', '  }']);
}

// ─── Helpers ───────────────────────────────────────────────────────────

// Standard uniforms the renderer always provides — never need a fallback.
const STD_UNIFORM_NAMES: ReadonlySet<string> = new Set([
  'u_resolution', 'u_time', 'u_mouse', 'u_cam_eye', 'u_cam_target', 'u_cam_up',
]);
// Name suffixes that signal a texture (so the fallback is a sampler2D, which
// reads black when unbound — safe — rather than a float that mistypes a
// texture() call).
const SAMPLER_NAME_RE = /(?:_tex|_texture|_img|_image|_video|_buf|_buffer|_sampler|_map)$/;

/** Scan wildcard bodies for `u_card…` / `u_buffer…` references that this
 *  build's `uniformDecls` doesn't declare, and return a sorted (deterministic)
 *  list of fallback `uniform …;` declarations so the shader still links.
 *  Sampler-shaped names become sampler2D (reads black unbound); everything else
 *  becomes float. Empty for any recipe with no dangling refs, so normal output
 *  stays byte-identical. */
function collectDanglingUniformFallbacks(cards: Recipe['cards'], uniformDecls: string[]): string[] {
  const declared = new Set<string>();
  for (const d of uniformDecls) {
    const m = /uniform\s+\w+\s+(u_\w+)\s*;/.exec(d);
    if (m?.[1]) declared.add(m[1]);
  }
  const missing = new Set<string>();
  for (const card of cards) {
    if (card.kind !== 'wildcard') continue;
    for (const match of card.rawSource.matchAll(UNIFORM_REF_RE)) {
      const name = match[0];
      if (!declared.has(name) && !STD_UNIFORM_NAMES.has(name)) missing.add(name);
    }
  }
  return [...missing].sort().map((name) => {
    const isSampler = SAMPLER_NAME_RE.test(name) || /^u_buffer_[a-d]$/.test(name);
    return `uniform ${isSampler ? 'sampler2D' : 'float'} ${name}; // fallback — dangling wildcard reference`;
  });
}

/** Resolve a 1-based GLSL body line number to the card whose span contains it,
 *  so a raw driver error ("L42: undeclared identifier") can be re-anchored to a
 *  card ("Card 'Swirl': …"). Both the renderer's user-coordinate error line and
 *  Span line numbers are relative to the emitted body. Returns null when no span
 *  covers the line (preamble/helpers/epilogue). */
export function cardForLine(spans: Span[], line: number): Span | null {
  for (const s of spans) {
    if (line >= s.startLine && line <= s.endLine) return s;
  }
  return null;
}

// Default register IO per category — the single place "what does a card touch"
// is answered when a CardDef doesn't declare `io` explicitly.
const CATEGORY_IO: Record<CardCategory, CardIO> = {
  shape: { reads: ['uv'], writes: ['d'] },
  distortion: { reads: ['uv'], writes: ['uv'] },
  color: { reads: ['d'], writes: ['col'] },
  effect: { reads: ['col'], writes: ['col'] },
};

/** The pipeline registers a card reads/writes — the single authority the
 *  compiler reasons about ordering/tiling from. Explicit `def.io` wins; else
 *  derived from `category`. */
export function cardIO(def: CardDef): CardIO {
  return def.io ?? CATEGORY_IO[def.category];
}

// The uniform-name scheme lives in ./uniform-names (the single authority).
// Re-exported here under their historical names so the public surface and the
// reverse parser keep importing them from one place.
export const uniformNameFor = encodeParam;
export const attrUniformNameFor = encodeAttr;

// Distortion card types whose snippet reassigns `uv`. v1 wires ONLY these as
// scoped block attributes — applied before the host body inside a uv
// save/restore, so they transform just that block. The scalar (d-mutating)
// distortions and the other categories arrive in later passes of this feature.
export const UV_TRANSFORM_ATTR_TYPES: ReadonlySet<string> = new Set([
  'translate', 'scale_uv', 'mirror_x', 'mirror_y', 'skew',
  'swirl', 'twirl', 'fisheye', 'polar_warp', 'mirror_domain',
  'mirror_repeat', 'polar_repeat', 'wave_warp', 'noise_warp', 'zoom_blur_uv',
]);

/** The host block's wired (uv-transform) attributes, paired with their def +
 *  original index (the index is part of the attribute uniform name so it stays
 *  stable across other attributes being added/removed). */
function wiredAttrs(card: TypedCard): Array<{ attr: CardAttribute; attrIndex: number; adef: CardDef }> {
  const out: Array<{ attr: CardAttribute; attrIndex: number; adef: CardDef }> = [];
  (card.attributes ?? []).forEach((attr, attrIndex) => {
    if (attr.enabled === false) return;
    if (!UV_TRANSFORM_ATTR_TYPES.has(attr.type)) return;
    const adef = lookupCardDef(attr.type);
    if (adef) out.push({ attr, attrIndex, adef });
  });
  return out;
}

/** Sanitize a user-given reroute name into a GLSL-identifier suffix. Non
 *  word-chars become '_'; empty collapses to 'unnamed'. The compiler always
 *  prefixes `rr_`, so a leading digit is harmless. Case is preserved so
 *  distinct names stay distinct (GLSL identifiers are case-sensitive). */
export function sanitizeRerouteId(name: string): string {
  const s = name.replace(/[^A-Za-z0-9_]/g, '_');
  return s.length > 0 ? s : 'unnamed';
}

/** A named reroute carries one of three pipeline registers. 'col' is the
 *  legacy/default channel and keeps the bare `rr_<id>` var name + vec3 type so
 *  existing recipes stay byte-identical; 'd'/'uv' get a typed suffixed var. */
type RerouteChannel = 'col' | 'd' | 'uv';
const REROUTE_CHANNEL: Record<RerouteChannel, { type: string; reg: string; zero: string }> = {
  col: { type: 'vec3', reg: 'col', zero: 'vec3(0.0)' },
  d: { type: 'float', reg: 'd', zero: '0.0' },
  uv: { type: 'vec2', reg: 'uv', zero: 'vec2(0.0)' },
};
function rerouteChannelOf(card: TypedCard): RerouteChannel {
  const v = Number(card.params.channel?.value ?? 0);
  return v === 1 ? 'd' : v === 2 ? 'uv' : 'col';
}
function rerouteVarName(id: string, ch: RerouteChannel): string {
  return ch === 'col' ? `rr_${id}` : `rr_${id}__${ch}`;
}

/** Pre-declaration lines for every distinct reroute var (decls AND usages), in
 *  first-appearance order, typed by channel: `vec3 rr_<id> = vec3(0.0);` /
 *  `float rr_<id>__d = 0.0;` / `vec2 rr_<id>__uv = vec2(0.0);`. Emitted at the
 *  top of main() so a usage whose ref has no matching declaration reads the
 *  zero default instead of an undeclared-variable error. */
function collectRerouteDecls(cards: Recipe['cards']): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const card of cards) {
    if (card.kind !== 'typed') continue;
    let raw: ParameterValue | undefined;
    if (card.type === 'reroute_decl') raw = card.params.name?.value;
    else if (card.type === 'reroute_use') raw = card.params.ref?.value;
    else continue;
    const id = sanitizeRerouteId(typeof raw === 'string' ? raw : '');
    const ch = rerouteChannelOf(card);
    const v = rerouteVarName(id, ch);
    if (seen.has(v)) continue;
    seen.add(v);
    lines.push(`  ${REROUTE_CHANNEL[ch].type} ${v} = ${REROUTE_CHANNEL[ch].zero};`);
  }
  return lines;
}

/** Format a param value as a GLSL literal — used to bake a macro's sub-block
 *  params into its inline-expanded body. float/select → a float literal,
 *  color → vec3(...), everything else (media/text) → 0.0 (unsupported in v1).
 *  Routes through the canonical `glslFloat` so baked macro literals spell the
 *  same bytes as uniform-default literals (byte-identical invariant). */
function glslLiteral(value: ParameterValue, kind: string | undefined): string {
  if (kind === 'color' && Array.isArray(value)) {
    return `vec3(${glslFloat(value[0] ?? 0)}, ${glslFloat(value[1] ?? 0)}, ${glslFloat(value[2] ?? 0)})`;
  }
  if (typeof value === 'number') return glslFloat(value);
  return '0.0';
}

/** Optional macro compression: strip arithmetic-identity operations that a
 *  baked literal produced (`x * 1.0`, `x + 0.0`, `x - 0.0`). These are exact
 *  IEEE identities, so the rendered result is byte-identical — the code is just
 *  shorter. (Deeper CSE/constant-folding via the dataflow IR is a follow-up.) */
function compressMacroLines(lines: string[]): string[] {
  return lines.map((ln) => ln
    .replace(/ \* 1\.0(?![\d.])/g, '')
    .replace(/ \+ 0\.0(?![\d.])/g, '')
    .replace(/ - 0\.0(?![\d.])/g, ''));
}

/** GL type for a given ParamDef.kind. Image + video + buffer params are
 *  textures bound through the runtime's sampler2D path. */
function glslTypeForParam(
  kind: 'float' | 'color' | 'select' | 'image' | 'video' | 'buffer' | 'text',
): string {
  if (kind === 'color') return 'vec3';
  if (kind === 'image' || kind === 'video' || kind === 'buffer') return 'sampler2D';
  // 'text' is compile-only and never emitted as a uniform (the uniform passes
  // skip it); 'float' here is purely defensive.
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
    if (card.type === 'macro') continue; // macros have no library def; their sub-blocks are validated implicitly at compile
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
      // Custom animation chains are shared Recipe-wide, so a buffer pass can
      // bind params to them too. (Buffer passes don't recurse into `passes`.)
      ...(recipe.animations ? { animations: recipe.animations } : {}),
    };
    passes.push({ id, name: pass.name, shader: compile(subRecipe) });
  }
  return { passes };
}
