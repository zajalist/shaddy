// Lesson definitions for the Learn page.
//
// Each lesson is a complete, runnable fragment-shader body (the preamble
// `#version 300 es; precision highp float; in vec2 v_uv; out vec4 fragColor;
//  uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_mouse;`
// is added by the renderer — see web/src/renderer/gl/preamble.ts).
//
// `check` runs after the user clicks the Check button. It gets the current
// source text + a sampling helper (already-read pixels). The goal isn't a
// rigorous proof — it's a friendly "did they almost certainly solve it?"
// combining a regex on their code (was the right construct introduced?)
// with a couple of pixel samples (does the picture look right?).
//
// Pixel sample coords: (u, v) in [0..1] over the framebuffer, (0,0) is the
// BOTTOM-LEFT (GL convention), so v=0.5 is vertically centred, v=1.0 is the
// top of the picture.

import type { RawShaderCanvasHandle } from './RawShaderCanvas';
import { luma, samplePixel } from './RawShaderCanvas';

export type CheckContext = {
  source: string;
  canvas: RawShaderCanvasHandle;
};

export type CheckResult = { pass: true } | { pass: false; reason: string };

export type Lesson = {
  id: string;
  number: number;
  title: string;
  /** Mascot's opening line — markdown-free plain prose, short. */
  prompt: string;
  /** Mascot's gentle nudge if the check fails. */
  hint: string;
  /** GLSL the user starts with. Must compile + render something. */
  starterCode: string;
  /** Canonical solution — used by the "Show me" button and is itself a valid
   *  answer to the check. */
  solutionCode: string;
  /** Pass/fail decision. May be async (snapshot reads may need a frame). */
  check: (ctx: CheckContext) => Promise<CheckResult>;
};

// ─── helpers used in every check ─────────────────────────────────────────

/** True if the source contains `needle` ignoring whitespace differences. */
function hasCode(src: string, needle: RegExp): boolean {
  return needle.test(src);
}

