# Shade Compiler Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `src/compiler/` — a standalone Recipe ↔ GLSL compiler per `D:\Personal\Resume\SHADE_COMPILER_HANDOFF.md` — with the magic-comment round-trip protocol, five-type animation system, escape-hatch `custom` block, the full **25-block library** ported from `src/cards/`, and a Vitest suite that proves correctness without booting a renderer.

**Architecture:** New module at `web/src/compiler/` lives alongside (does not replace) the existing `web/src/cards/`. UI consumers keep using `cards/` until migrated in a follow-up. The compiler emits a full WebGL2 fragment shader (no host-side preamble wrapping) with `// @shade:block id="…" type="…" params=<JSON>` magic comments around each block; the reverse parser recovers the Recipe from those JSON blobs without re-parsing the GLSL body.

**Tech Stack:** TypeScript (strict), Vitest (already configured), nanoid (already in deps) for block ids. Optional dev dep `gl` (headless WebGL) gated behind `HEADLESS_GL=1`. No new runtime deps.

**Companion spec:** `docs/superpowers/specs/2026-05-23-compiler-rework.md` — decisions + deltas vs handoff.

---

## File structure

```
web/src/compiler/
├── index.ts              # public surface: compile, parseShadeGlsl, BLOCK_LIBRARY, makeDefaultBlock, validateRecipe
├── types.ts              # Recipe, Block, BlockDef, Parameter, ParamDef, Animation, CompileResult, UniformBinding, CompileError
├── helpers.ts            # GLSL helper registry (noise, voronoi, hsv2rgb, hash, rotate2d) + closure resolver
├── markers.ts            # @shade:block + @shade:end + @shade:recipe emit/parse
├── anim.ts               # Animation expression emitter (5 types) + uniform-binding source list per animation
├── compile.ts            # Forward compiler — Recipe → CompileResult
├── parse.ts              # Reverse parser — parseShadeGlsl
├── default-block.ts      # makeDefaultBlock + validateRecipe (small enough to live together)
└── blocks/
    ├── index.ts                  # BLOCK_LIBRARY map + lookup
    │
    ├── # Phase 1 (Task 7) ───
    ├── radial-gradient.ts
    ├── ripple.ts
    ├── palette.ts
    │
    ├── # Phase 2 (Task 8) ───
    ├── stripes.ts
    ├── noise-field.ts
    ├── ring.ts
    ├── voronoi.ts
    ├── swirl.ts
    ├── repeat.ts
    ├── hue-cycle.ts
    ├── triple-gradient.ts
    │
    ├── # Phase 3 (Task 9) ───
    ├── wave-warp.ts
    ├── glow.ts
    ├── vignette.ts
    ├── grain.ts
    │
    ├── # Bonus 10 (Task 9b) ───
    ├── spiral.ts
    ├── dots.ts
    ├── checker.ts
    ├── rotate.ts
    ├── kaleidoscope.ts
    ├── pixelate.ts
    ├── invert.ts
    ├── posterize.ts
    ├── scanlines.ts
    ├── brightness-contrast.ts
    │
    └── custom.ts                 # Phase 4 (Task 10)

web/src/compiler/*.test.ts   # colocated, one per source file as appropriate
```

ESLint boundary: `src/compiler/**` may NOT import from `src/cards/**` or any sibling module. Add to `web/eslint.config.js` in Task 1.

---

## Task 1: Module scaffold + locked types

**Files:**
- Create: `web/src/compiler/types.ts`
- Modify: `web/eslint.config.js` (add `src/compiler/**` boundary block)

- [ ] **Step 1: Create the types file**

`web/src/compiler/types.ts`:

```typescript
// Locked contract types for the Shade compiler. See the handoff doc for
// rationale. Any change to these shapes is a breaking change for the
// editor team and the renderer team — coordinate before edit.

export type Recipe = {
  version: 1;
  blocks: Block[];
  globalTempo: number;
  canvasAspect: 'square' | 'portrait' | 'landscape';
};

export type Block = {
  id: string;
  type: BlockType;
  enabled: boolean;
  params: Record<string, Parameter>;
};

export type BlockType = string;

export type Parameter = {
  value: ParamValue;
  animation: Animation | null;
};

export type ParamValue =
  | number
  | readonly [number, number]
  | readonly [number, number, number]
  | string;

export type Animation =
  | { type: 'sine'; min: number; max: number; speed: number; phase: number; mode: 'hz' | 'bpm' }
  | { type: 'noise_wiggle'; min: number; max: number; speed: number; mode: 'hz' | 'bpm' }
  | { type: 'pulse'; min: number; max: number; speed: number; duty: number; mode: 'hz' | 'bpm' }
  | { type: 'mouse_follow'; min: number; max: number; axis: 'x' | 'y' }
  | {
      type: 'color_cycle';
      colorA: readonly [number, number, number];
      colorB: readonly [number, number, number];
      speed: number;
      mode: 'hz' | 'bpm';
    };

export type BlockDef = {
  type: BlockType;
  category: 'shape' | 'distortion' | 'color' | 'effect' | 'custom';
  friendlyName: string;
  icon: string;
  description: string;
  params: Record<string, ParamDef>;
  glsl: string;
  helpers?: string[];
};

export type ParamDef = {
  kind: 'number' | 'vec2' | 'color' | 'string';
  default: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  animatable: boolean;
};

export type CompileResult =
  | { ok: true; glsl: string; uniforms: UniformBinding[] }
  | { ok: false; error: CompileError; partialGlsl?: string };

export type UniformBinding = {
  name: string;
  type: 'float' | 'vec2' | 'vec3';
  source:
    | { kind: 'static'; blockId: string; paramName: string }
    | { kind: 'anim_min'; blockId: string; paramName: string }
    | { kind: 'anim_max'; blockId: string; paramName: string }
    | { kind: 'anim_speed'; blockId: string; paramName: string }
    | { kind: 'anim_phase'; blockId: string; paramName: string }
    | { kind: 'anim_duty'; blockId: string; paramName: string }
    | { kind: 'anim_color_a'; blockId: string; paramName: string }
    | { kind: 'anim_color_b'; blockId: string; paramName: string }
    | { kind: 'global_time' }
    | { kind: 'global_mouse' }
    | { kind: 'global_resolution' }
    | { kind: 'global_tempo_bps' };
};

export type CompileError = {
  code: 'unknown_block_type' | 'missing_param' | 'param_type_mismatch' | 'invalid_glsl';
  message: string;
  blockId?: string;
  paramName?: string;
};
```

- [ ] **Step 2: Add ESLint boundary block for `src/compiler/**`**

Modify `web/eslint.config.js`, inserting a new block before the test-files override (the last block):

```javascript
  // compiler/ — leaf, owns its own contract. Must not import any other
  // application module. Consumers (cards/, ux/, integration/) may import
  // from @/compiler entry only.
  {
    files: ['src/compiler/**/*.{ts,tsx}'],
    rules: restrict([
      xModule('renderer', 'compiler is a pure-logic module; renderer consumes its output'),
      xModule('editor', 'compiler is a leaf'),
      xModule('cards', 'compiler is the replacement for cards/; no back-references'),
      xModule('ux', 'compiler is a leaf'),
      xModule('integration', 'compiler is a leaf'),
    ]),
  },
```

Then in the ux/ block (already present), add `deepSibling('compiler')` to the restrict list.

- [ ] **Step 3: Typecheck — verify the types file compiles cleanly**

Run from `web/`:
```bash
npm run typecheck
```
Expected: PASS (no errors).

- [ ] **Step 4: Lint — verify the boundary rule loads**

```bash
npm run lint
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/compiler/types.ts web/eslint.config.js
git commit -m "feat(compiler): lock contract types + ESLint boundary (Task 1)"
```

---

## Task 2: GLSL helper registry

**Files:**
- Create: `web/src/compiler/helpers.ts`
- Create: `web/src/compiler/helpers.test.ts`

- [ ] **Step 1: Write the test file first**

`web/src/compiler/helpers.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  GLSL_HELPERS,
  HELPER_EMISSION_ORDER,
  resolveHelperClosure,
} from './helpers';

describe('GLSL_HELPERS', () => {
  it('declares each of the 5 helpers from the handoff', () => {
    for (const name of ['noise', 'voronoi', 'hsv2rgb', 'hash', 'rotate2d']) {
      expect(GLSL_HELPERS).toHaveProperty(name);
      expect(GLSL_HELPERS[name]!.length).toBeGreaterThan(0);
    }
  });

  it('every name in HELPER_EMISSION_ORDER has a body', () => {
    for (const name of HELPER_EMISSION_ORDER) {
      expect(GLSL_HELPERS).toHaveProperty(name);
    }
  });
});

describe('resolveHelperClosure', () => {
  it('expands transitive deps (noise depends on hash)', () => {
    const closure = resolveHelperClosure(['noise']);
    expect(closure.has('noise')).toBe(true);
    expect(closure.has('hash')).toBe(true);
  });

  it('voronoi pulls in hash', () => {
    const closure = resolveHelperClosure(['voronoi']);
    expect(closure.has('hash')).toBe(true);
  });

  it('ignores unknown helper names', () => {
    const closure = resolveHelperClosure(['no_such_helper', 'hash']);
    expect(closure.has('hash')).toBe(true);
    expect(closure.has('no_such_helper')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test -- --run compiler/helpers
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the helpers file**

`web/src/compiler/helpers.ts`:

```typescript
// Reusable GLSL helper functions referenced by blocks via BlockDef.helpers.
// The compiler walks the recipe, collects the union of names + transitive
// dependencies, then emits each function ONCE at the top of the shader
// (before main()). Emission order is fixed so dependents always come after
// their dependencies.
//
// Sources: noise + hash adapted from iq's Shadertoy snippets.
// voronoi adapted from Inigo Quilez. hsv2rgb from Sam Hocevar (PD).
// rotate2d is the standard 2x2 rotation matrix.

export const GLSL_HELPERS: Record<string, string> = {
  hash: `float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}`,

  noise: `float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i + vec2(0.0, 0.0));
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}`,

  voronoi: `float voronoi(vec2 p) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float md = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 site = g + vec2(hash(ip + g), hash(ip + g + 0.5));
      md = min(md, length(site - fp));
    }
  }
  return md;
}`,

  hsv2rgb: `vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}`,

  rotate2d: `mat2 rotate2d(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}`,
};

export const HELPER_DEPS: Record<string, string[]> = {
  noise: ['hash'],
  voronoi: ['hash'],
};

export const HELPER_EMISSION_ORDER: readonly string[] = [
  'hash',
  'noise',
  'voronoi',
  'hsv2rgb',
  'rotate2d',
];

