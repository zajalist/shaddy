// Reusable GLSL helper functions referenced by cards via CardDef.helpers.
// The compiler walks the recipe, collects the union of names + transitive
// dependencies, then emits each function ONCE at the top of the shader
// (before main()). Emission order is DERIVED (see orderedHelpers below) — no
// hand-maintained order list to fall out of sync.
//
// `BODIES` holds just the GLSL text; everything ELSE about a helper (its deps
// and emission phase) lives in `META`, and the two are composed into the one
// public `HELPERS` map. A reader asks `HELPERS[name]` and gets the whole story.

const BODIES: Record<string, string> = {
  hash21: `float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}`,

  hash22: `vec2 hash22(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                        dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}`,

  noise2: `float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  // Quintic fade (6f^5-15f^4+10f^3) — C2-continuous, so the noise AND its
  // screen-space slope (used by relief_light) are smooth, no grid artifacts.
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i + vec2(0.0, 0.0));
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}`,

  // 4-octave fBm. Used by many "organic" shape cards.
  fbm2: `float fbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise2(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}`,

  // Ridged-multifractal (1 - |noise|) — gives mountain-ridge vibes.
  ridged2: `float ridged2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * (1.0 - abs(noise2(p) * 2.0 - 1.0));
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}`,

  // Returns F1 (nearest) and F2 (second-nearest) distances — F2-F1 gives
  // cell edges, F1 alone gives cell-fill voronoi.
  worley2: `vec2 worley2(vec2 p) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float f1 = 1.4142;
  float f2 = 1.4142;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 seed = hash22(ip + g);
      vec2 site = g + 0.5 + (seed - 0.5);
      float d = length(site - fp);
      if (d < f1) { f2 = f1; f1 = d; }
      else if (d < f2) { f2 = d; }
    }
  }
  return vec2(f1, f2);
}`,

  hsv2rgb: `vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}`,

  rgb2hsv: `vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}`,

  // Rotate a vec2 by an angle in radians.
  rot2: `mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}`,

  // iq's cosine palette — gorgeous parametric colour ramps.
  // Pass a + b * cos(2π(c*t + d)) channel-wise.
  cospal: `vec3 cospal(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.2831853 * (c * t + d));
}`,

  // Ocean wave height (from "Seascape" by Alexander Alekseev / TDM, 2014,
  // CC BY-NC-SA 3.0). The octave sum + its constants are the author's tuning —
  // that's what makes it read as real water. Used by the composable wavy/ocean
  // SURFACE block (a height-field SDF), so the rest of the raymarcher (camera,
  // lighting, fresnel) is built from separate blocks.
  oc_hash: `float oc_hash(vec2 p){ float h = dot(p, vec2(127.1, 311.7)); return fract(sin(h) * 43758.5453123); }`,
  oc_noise: `float oc_noise(in vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return -1.0 + 2.0 * mix(mix(oc_hash(i + vec2(0.0,0.0)), oc_hash(i + vec2(1.0,0.0)), u.x),
                          mix(oc_hash(i + vec2(0.0,1.0)), oc_hash(i + vec2(1.0,1.0)), u.x), u.y);
}`,
  oc_octave: `float oc_octave(vec2 uv, float choppy){ uv += oc_noise(uv); vec2 wv = 1.0 - abs(sin(uv)); vec2 swv = abs(cos(uv)); wv = mix(wv, swv, wv); return pow(1.0 - pow(wv.x * wv.y, 0.65), choppy); }`,
  seaHeight: `float seaHeight(vec2 uv, float tt){
  float freq = 0.16, amp = 0.6, choppy = 4.0; float st = 1.0 + tt * 0.8;
  uv.x *= 0.75; mat2 m = mat2(1.6,1.2,-1.2,1.6); float d, h = 0.0;
  for(int i = 0; i < 5; i++){ d = oc_octave((uv + st) * freq, choppy); d += oc_octave((uv - st) * freq, choppy); h += d * amp; uv *= m; freq *= 1.9; amp *= 0.22; choppy = mix(choppy, 1.0, 0.2); }
  return h;
}`,

  // Common SDF primitives (return signed distance — negative inside).
  sdfBox: `float sdfBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}`,

  sdfHex: `float sdfHex(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}`,

  sdfTri: `float sdfTri(vec2 p, float r) {
  const float k = 1.7320508;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}`,

  sdfStar: `float sdfStar(vec2 p, float r, int n, float m) {
  float an = 3.14159 / float(n);
  float en = 3.14159 / m;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}`,

  sdfHeart: `float sdfHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) {
    return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - 0.3535;
  }
  return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
                  dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0))))
         * sign(p.x - p.y);
}`,

  // Line-segment SDF — distance from point p to segment a..b (no thickness).
  sdfSegment: `float sdfSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}`,

  // Capsule SDF — line segment a..b inflated by radius r.
  sdfCapsule: `float sdfCapsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}`,

  // Rounded box — separate radii per corner (x = right, y = left, w = bottom).
  sdfRoundedBox: `float sdfRoundedBox(vec2 p, vec2 b, vec4 r) {
  r.xy = (p.x > 0.0) ? r.xy : r.zw;
  r.x  = (p.y > 0.0) ? r.x  : r.y;
  vec2 q = abs(p) - b + r.x;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}`,

  // Ellipse SDF — iq's closed-form approximate version (cleaner than the
  // exact iterative one). ab = half-axes. Returns signed distance.
  sdfEllipse: `float sdfEllipse(vec2 p, vec2 ab) {
  float k0 = length(p / ab);
  float k1 = length(p / (ab * ab));
  return k0 * (k0 - 1.0) / max(k1, 1e-8);
}`,

  // Regular n-gon SDF (iq), radius r, integer side count n.
  sdfPolyN: `float sdfPolyN(vec2 p, float r, int n) {
  float an = 3.14159265 / float(n);
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  return length(p) * cos(bn) - r * cos(an);
}`,

  // Vesica — two-circle intersection lens (iq). r = circle radius,
  // d = half-distance between centres along x. Negative inside.
  sdfVesica: `float sdfVesica(vec2 p, float r, float d) {
  p = abs(p);
  float b = sqrt(max(r * r - d * d, 0.0));
  return ((p.y - b) * d > p.x * b)
    ? length(p - vec2(0.0, b))
    : length(p - vec2(-d, 0.0)) - r;
}`,

  // Pie wedge (iq). c = vec2(sin(theta), cos(theta)) of half-angle, r = radius.
  sdfPie: `float sdfPie(vec2 p, vec2 c, float r) {
  p.x = abs(p.x);
  float l = length(p) - r;
  float m = length(p - c * clamp(dot(p, c), 0.0, r));
  return max(l, m * sign(c.y * p.x - c.x * p.y));
}`,

  // Trapezoid (iq). r1 = bottom half-width, r2 = top half-width, h = half-height.
  sdfTrapezoid: `float sdfTrapezoid(vec2 p, float r1, float r2, float h) {
  vec2 k1 = vec2(r2, h);
  vec2 k2 = vec2(r2 - r1, 2.0 * h);
  p.x = abs(p.x);
  vec2 ca = vec2(p.x - min(p.x, (p.y < 0.0) ? r1 : r2), abs(p.y) - h);
  vec2 cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
}`,

  // Parallelogram (iq). wi = half-width, he = half-height, sk = skew along x.
  sdfParallelogram: `float sdfParallelogram(vec2 p, float wi, float he, float sk) {
  vec2 e = vec2(sk, he);
  p = (p.y < 0.0) ? -p : p;
  vec2 w = p - e;
  w.x -= clamp(w.x, -wi, wi);
  vec2 d = vec2(dot(w, w), -w.y);
  float s = p.x * e.y - p.y * e.x;
  p = (s < 0.0) ? -p : p;
  vec2 v = p - vec2(wi, 0.0);
  v -= e * clamp(dot(v, e) / dot(e, e), -1.0, 1.0);
  d = min(d, vec2(dot(v, v), wi * he - abs(s)));
  return sqrt(d.x) * sign(-d.y);
}`,

  // Horseshoe (iq). c = vec2(cos(angle), sin(angle)), r = radius, w = vec2(thickness, length).
  sdfHorseshoe: `float sdfHorseshoe(vec2 p, vec2 c, float r, vec2 w) {
  p.x = abs(p.x);
  float l = length(p);
  p = mat2(-c.x, c.y, c.y, c.x) * p;
  p = vec2((p.y > 0.0 || p.x > 0.0) ? p.x : l * sign(-c.x),
           (p.x > 0.0) ? p.y : l);
  p = vec2(p.x, abs(p.y - r)) - w;
  return length(max(p, 0.0)) + min(0.0, max(p.x, p.y));
}`,

  // ASCII bitmap glyph lookup — 10 hardcoded 5x7 character bitmaps ordered
  // light → dark: ' .:-=+*#%@'. Each glyph is 7 rows of 5 bits (MSB = left).
  // Returns 1.0 if the bit at (x, y) for glyph index `g` is set, else 0.0.
  // x ∈ [0,4], y ∈ [0,6] with y=0 at the top.
  // Out-of-range coordinates return 0.0 (acts as built-in border).
  asciiGlyph5x7: `float asciiGlyph5x7(int g, int x, int y) {
  if (x < 0 || x > 4 || y < 0 || y > 6) return 0.0;
  int row = 0;
  // ' ' (0)  blank
  // '.' (1)  bottom dot
  if (g == 1) {
    if (y == 5) row = 12;       // ..11.
    else if (y == 6) row = 12;  // ..11.
  }
  // ':' (2)  two dots
  else if (g == 2) {
    if (y == 1 || y == 2) row = 12;
    else if (y == 4 || y == 5) row = 12;
  }
  // '-' (3)  horizontal dash mid
  else if (g == 3) {
    if (y == 3) row = 14;       // .111. = 01110 = 14
  }
  // '=' (4)  two horizontal dashes
  else if (g == 4) {
    if (y == 2 || y == 4) row = 14;
  }
  // '+' (5)  plus
  else if (g == 5) {
    if (y == 1 || y == 2 || y == 4 || y == 5) row = 4;
    else if (y == 3) row = 14;
  }
  // '*' (6)  asterisk
  else if (g == 6) {
    if (y == 1) row = 21;        // .1.1.1 → 10101 = 21
    else if (y == 2) row = 14;   // .111. = 01110 = 14
    else if (y == 3) row = 31;
    else if (y == 4) row = 14;
    else if (y == 5) row = 21;
  }
  // '#' (7)  hash — heavy
  else if (g == 7) {
    if (y == 1 || y == 5) row = 10;   // .1.1. = 01010 = 10
    else if (y == 2 || y == 4) row = 31;
    else if (y == 3) row = 10;
  }
  // '%' (8)  percent — denser
  else if (g == 8) {
    if (y == 1) row = 25;   // 11.01 = 11001 = 25
    else if (y == 2) row = 26; // 11.1. = 11010 = 26
    else if (y == 3) row = 4;
    else if (y == 4) row = 11; // .1.11 = 01011 = 11
    else if (y == 5) row = 19; // 1..11 = 10011 = 19
  }
  // '@' (9)  at — densest
  else if (g == 9) {
    if (y == 0) row = 14;        // .111.
    else if (y == 1) row = 17;   // 1...1
    else if (y == 2) row = 23;   // 1.111 = 10111 = 23
    else if (y == 3) row = 21;   // 1.1.1
    else if (y == 4) row = 23;   // 1.111
    else if (y == 5) row = 16;   // 1....
    else if (y == 6) row = 15;   // .1111
  }
  int bit = (row >> (4 - x)) & 1;
  return float(bit);
}`,

  // ─── 3D raymarch helpers ────────────────────────────────────────────────
  // Hard min — straight CSG union of two SDFs.
  sdMin: `float sdMin(float a, float b) { return min(a, b); }`,

  // iq's polynomial smooth-min. k controls blend radius; k=0 == hard min().
  sdSmoothMin: `float sdSmoothMin(float a, float b, float k) {
  if (k <= 0.0) return min(a, b);
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}`,

  // 3D box SDF (iq). b = half-extents per axis.
  sdfBox3: `float sdfBox3(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}`,

  // Torus SDF (iq). t.x = major radius, t.y = minor radius.
  sdfTorus3: `float sdfTorus3(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}`,

  // Numerical-gradient surface normal — assumes sdScene exists at emit time.
  sceneNormal3: `vec3 sceneNormal3(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    sdScene(p + e.xyy) - sdScene(p - e.xyy),
    sdScene(p + e.yxy) - sdScene(p - e.yxy),
    sdScene(p + e.yyx) - sdScene(p - e.yyx)
  ));
}`,

  // iq's soft-shadow march — call AFTER sdScene exists. 32 iterations gives
  // a usable penumbra at low cost; w widens the shadow gradient.
  softShadow3: `float softShadow3(vec3 ro, vec3 rd, float mint, float maxt, float w) {
  float res = 1.0;
  float t = mint;
  for (int i = 0; i < 32; i++) {
    float h = sdScene(ro + rd * t);
    res = min(res, h / (w * t));
    t += clamp(h, 0.005, 0.5);
    if (res < -1.0 || t > maxt) break;
  }
  return clamp(res, 0.0, 1.0);
}`,
};