/** Sleep one rAF so the next read sees the freshly-compiled frame. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    } else {
      setTimeout(resolve, 32);
    }
  });
}

// ─── lesson 1 — make a circle ─────────────────────────────────────────────
// Starter draws a tiny "dot" (radius 0) because the comparison is < 0.
// Goal: change `< 0.0` to `< 0.5` so a visible disc appears.

const L1_STARTER = `void main() {
  // The fragment lives in [-1, 1]^2 after we centre + aspect-correct it.
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // Draw red where the point is inside a circle of radius R.
  // Right now R is zero, so we get NO circle. Make R bigger!
  float inside = step(length(uv), 0.0);

  vec3 color = vec3(inside, 0.0, 0.0);
  fragColor = vec4(color, 1.0);
}`;

const L1_SOLUTION = `void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  float inside = step(length(uv), 0.5);

  vec3 color = vec3(inside, 0.0, 0.0);
  fragColor = vec4(color, 1.0);
}`;

// ─── lesson 2 — soften the edge with smoothstep ──────────────────────────

const L2_STARTER = `void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // Hard-edged circle. Wrap the inside-test in smoothstep(...) so the
  // edge fades over a few pixels.
  float inside = step(length(uv), 0.5);

  vec3 color = vec3(inside, 0.0, 0.0);
  fragColor = vec4(color, 1.0);
}`;

const L2_SOLUTION = `void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // smoothstep(edge1, edge0, x) — note the swap so we fade FROM the inside
  // TO the outside as length(uv) grows past 0.48.
  float inside = smoothstep(0.5, 0.48, length(uv));

  vec3 color = vec3(inside, 0.0, 0.0);
  fragColor = vec4(color, 1.0);
}`;

// ─── lesson 3 — move the circle ──────────────────────────────────────────

const L3_STARTER = `void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // The circle is centred. Shift it: replace length(uv) with
  // length(uv - vec2(0.3, 0.0)) so it slides to the right.
  float d = length(uv);
  float inside = smoothstep(0.5, 0.48, d);

  vec3 color = vec3(inside, 0.0, 0.0);
  fragColor = vec4(color, 1.0);
}`;

const L3_SOLUTION = `void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  float d = length(uv - vec2(0.3, 0.0));
  float inside = smoothstep(0.5, 0.48, d);

  vec3 color = vec3(inside, 0.0, 0.0);
  fragColor = vec4(color, 1.0);
}`;

// ─── lesson 4 — animate with sin(u_time) ─────────────────────────────────

const L4_STARTER = `void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // Make the radius pulse. Multiply 0.5 by (0.5 + 0.5 * sin(u_time)) so it
  // breathes between 0 and 0.5.
  float radius = 0.5;
  float inside = smoothstep(radius, radius - 0.02, length(uv));

  vec3 color = vec3(inside, 0.2, 0.2);
  fragColor = vec4(color, 1.0);
}`;

const L4_SOLUTION = `void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  float radius = 0.5 * (0.5 + 0.5 * sin(u_time));
  float inside = smoothstep(radius, radius - 0.02, length(uv));

  vec3 color = vec3(inside, 0.2, 0.2);
  fragColor = vec4(color, 1.0);
}`;

// ─── lesson 5 — mix two colours by distance ──────────────────────────────

const L5_STARTER = `void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  vec3 c1 = vec3(1.0, 0.7, 0.2);   // warm gold
  vec3 c2 = vec3(0.1, 0.2, 0.5);   // cool navy

  // Replace this solid colour with mix(c1, c2, length(uv)).
  vec3 color = c1;

  fragColor = vec4(color, 1.0);
}`;

const L5_SOLUTION = `void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  vec3 c1 = vec3(1.0, 0.7, 0.2);
  vec3 c2 = vec3(0.1, 0.2, 0.5);

  vec3 color = mix(c1, c2, length(uv));

  fragColor = vec4(color, 1.0);
}`;

// ─── lesson 6 — add value noise ──────────────────────────────────────────
// We supply a tiny inline hash-noise helper so the user only has to call it.

const L6_STARTER = `// A pocket-sized 2D value noise. Already defined for you.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // Solid grey. Replace with noise2(uv * 5.0) so it gets bumpy.
  float n = 0.5;

  fragColor = vec4(vec3(n), 1.0);
}`;

const L6_SOLUTION = `float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  float n = noise2(uv * 5.0);

  fragColor = vec4(vec3(n), 1.0);
}`;

// ─── lesson 7 — smooth-min two SDFs ──────────────────────────────────────

const L7_STARTER = `// Polynomial smooth-min from iq — merges two distances smoothly.
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // Two circles, currently combined with hard min(). Replace min(d1, d2)
  // with smin(d1, d2, 0.2) so they melt into each other.
  float d1 = length(uv - vec2(-0.25, 0.0)) - 0.3;
  float d2 = length(uv - vec2( 0.25, 0.0)) - 0.3;
  float d  = min(d1, d2);

  float inside = smoothstep(0.01, -0.01, d);
  fragColor = vec4(vec3(inside) * vec3(1.0, 0.6, 0.2), 1.0);
}`;

const L7_SOLUTION = `float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  float d1 = length(uv - vec2(-0.25, 0.0)) - 0.3;
  float d2 = length(uv - vec2( 0.25, 0.0)) - 0.3;
  float d  = smin(d1, d2, 0.2);

  float inside = smoothstep(0.01, -0.01, d);
  fragColor = vec4(vec3(inside) * vec3(1.0, 0.6, 0.2), 1.0);
}`;

// ─── lesson 8 — iq cospal palette ────────────────────────────────────────

const L8_STARTER = `// Inigo Quilez's cosine palette. Tweakable, infinite, gorgeous.
vec3 cospal(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // We have a gradient ramp t in [0, 1]. Right now we paint it grey.
  // Replace vec3(t) with a call to cospal(t, a, b, c, d) — try
  //   a = vec3(0.5),  b = vec3(0.5),  c = vec3(1.0),  d = vec3(0.0, 0.33, 0.67)
  // for a classic rainbow.
  float t = length(uv);
  vec3 color = vec3(t);

  fragColor = vec4(color, 1.0);
}`;

const L8_SOLUTION = `vec3 cospal(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  float t = length(uv);
  vec3 color = cospal(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));

  fragColor = vec4(color, 1.0);
}`;

// ─── catalogue ───────────────────────────────────────────────────────────

export const LESSONS: Lesson[] = [
  {
    id: 'circle',
    number: 1,
    title: 'Make a circle',
    prompt: "We're drawing nothing because the radius is zero. Change `length(uv) < 0.0` to `length(uv) < 0.5` and a big red disc shows up.",
    hint: "Find the `0.0` inside `step(length(uv), 0.0)` and bump it up to `0.5`.",
    starterCode: L1_STARTER,
    solutionCode: L1_SOLUTION,
    check: async ({ canvas }) => {
      await nextFrame();
      const buf = canvas.readPixels();
      if (!buf) return { pass: false, reason: "Couldn't read the canvas — try again." };
      const centre = samplePixel(buf, 0.5, 0.5);
      const corner = samplePixel(buf, 0.05, 0.05);
      // Red disc means centre is bright red, corner is dark.
      if (centre[0] > 0.7 && corner[0] < 0.2) return { pass: true };
      return { pass: false, reason: 'Almost — the centre should be bright red.' };
    },
  },
  {
    id: 'smoothstep',
    number: 2,
    title: 'Soften the edge',
    prompt: 'The disc is sharp and pixelated. Replace `step(...)` with `smoothstep(0.5, 0.48, length(uv))` so the edge fades.',
    hint: 'Use `smoothstep(0.5, 0.48, length(uv))` — note the edges are reversed so we fade FROM inside TO outside.',
    starterCode: L2_STARTER,
    solutionCode: L2_SOLUTION,
    check: async ({ source, canvas }) => {
      if (!hasCode(source, /\bsmoothstep\s*\(/)) {
        return { pass: false, reason: 'I want to see `smoothstep(` in your code.' };
      }
      await nextFrame();
      const buf = canvas.readPixels();
      if (!buf) return { pass: false, reason: "Couldn't read the canvas." };
      const centre = samplePixel(buf, 0.5, 0.5);
      if (centre[0] < 0.7) return { pass: false, reason: 'The middle should still be bright red.' };
      return { pass: true };
    },
  },
  {
    id: 'translate',
    number: 3,
    title: 'Move the circle',
    prompt: 'Slide the circle to the right. Change `length(uv)` to `length(uv - vec2(0.3, 0.0))`.',
    hint: 'Subtract a `vec2(0.3, 0.0)` from `uv` before measuring its length.',
    starterCode: L3_STARTER,
    solutionCode: L3_SOLUTION,
    check: async ({ canvas }) => {
      await nextFrame();
      const buf = canvas.readPixels();
      if (!buf) return { pass: false, reason: "Couldn't read the canvas." };
      // Disc shifted right → sample at u=0.75, v=0.5 should be red,
      // sample at u=0.25, v=0.5 should be dark.
      const right = samplePixel(buf, 0.72, 0.5);
      const left  = samplePixel(buf, 0.28, 0.5);
      if (right[0] > 0.6 && left[0] < 0.2) return { pass: true };
      return { pass: false, reason: "The disc isn't on the right yet." };
    },
  },
  {
    id: 'animate',
    number: 4,
    title: 'Animate with u_time',
    prompt: 'Make it breathe. Multiply the radius by `(0.5 + 0.5 * sin(u_time))` so it pulses from 0 to its full size.',
    hint: 'Replace `float radius = 0.5;` with `float radius = 0.5 * (0.5 + 0.5 * sin(u_time));`.',
    starterCode: L4_STARTER,
    solutionCode: L4_SOLUTION,
    check: async ({ source }) => {
      if (!hasCode(source, /\bsin\s*\(\s*u_time/)) {
        return { pass: false, reason: 'I want to see `sin(u_time` somewhere.' };
      }
      return { pass: true };
    },
  },
  {
    id: 'mix',
    number: 5,
    title: 'Mix two colours',
    prompt: 'Make the colour a blend of `c1` and `c2`. Use `mix(c1, c2, length(uv))` so the middle is gold and the edges are navy.',
    hint: 'Use `mix(c1, c2, t)` — `t` should be `length(uv)`.',
    starterCode: L5_STARTER,
    solutionCode: L5_SOLUTION,
    check: async ({ source, canvas }) => {
      if (!hasCode(source, /\bmix\s*\(\s*c1\s*,\s*c2/)) {
        return { pass: false, reason: 'I want to see `mix(c1, c2, ...)` in your code.' };
      }
      await nextFrame();
      const buf = canvas.readPixels();
      if (!buf) return { pass: false, reason: "Couldn't read the canvas." };
      const centre = samplePixel(buf, 0.5, 0.5);
      const corner = samplePixel(buf, 0.05, 0.05);
      // Centre warm (R > B), corner cool (B > R).
      if (centre[0] > centre[2] && corner[2] > corner[0]) return { pass: true };
      return { pass: false, reason: "Centre should be warm gold, edges cool navy." };
    },
  },
  {
    id: 'noise',
    number: 6,
    title: 'Add noise',
    prompt: 'Call the `noise2()` helper. Replace `float n = 0.5;` with `n = noise2(uv * 5.0);` to get a lumpy texture.',
    hint: 'Use the provided `noise2(p)` — feed it `uv * 5.0` for a nice scale.',
    starterCode: L6_STARTER,
    solutionCode: L6_SOLUTION,
    check: async ({ source, canvas }) => {
      if (!hasCode(source, /\bnoise2\s*\(/)) {
        return { pass: false, reason: 'I want to see a `noise2(` call.' };
      }
      await nextFrame();
      const buf = canvas.readPixels();
      if (!buf) return { pass: false, reason: "Couldn't read the canvas." };
      // Noise → samples at different points should differ.
      const a = luma(samplePixel(buf, 0.25, 0.25));
      const b = luma(samplePixel(buf, 0.75, 0.75));
      const c = luma(samplePixel(buf, 0.5,  0.5));
      const spread = Math.max(a, b, c) - Math.min(a, b, c);
      if (spread > 0.1) return { pass: true };
      return { pass: false, reason: "Doesn't look bumpy enough — did you scale uv?" };
    },
  },
  {
    id: 'smin',
    number: 7,
    title: 'Smooth-min two shapes',
    prompt: 'Merge the two circles smoothly. Replace `min(d1, d2)` with `smin(d1, d2, 0.2)` and watch them melt together.',
    hint: 'Use `smin(d1, d2, 0.2)` — `smin` is already defined for you above `main`.',
    starterCode: L7_STARTER,
    solutionCode: L7_SOLUTION,
    check: async ({ source, canvas }) => {
      if (!hasCode(source, /\bsmin\s*\(/)) {
        return { pass: false, reason: 'I want to see a call to `smin(`.' };
      }
      await nextFrame();
      const buf = canvas.readPixels();
      if (!buf) return { pass: false, reason: "Couldn't read the canvas." };
      // After smin, the BRIDGE between the two circles (centre, v=0.5) should
      // be filled (orange). With plain min there's a notch there.
      const bridge = samplePixel(buf, 0.5, 0.5);
      if (bridge[0] > 0.4) return { pass: true };
      return { pass: false, reason: "The middle should be filled — try a larger k like 0.2." };
    },
  },
  {
    id: 'palette',
    number: 8,
    title: 'Your first palette',
    prompt: 'Trade the grey ramp for a real palette. Call `cospal(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67))` — that\'s the classic iq rainbow.',
    hint: 'Use `cospal(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67))`.',
    starterCode: L8_STARTER,
    solutionCode: L8_SOLUTION,
    check: async ({ source, canvas }) => {
      if (!hasCode(source, /\bcospal\s*\(/)) {
        return { pass: false, reason: 'I want to see a `cospal(` call.' };
      }
      await nextFrame();
      const buf = canvas.readPixels();
      if (!buf) return { pass: false, reason: "Couldn't read the canvas." };
      // Different rings should have different hues. Compare centre, mid, edge.
      const centre = samplePixel(buf, 0.5, 0.5);
      const mid    = samplePixel(buf, 0.7, 0.5);
      const edge   = samplePixel(buf, 0.95, 0.5);
      const dHue =
        Math.abs(centre[0] - edge[0]) +
        Math.abs(centre[1] - edge[1]) +
        Math.abs(centre[2] - edge[2]) +
        Math.abs(mid[0] - edge[0]) +
        Math.abs(mid[1] - edge[1]) +
        Math.abs(mid[2] - edge[2]);
      if (dHue > 0.5) return { pass: true };
      return { pass: false, reason: "It still looks grey — did you swap in cospal(...)?" };
    },
  },
];

// ─── progress (localStorage) ─────────────────────────────────────────────

const STORAGE_KEY = 'shade.learn.completed.v1';

export function loadProgress(): Set<string> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function saveProgress(done: Set<string>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]));
    }
  } catch {
    // best-effort; nothing else to do
  }
}