export function resolveHelperClosure(requested: Iterable<string>): Set<string> {
  const out = new Set<string>();
  const stack = [...requested];
  while (stack.length > 0) {
    const name = stack.pop()!;
    if (out.has(name)) continue;
    if (!(name in GLSL_HELPERS)) continue;
    out.add(name);
    const deps = HELPER_DEPS[name];
    if (deps) for (const d of deps) stack.push(d);
  }
  return out;
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npm run test -- --run compiler/helpers
```
Expected: PASS (5+ tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/compiler/helpers.ts web/src/compiler/helpers.test.ts
git commit -m "feat(compiler): GLSL helper registry + closure resolver (Task 2)"
```

---

## Task 3: Magic comment format (markers)

**Files:**
- Create: `web/src/compiler/markers.ts`
- Create: `web/src/compiler/markers.test.ts`

- [ ] **Step 1: Write the test file**

`web/src/compiler/markers.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  emitBlockOpen,
  emitBlockClose,
  emitRecipeHeader,
  parseAllBlockMarkers,
  parseRecipeHeader,
  BLOCK_OPEN_REGEX,
} from './markers';

describe('emit', () => {
  it('emitBlockOpen produces a single-line marker with id, type, JSON params', () => {
    const out = emitBlockOpen('b1', 'ripple', { freq: { value: 10 } });
    expect(out).toBe('// @shade:block id="b1" type="ripple" params={"freq":{"value":10}}');
    expect(out.includes('\n')).toBe(false);
  });

  it('emitBlockClose mirrors id', () => {
    expect(emitBlockClose('b1')).toBe('// @shade:end b1');
  });

  it('emitRecipeHeader carries tempo + aspect', () => {
    expect(emitRecipeHeader({ globalTempo: 132, canvasAspect: 'portrait' })).toBe(
      '// @shade:recipe tempo=132 aspect=portrait',
    );
  });
});

describe('parse', () => {
  it('parses all block markers in document order', () => {
    const src = [
      'void main() {',
      '  // @shade:block id="b1" type="radial_gradient" params={"softness":{"value":1}}',
      '  d = 1.0;',
      '  // @shade:end b1',
      '  // @shade:block id="b2" type="ripple" params={"freq":{"value":8,"animation":null}}',
      '  d = sin(d);',
      '  // @shade:end b2',
      '}',
    ].join('\n');
    const markers = parseAllBlockMarkers(src);
    expect(markers.length).toBe(2);
    expect(markers[0]).toMatchObject({ id: 'b1', type: 'radial_gradient' });
    expect(markers[0]!.params).toEqual({ softness: { value: 1 } });
    expect(markers[1]).toMatchObject({ id: 'b2', type: 'ripple' });
  });

  it('parseRecipeHeader extracts tempo + aspect', () => {
    const src = '// @shade:recipe tempo=120 aspect=square\nvoid main() {}';
    expect(parseRecipeHeader(src)).toEqual({ globalTempo: 120, canvasAspect: 'square' });
  });

  it('parseRecipeHeader returns null when absent', () => {
    expect(parseRecipeHeader('void main() {}')).toBeNull();
  });

  it('regex tolerates whitespace variation in the marker', () => {
    const line = '//   @shade:block  id="x"  type="y"  params={}';
    expect(BLOCK_OPEN_REGEX.test(line)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — verify fails**

```bash
npm run test -- --run compiler/markers
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the markers module**

`web/src/compiler/markers.ts`:

```typescript
// Magic comment protocol that anchors each block's GLSL span in the emitted
// shader source. The reverse parser reads these — never the GLSL body.

import type { Recipe } from './types';

// Permissive whitespace so hand edits to the source (extra spaces, tabs)
// don't break round-trip.
export const BLOCK_OPEN_REGEX =
  /\/\/\s*@shade:block\s+id="([^"]+)"\s+type="([^"]+)"\s+params=(\{[^\n]*\})/g;

const RECIPE_HEADER_REGEX =
  /\/\/\s*@shade:recipe\s+tempo=(\d+(?:\.\d+)?)\s+aspect=(square|portrait|landscape)/;

export type BlockMarker = {
  id: string;
  type: string;
  params: Record<string, unknown>;
};

export function emitBlockOpen(
  id: string,
  type: string,
  params: Record<string, unknown>,
): string {
  // Embedding raw JSON in a // comment works because GLSL preprocessing
  // strips // comments before tokenization. If you ever pre-process the
  // source through a JS pipeline that re-quotes strings, this WILL break.
  return `// @shade:block id="${id}" type="${type}" params=${JSON.stringify(params)}`;
}

export function emitBlockClose(id: string): string {
  return `// @shade:end ${id}`;
}

export function emitRecipeHeader(opts: {
  globalTempo: number;
  canvasAspect: Recipe['canvasAspect'];
}): string {
  return `// @shade:recipe tempo=${opts.globalTempo} aspect=${opts.canvasAspect}`;
}

export function parseAllBlockMarkers(source: string): BlockMarker[] {
  const out: BlockMarker[] = [];
  // Reset lastIndex since the regex is /g.
  BLOCK_OPEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BLOCK_OPEN_REGEX.exec(source)) !== null) {
    const [, id, type, paramsJson] = match;
    let params: Record<string, unknown>;
    try {
      params = JSON.parse(paramsJson!) as Record<string, unknown>;
    } catch {
      // Malformed JSON inside the marker — skip; the caller can detect via
      // count mismatch and surface to the user.
      continue;
    }
    out.push({ id: id!, type: type!, params });
  }
  return out;
}