// ─── Helper metadata ────────────────────────────────────────────────────
// Everything ABOUT a helper beyond its body. Only the handful with deps or a
// non-default phase need an entry; the rest fall back to {deps:[], phase:'pre'},
// so adding a plain helper to BODIES needs NOTHING here. Crucially there is no
// separate emission-ORDER list — order is derived (see orderedHelpers), so a
// helper can never be silently dropped by forgetting to list it.
//
//   phase 'pre'  → emitted before sdScene() (the default; every 2D helper)
//   phase 'post' → emitted AFTER sdScene() in the 3D compiler (these call
//                  sdScene by name, so they're invalid until it exists)
export type HelperPhase = 'pre' | 'post';
const META: Record<string, { deps?: readonly string[]; phase?: HelperPhase }> = {
  noise2: { deps: ['hash21'] },
  fbm2: { deps: ['noise2', 'hash21'] },
  ridged2: { deps: ['noise2', 'hash21'] },
  worley2: { deps: ['hash22'] },
  oc_noise: { deps: ['oc_hash'] },
  oc_octave: { deps: ['oc_noise', 'oc_hash'] },
  seaHeight: { deps: ['oc_octave', 'oc_noise', 'oc_hash'] },
  sceneNormal3: { phase: 'post' },
  softShadow3: { phase: 'post' },
};

