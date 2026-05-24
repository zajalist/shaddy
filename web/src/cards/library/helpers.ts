// Reusable GLSL helper functions referenced by cards via CardDef.helpers.
// The compiler walks the recipe, collects the union of names + transitive
// dependencies, then emits each function ONCE at the top of the shader
// (before main()). Emission order is fixed below so dependents always come
// after their dependencies.

export const GLSL_HELPERS: Record<string, string> = {
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
  vec2 u = f * f * (3.0 - 2.0 * f);
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
};

/** Helper → list of other helpers it depends on. Resolved transitively at compile. */
export const HELPER_DEPS: Record<string, string[]> = {
  noise2: ['hash21'],
  fbm2: ['noise2', 'hash21'],
  ridged2: ['noise2', 'hash21'],
  worley2: ['hash22'],
};

/** Fixed emission order. Any helper named here that's in the requested set is
 *  emitted; anything not in the registry is ignored. Dependents come AFTER
 *  their dependencies. */
export const HELPER_EMISSION_ORDER: readonly string[] = [
  'hash21',
  'hash22',
  'noise2',
  'fbm2',
  'ridged2',
  'worley2',
  'hsv2rgb',
  'rgb2hsv',
  'rot2',
  'cospal',
  'sdfBox',
  'sdfHex',
  'sdfTri',
  'sdfStar',
  'sdfHeart',
];

/** Expand a set of helper names to include all transitive dependencies. */
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