export function parseRecipeHeader(
  source: string,
): { globalTempo: number; canvasAspect: Recipe['canvasAspect'] } | null {
  const m = RECIPE_HEADER_REGEX.exec(source);
  if (!m) return null;
  return {
    globalTempo: Number(m[1]),
    canvasAspect: m[2] as Recipe['canvasAspect'],
  };
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npm run test -- --run compiler/markers
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/compiler/markers.ts web/src/compiler/markers.test.ts
git commit -m "feat(compiler): @shade:block / @shade:end / @shade:recipe magic comments (Task 3)"
```

---

## Task 4: Animation expression emitter

**Files:**
- Create: `web/src/compiler/anim.ts`
- Create: `web/src/compiler/anim.test.ts`

- [ ] **Step 1: Write the test file**

`web/src/compiler/anim.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { emitAnimLocal, animUniformBindings, timeExpr } from './anim';
import type { Animation } from './types';

describe('timeExpr', () => {
  it('hz mode returns u_time', () => {
    expect(timeExpr('hz')).toBe('u_time');
  });
  it('bpm mode scales by u_tempo_bps', () => {
    expect(timeExpr('bpm')).toBe('(u_time * u_tempo_bps)');
  });
});

describe('emitAnimLocal', () => {
  it('sine: mix(min, max, sin(t * speed + phase) * 0.5 + 0.5)', () => {
    const anim: Animation = { type: 'sine', min: 5, max: 15, speed: 1.2, phase: 0, mode: 'hz' };
    const out = emitAnimLocal('b1', 'freq', anim);
    expect(out).toContain('float _b1_freq');
    expect(out).toContain(
      'mix(u_b1_freq_min, u_b1_freq_max, sin(u_time * u_b1_freq_speed + u_b1_freq_phase) * 0.5 + 0.5)',
    );
  });

  it('noise_wiggle: mix(min, max, noise(vec2(t * speed, 0.0)))', () => {
    const anim: Animation = { type: 'noise_wiggle', min: 0, max: 1, speed: 1, mode: 'hz' };
    const out = emitAnimLocal('b1', 'x', anim);
    expect(out).toContain('mix(u_b1_x_min, u_b1_x_max, noise(vec2(u_time * u_b1_x_speed, 0.0)))');
  });

  it('pulse: mix(min, max, step(duty, fract(t * speed)))', () => {
    const anim: Animation = { type: 'pulse', min: 0, max: 1, speed: 1, duty: 0.5, mode: 'hz' };
    const out = emitAnimLocal('b1', 'x', anim);
    expect(out).toContain(
      'mix(u_b1_x_min, u_b1_x_max, step(u_b1_x_duty, fract(u_time * u_b1_x_speed)))',
    );
  });

  it('mouse_follow: mix(min, max, u_mouse.<axis>)', () => {
    const anim: Animation = { type: 'mouse_follow', min: 0, max: 1, axis: 'x' };
    expect(emitAnimLocal('b1', 'x', anim)).toContain(
      'mix(u_b1_x_min, u_b1_x_max, u_mouse.x)',
    );
    const animY: Animation = { type: 'mouse_follow', min: 0, max: 1, axis: 'y' };
    expect(emitAnimLocal('b1', 'y', animY)).toContain('u_mouse.y');
  });

  it('color_cycle: mix(colorA, colorB, sin(t * speed) * 0.5 + 0.5); type is vec3', () => {
    const anim: Animation = {
      type: 'color_cycle',
      colorA: [1, 0, 0],
      colorB: [0, 1, 0],
      speed: 1,
      mode: 'hz',
    };
    const out = emitAnimLocal('b1', 'c', anim);
    expect(out).toContain('vec3 _b1_c');
    expect(out).toContain(
      'mix(u_b1_c_color_a, u_b1_c_color_b, sin(u_time * u_b1_c_speed) * 0.5 + 0.5)',
    );
  });

  it('bpm mode replaces u_time with (u_time * u_tempo_bps)', () => {
    const anim: Animation = { type: 'sine', min: 0, max: 1, speed: 1, phase: 0, mode: 'bpm' };
    expect(emitAnimLocal('b1', 'x', anim)).toContain('(u_time * u_tempo_bps)');
  });
});

describe('animUniformBindings', () => {
  it('sine produces min, max, speed, phase floats', () => {
    const anim: Animation = { type: 'sine', min: 0, max: 1, speed: 1, phase: 0, mode: 'hz' };
    const bs = animUniformBindings('b1', 'x', anim);
    expect(bs.map((b) => b.source.kind).sort()).toEqual([
      'anim_max',
      'anim_min',
      'anim_phase',
      'anim_speed',
    ]);
    expect(bs.every((b) => b.type === 'float')).toBe(true);
  });

  it('pulse produces min, max, speed, duty', () => {
    const anim: Animation = { type: 'pulse', min: 0, max: 1, speed: 1, duty: 0.5, mode: 'hz' };
    const bs = animUniformBindings('b1', 'x', anim);
    expect(bs.map((b) => b.source.kind).sort()).toEqual([
      'anim_duty',
      'anim_max',
      'anim_min',
      'anim_speed',
    ]);
  });

  it('color_cycle produces colorA + colorB as vec3 + speed', () => {
    const anim: Animation = {
      type: 'color_cycle',
      colorA: [1, 0, 0],
      colorB: [0, 1, 0],
      speed: 1,
      mode: 'hz',
    };
    const bs = animUniformBindings('b1', 'c', anim);
    const types = bs.map((b) => b.type).sort();
    expect(types).toEqual(['float', 'vec3', 'vec3']);
  });

  it('mouse_follow produces just min + max', () => {
    const anim: Animation = { type: 'mouse_follow', min: 0, max: 1, axis: 'x' };
    const bs = animUniformBindings('b1', 'x', anim);
    expect(bs.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test — verify fails**

```bash
npm run test -- --run compiler/anim
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the anim module**

`web/src/compiler/anim.ts`:

```typescript
// Animation compilation: emits the per-frame local-variable expression for
// an animated parameter, plus the list of UniformBinding entries the
// renderer needs to populate to feed it.
//
// All time-based animations switch on `mode`:
//   'hz'  — t = u_time (seconds since first mount)
//   'bpm' — t = u_time * u_tempo_bps (beats since first mount)

import type { Animation, UniformBinding } from './types';

const u = (blockId: string, paramName: string, suffix: string): string =>
  `u_${blockId}_${paramName}_${suffix}`;

export function timeExpr(mode: 'hz' | 'bpm'): string {
  return mode === 'bpm' ? '(u_time * u_tempo_bps)' : 'u_time';
}

export function emitAnimLocal(blockId: string, paramName: string, anim: Animation): string {
  const local = `_${blockId}_${paramName}`;
  switch (anim.type) {
    case 'sine': {
      const t = timeExpr(anim.mode);
      return `float ${local} = mix(${u(blockId, paramName, 'min')}, ${u(blockId, paramName, 'max')}, sin(${t} * ${u(blockId, paramName, 'speed')} + ${u(blockId, paramName, 'phase')}) * 0.5 + 0.5);`;
    }
    case 'noise_wiggle': {
      const t = timeExpr(anim.mode);
      return `float ${local} = mix(${u(blockId, paramName, 'min')}, ${u(blockId, paramName, 'max')}, noise(vec2(${t} * ${u(blockId, paramName, 'speed')}, 0.0)));`;
    }
    case 'pulse': {
      const t = timeExpr(anim.mode);
      return `float ${local} = mix(${u(blockId, paramName, 'min')}, ${u(blockId, paramName, 'max')}, step(${u(blockId, paramName, 'duty')}, fract(${t} * ${u(blockId, paramName, 'speed')})));`;
    }
    case 'mouse_follow': {
      return `float ${local} = mix(${u(blockId, paramName, 'min')}, ${u(blockId, paramName, 'max')}, u_mouse.${anim.axis});`;
    }
    case 'color_cycle': {
      const t = timeExpr(anim.mode);
      return `vec3 ${local} = mix(${u(blockId, paramName, 'color_a')}, ${u(blockId, paramName, 'color_b')}, sin(${t} * ${u(blockId, paramName, 'speed')}) * 0.5 + 0.5);`;
    }
  }
}

export function animUniformBindings(
  blockId: string,
  paramName: string,
  anim: Animation,
): UniformBinding[] {
  const floatB = (suffix: string, kind: UniformBinding['source']['kind']): UniformBinding => ({
    name: u(blockId, paramName, suffix),
    type: 'float',
    source: { kind, blockId, paramName } as UniformBinding['source'],
  });
  const vec3B = (suffix: string, kind: UniformBinding['source']['kind']): UniformBinding => ({
    name: u(blockId, paramName, suffix),
    type: 'vec3',
    source: { kind, blockId, paramName } as UniformBinding['source'],
  });

  switch (anim.type) {
    case 'sine':
      return [
        floatB('min', 'anim_min'),
        floatB('max', 'anim_max'),
        floatB('speed', 'anim_speed'),
        floatB('phase', 'anim_phase'),
      ];
    case 'noise_wiggle':
      return [
        floatB('min', 'anim_min'),
        floatB('max', 'anim_max'),
        floatB('speed', 'anim_speed'),
      ];
    case 'pulse':
      return [
        floatB('min', 'anim_min'),
        floatB('max', 'anim_max'),
        floatB('speed', 'anim_speed'),
        floatB('duty', 'anim_duty'),
      ];
    case 'mouse_follow':
      return [floatB('min', 'anim_min'), floatB('max', 'anim_max')];
    case 'color_cycle':
      return [
        vec3B('color_a', 'anim_color_a'),
        vec3B('color_b', 'anim_color_b'),
        floatB('speed', 'anim_speed'),
      ];
  }
}

/** True if the animation produces a vec3 (only `color_cycle`). */
export function animYieldsVec3(anim: Animation): boolean {
  return anim.type === 'color_cycle';
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npm run test -- --run compiler/anim
```
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/compiler/anim.ts web/src/compiler/anim.test.ts
git commit -m "feat(compiler): animation expression emitter for 5 types (Task 4)"
```

---

## Task 5: Forward compiler — skeleton + empty recipe

**Files:**
- Create: `web/src/compiler/compile.ts`
- Create: `web/src/compiler/compile.test.ts`

This task lands `compile()` returning a valid empty-recipe shader. Block walking comes in Task 6.

- [ ] **Step 1: Write the test file (empty-recipe assertions only)**

`web/src/compiler/compile.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import type { Recipe } from './types';

function emptyRecipe(): Recipe {
  return { version: 1, blocks: [], globalTempo: 120, canvasAspect: 'square' };
}

describe('compile — empty recipe', () => {
  it('returns ok', () => {
    expect(compile(emptyRecipe()).ok).toBe(true);
  });

  it('emits a valid-looking fragment shader skeleton', () => {
    const out = compile(emptyRecipe());
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toContain('#version 300 es');
    expect(out.glsl).toContain('precision highp float;');
    expect(out.glsl).toContain('out vec4 fragColor;');
    expect(out.glsl).toContain('void main()');
    expect(out.glsl).toContain('fragColor = vec4(col, 1.0);');
  });

  it('declares the four global uniforms', () => {
    const out = compile(emptyRecipe());
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toContain('uniform vec2 u_resolution;');
    expect(out.glsl).toContain('uniform float u_time;');
    expect(out.glsl).toContain('uniform vec2 u_mouse;');
    expect(out.glsl).toContain('uniform float u_tempo_bps;');
  });

  it('returns the four global uniform bindings', () => {
    const out = compile(emptyRecipe());
    if (!out.ok) throw new Error('expected ok');
    const kinds = out.uniforms.map((u) => u.source.kind).sort();
    expect(kinds).toEqual(['global_mouse', 'global_resolution', 'global_tempo_bps', 'global_time']);
  });

  it('emits the @shade:recipe header', () => {
    const out = compile(emptyRecipe());
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toContain('// @shade:recipe tempo=120 aspect=square');
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run compiler/compile
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write compile.ts skeleton**

`web/src/compiler/compile.ts`:

```typescript
// Forward compiler. Recipe → CompileResult.
//
// Pipeline (handoff §"Forward compilation algorithm"):
//   1. Precision / version header.
//   2. Global uniforms (always: time, mouse, resolution, tempo_bps).
//   3. Per-block uniform declarations.
//   4. Helper function definitions (deduplicated).
//   5. main() — uv/d/col prelude → recipe-header magic comment →
//      per-block emission → fragColor write.
//
// Per-block emission is in walkBlocks(); empty-recipe path skips it.

import { emitRecipeHeader } from './markers';
import type { CompileResult, Recipe, UniformBinding } from './types';

const GLOBAL_UNIFORM_DECLS: readonly string[] = [
  'uniform vec2 u_resolution;',
  'uniform float u_time;',
  'uniform vec2 u_mouse;',
  'uniform float u_tempo_bps;',
];

const GLOBAL_UNIFORM_BINDINGS: UniformBinding[] = [
  { name: 'u_resolution', type: 'vec2', source: { kind: 'global_resolution' } },
  { name: 'u_time', type: 'float', source: { kind: 'global_time' } },
  { name: 'u_mouse', type: 'vec2', source: { kind: 'global_mouse' } },
  { name: 'u_tempo_bps', type: 'float', source: { kind: 'global_tempo_bps' } },
];

const MAIN_PRELUDE = [
  '  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;',
  '  uv.x *= u_resolution.x / u_resolution.y;',
  '  float d = 0.0;',
  '  vec3 col = vec3(0.0);',
];

const MAIN_EPILOGUE = ['  fragColor = vec4(col, 1.0);'];

export function compile(recipe: Recipe): CompileResult {
  const lines: string[] = [];
  const uniforms: UniformBinding[] = [...GLOBAL_UNIFORM_BINDINGS];

  // 1. Version + precision + out
  lines.push('#version 300 es');
  lines.push('precision highp float;');
  lines.push('');
  lines.push('out vec4 fragColor;');
  lines.push('');

  // 2. Global uniforms
  for (const decl of GLOBAL_UNIFORM_DECLS) lines.push(decl);
  lines.push('');

  // 3. Per-block uniform decls + 4. helpers come in Task 6.

  // 5. main()
  lines.push('void main() {');
  for (const l of MAIN_PRELUDE) lines.push(l);
  lines.push('');
  lines.push(
    '  ' +
      emitRecipeHeader({
        globalTempo: recipe.globalTempo,
        canvasAspect: recipe.canvasAspect,
      }),
  );
  lines.push('');

  // Per-block walker in Task 6; no-op for now.

  for (const l of MAIN_EPILOGUE) lines.push(l);
  lines.push('}');

  return {
    ok: true,
    glsl: lines.join('\n'),
    uniforms,
  };
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm run test -- --run compiler/compile
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/compiler/compile.ts web/src/compiler/compile.test.ts
git commit -m "feat(compiler): compile() skeleton — empty recipe → valid shader (Task 5)"
```

---

## Task 6: Forward compiler — block walker + snippet substitution

**Files:**
- Modify: `web/src/compiler/compile.ts`
- Modify: `web/src/compiler/compile.test.ts`
- Create: `web/src/compiler/format.ts` (small param formatters)

- [ ] **Step 1: Write the formatters first**

`web/src/compiler/format.ts`:

```typescript
// GLSL-literal formatters for default values + ad-hoc emission.

import type { ParamValue } from './types';

export function glslFloat(n: number): string {
  const s = Number(n.toFixed(6)).toString();
  return s.includes('.') ? s : `${s}.0`;
}

export function glslLiteral(v: ParamValue): string {
  if (typeof v === 'number') return glslFloat(v);
  if (typeof v === 'string') return v; // for `custom` block raw code
  if (v.length === 2) return `vec2(${glslFloat(v[0])}, ${glslFloat(v[1])})`;
  return `vec3(${glslFloat(v[0])}, ${glslFloat(v[1])}, ${glslFloat(v[2])})`;
}

export function substitutePlaceholders(
  template: string,
  mapper: (paramName: string) => string,
): string {
  return template.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (_, key) => mapper(key as string));
}
```

- [ ] **Step 2: Add per-block tests to compile.test.ts**

Append to `web/src/compiler/compile.test.ts`:

```typescript
import { BLOCK_LIBRARY } from './blocks';
import type { Block } from './types';

function recipeOf(blocks: Block[]): Recipe {
  return { version: 1, blocks, globalTempo: 120, canvasAspect: 'square' };
}

function block(partial: Partial<Block> & { type: string }): Block {
  return {
    id: partial.id ?? 'b1',
    type: partial.type,
    enabled: partial.enabled ?? true,
    params: partial.params ?? {},
  };
}

describe('compile — block walker', () => {
  it('skips disabled blocks entirely', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'ripple',
          enabled: false,
          params: {
            freq: { value: 10, animation: null },
            phase: { value: 0, animation: null },
          },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).not.toContain('@shade:block id="b1"');
    expect(out.uniforms.find((u) => u.source.kind === 'static')).toBeUndefined();
  });

  it('emits a magic comment around each enabled block', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'radial_gradient',
          params: {
            center: { value: [0, 0], animation: null },
            softness: { value: 1, animation: null },
          },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toMatch(
      /@shade:block id="b1" type="radial_gradient" params=\{.*"softness".*"center".*\}/,
    );
    expect(out.glsl).toContain('@shade:end b1');
  });

  it('substitutes {{param}} placeholders with uniform names', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'ripple',
          params: {
            freq: { value: 10, animation: null },
            phase: { value: 0, animation: null },
          },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toContain('uniform float u_b1_freq;');
    expect(out.glsl).toContain('uniform float u_b1_phase;');
    expect(out.glsl).toContain('d = sin(d * u_b1_freq + u_b1_phase);');
  });

  it('returns a static UniformBinding per non-animated param', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'ripple',
          params: {
            freq: { value: 10, animation: null },
            phase: { value: 0, animation: null },
          },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    const statics = out.uniforms.filter((u) => u.source.kind === 'static');
    expect(statics.length).toBe(2);
    expect(statics.map((u) => u.name).sort()).toEqual(['u_b1_freq', 'u_b1_phase']);
  });

  it('emits helpers exactly once when multiple blocks use the same helper', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'noise_field',
          params: { scale: { value: 4, animation: null } },
        }),
        block({
          id: 'b2',
          type: 'noise_field',
          params: { scale: { value: 8, animation: null } },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    const noiseOccurrences = out.glsl.split('float noise(vec2 p)').length - 1;
    expect(noiseOccurrences).toBe(1);
    expect(out.glsl).toContain('float hash(vec2 p)'); // transitive
  });

  it('emits animation local + replaces param with local in snippet', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'ripple',
          params: {
            freq: {
              value: 10,
              animation: { type: 'sine', min: 5, max: 15, speed: 1.2, phase: 0, mode: 'hz' },
            },
            phase: { value: 0, animation: null },
          },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toContain('float _b1_freq = mix(u_b1_freq_min, u_b1_freq_max,');
    expect(out.glsl).toContain('d = sin(d * _b1_freq + u_b1_phase);');
    // Animated freq → no `u_b1_freq` static; only the four anim_* sub-uniforms.
    const animBindings = out.uniforms.filter(
      (u) => u.source.kind === 'anim_min' || u.source.kind === 'anim_max',
    );
    expect(animBindings.length).toBe(2);
  });

  it('errors with unknown_block_type and partialGlsl up to the broken block', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'radial_gradient',
          params: {
            center: { value: [0, 0], animation: null },
            softness: { value: 1, animation: null },
          },
        }),
        block({ id: 'b2', type: 'no_such_block', params: {} }),
      ]),
    );
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error('expected error');
    expect(out.error.code).toBe('unknown_block_type');
    expect(out.error.blockId).toBe('b2');
    expect(out.partialGlsl).toBeDefined();
    expect(out.partialGlsl!).toContain('@shade:block id="b1"');
    expect(out.partialGlsl!).not.toContain('@shade:block id="b2"');
  });

  it('errors when color_cycle is attached to a non-color param', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'ripple',
          params: {
            freq: {
              value: 10,
              animation: {
                type: 'color_cycle',
                colorA: [1, 0, 0],
                colorB: [0, 1, 0],
                speed: 1,
                mode: 'hz',
              },
            },
            phase: { value: 0, animation: null },
          },
        }),
      ]),
    );
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error('expected error');
    expect(out.error.code).toBe('param_type_mismatch');
  });
});