/** The single source of truth for a GLSL helper: its body + how it emits. */
export type HelperDef = { body: string; deps: readonly string[]; phase: HelperPhase };

/** One entry per helper, composed from its body + metadata. Consumers read
 *  `HELPERS[name]` and get everything. */
export const HELPERS: Record<string, HelperDef> = Object.fromEntries(
  Object.entries(BODIES).map(([name, body]) => [name, {
    body,
    deps: META[name]?.deps ?? [],
    phase: META[name]?.phase ?? 'pre',
  }]),
) as Record<string, HelperDef>;

/** Expand a set of requested helper names to include all transitive deps. */
export function resolveHelperClosure(requested: Iterable<string>): Set<string> {
  const out = new Set<string>();
  const stack = [...requested];
  while (stack.length > 0) {
    const name = stack.pop()!;
    if (out.has(name)) continue;
    if (!(name in HELPERS)) continue;
    out.add(name);
    for (const d of HELPERS[name]!.deps) stack.push(d);
  }
  return out;
}

export type OrderedHelper = { name: string; body: string; phase: HelperPhase };

/** The closure's helpers in deterministic emission order: dependencies before
 *  dependents, with declaration order (the order in BODIES) as the stable
 *  tiebreak. A stable DFS post-order — byte-identical across builds (the
 *  reverse-parser round-trip relies on it) and impossible to forget a helper. */
export function orderedHelpers(closure: ReadonlySet<string>): OrderedHelper[] {
  const visited = new Set<string>();
  const out: OrderedHelper[] = [];
  const visit = (name: string): void => {
    if (visited.has(name) || !closure.has(name)) return;
    const def = HELPERS[name];
    if (!def) return;
    visited.add(name);
    for (const d of def.deps) visit(d); // dependencies first
    out.push({ name, body: def.body, phase: def.phase });
  };
  for (const name of Object.keys(BODIES)) visit(name); // stable declaration order
  return out;
}