void BLOCK_LIBRARY; // referenced so the test file compiles before Task 7 lands blocks
```

- [ ] **Step 3: Run — should FAIL since `./blocks` doesn't exist yet**

```bash
npm run test -- --run compiler/compile
```
Expected: FAIL — `./blocks` import unresolved.

- [ ] **Step 4: Implement the block walker in compile.ts**

Replace the contents of `web/src/compiler/compile.ts`:

```typescript
// Forward compiler. Recipe → CompileResult.
//
// Pipeline (handoff §"Forward compilation algorithm"):
//   1. #version + precision header.
//   2. `out vec4 fragColor`.
//   3. Global uniforms (always: time, mouse, resolution, tempo_bps).
//   4. Per-block uniform declarations.
//   5. Helper function definitions (deduplicated).
//   6. main() — uv/d/col prelude → recipe-header magic comment →
//      per-block emission (animation locals + substituted snippet, wrapped
//      in @shade:block / @shade:end markers) → fragColor write.
//
// `partialGlsl` is emitted on error: everything up to and including the
// LAST successfully compiled block + the closing fragColor + `}` so the
// renderer can still draw something while the user fixes the bad block.

import { animUniformBindings, animYieldsVec3, emitAnimLocal } from './anim';
import { BLOCK_LIBRARY } from './blocks';
import { substitutePlaceholders } from './format';
import { GLSL_HELPERS, HELPER_EMISSION_ORDER, resolveHelperClosure } from './helpers';
import { emitBlockClose, emitBlockOpen, emitRecipeHeader } from './markers';
import type {
  BlockDef,
  Block,
  CompileError,
  CompileResult,
  Parameter,
  Recipe,
  UniformBinding,
} from './types';

const GLOBAL_UNIFORM_DECLS: readonly string[] = [
  'uniform vec2 u_resolution;',
  'uniform float u_time;',
  'uniform vec2 u_mouse;',
  'uniform float u_tempo_bps;',
];

const GLOBAL_UNIFORM_BINDINGS: UniformBinding[] = [
  { name: 'u_resolution', type: 'vec2', source: { kind: 'global_resolution' } },
  { name: 'u_time', type: 'float', source: { kind: 'global_time' } },
  { name: 'u_mouse', type: 'vec2', source: { kind: 'global_mouse' } },
  { name: 'u_tempo_bps', type: 'float', source: { kind: 'global_tempo_bps' } },
];

const MAIN_PRELUDE = [
  '  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;',
  '  uv.x *= u_resolution.x / u_resolution.y;',
  '  float d = 0.0;',
  '  vec3 col = vec3(0.0);',
];

const MAIN_EPILOGUE = ['  fragColor = vec4(col, 1.0);'];

export function compile(recipe: Recipe): CompileResult {
  const uniforms: UniformBinding[] = [...GLOBAL_UNIFORM_BINDINGS];

  // ── Pre-pass: validate + collect per-block uniforms + helpers ──────
  const perBlockUniformDecls: string[] = [];
  const helperRequests = new Set<string>();
  const enabledBlocks = recipe.blocks.filter((b) => b.enabled);

  for (const b of enabledBlocks) {
    const def = BLOCK_LIBRARY[b.type];
    if (!def) {
      return failPartial(
        { code: 'unknown_block_type', message: `unknown block type "${b.type}"`, blockId: b.id },
        recipe,
        b.id,
      );
    }
    const validation = validateBlockParams(b, def);
    if (validation) return failPartial(validation, recipe, b.id);

    if (def.helpers) for (const h of def.helpers) helperRequests.add(h);
    // noise_wiggle anim implicitly needs `noise` helper.
    for (const [pname, p] of Object.entries(b.params)) {
      void pname;
      if (p.animation?.type === 'noise_wiggle') helperRequests.add('noise');
    }

    collectUniformsForBlock(b, def, uniforms, perBlockUniformDecls);
  }
  const helperClosure = resolveHelperClosure(helperRequests);

  // ── Emit ────────────────────────────────────────────────────────────
  const lines: string[] = [];
  lines.push('#version 300 es');
  lines.push('precision highp float;');
  lines.push('');
  lines.push('out vec4 fragColor;');
  lines.push('');
  for (const d of GLOBAL_UNIFORM_DECLS) lines.push(d);
  lines.push('');

  if (perBlockUniformDecls.length > 0) {
    lines.push('// === per-block uniforms ===');
    for (const d of perBlockUniformDecls) lines.push(d);
    lines.push('');
  }

  for (const name of HELPER_EMISSION_ORDER) {
    if (!helperClosure.has(name)) continue;
    const body = GLSL_HELPERS[name];
    if (!body) continue;
    for (const hl of body.split('\n')) lines.push(hl);
    lines.push('');
  }

  lines.push('void main() {');
  for (const l of MAIN_PRELUDE) lines.push(l);
  lines.push('');
  lines.push(
    '  ' +
      emitRecipeHeader({
        globalTempo: recipe.globalTempo,
        canvasAspect: recipe.canvasAspect,
      }),
  );
  lines.push('');

  for (const b of enabledBlocks) {
    const def = BLOCK_LIBRARY[b.type]!; // pre-validated above
    emitBlock(b, def, lines);
  }

  for (const l of MAIN_EPILOGUE) lines.push(l);
  lines.push('}');

  return { ok: true, glsl: lines.join('\n'), uniforms };
}

// ─── Block emission ────────────────────────────────────────────────────

function emitBlock(b: Block, def: BlockDef, lines: string[]): void {
  lines.push('  ' + emitBlockOpen(b.id, b.type, b.params));

  // Animation locals first.
  for (const [pname, p] of Object.entries(b.params)) {
    if (p.animation) lines.push('  ' + emitAnimLocal(b.id, pname, p.animation));
  }

  // Substituted snippet — animated params resolve to the local name; static
  // params resolve to the uniform name.
  const snippet = substitutePlaceholders(def.glsl, (paramName) => {
    const p = b.params[paramName];
    if (p?.animation) return `_${b.id}_${paramName}`;
    return `u_${b.id}_${paramName}`;
  });
  for (const sl of snippet.split('\n')) lines.push('  ' + sl);

  lines.push('  ' + emitBlockClose(b.id));
  lines.push('');
}

// ─── Uniform collection ────────────────────────────────────────────────

function collectUniformsForBlock(
  b: Block,
  def: BlockDef,
  uniforms: UniformBinding[],
  decls: string[],
): void {
  for (const [paramName, paramDef] of Object.entries(def.params)) {
    const p = b.params[paramName];
    if (!p) continue;

    if (p.animation) {
      for (const ub of animUniformBindings(b.id, paramName, p.animation)) {
        uniforms.push(ub);
        decls.push(`uniform ${ub.type} ${ub.name};`);
      }
      continue;
    }

    // Static param → one uniform with the param's GL type.
    const name = `u_${b.id}_${paramName}`;
    const glType = glTypeForParam(paramDef.kind);
    if (glType) {
      decls.push(`uniform ${glType} ${name};`);
      uniforms.push({
        name,
        type: glType,
        source: { kind: 'static', blockId: b.id, paramName },
      });
    }
  }
}

function glTypeForParam(kind: BlockDef['params'][string]['kind']): 'float' | 'vec2' | 'vec3' | null {
  switch (kind) {
    case 'number':
      return 'float';
    case 'vec2':
      return 'vec2';
    case 'color':
      return 'vec3';
    case 'string':
      return null; // strings don't produce a uniform; they're inlined (custom block)
  }
}

// ─── Validation ────────────────────────────────────────────────────────

function validateBlockParams(b: Block, def: BlockDef): CompileError | null {
  for (const [name, defP] of Object.entries(def.params)) {
    const p = b.params[name];
    if (!p) {
      return {
        code: 'missing_param',
        message: `block "${b.id}" (${b.type}) is missing param "${name}"`,
        blockId: b.id,
        paramName: name,
      };
    }
    // color_cycle animation requires kind: 'color'.
    if (p.animation?.type === 'color_cycle' && defP.kind !== 'color') {
      return {
        code: 'param_type_mismatch',
        message: `block "${b.id}" param "${name}" has color_cycle animation but kind is ${defP.kind}`,
        blockId: b.id,
        paramName: name,
      };
    }
    // Other animations must NOT be on color params (they're scalar).
    if (
      p.animation &&
      p.animation.type !== 'color_cycle' &&
      defP.kind === 'color'
    ) {
      return {
        code: 'param_type_mismatch',
        message: `block "${b.id}" param "${name}" is a color but animation type "${p.animation.type}" is scalar`,
        blockId: b.id,
        paramName: name,
      };
    }
  }
  return null;
}

// ─── Partial-output failure path ───────────────────────────────────────

function failPartial(
  error: CompileError,
  recipe: Recipe,
  brokenBlockId: string,
): CompileResult {
  // Build a Recipe containing only the blocks BEFORE the broken one, then
  // compile that. Yields a renderable shader without the bad block.
  const stopIdx = recipe.blocks.findIndex((b) => b.id === brokenBlockId);
  const partialRecipe: Recipe = {
    ...recipe,
    blocks: recipe.blocks.slice(0, stopIdx),
  };
  const partial = compile(partialRecipe);
  return {
    ok: false,
    error,
    partialGlsl: partial.ok ? partial.glsl : undefined,
  };
}

// Re-exported for tests / consumers that want validation independent of compile.
export { validateBlockParams };

// `BlockType` / `Parameter` referenced via the imported types only —
// these voids keep tree-shaking from dropping them under strict imports.
void (null as unknown as Parameter);
```

- [ ] **Step 5: Confirm we still need to land Task 7's blocks before tests pass**

The test file references blocks (`ripple`, `radial_gradient`, `noise_field`) that don't exist yet. That's intentional — Task 7 lands them.

For now, run only the empty-recipe tests:

```bash
npm run test -- --run compiler/compile --testNamePattern="empty recipe"
```
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add web/src/compiler/compile.ts web/src/compiler/compile.test.ts web/src/compiler/format.ts
git commit -m "feat(compiler): block walker + uniform collection + helpers + partial-output errors (Task 6)"
```

---

## Task 7: Block library — Phase 1 (3 blocks)

**Files:**
- Create: `web/src/compiler/blocks/index.ts`
- Create: `web/src/compiler/blocks/radial-gradient.ts`
- Create: `web/src/compiler/blocks/ripple.ts`
- Create: `web/src/compiler/blocks/palette.ts`

- [ ] **Step 1: Write `radial_gradient.ts`**

`web/src/compiler/blocks/radial-gradient.ts`:

```typescript
import type { BlockDef } from '../types';

export const RADIAL_GRADIENT: BlockDef = {
  type: 'radial_gradient',
  category: 'shape',
  friendlyName: 'Radial gradient',
  icon: 'Circle',
  description: 'Smooth distance falloff from a centre point.',
  params: {
    center: {
      kind: 'vec2',
      default: [0, 0] as const,
      min: -1,
      max: 1,
      label: 'centre',
      animatable: false,
    },
    softness: {
      kind: 'number',
      default: 1.0,
      min: 0.1,
      max: 3,
      step: 0.05,
      label: 'softness',
      animatable: true,
    },
  },
  glsl: 'd = 1.0 - length(uv - {{center}}) * {{softness}};',
};
```

- [ ] **Step 2: Write `ripple.ts`**

`web/src/compiler/blocks/ripple.ts`:

```typescript
import type { BlockDef } from '../types';

export const RIPPLE: BlockDef = {
  type: 'ripple',
  category: 'distortion',
  friendlyName: 'Ripple',
  icon: 'WaveSine',
  description: 'Sin-distort the running scalar into concentric bands.',
  params: {
    freq: {
      kind: 'number',
      default: 10,
      min: 0,
      max: 30,
      step: 0.1,
      label: 'frequency',
      animatable: true,
    },
    phase: {
      kind: 'number',
      default: 0,
      min: 0,
      max: 6.2832,
      step: 0.01,
      label: 'phase',
      animatable: true,
    },
  },
  glsl: 'd = sin(d * {{freq}} + {{phase}});',
};
```

- [ ] **Step 3: Write `palette.ts`**

`web/src/compiler/blocks/palette.ts`:

```typescript
import type { BlockDef } from '../types';

export const PALETTE: BlockDef = {
  type: 'palette',
  category: 'color',
  friendlyName: 'Palette',
  icon: 'Palette',
  description: 'Map the scalar d to a 2-colour gradient.',
  params: {
    colorA: {
      kind: 'color',
      default: [0, 0.4, 1] as const,
      label: 'colour A',
      animatable: true,
    },
    colorB: {
      kind: 'color',
      default: [1, 0.2, 0.6] as const,
      label: 'colour B',
      animatable: true,
    },
  },
  glsl: 'col = mix({{colorA}}, {{colorB}}, clamp(d, 0.0, 1.0));',
};
```

- [ ] **Step 4: Write `blocks/index.ts`**

`web/src/compiler/blocks/index.ts`:

```typescript
// BLOCK_LIBRARY — the canonical registry of every block type the compiler
// recognises. The AI-import path (separate module) also reads this to know
// what types Claude is allowed to emit.

import type { BlockDef } from '../types';
import { PALETTE } from './palette';
import { RADIAL_GRADIENT } from './radial-gradient';
import { RIPPLE } from './ripple';

export { PALETTE, RADIAL_GRADIENT, RIPPLE };

const ALL: BlockDef[] = [RADIAL_GRADIENT, RIPPLE, PALETTE];

export const BLOCK_LIBRARY: Record<string, BlockDef> = Object.fromEntries(
  ALL.map((b) => [b.type, b]),
);

export const BLOCK_LIBRARY_LIST: readonly BlockDef[] = ALL;
```

- [ ] **Step 5: Run full compile tests**

```bash
npm run test -- --run compiler
```
Expected: PASS (all anim, markers, helpers, compile tests).

- [ ] **Step 6: Commit**

```bash
git add web/src/compiler/blocks/
git commit -m "feat(compiler): Phase 1 blocks — radial_gradient + ripple + palette (Task 7)"
```

---

## Task 8: Block library — Phase 2 (8 blocks)

**Files:**
- Create: 8 files under `web/src/compiler/blocks/`
- Modify: `web/src/compiler/blocks/index.ts` (register them)

- [ ] **Step 1: Write `stripes.ts`**

`web/src/compiler/blocks/stripes.ts`:

```typescript
import type { BlockDef } from '../types';

export const STRIPES: BlockDef = {
  type: 'stripes',
  category: 'shape',
  friendlyName: 'Stripes',
  icon: 'Bars',
  description: 'Parallel bands along a direction vector.',
  params: {
    direction: {
      kind: 'vec2',
      default: [1, 0] as const,
      label: 'direction',
      animatable: false,
    },
    width: {
      kind: 'number',
      default: 8,
      min: 0.5,
      max: 30,
      step: 0.1,
      label: 'width',
      animatable: true,
    },
  },
  glsl: 'd = step(0.5, fract(dot(uv, {{direction}}) * {{width}}));',
};
```

- [ ] **Step 2: Write `noise-field.ts`**

```typescript
import type { BlockDef } from '../types';

export const NOISE_FIELD: BlockDef = {
  type: 'noise_field',
  category: 'shape',
  friendlyName: 'Noise field',
  icon: 'Sparkle',
  description: 'Smooth procedural noise across the canvas.',
  params: {
    scale: {
      kind: 'number',
      default: 4,
      min: 0.5,
      max: 20,
      step: 0.1,
      label: 'scale',
      animatable: true,
    },
  },
  glsl: 'd = noise(uv * {{scale}});',
  helpers: ['noise'],
};
```

- [ ] **Step 3: Write `ring.ts`**

```typescript
import type { BlockDef } from '../types';

export const RING: BlockDef = {
  type: 'ring',
  category: 'shape',
  friendlyName: 'Ring',
  icon: 'CircleDashed',
  description: 'Annulus at a given radius with a soft thickness.',
  params: {
    center: {
      kind: 'vec2',
      default: [0, 0] as const,
      label: 'centre',
      animatable: false,
    },
    radius: {
      kind: 'number',
      default: 0.5,
      min: 0,
      max: 2,
      step: 0.01,
      label: 'radius',
      animatable: true,
    },
    thickness: {
      kind: 'number',
      default: 0.05,
      min: 0.005,
      max: 1,
      step: 0.005,
      label: 'thickness',
      animatable: true,
    },
  },
  glsl:
    'd = 1.0 - smoothstep({{thickness}}, {{thickness}} + 0.05, abs(length(uv - {{center}}) - {{radius}}));',
};
```

- [ ] **Step 4: Write `voronoi.ts`**

```typescript
import type { BlockDef } from '../types';

export const VORONOI: BlockDef = {
  type: 'voronoi',
  category: 'shape',
  friendlyName: 'Voronoi',
  icon: 'Hexagon',
  description: 'Cellular noise — distance to nearest jittered cell seed.',
  params: {
    scale: {
      kind: 'number',
      default: 5,
      min: 1,
      max: 20,
      step: 0.1,
      label: 'scale',
      animatable: true,
    },
    jitter: {
      kind: 'number',
      default: 1,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'jitter',
      animatable: true,
    },
  },
  // jitter is folded into voronoi() via uv scaling for v1; future revision
  // can hand voronoi a jitter param if the look needs it.
  glsl: 'd = voronoi(uv * {{scale}}) * mix(1.0, 1.0, {{jitter}});',
  helpers: ['voronoi'],
};
```

- [ ] **Step 5: Write `swirl.ts`**

```typescript
import type { BlockDef } from '../types';

// UV-modifier block — place ABOVE a shape card to twist the UV space.

export const SWIRL: BlockDef = {
  type: 'swirl',
  category: 'distortion',
  friendlyName: 'Swirl',
  icon: 'ArrowsClockwise',
  description: 'Twist UV space around the centre. Place above a shape block.',
  params: {
    center: {
      kind: 'vec2',
      default: [0, 0] as const,
      label: 'centre',
      animatable: false,
    },
    strength: {
      kind: 'number',
      default: 2,
      min: -10,
      max: 10,
      step: 0.1,
      label: 'strength',
      animatable: true,
    },
  },
  glsl: 'uv = rotate2d(length(uv - {{center}}) * {{strength}}) * (uv - {{center}}) + {{center}};',
  helpers: ['rotate2d'],
};
```

- [ ] **Step 6: Write `repeat.ts`**

```typescript
import type { BlockDef } from '../types';

export const REPEAT: BlockDef = {
  type: 'repeat',
  category: 'distortion',
  friendlyName: 'Repeat',
  icon: 'GridFour',
  description: 'Tile UV space. Place above a shape block.',
  params: {
    count: {
      kind: 'number',
      default: 3,
      min: 1,
      max: 12,
      step: 0.1,
      label: 'count',
      animatable: true,
    },
  },
  glsl: 'uv = fract((uv * 0.5 + 0.5) * {{count}}) * 2.0 - 1.0;',
};
```

- [ ] **Step 7: Write `hue-cycle.ts`**

```typescript
import type { BlockDef } from '../types';

export const HUE_CYCLE: BlockDef = {
  type: 'hue_cycle',
  category: 'color',
  friendlyName: 'Hue cycle',
  icon: 'Rainbow',
  description: 'Map d to a rotating hue around the colour wheel.',
  params: {
    speed: {
      kind: 'number',
      default: 1,
      min: 0,
      max: 5,
      step: 0.05,
      label: 'cycles',
      animatable: true,
    },
    saturation: {
      kind: 'number',
      default: 0.85,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'saturation',
      animatable: true,
    },
    brightness: {
      kind: 'number',
      default: 1,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'brightness',
      animatable: true,
    },
  },
  glsl: 'col = hsv2rgb(vec3(d * {{speed}}, {{saturation}}, {{brightness}}));',
  helpers: ['hsv2rgb'],
};
```

- [ ] **Step 8: Write `triple-gradient.ts`**

```typescript
import type { BlockDef } from '../types';

export const TRIPLE_GRADIENT: BlockDef = {
  type: 'triple_gradient',
  category: 'color',
  friendlyName: 'Triple gradient',
  icon: 'PaintBucket',
  description: 'Three-colour gradient mapped to d (A at 0, B at 0.5, C at 1).',
  params: {
    colorA: { kind: 'color', default: [0.1, 0.05, 0.25] as const, label: 'colour A', animatable: true },
    colorB: { kind: 'color', default: [0.9, 0.3, 0.45] as const, label: 'colour B', animatable: true },
    colorC: { kind: 'color', default: [1, 0.85, 0.4] as const, label: 'colour C', animatable: true },
  },
  glsl:
    'col = mix(mix({{colorA}}, {{colorB}}, clamp(d * 2.0, 0.0, 1.0)), {{colorC}}, clamp((d - 0.5) * 2.0, 0.0, 1.0));',
};
```

- [ ] **Step 9: Register all 8 in `blocks/index.ts`**

Replace `web/src/compiler/blocks/index.ts`:

```typescript
import type { BlockDef } from '../types';
import { HUE_CYCLE } from './hue-cycle';
import { NOISE_FIELD } from './noise-field';
import { PALETTE } from './palette';
import { RADIAL_GRADIENT } from './radial-gradient';
import { REPEAT } from './repeat';
import { RING } from './ring';
import { RIPPLE } from './ripple';
import { STRIPES } from './stripes';
import { SWIRL } from './swirl';
import { TRIPLE_GRADIENT } from './triple-gradient';
import { VORONOI } from './voronoi';

export {
  HUE_CYCLE,
  NOISE_FIELD,
  PALETTE,
  RADIAL_GRADIENT,
  REPEAT,
  RING,
  RIPPLE,
  STRIPES,
  SWIRL,
  TRIPLE_GRADIENT,
  VORONOI,
};

const ALL: BlockDef[] = [
  RADIAL_GRADIENT,
  STRIPES,
  NOISE_FIELD,
  RING,
  VORONOI,
  RIPPLE,
  SWIRL,
  REPEAT,
  PALETTE,
  HUE_CYCLE,
  TRIPLE_GRADIENT,
];

export const BLOCK_LIBRARY: Record<string, BlockDef> = Object.fromEntries(
  ALL.map((b) => [b.type, b]),
);

export const BLOCK_LIBRARY_LIST: readonly BlockDef[] = ALL;
```

- [ ] **Step 10: Add a per-block sanity test (test-table style)**

Append to `web/src/compiler/compile.test.ts`:

```typescript
describe('per-block sanity — every Phase 1 + 2 block compiles in isolation', () => {
  it.each(['radial_gradient', 'stripes', 'noise_field', 'ring', 'voronoi', 'ripple',
    'swirl', 'repeat', 'palette', 'hue_cycle', 'triple_gradient'])(
    '%s compiles with default params',
    (type) => {
      const def = BLOCK_LIBRARY[type]!;
      const params: Record<string, { value: import('./types').ParamValue; animation: null }> = {};
      for (const [k, p] of Object.entries(def.params)) {
        params[k] = { value: p.default, animation: null };
      }
      const out = compile(
        recipeOf([block({ id: 'b1', type, params })]),
      );
      expect(out.ok).toBe(true);
    },
  );
});
```

- [ ] **Step 11: Run tests — verify pass**

```bash
npm run test -- --run compiler
```
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add web/src/compiler/blocks/
git commit -m "feat(compiler): Phase 2 blocks (8 blocks across shape/distortion/color) (Task 8)"
```

---

## Task 9: Block library — Phase 3 (4 effects)

**Files:**
- Create: `web/src/compiler/blocks/{wave-warp,glow,vignette,grain}.ts`
- Modify: `web/src/compiler/blocks/index.ts`

- [ ] **Step 1: Write `wave-warp.ts`**

```typescript
import type { BlockDef } from '../types';

export const WAVE_WARP: BlockDef = {
  type: 'wave_warp',
  category: 'distortion',
  friendlyName: 'Wave warp',
  icon: 'WaveTriangle',
  description: 'Sinusoidal UV displacement. Place above a shape block.',
  params: {
    direction: {
      kind: 'vec2',
      default: [1, 0] as const,
      label: 'direction',
      animatable: false,
    },
    amplitude: {
      kind: 'number',
      default: 0.1,
      min: 0,
      max: 1,
      step: 0.005,
      label: 'amplitude',
      animatable: true,
    },
    frequency: {
      kind: 'number',
      default: 5,
      min: 0,
      max: 25,
      step: 0.1,
      label: 'frequency',
      animatable: true,
    },
  },
  glsl:
    'uv += {{direction}} * sin(dot(uv, vec2(-{{direction}}.y, {{direction}}.x)) * {{frequency}}) * {{amplitude}};',
};
```

- [ ] **Step 2: Write `glow.ts`**

```typescript
import type { BlockDef } from '../types';

export const GLOW: BlockDef = {
  type: 'glow',
  category: 'effect',
  friendlyName: 'Glow',
  icon: 'Sun',
  description: 'Boost brightness where col is already bright (fake bloom — single pass).',
  params: {
    threshold: {
      kind: 'number',
      default: 0.55,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'threshold',
      animatable: true,
    },
    intensity: {
      kind: 'number',
      default: 1.2,
      min: 0,
      max: 4,
      step: 0.05,
      label: 'intensity',
      animatable: true,
    },
  },
  glsl: 'col += col * smoothstep({{threshold}}, 1.0, dot(col, vec3(0.299, 0.587, 0.114))) * {{intensity}};',
};
```

- [ ] **Step 3: Write `vignette.ts`**

```typescript
import type { BlockDef } from '../types';

export const VIGNETTE: BlockDef = {
  type: 'vignette',
  category: 'effect',
  friendlyName: 'Vignette',
  icon: 'CircleHalf',
  description: 'Darken the corners.',
  params: {
    inner: {
      kind: 'number',
      default: 0.5,
      min: 0,
      max: 2,
      step: 0.01,
      label: 'inner',
      animatable: true,
    },
    outer: {
      kind: 'number',
      default: 1.5,
      min: 0,
      max: 2,
      step: 0.01,
      label: 'outer',
      animatable: true,
    },
  },
  glsl: 'col *= 1.0 - smoothstep({{inner}}, {{outer}}, length(uv));',
};
```

- [ ] **Step 4: Write `grain.ts`**

```typescript
import type { BlockDef } from '../types';

export const GRAIN: BlockDef = {
  type: 'grain',
  category: 'effect',
  friendlyName: 'Grain',
  icon: 'Television',
  description: 'Film-grain analog seeded by time so it shimmers.',
  params: {
    amount: {
      kind: 'number',
      default: 0.05,
      min: 0,
      max: 0.5,
      step: 0.005,
      label: 'amount',
      animatable: true,
    },
  },
  glsl: 'col += vec3((hash(uv + fract(u_time)) - 0.5) * {{amount}});',
  helpers: ['hash'],
};
```

- [ ] **Step 5: Register in `blocks/index.ts`**

Append the imports + exports + `ALL` entries for `WAVE_WARP, GLOW, VIGNETTE, GRAIN` to `web/src/compiler/blocks/index.ts`. Final `ALL`:

```typescript
const ALL: BlockDef[] = [
  RADIAL_GRADIENT,
  STRIPES,
  NOISE_FIELD,
  RING,
  VORONOI,
  RIPPLE,
  SWIRL,
  REPEAT,
  WAVE_WARP,
  PALETTE,
  HUE_CYCLE,
  TRIPLE_GRADIENT,
  GLOW,
  VIGNETTE,
  GRAIN,
];
```

- [ ] **Step 6: Extend the test-table from Task 8**

In `compile.test.ts`, update the `.each` list to include the four new types: `'wave_warp', 'glow', 'vignette', 'grain'`.

- [ ] **Step 7: Run tests — verify pass**

```bash
npm run test -- --run compiler
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add web/src/compiler/blocks/
git commit -m "feat(compiler): Phase 3 blocks — wave_warp + glow + vignette + grain (Task 9)"
```

---

## Task 9b: Bonus 10 blocks (parity with `src/cards/`)

Re-authors the 10 cards already shipped in `src/cards/` under the new BlockDef schema. Per the product owner's call on the library-count question, this lands in the same PR so the compiler has full parity at merge.

**Files:**
- Create: 10 files under `web/src/compiler/blocks/`
- Modify: `web/src/compiler/blocks/index.ts` (register them)
- Modify: `web/src/compiler/compile.test.ts` (extend the test-table)

- [ ] **Step 1: Write `spiral.ts`**

```typescript
import type { BlockDef } from '../types';

export const SPIRAL: BlockDef = {
  type: 'spiral',
  category: 'shape',
  friendlyName: 'Spiral',
  icon: 'SpinnerGap',
  description: 'Polar-coord spiral arms around the centre.',
  params: {
    arms: { kind: 'number', default: 4, min: 0, max: 20, step: 0.1, label: 'arms', animatable: true },
    twist: { kind: 'number', default: 3, min: -10, max: 10, step: 0.1, label: 'twist', animatable: true },
  },
  glsl: 'd = fract(atan(uv.y, uv.x) / 6.2831 * {{arms}} + length(uv) * {{twist}});',
};
```

- [ ] **Step 2: Write `dots.ts`**

```typescript
import type { BlockDef } from '../types';

export const DOTS: BlockDef = {
  type: 'dots',
  category: 'shape',
  friendlyName: 'Dots',
  icon: 'DotsNine',
  description: 'Polka-dot grid.',
  params: {
    scale: { kind: 'number', default: 8, min: 1, max: 40, step: 0.1, label: 'scale', animatable: true },
    radius: { kind: 'number', default: 0.25, min: 0.02, max: 0.5, step: 0.005, label: 'radius', animatable: true },
  },
  glsl: 'd = 1.0 - smoothstep({{radius}} - 0.02, {{radius}} + 0.02, length(fract(uv * {{scale}}) - 0.5));',
};
```

- [ ] **Step 3: Write `checker.ts`**

```typescript
import type { BlockDef } from '../types';

export const CHECKER: BlockDef = {
  type: 'checker',
  category: 'shape',
  friendlyName: 'Checker',
  icon: 'Checkerboard',
  description: 'Checkerboard pattern.',
  params: {
    scale: { kind: 'number', default: 6, min: 1, max: 30, step: 0.1, label: 'scale', animatable: true },
  },
  glsl: 'd = step(0.5, mod(floor(uv.x * {{scale}}) + floor(uv.y * {{scale}}), 2.0));',
};
```

- [ ] **Step 4: Write `rotate.ts`**

```typescript
import type { BlockDef } from '../types';

export const ROTATE: BlockDef = {
  type: 'rotate',
  category: 'distortion',
  friendlyName: 'Rotate',
  icon: 'ArrowClockwise',
  description: 'Rotate UV space by an angle. Place above a shape block.',
  params: {
    angle: { kind: 'number', default: 0, min: -6.2831, max: 6.2831, step: 0.01, label: 'angle', animatable: true },
  },
  glsl: 'uv = rotate2d({{angle}}) * uv;',
  helpers: ['rotate2d'],
};
```

- [ ] **Step 5: Write `kaleidoscope.ts`**

```typescript
import type { BlockDef } from '../types';

export const KALEIDOSCOPE: BlockDef = {
  type: 'kaleidoscope',
  category: 'distortion',
  friendlyName: 'Kaleidoscope',
  icon: 'Diamond',
  description: 'Mirror UV space into N wedges. Place above a shape block.',
  params: {
    slices: { kind: 'number', default: 6, min: 2, max: 24, step: 1, label: 'slices', animatable: true },
  },
  glsl: '{ float _r = length(uv); float _a = atan(uv.y, uv.x); float _seg = 6.2831 / {{slices}}; _a = abs(mod(_a, _seg) - _seg * 0.5); uv = vec2(cos(_a), sin(_a)) * _r; }',
};
```

- [ ] **Step 6: Write `pixelate.ts`**

```typescript
import type { BlockDef } from '../types';

export const PIXELATE: BlockDef = {
  type: 'pixelate',
  category: 'distortion',
  friendlyName: 'Pixelate',
  icon: 'Squares',
  description: 'Snap UV space to a grid. Place above a shape block.',
  params: {
    grid: { kind: 'number', default: 20, min: 4, max: 100, step: 1, label: 'grid', animatable: true },
  },
  glsl: 'uv = floor(uv * {{grid}}) / {{grid}};',
};
```

- [ ] **Step 7: Write `invert.ts`**

```typescript
import type { BlockDef } from '../types';

export const INVERT: BlockDef = {
  type: 'invert',
  category: 'color',
  friendlyName: 'Invert',
  icon: 'CircleHalf',
  description: 'Invert the colour. Amount controls a blend toward the inverse.',
  params: {
    amount: { kind: 'number', default: 1, min: 0, max: 1, step: 0.01, label: 'amount', animatable: true },
  },
  glsl: 'col = mix(col, vec3(1.0) - col, {{amount}});',
};
```

- [ ] **Step 8: Write `posterize.ts`**

```typescript
import type { BlockDef } from '../types';

export const POSTERIZE: BlockDef = {
  type: 'posterize',
  category: 'color',
  friendlyName: 'Posterize',
  icon: 'Stack',
  description: 'Snap each colour channel to N discrete levels.',
  params: {
    levels: { kind: 'number', default: 4, min: 2, max: 16, step: 1, label: 'levels', animatable: true },
  },
  glsl: 'col = floor(col * {{levels}}) / ({{levels}} - 1.0);',
};
```

- [ ] **Step 9: Write `scanlines.ts`**

```typescript
import type { BlockDef } from '../types';

export const SCANLINES: BlockDef = {
  type: 'scanlines',
  category: 'effect',
  friendlyName: 'Scanlines',
  icon: 'Television',
  description: 'CRT-style horizontal banding.',
  params: {
    spacing: { kind: 'number', default: 4, min: 1, max: 20, step: 0.5, label: 'spacing', animatable: true },
    intensity: { kind: 'number', default: 0.35, min: 0, max: 1, step: 0.01, label: 'intensity', animatable: true },
  },
  glsl: 'col *= 1.0 - {{intensity}} * step(0.5, fract(gl_FragCoord.y / {{spacing}}));',
};
```

- [ ] **Step 10: Write `brightness-contrast.ts`**

```typescript
import type { BlockDef } from '../types';

export const BRIGHTNESS_CONTRAST: BlockDef = {
  type: 'brightness_contrast',
  category: 'effect',
  friendlyName: 'Brightness / contrast',
  icon: 'SunDim',
  description: 'Photographic brightness + contrast on the final colour.',
  params: {
    brightness: { kind: 'number', default: 0, min: -1, max: 1, step: 0.01, label: 'brightness', animatable: true },
    contrast: { kind: 'number', default: 1, min: 0, max: 3, step: 0.01, label: 'contrast', animatable: true },
  },
  glsl: 'col = (col - 0.5) * {{contrast}} + 0.5 + {{brightness}};',
};
```

- [ ] **Step 11: Register all 10 in `blocks/index.ts`**

Add the imports + exports + ALL entries. Final `ALL` order (categories grouped):

```typescript
const ALL: BlockDef[] = [
  // shape
  RADIAL_GRADIENT, RING, STRIPES, CHECKER, DOTS, SPIRAL, NOISE_FIELD, VORONOI,
  // distortion
  RIPPLE, SWIRL, REPEAT, WAVE_WARP, ROTATE, KALEIDOSCOPE, PIXELATE,
  // color
  PALETTE, TRIPLE_GRADIENT, HUE_CYCLE, INVERT, POSTERIZE,
  // effect
  VIGNETTE, GLOW, GRAIN, SCANLINES, BRIGHTNESS_CONTRAST,
  // custom (Task 10)
];
```

(CUSTOM gets appended in Task 10.)

- [ ] **Step 12: Extend the per-block test-table in `compile.test.ts`**

Update the `.each` argument to include all 25 block types so every block's default-param compilation is sanity-checked.

- [ ] **Step 13: Run tests — verify pass**

```bash
npm run test -- --run compiler
```
Expected: PASS (25 per-block sanity tests now).

- [ ] **Step 14: Commit**

```bash
git add web/src/compiler/blocks/
git commit -m "feat(compiler): bonus 10 blocks — parity with src/cards/ (Task 9b)"
```

---

## Task 10: Custom block (escape hatch)

**Files:**
- Create: `web/src/compiler/blocks/custom.ts`
- Modify: `web/src/compiler/blocks/index.ts`
- Modify: `web/src/compiler/compile.ts` (special-case the `custom` block emission)
- Modify: `web/src/compiler/compile.test.ts`

- [ ] **Step 1: Write the custom block definition**

`web/src/compiler/blocks/custom.ts`:

```typescript
import type { BlockDef } from '../types';

// `custom` is the escape hatch — its `code` param is a string of raw GLSL
// that gets emitted verbatim inside a `{ ... }` block scope, so variable
// declarations inside it don't leak. The user provides `uv`, `d`, `col`
// just like any other block.
//
// The AI-import path also targets this block when Claude can't map
// to a typed block.

export const CUSTOM: BlockDef = {
  type: 'custom',
  category: 'custom',
  friendlyName: 'Custom code',
  icon: 'CodeSimple',
  description: 'Raw GLSL inside a block scope. Reads uv/d/col; writes d/col.',
  params: {
    code: {
      kind: 'string',
      default: '  // your code here\n  d = 0.5;',
      label: 'code',
      animatable: false,
    },
  },
  // `code` is special-cased in compile() — its template doesn't go through
  // substitutePlaceholders. Setting glsl to the placeholder is purely
  // documentary; compile.ts intercepts the type === 'custom' branch.
  glsl: '{{code}}',
};
```

- [ ] **Step 2: Special-case `custom` in `compile.ts` `emitBlock`**

In `web/src/compiler/compile.ts`, modify `emitBlock`:

```typescript
function emitBlock(b: Block, def: BlockDef, lines: string[]): void {
  lines.push('  ' + emitBlockOpen(b.id, b.type, b.params));

  if (b.type === 'custom') {
    const code = (b.params.code?.value as string | undefined) ?? '';
    lines.push('  {');
    for (const sl of code.split('\n')) lines.push('  ' + sl);
    lines.push('  }');
    lines.push('  ' + emitBlockClose(b.id));
    lines.push('');
    return;
  }

  // ... (existing animation-locals + substituted-snippet logic unchanged)
  for (const [pname, p] of Object.entries(b.params)) {
    if (p.animation) lines.push('  ' + emitAnimLocal(b.id, pname, p.animation));
  }
  const snippet = substitutePlaceholders(def.glsl, (paramName) => {
    const p = b.params[paramName];
    if (p?.animation) return `_${b.id}_${paramName}`;
    return `u_${b.id}_${paramName}`;
  });
  for (const sl of snippet.split('\n')) lines.push('  ' + sl);

  lines.push('  ' + emitBlockClose(b.id));
  lines.push('');
}
```

- [ ] **Step 3: Register CUSTOM in `blocks/index.ts`**

Add `import { CUSTOM } from './custom';` and append `CUSTOM` to the bottom of `ALL`.

- [ ] **Step 4: Add tests for the custom block**

Append to `compile.test.ts`:

```typescript
describe('compile — custom block', () => {
  it('emits the user code verbatim inside a block scope', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'custom',
          params: { code: { value: 'd = 0.42;\ncol = vec3(1, 0, 0);', animation: null } },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    expect(out.glsl).toContain('  {');
    expect(out.glsl).toContain('d = 0.42;');
    expect(out.glsl).toContain('col = vec3(1, 0, 0);');
    expect(out.glsl).toContain('  }');
  });

  it('does NOT emit any per-block uniforms for a custom block', () => {
    const out = compile(
      recipeOf([
        block({
          id: 'b1',
          type: 'custom',
          params: { code: { value: 'd = 0.5;', animation: null } },
        }),
      ]),
    );
    if (!out.ok) throw new Error('expected ok');
    const statics = out.uniforms.filter((u) => u.source.kind === 'static');
    expect(statics.length).toBe(0);
  });
});
```

- [ ] **Step 5: Run — verify pass**

```bash
npm run test -- --run compiler
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/compiler/blocks/custom.ts web/src/compiler/blocks/index.ts web/src/compiler/compile.ts web/src/compiler/compile.test.ts
git commit -m "feat(compiler): custom block (escape hatch) — verbatim GLSL in a scope (Task 10)"
```

---

## Task 11: Reverse parser + round-trip tests

**Files:**
- Create: `web/src/compiler/parse.ts`
- Create: `web/src/compiler/parse.test.ts`
- Create: `web/src/compiler/round-trip.test.ts`

- [ ] **Step 1: Write the parser test file**

`web/src/compiler/parse.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { parseShadeGlsl } from './parse';
import type { Recipe } from './types';

describe('parseShadeGlsl', () => {
  it("rejects non-Shade GLSL with reason 'not_shade_authored'", () => {
    const result = parseShadeGlsl('void main() { gl_FragColor = vec4(1.0); }');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.reason).toBe('not_shade_authored');
  });

  it('reconstructs a single-block recipe from Shade-emitted GLSL', () => {
    const original: Recipe = {
      version: 1,
      blocks: [
        {
          id: 'b1',
          type: 'ripple',
          enabled: true,
          params: {
            freq: { value: 10, animation: null },
            phase: { value: 0, animation: null },
          },
        },
      ],
      globalTempo: 120,
      canvasAspect: 'square',
    };
    const compiled = compile(original);
    if (!compiled.ok) throw new Error('compile failed');

    const parsed = parseShadeGlsl(compiled.glsl);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error('expected ok');
    expect(parsed.recipe).toEqual(original);
    expect(parsed.unknownBlocks).toEqual([]);
  });

  it('lists unknown block types but still returns the rest', () => {
    const glsl = [
      '// @shade:recipe tempo=120 aspect=square',
      '// @shade:block id="b1" type="palette" params={"colorA":{"value":[0,0,0],"animation":null},"colorB":{"value":[1,1,1],"animation":null}}',
      '// @shade:end b1',
      '// @shade:block id="b2" type="future_block" params={"x":{"value":0,"animation":null}}',
      '// @shade:end b2',
    ].join('\n');
    const parsed = parseShadeGlsl(glsl);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error('expected ok');
    expect(parsed.unknownBlocks).toEqual(['future_block']);
    expect(parsed.recipe.blocks.length).toBe(2);
    expect(parsed.recipe.blocks[1]!.type).toBe('future_block');
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run compiler/parse
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write `parse.ts`**

`web/src/compiler/parse.ts`:

```typescript
// Reverse parser — Shade-emitted GLSL → Recipe.
//
// Reads the @shade:block magic comments; never inspects the GLSL body
// inside them. Per the handoff: arbitrary GLSL is NOT this parser's job
// (that's the AI-import path).

import { BLOCK_LIBRARY } from './blocks';
import { parseAllBlockMarkers, parseRecipeHeader } from './markers';
import type { Block, Recipe } from './types';

export type ParseResult =
  | { ok: true; recipe: Recipe; unknownBlocks: string[] }
  | { ok: false; reason: 'not_shade_authored' | 'malformed_marker' | 'invalid_recipe_json' };

export function parseShadeGlsl(source: string): ParseResult {
  const header = parseRecipeHeader(source);
  if (!header) {
    return { ok: false, reason: 'not_shade_authored' };
  }
  const markers = parseAllBlockMarkers(source);
  // Empty recipe (header but no blocks) is valid.

  const blocks: Block[] = [];
  const unknownTypes = new Set<string>();
  for (const m of markers) {
    if (!BLOCK_LIBRARY[m.type]) unknownTypes.add(m.type);
    blocks.push({
      id: m.id,
      type: m.type,
      enabled: true,
      params: m.params as Block['params'],
    });
  }

  return {
    ok: true,
    recipe: {
      version: 1,
      blocks,
      globalTempo: header.globalTempo,
      canvasAspect: header.canvasAspect,
    },
    unknownBlocks: [...unknownTypes],
  };
}
```

- [ ] **Step 4: Run parser tests — verify pass**

```bash
npm run test -- --run compiler/parse
```
Expected: PASS (3 tests).

- [ ] **Step 5: Write the round-trip test suite**

`web/src/compiler/round-trip.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { parseShadeGlsl } from './parse';
import type { Recipe } from './types';

const RECIPES: Recipe[] = [
  // 1. empty
  { version: 1, blocks: [], globalTempo: 120, canvasAspect: 'square' },

  // 2. single block, static params
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'radial_gradient',
        enabled: true,
        params: {
          center: { value: [0, 0], animation: null },
          softness: { value: 0.7, animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 3. shape → distortion → color chain
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'radial_gradient',
        enabled: true,
        params: {
          center: { value: [0, 0], animation: null },
          softness: { value: 1, animation: null },
        },
      },
      {
        id: 'b2',
        type: 'ripple',
        enabled: true,
        params: {
          freq: { value: 10, animation: null },
          phase: { value: 0, animation: null },
        },
      },
      {
        id: 'b3',
        type: 'palette',
        enabled: true,
        params: {
          colorA: { value: [0, 0.4, 1], animation: null },
          colorB: { value: [1, 0.2, 0.6], animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 4. animated sine
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'ripple',
        enabled: true,
        params: {
          freq: {
            value: 10,
            animation: { type: 'sine', min: 5, max: 15, speed: 1.2, phase: 0, mode: 'hz' },
          },
          phase: { value: 0, animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'portrait',
  },

  // 5. animated pulse with bpm mode
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'ripple',
        enabled: true,
        params: {
          freq: {
            value: 10,
            animation: { type: 'pulse', min: 5, max: 15, speed: 1, duty: 0.5, mode: 'bpm' },
          },
          phase: { value: 0, animation: null },
        },
      },
    ],
    globalTempo: 132,
    canvasAspect: 'landscape',
  },

  // 6. mouse_follow animation
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'radial_gradient',
        enabled: true,
        params: {
          center: { value: [0, 0], animation: null },
          softness: {
            value: 1,
            animation: { type: 'mouse_follow', min: 0.5, max: 2, axis: 'x' },
          },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 7. color_cycle on a color param
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'palette',
        enabled: true,
        params: {
          colorA: {
            value: [0, 0, 0],
            animation: {
              type: 'color_cycle',
              colorA: [1, 0, 0],
              colorB: [0, 1, 0],
              speed: 1,
              mode: 'hz',
            },
          },
          colorB: { value: [1, 1, 1], animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 8. noise_wiggle (pulls noise helper transitively)
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'ripple',
        enabled: true,
        params: {
          freq: {
            value: 10,
            animation: { type: 'noise_wiggle', min: 5, max: 15, speed: 1, mode: 'hz' },
          },
          phase: { value: 0, animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 9. custom block
  {
    version: 1,
    blocks: [
      {
        id: 'b1',
        type: 'custom',
        enabled: true,
        params: {
          code: { value: 'd = sin(uv.x * 10.0);', animation: null },
        },
      },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },

  // 10. full ten-block stress
  {
    version: 1,
    blocks: [
      { id: 'b1', type: 'radial_gradient', enabled: true, params: { center: { value: [0, 0], animation: null }, softness: { value: 1, animation: null } } },
      { id: 'b2', type: 'ring', enabled: true, params: { center: { value: [0, 0], animation: null }, radius: { value: 0.5, animation: null }, thickness: { value: 0.05, animation: null } } },
      { id: 'b3', type: 'stripes', enabled: true, params: { direction: { value: [1, 0], animation: null }, width: { value: 8, animation: null } } },
      { id: 'b4', type: 'noise_field', enabled: true, params: { scale: { value: 4, animation: null } } },
      { id: 'b5', type: 'voronoi', enabled: true, params: { scale: { value: 5, animation: null }, jitter: { value: 1, animation: null } } },
      { id: 'b6', type: 'ripple', enabled: true, params: { freq: { value: 10, animation: null }, phase: { value: 0, animation: null } } },
      { id: 'b7', type: 'palette', enabled: true, params: { colorA: { value: [0, 0.4, 1], animation: null }, colorB: { value: [1, 0.2, 0.6], animation: null } } },
      { id: 'b8', type: 'vignette', enabled: true, params: { inner: { value: 0.5, animation: null }, outer: { value: 1.5, animation: null } } },
      { id: 'b9', type: 'glow', enabled: true, params: { threshold: { value: 0.55, animation: null }, intensity: { value: 1.2, animation: null } } },
      { id: 'b10', type: 'grain', enabled: true, params: { amount: { value: 0.05, animation: null } } },
    ],
    globalTempo: 120,
    canvasAspect: 'square',
  },
];

describe('round-trip — compile() then parseShadeGlsl() returns the original Recipe', () => {
  it.each(RECIPES.map((r, i) => [i, r] as const))(
    'recipe #%i round-trips byte-equal',
    (_i, original) => {
      const compiled = compile(original);
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) return;
      const parsed = parseShadeGlsl(compiled.glsl);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(parsed.recipe).toEqual(original);
    },
  );
});
```

- [ ] **Step 6: Run all compiler tests — verify pass**

```bash
npm run test -- --run compiler
```
Expected: PASS (round-trip suite + everything before).

- [ ] **Step 7: Commit**

```bash
git add web/src/compiler/parse.ts web/src/compiler/parse.test.ts web/src/compiler/round-trip.test.ts
git commit -m "feat(compiler): reverse parser + 10-recipe round-trip suite (Task 11)"
```

---

## Task 12: Public surface + utility helpers

**Files:**
- Create: `web/src/compiler/default-block.ts`
- Create: `web/src/compiler/default-block.test.ts`
- Create: `web/src/compiler/index.ts`

- [ ] **Step 1: Write the test**

`web/src/compiler/default-block.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { makeDefaultBlock, validateRecipe } from './default-block';
import type { Recipe } from './types';

describe('makeDefaultBlock', () => {
  it('returns a Block with default param values and fresh id', () => {
    const b = makeDefaultBlock('ripple');
    expect(b.type).toBe('ripple');
    expect(b.enabled).toBe(true);
    expect(b.params.freq?.value).toBe(10);
    expect(b.params.phase?.value).toBe(0);
    expect(b.id.length).toBeGreaterThan(0);
  });

  it('two calls produce distinct ids', () => {
    expect(makeDefaultBlock('ripple').id).not.toBe(makeDefaultBlock('ripple').id);
  });

  it('throws on unknown type (programming error — not a runtime case)', () => {
    expect(() => makeDefaultBlock('no_such')).toThrow();
  });
});

describe('validateRecipe', () => {
  it('returns ok for a sound recipe', () => {
    const r: Recipe = {
      version: 1,
      blocks: [makeDefaultBlock('ripple')],
      globalTempo: 120,
      canvasAspect: 'square',
    };
    expect(validateRecipe(r).ok).toBe(true);
  });

  it('returns errors for an unknown block type', () => {
    const r: Recipe = {
      version: 1,
      blocks: [{ id: 'x', type: 'nope', enabled: true, params: {} }],
      globalTempo: 120,
      canvasAspect: 'square',
    };
    const res = validateRecipe(r);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected fail');
    expect(res.errors[0]!.code).toBe('unknown_block_type');
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run compiler/default-block
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write `default-block.ts`**

`web/src/compiler/default-block.ts`:

```typescript
// Small utilities the editor team needs for constructing fresh blocks +
// pre-flight-checking recipes before handing them to compile().

import { nanoid } from 'nanoid';

import { BLOCK_LIBRARY } from './blocks';
import { compile } from './compile';
import type { Block, CompileError, Parameter, Recipe } from './types';

export function makeDefaultBlock(type: string): Block {
  const def = BLOCK_LIBRARY[type];
  if (!def) throw new Error(`makeDefaultBlock: unknown block type "${type}"`);
  const params: Record<string, Parameter> = {};
  for (const [k, p] of Object.entries(def.params)) {
    params[k] = { value: p.default, animation: null };
  }
  return { id: nanoid(8), type, enabled: true, params };
}

export type ValidateResult = { ok: true } | { ok: false; errors: CompileError[] };

export function validateRecipe(recipe: Recipe): ValidateResult {
  // Cheap: try a compile. If it errors, surface the error. Anything that
  // would block the renderer is captured by the compiler's own validation.
  const c = compile(recipe);
  if (c.ok) return { ok: true };
  return { ok: false, errors: [c.error] };
}
```

- [ ] **Step 4: Write `index.ts` (public surface)**

`web/src/compiler/index.ts`:

```typescript
// Shade Compiler — public surface. Importers get EXACTLY this; everything
// else is internal. See docs/superpowers/specs/2026-05-23-compiler-rework.md
// and the engineering handoff for the contract.

export type {
  Recipe,
  Block,
  BlockType,
  Parameter,
  ParamValue,
  Animation,
  BlockDef,
  ParamDef,
  CompileResult,
  UniformBinding,
  CompileError,
} from './types';

export { compile } from './compile';
export { parseShadeGlsl } from './parse';
export type { ParseResult } from './parse';
export { BLOCK_LIBRARY, BLOCK_LIBRARY_LIST } from './blocks';
export { makeDefaultBlock, validateRecipe } from './default-block';
export type { ValidateResult } from './default-block';
```

- [ ] **Step 5: Run — verify pass**

```bash
npm run test -- --run compiler
```
Expected: PASS (all compiler tests).

- [ ] **Step 6: Final full-project gate**

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
Expected: ALL PASS.

- [ ] **Step 7: Commit**

```bash
git add web/src/compiler/default-block.ts web/src/compiler/default-block.test.ts web/src/compiler/index.ts
git commit -m "feat(compiler): public surface — index.ts + makeDefaultBlock + validateRecipe (Task 12)"
```

---

## Task 13: Headless-gl integration test (optional, env-gated)

**Files:**
- Modify: `web/package.json` (add `gl` to devDependencies, gated)
- Create: `web/src/compiler/integration.test.ts`

This task is OPTIONAL. Skip if `gl` doesn't install cleanly on the dev's platform — the test is env-gated so CI can opt in later without touching the source tree.

- [ ] **Step 1: Install the `gl` package**

```bash
cd web
npm install --save-dev gl
```

If install fails (common on Windows without VS build tools), STOP and skip the rest of this task. Document in the PR description that the optional integration suite needs `gl` and can be added later.

- [ ] **Step 2: Write the integration test**

`web/src/compiler/integration.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { BLOCK_LIBRARY_LIST } from './blocks';
import { makeDefaultBlock } from './default-block';
import type { Recipe } from './types';

const ENABLED = process.env.HEADLESS_GL === '1';

const describeIfGl = ENABLED ? describe : describe.skip;

describeIfGl('headless-gl integration — every block compiles in a real GL context', () => {
  // Lazy import so vitest doesn't crash on systems where `gl` isn't built.
  let createGl: typeof import('gl');
  beforeAll(async () => {
    createGl = (await import('gl')).default;
  });

  it.each(BLOCK_LIBRARY_LIST.map((d) => d.type))(
    '%s produces valid WebGL2-style GLSL',
    (type) => {
      const recipe: Recipe = {
        version: 1,
        blocks: [makeDefaultBlock(type)],
        globalTempo: 120,
        canvasAspect: 'square',
      };
      const compiled = compile(recipe);
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) return;

      // `gl` package only supports WebGL1. Strip the `#version 300 es` +
      // `out vec4 fragColor;` and rewrite `fragColor =` → `gl_FragColor =`
      // for the validation pass. The shape of the snippet still proves the
      // GLSL parses.
      const sanitized = compiled.glsl
        .replace(/^#version 300 es$/m, '')
        .replace(/^out vec4 fragColor;$/m, '')
        .replace(/fragColor =/g, 'gl_FragColor =');

      const ctx = createGl(64, 64);
      const shader = ctx.createShader(ctx.FRAGMENT_SHADER)!;
      ctx.shaderSource(shader, sanitized);
      ctx.compileShader(shader);
      const ok = ctx.getShaderParameter(shader, ctx.COMPILE_STATUS);
      if (!ok) {
        const log = ctx.getShaderInfoLog(shader);
        throw new Error(`shader for "${type}" failed to compile:\n${log}\n\nsource:\n${sanitized}`);
      }
    },
  );
});
```

- [ ] **Step 3: Run without env (should skip)**

```bash
npm run test -- --run compiler/integration
```
Expected: SKIPPED (one suite, 0 actual runs).

- [ ] **Step 4: Run with env (real GL)**

```bash
HEADLESS_GL=1 npm run test -- --run compiler/integration
```
Expected: PASS for every block. If ANY block fails, fix the snippet — bad GLSL discovered here is the whole reason this test exists.

- [ ] **Step 5: Commit**

```bash
git add web/package.json web/package-lock.json web/src/compiler/integration.test.ts
git commit -m "test(compiler): optional headless-gl integration gate (Task 13)"
```

---

## Self-review (run after Task 12, before Task 13)

This is YOUR checklist — don't dispatch a subagent. Open the spec at `docs/superpowers/specs/2026-05-23-compiler-rework.md` side-by-side with this plan and walk it.

**1. Spec coverage** — every checklist item under "Success criteria" should map to a task:
- types.ts → Task 1 ✓
- compile() → Tasks 5, 6, 10 ✓
- parseShadeGlsl() → Task 11 ✓
- Block library files → Tasks 7, 8, 9, 10 ✓
- Helpers library → Task 2 ✓
- Per-block unit tests → Tasks 7, 8, 9 ✓
- Animation tests → Task 4 ✓
- Round-trip test → Task 11 ✓
- Headless-gl test → Task 13 ✓
- All 25 + custom → Tasks 7 (3) + 8 (8) + 9 (4) + 9b (10) + 10 (1) = 26 ✓
- src/cards/ intact → no task touches it ✓
- No circular import → ESLint boundary in Task 1 ✓

**2. Placeholder scan** — search the plan for `TBD`, `TODO`, `etc.`, `…`, `[fill in]`. Should be none in any step that emits code or commands.

**3. Type consistency**
- `BlockDef.params[k].kind` set across `types.ts` (Task 1), `glTypeForParam` (Task 6), every block file (Tasks 7–10), `makeDefaultBlock` (Task 12). All use `'number' | 'vec2' | 'color' | 'string'`. ✓
- `UniformBinding.source.kind` set across `types.ts` (Task 1), `animUniformBindings` (Task 4), `compile.ts` (Task 5/6). All values listed in the source union are reachable. ✓
- Animation discriminator literals (`'sine' | 'noise_wiggle' | 'pulse' | 'mouse_follow' | 'color_cycle'`) consistent across Task 1, Task 4, Task 11 round-trip recipes. ✓
- `CompileResult` discriminator (`ok: true | false`) used uniformly. ✓

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-23-compiler-rework.md`. Companion spec at `docs/superpowers/specs/2026-05-23-compiler-rework.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Use `superpowers:subagent-driven-development`.

2. **Inline Execution** — Execute tasks in this session with checkpoints for review. Use `superpowers:executing-plans`.

The user has indicated they'll do **inline editing on the plan AFTER answering open questions** — so do NOT start execution until they've confirmed.
