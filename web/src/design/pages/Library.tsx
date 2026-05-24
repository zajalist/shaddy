// Library — the shader-knowledge encyclopedia.
//
// One long-form page that explains EVERYTHING about shader programming in
// plain language. Aimed at both newcomers (the hero copy keeps zero jargon
// for the first few paragraphs) and pros (every group ships real code,
// real maths, and references to the standard formulas).
//
// Layout:
//   - Hero strip — warm cream gradient, big Bricolage headline, search box.
//   - Two-column body: sticky TOC sidebar (240px) + article column (~900px).
//   - Each article is a self-contained <Article> with eyebrow, heading,
//     underline, prose, code, and diagrams.
//
// Search wiring: the hero's search box owns the only query state. Lowered,
// trimmed, and passed to the TOC for filtering; articles whose title doesn't
// match are hidden via `display:none` so anchor links + IntersectionObserver
// continue to work (the DOM stays intact).

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import { SHADE, TYPE } from '../tokens';
import { useIsMobile } from '../useIsMobile';
import { Article } from './library/Article';
import { CodeSnippet } from './library/CodeSnippet';
import { Diagram } from './library/Diagram';
import { TOC } from './library/TOC';
import type { TocGroup } from './library/TOC';

// ─── fonts + body chrome ───────────────────────────────────────────────
const FONT_LINK_ID = 'shade-design-fonts';
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Geist+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap';
const KEYFRAMES_ID = 'shade-library-keyframes';

const useLibraryChrome = () => {
  useEffect(() => {
    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      link.href = FONTS_HREF;
      document.head.appendChild(link);
    }
    if (!document.getElementById(KEYFRAMES_ID)) {
      const style = document.createElement('style');
      style.id = KEYFRAMES_ID;
      style.textContent = `
        @keyframes libFadeIn { from { opacity: 0 } to { opacity: 1 } }
        .lib-article-hidden { display: none !important; }
      `;
      document.head.appendChild(style);
    }
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    const prevOverflowX = document.body.style.overflowX;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    document.body.style.background = SHADE.bg;
    document.body.style.color = SHADE.text;
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
      document.body.style.overflowX = prevOverflowX;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
    };
  }, []);
};

// ─── tiny styled atoms ─────────────────────────────────────────────────

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: '0 0 14px', color: SHADE.text, lineHeight: 1.7 }}>
    {children}
  </p>
);

const Inline = ({ children }: { children: React.ReactNode }) => (
  <code style={{
    fontFamily: TYPE.bodyMono,
    fontSize: '0.92em',
    background: SHADE.surface3,
    color: SHADE.text,
    padding: '1px 6px',
    borderRadius: 4,
    border: `1px solid ${SHADE.border}`,
  }}>{children}</code>
);

const Strong = ({ children }: { children: React.ReactNode }) => (
  <strong style={{ color: SHADE.text, fontWeight: 700 }}>{children}</strong>
);

const Table = ({ head, rows }: { head: string[]; rows: string[][] }) => (
  <div style={{
    margin: '18px 0',
    border: `1.5px solid ${SHADE.inkLine}`,
    borderRadius: 10,
    boxShadow: `0 3px 0 ${SHADE.inkLine}`,
    overflow: 'hidden',
    background: SHADE.surface1,
  }}>
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: TYPE.body,
      fontSize: 13.5,
    }}>
      <thead>
        <tr style={{ background: SHADE.surface2 }}>
          {head.map((h) => (
            <th key={h} style={{
              padding: '10px 12px',
              textAlign: 'left',
              fontFamily: TYPE.bodyMono,
              fontSize: 10.5,
              fontWeight: 700,
              color: SHADE.textDim,
              letterSpacing: TYPE.trackEyebrow,
              textTransform: 'uppercase',
              borderBottom: `1.5px solid ${SHADE.inkLine}`,
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{
            background: i % 2 === 0 ? SHADE.surface1 : SHADE.surface2,
          }}>
            {row.map((cell, j) => (
              <td key={j} style={{
                padding: '8px 12px',
                color: SHADE.text,
                borderTop: i === 0 ? 'none' : `1px dashed ${SHADE.border}`,
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── article registry ──────────────────────────────────────────────────
// Single source of truth: each article exports its `id` + `title` here.
// The TOC sidebar lists them; the body renders them; the search filter
// matches on title.

type ArticleMeta = { id: string; title: string };
type Group = {
  label: string;
  color: string;
  articles: ArticleMeta[];
};

const GROUPS: Group[] = [
  {
    label: 'Fundamentals',
    color: SHADE.gold,
    articles: [
      { id: 'what-is-a-shader',      title: 'What IS a shader?' },
      { id: 'fragment-pipeline',     title: 'The fragment shader pipeline' },
      { id: 'why-gpus-fast',         title: 'Why GPUs are fast' },
      { id: 'glsl-vs-the-others',    title: 'GLSL vs HLSL vs WGSL vs Metal' },
    ],
  },
  {
    label: 'Math you need',
    color: SHADE.catShape,
    articles: [
      { id: 'uv-coordinates',     title: 'UV coordinates' },
      { id: 'trig-in-shaders',    title: 'Trig in shaders' },
      { id: 'vectors-dot',        title: 'Vectors + dot product' },
      { id: 'smoothstep-mix',     title: 'Smoothstep + mix' },
      { id: 'hash-noise',         title: 'Hash + noise' },
      { id: 'fbm-ridged',         title: 'fBm + ridged + turbulence' },
    ],
  },
  {
    label: 'SDFs',
    color: SHADE.catDistort,
    articles: [
      { id: 'sdf-intro',          title: "What's an SDF?" },
      { id: 'sdf-2d',             title: '2D SDF primitives' },
      { id: 'sdf-3d',             title: '3D SDF primitives' },
      { id: 'sdf-combinators',    title: 'SDF combinators' },
      { id: 'domain-operators',   title: 'Domain operators' },
      { id: 'raymarching',        title: 'Raymarching' },
    ],
  },
  {
    label: 'Lighting',
    color: SHADE.catColor,
    articles: [
      { id: 'surface-normals',    title: 'Surface normals' },
      { id: 'lambert',            title: 'Lambert (diffuse)' },
      { id: 'phong-specular',     title: 'Phong / Blinn-Phong specular' },
      { id: 'fresnel',            title: 'Fresnel' },
      { id: 'ao',                 title: 'Ambient occlusion' },
      { id: 'soft-shadows',       title: 'Soft shadows' },
    ],
  },
  {
    label: 'Color',
    color: SHADE.catEffect,
    articles: [
      { id: 'linear-srgb',        title: 'Linear vs sRGB' },
      { id: 'tonemapping',        title: 'Tonemapping' },
      { id: 'palettes',           title: 'Palettes' },
      { id: 'hsv',                title: 'HSV' },
    ],
  },
  {
    label: 'Fractals',
    color: SHADE.ember,
    articles: [
      { id: 'mandelbrot-julia',   title: 'Mandelbrot / Julia escape-time' },
      { id: 'burning-ship',       title: 'Burning Ship' },
      { id: 'newton',             title: 'Newton fractals' },
      { id: 'ifs',                title: 'IFS (iterated function systems)' },
      { id: 'mandelbulb',         title: 'Mandelbulb' },
    ],
  },
  {
    label: 'Recipes',
    color: SHADE.goldDeep,
    articles: [
      { id: 'three-card-starter', title: 'The 3-card starter' },
      { id: 'reaction-diffusion', title: 'Reaction-diffusion' },
      { id: 'plasma',             title: 'Plasma demoscene effect' },
      { id: 'voronoi',            title: 'Voronoi tessellation' },
      { id: 'domain-warping',     title: 'Domain warping' },
    ],
  },
];

const ARTICLE_COUNT = GROUPS.reduce((acc, g) => acc + g.articles.length, 0);

// ─── code samples (kept at top-level so the article bodies stay terse) ──

const CODE_CPU_VS_GPU = `// CPU equivalent of a fragment shader — one big loop.
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    pixels[x][y] = shade(x / width, y / height);
  }
}

// On the GPU: the loop disappears. Every pixel runs shade()
// in parallel, on its own tiny thread, simultaneously.`;

const CODE_HELLO_FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 col = vec3(uv, 0.5 + 0.5 * sin(u_time));
  fragColor = vec4(col, 1.0);
}`;

const CODE_UV_BASICS = `// Normalised UV: pixel index ÷ canvas size → 0..1.
vec2 uv = gl_FragCoord.xy / u_resolution.xy;

// Flip Y so (0,0) is bottom-left (OpenGL convention).
uv.y = 1.0 - uv.y;

// Centred -1..1, aspect corrected so circles stay round.
vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;`;

const CODE_TRIG = `// sin / cos are your oscillators. Add a phase to offset them.
float wave = sin(u_time + uv.x * 6.28);   // moving stripes
float ring = cos(length(uv) * 30.0);      // concentric rings

// Combine for organic motion:
float field = sin(uv.x * 4.0 + u_time)
            * cos(uv.y * 5.0 - u_time * 0.5);`;

const CODE_DOT = `vec3 N = normalize(normal);
vec3 L = normalize(lightDir);
float lambert = max(dot(N, L), 0.0);  // 1 = aligned, 0 = perpendicular

// dot also projects: "how much of A points along B"
float forwardSpeed = dot(velocity, forwardDir);`;

const CODE_SMOOTHSTEP = `// Cubic Hermite ramp: smoothstep(edge0, edge1, x).
float t = smoothstep(0.4, 0.6, length(uv));

// Soft circle: 1 inside, 0 outside, ~0.5 on the rim.
float mask = 1.0 - smoothstep(0.49, 0.51, length(uv));

// mix(a, b, t): linear blend. The pair that does 90% of all visuals.
vec3 col = mix(skyBlue, sunsetOrange, smoothstep(0.0, 1.0, uv.y));`;

const CODE_HASH = `// 1D hash — turns any float into a pseudo-random float.
float hash(float n) { return fract(sin(n) * 43758.5453); }

// 2D hash → float.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Value noise: bilinear blend between 4 hash samples on a grid.
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i),               b = hash(i + vec2(1, 0));
  float c = hash(i + vec2(0, 1)),  d = hash(i + vec2(1, 1));
  vec2 u = f * f * (3.0 - 2.0 * f);     // smoothstep
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}`;

const CODE_FBM = `float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p *= 2.0;        // double the frequency
    amp *= 0.5;      // halve the amplitude
  }
  return v;
}

// Ridged: take 1.0 - |noise|, then square it — sharp valleys.
// Turbulence: sum of abs(noise) — chaotic, no smooth gradients.`;

const CODE_SDF_CIRCLE = `float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float sdTriangle(vec2 p, float r) {
  const float k = sqrt(3.0);
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}
float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(-0.866, 0.5, 0.577);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}`;

const CODE_SDF_3D = `float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}
float sdTorus(vec3 p, vec2 t) {            // t = (major, minor)
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}`;

const CODE_SDF_BOOL = `// Hard combinators — produce sharp seams at the join.
float opUnion(float a, float b)        { return min(a, b); }
float opIntersection(float a, float b) { return max(a, b); }
float opSubtract(float a, float b)     { return max(a, -b); }

// iq's smooth-min — k controls the blend radius.
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}`;

const CODE_DOMAIN_OPS = `// Mirror around an axis.
p.x = abs(p.x);

// Repeat every L units, centred.
vec2 q = mod(p + 0.5 * L, L) - 0.5 * L;

// Polar repeat — n copies around the origin.
float a = atan(p.y, p.x);
float r = length(p);
float seg = 6.2831 / float(n);
a = mod(a + 0.5 * seg, seg) - 0.5 * seg;
p = vec2(cos(a), sin(a)) * r;

// Twist around the Y axis.
float c = cos(p.y * twist), s = sin(p.y * twist);
p.xz = mat2(c, -s, s, c) * p.xz;`;

const CODE_RAYMARCH = `vec2 raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);            // your scene SDF
    if (d < 0.001) return vec2(t, float(i));
    if (t > 100.0) break;
    t += d * 0.9;                // step CAREFULLY (under-relax)
  }
  return vec2(-1.0, 0.0);
}`;

const CODE_NORMAL = `// Central-difference: cheap, robust.
vec3 calcNormal(vec3 p) {
  const float e = 0.001;
  vec2 h = vec2(e, 0.0);
  return normalize(vec3(
    map(p + h.xyy) - map(p - h.xyy),
    map(p + h.yxy) - map(p - h.yxy),
    map(p + h.yyx) - map(p - h.yyx)));
}`;

const CODE_LAMBERT = `vec3 N = calcNormal(hit);
vec3 L = normalize(lightPos - hit);
float diff = max(dot(N, L), 0.0);
vec3 col = albedo * diff;`;

const CODE_PHONG = `vec3 V = normalize(cam - hit);
vec3 H = normalize(L + V);           // half-vector (Blinn)
float spec = pow(max(dot(N, H), 0.0), shininess);
col += vec3(1.0) * spec;             // white highlight`;

const CODE_FRESNEL = `// Schlick approximation — used universally.
float schlick(float cosTheta, float F0) {
  float m = 1.0 - cosTheta;
  return F0 + (1.0 - F0) * m * m * m * m * m;
}
float f = schlick(max(dot(N, V), 0.0), 0.04);
col = mix(diffuse, reflection, f);`;

const CODE_AO = `// 5-tap occlusion — march short distances along the normal.
float ao(vec3 p, vec3 n) {
  float occ = 0.0, w = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = 0.05 * float(i);
    float d = map(p + n * h);
    occ += (h - d) * w;
    w *= 0.85;
  }
  return clamp(1.0 - 1.5 * occ, 0.0, 1.0);
}`;

const CODE_SOFT_SHADOW = `// iq's penumbra shadow — k controls hardness (8..64 typical).
float softShadow(vec3 ro, vec3 rd, float k) {
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 64; i++) {
    float h = map(ro + rd * t);
    if (h < 0.001) return 0.0;
    res = min(res, k * h / t);
    t += h;
    if (t > 20.0) break;
  }
  return res;
}`;

const CODE_GAMMA = `vec3 linearToSrgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }
vec3 srgbToLinear(vec3 c) { return pow(c, vec3(2.2)); }
// Always do maths in LINEAR space, then convert at the END.`;

const CODE_TONEMAP = `vec3 reinhard(vec3 c) { return c / (1.0 + c); }

vec3 aces(vec3 c) {
  const float a = 2.51, b = 0.03, d = 0.59, dd = 0.14;
  return clamp((c * (a * c + b)) / (c * (a * c + d) + dd), 0.0, 1.0);
}

vec3 filmic(vec3 c) {
  vec3 x = max(vec3(0.0), c - 0.004);
  return (x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06);
}`;

const CODE_COSINE_PAL = `vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}
// a — base offset (centre value of each channel)
// b — amplitude of the cosine ride
// c — frequency per channel (often (1,1,1))
// d — phase shift — change THIS to retune the hue rotation`;

const CODE_HSV = `vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)),
              d / (q.x + 1e-10), q.x);
}`;

const CODE_MANDELBROT = `vec2 c = (uv - 0.5) * 3.5 - vec2(0.5, 0.0);
vec2 z = vec2(0.0);
int i = 0;
for (; i < MAX; i++) {
  z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
  if (dot(z, z) > 4.0) break;
}
float t = float(i) / float(MAX);`;

const CODE_BURNING_SHIP = `// Same iteration as Mandelbrot but absolute the components first.
for (int i = 0; i < MAX; i++) {
  z = vec2(abs(z.x), abs(z.y));
  z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
  if (dot(z, z) > 4.0) break;
}`;

const CODE_NEWTON = `// Newton's method on f(z) = z^3 - 1.
// Coloured by WHICH root the iterate falls into.
for (int i = 0; i < 40; i++) {
  vec2 z2 = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y);
  vec2 z3 = vec2(z2.x*z.x - z2.y*z.y, z2.x*z.y + z2.y*z.x);
  vec2 f  = z3 - vec2(1.0, 0.0);     // z^3 - 1
  vec2 fp = 3.0 * z2;                // 3 z^2
  // z = z - f / fp  (complex division)
  float denom = dot(fp, fp);
  z -= vec2(f.x*fp.x + f.y*fp.y, f.y*fp.x - f.x*fp.y) / denom;
  if (dot(f, f) < 1e-6) break;
}`;

const CODE_IFS = `// Sierpinski triangle via the chaos game.
vec2 p = vec2(0.0);
for (int i = 0; i < 80; i++) {
  float r = hash(float(i) + u_time);
  vec2 v = vertices[int(r * 3.0)];
  p = 0.5 * (p + v);                 // jump halfway to a random corner
}`;

const CODE_MANDELBULB = `// 3D extension — use spherical coords, raise the radius to a power.
vec3 z = pos;
float dr = 1.0, r = 0.0;
for (int i = 0; i < 8; i++) {
  r = length(z);
  if (r > 2.0) break;
  float theta = acos(z.z / r) * POWER;
  float phi   = atan(z.y, z.x) * POWER;
  float zr = pow(r, POWER);
  dr = pow(r, POWER - 1.0) * POWER * dr + 1.0;
  z = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta)) + pos;
}
float d = 0.5 * log(r) * r / dr;     // distance estimator`;

const CODE_3_CARD_STARTER = `// 1. radial — bright at centre, dark at edges.
float d  = length(uv * 2.0 - 1.0);
float bg = 1.0 - smoothstep(0.6, 0.95, d);

// 2. palette — colour the radial.
vec3 col = palette(bg, vec3(0.5), vec3(0.5), vec3(1.0),
                       vec3(0.0, 0.33, 0.67));

// 3. vignette — darken the corners further.
col *= smoothstep(1.4, 0.6, d);`;

const CODE_RD = `// Gray-Scott in two textures — ping-pong.
vec2 lap = texelFetch(u_prev, ivec2(gl_FragCoord.xy) + ivec2(1, 0), 0).rg
         + texelFetch(u_prev, ivec2(gl_FragCoord.xy) - ivec2(1, 0), 0).rg
         + texelFetch(u_prev, ivec2(gl_FragCoord.xy) + ivec2(0, 1), 0).rg
         + texelFetch(u_prev, ivec2(gl_FragCoord.xy) - ivec2(0, 1), 0).rg
         - 4.0 * vec2(u, v);
float du = Du * lap.x - u*v*v + F * (1.0 - u);
float dv = Dv * lap.y + u*v*v - (F + K) * v;
fragColor = vec4(u + du, v + dv, 0.0, 1.0);`;

const CODE_PLASMA = `float p = sin(uv.x * 10.0 + u_time)
        + sin(uv.y * 10.0 + u_time)
        + sin((uv.x + uv.y) * 10.0 + u_time)
        + sin(length(uv * 10.0) + u_time);
vec3 col = 0.5 + 0.5 * cos(p + vec3(0.0, 2.0, 4.0));`;

const CODE_VORONOI = `// Standard 3x3 cell search — returns (F1, F2).
vec2 voronoi(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float F1 = 8.0, F2 = 8.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y);
    vec2 o = hash2(i + g);
    float d = length(g + o - f);
    if (d < F1) { F2 = F1; F1 = d; }
    else if (d < F2) F2 = d;
  }
  return vec2(F1, F2);
}`;

const CODE_DOMAIN_WARP = `// iq's classic. Sample noise at noise-warped coordinates.
vec2 q = vec2(fbm(p),             fbm(p + vec2(5.2, 1.3)));
vec2 r = vec2(fbm(p + 4.0*q + vec2(1.7,9.2)),
              fbm(p + 4.0*q + vec2(8.3,2.8)));
float v = fbm(p + 4.0 * r);`;

// ─── hero ──────────────────────────────────────────────────────────────

const Hero = ({
  query, setQuery, articleCount, groupCount,
}: {
  query: string;
  setQuery: (v: string) => void;
  articleCount: number;
  groupCount: number;
}) => {
  const headStyle: CSSProperties = {
    width: '100%',
    background: `linear-gradient(180deg, ${SHADE.surface2} 0%, ${SHADE.bg} 100%)`,
    borderBottom: `1.5px solid ${SHADE.inkLine}`,
    padding: 'clamp(36px, 7vw, 56px) clamp(16px, 4vw, 28px) clamp(28px, 6vw, 44px)',
    position: 'relative',
    overflow: 'hidden',
  };
  const stripe: CSSProperties = {
    position: 'absolute', top: 0, right: 0, width: 320, height: '100%',
    background: `repeating-linear-gradient(
      135deg, transparent 0, transparent 14px,
      ${SHADE.surface3} 14px, ${SHADE.surface3} 16px)`,
    opacity: 0.55, pointerEvents: 'none',
    maskImage: 'linear-gradient(270deg, #000 0%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(270deg, #000 0%, transparent 100%)',
  };
  const inner: CSSProperties = {
    position: 'relative',
    maxWidth: 1200,
    margin: '0 auto',
  };
  return (
    <header style={headStyle}>
      <div aria-hidden style={stripe} />
      <div style={inner}>
        <span style={{
          fontFamily: TYPE.bodyMono,
          fontSize: 10.5,
          fontWeight: 600,
          color: SHADE.ember,
          letterSpacing: TYPE.trackEyebrow,
          textTransform: 'uppercase',
        }}>the library</span>
        <h1 style={{
          margin: '10px 0 12px',
          fontFamily: TYPE.display,
          fontSize: 'clamp(34px, 5vw, 60px)',
          fontWeight: 700,
          letterSpacing: TYPE.trackTighter,
          color: SHADE.text,
          lineHeight: 1.02,
          maxWidth: 880,
        }}>
          The Library &mdash; everything I wish<br />someone had told me about shaders.
        </h1>
        <p style={{
          margin: '0 0 22px',
          maxWidth: 640,
          fontFamily: TYPE.body,
          fontSize: 16.5,
          color: SHADE.textDim,
          lineHeight: 1.55,
        }}>
          {articleCount} short articles across {groupCount} sections. Starts at
          &ldquo;what IS a shader?&rdquo;, ends at Mandelbulb distance
          estimators. Read it straight through, or use the search on the left
          to find the one trick you came for.
        </p>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          maxWidth: 460,
          padding: '10px 14px',
          background: SHADE.surface1,
          border: `1.5px solid ${SHADE.inkLine}`,
          borderRadius: 10,
          boxShadow: `0 3px 0 ${SHADE.inkLine}`,
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6.5" stroke={SHADE.textDim} strokeWidth="2" />
            <line x1="16" y1="16" x2="20.5" y2="20.5"
              stroke={SHADE.textDim} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search the library…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: TYPE.body, fontSize: 15, color: SHADE.text,
              letterSpacing: '-0.005em',
            }}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')}
              aria-label="clear search"
              style={{
                border: 'none', background: SHADE.surface3,
                width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
                fontFamily: TYPE.bodyMono, fontSize: 12, color: SHADE.text,
              }}>×</button>
          )}
        </label>
      </div>
    </header>
  );
};

// ─── page ──────────────────────────────────────────────────────────────

export const Library = () => {
  useLibraryChrome();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  // Articles whose title doesn't include the query get `display: none`
  // applied. We build a set of visible IDs once per query change.
  const visibleIds = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    GROUPS.forEach((g) => g.articles.forEach((a) => {
      if (q === '' || a.title.toLowerCase().includes(q)) s.add(a.id);
    }));
    return s;
  }, [q]);

  const tocGroups: TocGroup[] = GROUPS.map((g) => ({
    label: g.label,
    color: g.color,
    entries: g.articles,
  }));

  // Helper — wrap each Article in a hideable container based on visibleIds.
  const wrapArt = (id: string, node: React.ReactNode) => (
    <div key={id} className={visibleIds.has(id) ? undefined : 'lib-article-hidden'}>
      {node}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', background: SHADE.bg, color: SHADE.text,
      fontFamily: TYPE.body,
    }}>
      <Hero
        query={query} setQuery={setQuery}
        articleCount={ARTICLE_COUNT}
        groupCount={GROUPS.length}
      />

      <BodyLayout tocGroups={tocGroups} q={q}>
        <main style={{ flex: 1, minWidth: 0, maxWidth: 900 }}>
          {/* ============================================================
              GROUP 1 — Fundamentals
              ============================================================ */}
          {wrapArt('what-is-a-shader', (
            <Article id="what-is-a-shader" group="Fundamentals" title="What IS a shader?">
              <P>
                A shader is a tiny program that runs <Strong>once per pixel</Strong>,
                on the GPU, in parallel. Input: a position. Output: a colour.
                No DOM, no event loop, no allocation. Maths in, colour out.
              </P>
              <P>
                The mental flip everyone has to do: you&apos;re not writing a
                loop over pixels. You&apos;re writing the body of the loop.
                The GPU runs that body for every pixel at once, on hundreds
                of cores, in the time a CPU would take to colour a handful.
                Once that clicks, the rest of shader programming is just
                vocabulary.
              </P>
              <CodeSnippet lang="ts" source={CODE_CPU_VS_GPU} />
              <P>
                Below is a complete &ldquo;hello, gradient&rdquo; in real GLSL
                &mdash; the same string the browser hands to the GPU.
                It paints rgb from the pixel&apos;s position, and the blue
                channel breathes with time.
              </P>
              <CodeSnippet lang="glsl" source={CODE_HELLO_FRAG} />
            </Article>
          ))}

          {wrapArt('fragment-pipeline', (
            <Article id="fragment-pipeline" group="Fundamentals" title="The fragment shader pipeline">
              <P>
                Before your fragment shader runs, two things happen. First
                the <Strong>vertex shader</Strong> places triangles on the
                screen. Then the rasterizer figures out which pixels each
                triangle covers and creates a fragment for each one. Only
                THEN does your fragment shader get called — once per
                covered pixel.
              </P>
              <Diagram kind="pipeline" caption="vertex → rasterize → fragment" />
              <P>
                For full-screen effects (the entire Shaddy library), the
                vertex stage is trivial: a single full-screen quad of two
                triangles. All the interesting maths lives in the fragment
                shader. That's why we talk about "shaders" as if there's
                only one — for screen-space art, there effectively is.
              </P>
            </Article>
          ))}

          {wrapArt('why-gpus-fast', (
            <Article id="why-gpus-fast" group="Fundamentals" title="Why GPUs are fast">
              <P>
                A CPU has a handful of very smart cores &mdash; 4 to 16 on a
                typical laptop &mdash; that each handle completely different
                work. A GPU has <Strong>hundreds to thousands</Strong> of
                much simpler cores, all running the SAME program on different
                data. The acronym is SIMT: Single Instruction, Multiple
                Thread.
              </P>
              <Diagram kind="gpuGrid" />
              <P>
                Shaders are a perfect fit. A 1920&times;1080 canvas is 2
                million pixels. The GPU dispatches them in groups (warps or
                wavefronts, ~32 threads each) and burns through the frame
                in milliseconds. The same maths in a CPU loop takes seconds —
                two or three orders of magnitude is normal.
              </P>
              <P>
                The trade-off: <Strong>branches are expensive</Strong>.
                When threads in a warp disagree about an <Inline>if</Inline>,
                the GPU runs both sides and masks the loser. Keep branches
                uniform across threads where you can; reach for{' '}
                <Inline>mix</Inline>, <Inline>step</Inline>, and{' '}
                <Inline>smoothstep</Inline> before <Inline>if</Inline>.
              </P>
            </Article>
          ))}

          {wrapArt('glsl-vs-the-others', (
            <Article id="glsl-vs-the-others" group="Fundamentals" title="GLSL vs HLSL vs WGSL vs Metal">
              <P>
                Same idea, different syntax. Pick based on the platform:
              </P>
              <Table
                head={['lang', 'platform', 'looks like', 'main type']}
                rows={[
                  ['GLSL',  'WebGL, OpenGL', 'C',          'vec2/3/4'],
                  ['HLSL',  'DirectX, Unity', 'C with attributes', 'float2/3/4'],
                  ['WGSL',  'WebGPU',         'Rust-ish',    'vec2<f32>'],
                  ['Metal Shading Language', 'Apple', 'C++14 subset', 'float2/3/4'],
                ]}
              />
              <P>
                Shaddy is a web tool, so everything you write here is GLSL
                ES 3.0 (the WebGL 2 dialect). The maths translates
                line-for-line to the others. Only the type names and a
                handful of qualifiers change. Our exporter does this mapping
                for Unity and Godot 4; for the rest, it&apos;s a search and
                replace away.
              </P>
            </Article>
          ))}

          {/* ============================================================
              GROUP 2 — Math you need
              ============================================================ */}
          {wrapArt('uv-coordinates', (
            <Article id="uv-coordinates" group="Math you need" groupColor={SHADE.catShape} title="UV coordinates">
              <P>
                UVs are how you ask "where am I on the screen?". The
                canonical form is <Inline>vec2 uv = gl_FragCoord.xy / u_resolution</Inline> —
                a pair in <Strong>[0, 1]</Strong> where (0,0) is the
                bottom-left of the canvas and (1,1) is the top-right.
              </P>
              <Diagram kind="uvGrid" caption="normalised UV — 0..1" />
              <P>
                For symmetric effects you almost always want centred
                coordinates instead: subtract 0.5, then aspect-correct
                by dividing only by the height. That gives you a{' '}
                <Strong>square</Strong> coordinate system regardless of
                the canvas shape, with the origin at the centre.
              </P>
              <Diagram kind="uvCentred" caption="centred + aspect-corrected" />
              <CodeSnippet lang="glsl" source={CODE_UV_BASICS} />
            </Article>
          ))}

          {wrapArt('trig-in-shaders', (
            <Article id="trig-in-shaders" group="Math you need" groupColor={SHADE.catShape} title="Trig in shaders">
              <P>
                <Inline>sin</Inline> and <Inline>cos</Inline> are the engine
                of nearly every animated visual you&apos;ll see in this
                library. Cheap on the GPU (one instruction on most hardware),
                they oscillate between -1 and +1 which is exactly what you
                want for blending, and they tile seamlessly at integer
                frequencies.
              </P>
              <Diagram kind="trigWave" />
              <P>
                <Strong>Phase</Strong> offsets the wave.{' '}
                <Strong>Frequency</Strong> controls how often it repeats.{' '}
                <Strong>Amplitude</Strong> controls the height. Stack two
                waves at different frequencies and you get something organic.
                Add a <Inline>u_time</Inline> term and it moves. That&apos;s
                pretty much the recipe behind half the templates on the
                landing page.
              </P>
              <CodeSnippet lang="glsl" source={CODE_TRIG} />
            </Article>
          ))}

          {wrapArt('vectors-dot', (
            <Article id="vectors-dot" group="Math you need" groupColor={SHADE.catShape} title="Vectors + dot product">
              <P>
                The dot product is the workhorse of shader maths. Two
                interpretations: <Inline>dot(A, B)</Inline> equals{' '}
                <Inline>|A| · |B| · cos(θ)</Inline>, AND it equals "how
                much of A points in the direction of B" (the projection
                of A onto B).
              </P>
              <Diagram kind="dotProduct" />
              <P>
                For normalised vectors (length 1), the dot product
                collapses to just <Inline>cos(θ)</Inline> — between -1
                and 1. That's why <Inline>dot(N, L)</Inline> is the basic
                lighting term, and why <Inline>1.0 - dot(N, V)</Inline>{' '}
                gives you the Fresnel grazing angle factor.
              </P>
              <CodeSnippet lang="glsl" source={CODE_DOT} />
            </Article>
          ))}

          {wrapArt('smoothstep-mix', (
            <Article id="smoothstep-mix" group="Math you need" groupColor={SHADE.catShape} title="Smoothstep + mix">
              <P>
                If you only learn two built-ins, learn these two.
                {' '}<Inline>mix(a, b, t)</Inline> is a linear blend:{' '}
                <Inline>a</Inline> at t=0, <Inline>b</Inline> at t=1,
                halfway between at t=0.5. That&apos;s every gradient you
                will ever paint.
              </P>
              <P>
                <Inline>smoothstep(e0, e1, x)</Inline> is the soft step
                function. Zero below e0, one above e1, a cubic Hermite
                ramp between. This is where the &ldquo;organic&rdquo; feel
                of good shaders comes from. Try replacing one{' '}
                <Inline>smoothstep</Inline> with <Inline>step</Inline> on
                any recipe in the Gallery and watch it turn back into a
                Windows 95 dialog box.
              </P>
              <Diagram kind="smoothstepCurve" caption="step (dashed) vs smoothstep (solid)" />
              <CodeSnippet lang="glsl" source={CODE_SMOOTHSTEP} />
            </Article>
          ))}

          {wrapArt('hash-noise', (
            <Article id="hash-noise" group="Math you need" groupColor={SHADE.catShape} title="Hash + noise">
              <P>
                Shaders are deterministic, so there&apos;s no built-in
                random. The workaround: <Strong>hash</Strong> the input
                position with something that&apos;s mathematically silly
                but spreads values evenly &mdash;{' '}
                <Inline>fract(sin(dot(p, magic)) * huge)</Inline> is the
                classic. Cheap, ugly, works.
              </P>
              <P>
                Raw hash is too jagged for most uses; neighbouring pixels
                get wildly different values. To smooth it, you sample on a
                grid and blend.{' '}
                <Strong>Value noise</Strong> bilerps between four corner
                hashes. <Strong>Gradient noise</Strong> (Perlin) stores
                random gradients per corner instead of scalars and gives
                smoother derivatives. <Strong>Simplex noise</Strong> moves
                the grid to triangles, which kills the axis bias and runs
                faster in 3D and up. For 2D work, value noise is usually
                fine.
              </P>
              <Diagram kind="noiseStack" caption="value · gradient · simplex" />
              <CodeSnippet lang="glsl" source={CODE_HASH} />
            </Article>
          ))}

          {wrapArt('fbm-ridged', (
            <Article id="fbm-ridged" group="Math you need" groupColor={SHADE.catShape} title="fBm + ridged + turbulence">
              <P>
                One layer of noise is too smooth to look like anything in
                nature. The trick is to <Strong>stack octaves</Strong>:
                sum copies of the noise at doubling frequency and halving
                amplitude. That&apos;s fractal Brownian motion &mdash; fBm
                &mdash; and it&apos;s what makes clouds, terrain, and
                marble look real. You can spot fBm in half the gallery
                recipes once you know what you&apos;re looking at.
              </P>
              <Diagram kind="fbmOctaves" caption="4 octaves stacking at 2× freq, 0.5× amp" />
              <P>
                Variants:{' '}
                <Strong>Ridged</Strong> uses{' '}
                <Inline>(1 - abs(noise))²</Inline> per octave — sharp
                valleys, great for mountain ridges.{' '}
                <Strong>Turbulence</Strong> sums{' '}
                <Inline>abs(noise)</Inline> — chaotic and cloudy. All
                three share the same loop structure.
              </P>
              <CodeSnippet lang="glsl" source={CODE_FBM} />
            </Article>
          ))}

          {/* ============================================================
              GROUP 3 — SDFs
              ============================================================ */}
          {wrapArt('sdf-intro', (
            <Article id="sdf-intro" group="SDFs" groupColor={SHADE.catDistort} title="What's an SDF?">
              <P>
                A <Strong>signed distance field</Strong> is a function that
                takes a point and returns the distance to the nearest
                surface. Positive outside the shape, zero on it, negative
                inside. That sign is what lets you do solid geometry with
                pure arithmetic &mdash; no triangles, no meshes, no
                vertices.
              </P>
              <Diagram kind="sdfRings" caption="iso-lines at d = -30, -20, -10, 0, +10, +20, +30" />
              <P>
                Because the function tells you HOW FAR you are from the
                surface, you also get <Strong>ray marching</Strong> for
                free: step exactly that distance along a ray, knowing you
                can&apos;t overshoot. And you get anti-aliased rendering by
                running <Inline>smoothstep</Inline> against the distance.
                The same field, three ways to use it.
              </P>
            </Article>
          ))}

          {wrapArt('sdf-2d', (
            <Article id="sdf-2d" group="SDFs" groupColor={SHADE.catDistort} title="2D SDF primitives">
              <P>
                The 2D zoo. Circles and boxes are trivial; triangles and
                hexagons take a few extra lines because they need
                rotational symmetry. iq&apos;s website is where every
                graphics programmer eventually ends up &mdash; these
                formulas are copied near-verbatim from there because
                nobody has improved on them.
              </P>
              <Diagram kind="sdfPrimitives2D" />
              <CodeSnippet lang="glsl" source={CODE_SDF_CIRCLE}
                caption="iq's standard 2D SDF primitives" />
            </Article>
          ))}

          {wrapArt('sdf-3d', (
            <Article id="sdf-3d" group="SDFs" groupColor={SHADE.catDistort} title="3D SDF primitives">
              <P>
                In 3D the same primitives extend naturally. A sphere is
                still <Inline>length(p) - r</Inline>. A box uses the
                3-component max. A torus is two distances composed: the
                offset from the major radius first, then from the minor.
              </P>
              <Diagram kind="sdfPrimitives3D" />
              <CodeSnippet lang="glsl" source={CODE_SDF_3D} />
            </Article>
          ))}

          {wrapArt('sdf-combinators', (
            <Article id="sdf-combinators" group="SDFs" groupColor={SHADE.catDistort} title="SDF combinators">
              <P>
                Combining shapes is just maths on their distance values.
                Union is <Inline>min</Inline>: the closest surface wins.
                Intersection is <Inline>max</Inline>: stay outside ALL
                shapes. Subtraction is <Inline>max(a, -b)</Inline>: stay
                outside A and inside B's negation.
              </P>
              <Diagram kind="sdfBoolean" caption="union · intersection · subtract" />
              <P>
                The hard versions produce sharp seams. iq's{' '}
                <Strong>smooth-min</Strong> blends two distances over a
                radius <Inline>k</Inline> — perfect for glops, liquid
                metal, and that "two blobs merging" look.
              </P>
              <Diagram kind="sdfSmoothUnion" caption="hard min has a corner — smin curves it" />
              <CodeSnippet lang="glsl" source={CODE_SDF_BOOL} />
            </Article>
          ))}

          {wrapArt('domain-operators', (
            <Article id="domain-operators" group="SDFs" groupColor={SHADE.catDistort} title="Domain operators">
              <P>
                Instead of modifying the SDF, modify the{' '}
                <Strong>input point</Strong>. Take the absolute value to
                mirror; modulo to tile; switch to polar coords to repeat
                radially; rotate columns of the matrix by a height-
                dependent angle to twist.
              </P>
              <Diagram kind="domainRepeat" caption="infinite repeat via mod(p, L) - L/2" />
              <CodeSnippet lang="glsl" source={CODE_DOMAIN_OPS} />
              <P>
                Caveat: domain operators only preserve distance perfectly
                when the operation is <Strong>isometric</Strong> (mirror,
                rotate, translate). Non-uniform scale or arbitrary warps
                produce inexact distances — the field still works for
                rendering but raymarching may overshoot, so step smaller
                (multiply by 0.7–0.9).
              </P>
            </Article>
          ))}

          {wrapArt('raymarching', (
            <Article id="raymarching" group="SDFs" groupColor={SHADE.catDistort} title="Raymarching">
              <P>
                Sphere tracing is the technique that makes SDFs visible.
                For each pixel, shoot a ray from the camera. Step forward
                by exactly the SDF distance. Repeat until you&apos;re close
                enough to count as a hit, or you&apos;ve gone too far and
                missed. The maths feels too good to be true the first
                time you write it.
              </P>
              <Diagram kind="raymarch" caption="each circle shows the safe step size" />
              <P>
                The whole loop is about ten lines. The trick is in the
                tuning: 64–128 max steps for complex scenes, a step
                multiplier under 1.0 ("under-relax") for inexact SDFs,
                and an early-out when the ray exceeds the far plane.
              </P>
              <CodeSnippet lang="glsl" source={CODE_RAYMARCH} />
            </Article>
          ))}

          {/* ============================================================
              GROUP 4 — Lighting + materials
              ============================================================ */}
          {wrapArt('surface-normals', (
            <Article id="surface-normals" group="Lighting" groupColor={SHADE.catColor} title="Surface normals">
              <P>
                A normal is the unit vector pointing perpendicular to the
                surface. For triangles you compute it from the cross
                product. For SDFs you get it for free: the{' '}
                <Strong>gradient</Strong> of the distance field IS the
                outward normal direction.
              </P>
              <P>
                Analytic gradients are exact but tedious. The practical
                trick is the <Strong>central-difference</Strong>: sample
                the SDF at six points around <Inline>p</Inline>, take the
                differences, normalize. Works for any SDF, regardless of
                how it's built up.
              </P>
              <CodeSnippet lang="glsl" source={CODE_NORMAL} />
            </Article>
          ))}

          {wrapArt('lambert', (
            <Article id="lambert" group="Lighting" groupColor={SHADE.catColor} title="Lambert (diffuse)">
              <P>
                The simplest light model in graphics. Brightness equals{' '}
                <Inline>max(dot(N, L), 0)</Inline>. Surface faces the light:
                N&middot;L = 1 (full brightness). Perpendicular to it:
                zero (dark). Pointing away would go negative, so we clamp
                it.
              </P>
              <Diagram kind="lambert" />
              <CodeSnippet lang="glsl" source={CODE_LAMBERT} />
              <P>
                Lambert alone looks flat and chalky &mdash; like a stage
                prop. Add a constant low-level <Strong>ambient</Strong>{' '}
                term so the shadows aren&apos;t pitch black, then layer
                specular and Fresnel on top for shine.
              </P>
            </Article>
          ))}

          {wrapArt('phong-specular', (
            <Article id="phong-specular" group="Lighting" groupColor={SHADE.catColor} title="Phong / Blinn-Phong specular">
              <P>
                Diffuse alone doesn't shine. Specular adds the bright
                highlight you see on metal and wet surfaces. Phong uses
                the reflection vector; <Strong>Blinn-Phong</Strong>{' '}
                replaces it with the half-vector between L and the view —
                cheaper, and arguably better-looking.
              </P>
              <P>
                The <Strong>shininess exponent</Strong> controls how
                tight the highlight is. Low values (8–32) give broad
                wet-looking highlights; high (128–512) give the pinpoint
                glints of polished metal.
              </P>
              <CodeSnippet lang="glsl" source={CODE_PHONG} />
            </Article>
          ))}

          {wrapArt('fresnel', (
            <Article id="fresnel" group="Lighting" groupColor={SHADE.catColor} title="Fresnel">
              <P>
                Surfaces reflect more light at grazing angles than head-on.
                It&apos;s why a lake far away looks like a mirror, but
                looking straight down you can see fish. Fresnel is the term
                that captures this. Once you start noticing it in the real
                world you can&apos;t stop &mdash; car paint, wet roads,
                phone screens, every shiny thing.
              </P>
              <Diagram kind="fresnelCurve" caption="Schlick's approximation — F0=0.04 (water/glass)" />
              <P>
                Computing real Fresnel involves Snell's law and is
                expensive. <Strong>Schlick's approximation</Strong>{' '}
                replaces it with a fifth-power curve: extremely cheap,
                visually indistinguishable, used universally.
              </P>
              <CodeSnippet lang="glsl" source={CODE_FRESNEL} />
            </Article>
          ))}

          {wrapArt('ao', (
            <Article id="ao" group="Lighting" groupColor={SHADE.catColor} title="Ambient occlusion">
              <P>
                AO is the darkening you see in crevices — corners get
                less ambient light because the surrounding geometry
                blocks the sky. For SDFs there's a cheap approximation:
                march a few short rays along the normal and compare the
                expected distance to the actual SDF reading. If the SDF
                is closer than expected, something is blocking.
              </P>
              <Diagram kind="aoSamples" caption="5 short rays — each weighted less than the last" />
              <CodeSnippet lang="glsl" source={CODE_AO} />
            </Article>
          ))}

          {wrapArt('soft-shadows', (
            <Article id="soft-shadows" group="Lighting" groupColor={SHADE.catColor} title="Soft shadows">
              <P>
                A standard shadow ray either hits or misses — boolean.
                Real shadows have soft edges. iq's penumbra trick: along
                the shadow ray, track the smallest{' '}
                <Inline>distance ÷ travelled</Inline> ratio so far. That
                ratio approximates how close the ray came to the
                occluder, giving a smooth falloff at the silhouette.
              </P>
              <CodeSnippet lang="glsl" source={CODE_SOFT_SHADOW}
                caption="penumbra approximation — k tunes hardness" />
            </Article>
          ))}

          {/* ============================================================
              GROUP 5 — Color + tonemapping
              ============================================================ */}
          {wrapArt('linear-srgb', (
            <Article id="linear-srgb" group="Color" groupColor={SHADE.catEffect} title="Linear vs sRGB">
              <P>
                Human eyes don&apos;t see brightness linearly. We&apos;re
                much more sensitive to changes in dark tones. Monitors and
                PNG files encode colours in <Strong>sRGB</Strong>, which
                applies a ~x^(1/2.2) gamma curve to match.
              </P>
              <Diagram kind="gammaCurve" caption="sRGB curve vs linear identity" />
              <P>
                Shader maths only behaves correctly on{' '}
                <Strong>linear</Strong> values. Adding two sRGB colours
                produces something that looks wrong to anyone with eyes.
                The standard workflow: convert sRGB inputs to linear at
                the start, do every blend, lighting calc, and tonemap in
                linear, convert back to sRGB at the very end. Skip the
                conversion and your skin tones turn weird grey before you
                notice why.
              </P>
              <CodeSnippet lang="glsl" source={CODE_GAMMA} />
            </Article>
          ))}

          {wrapArt('tonemapping', (
            <Article id="tonemapping" group="Color" groupColor={SHADE.catEffect} title="Tonemapping">
              <P>
                Shaders happily produce HDR values &mdash; colours above
                1.0. Monitors can&apos;t display them, so you have to
                squash the range into 0&ndash;1. <Strong>Reinhard</Strong>{' '}
                (<Inline>c / (1 + c)</Inline>) is the dead-simple option.
                ACES is what film and modern games use; it keeps contrast
                and saturation looking right. Uncharted2 / filmic sits in
                the warm middle and is the one I reach for first when
                nothing else looks quite right.
              </P>
              <Diagram kind="tonemapCurves" caption="how each maps HDR input 0..4 → display 0..1" />
              <CodeSnippet lang="glsl" source={CODE_TONEMAP} />
            </Article>
          ))}

          {wrapArt('palettes', (
            <Article id="palettes" group="Color" groupColor={SHADE.catEffect} title="Palettes">
              <P>
                iq&apos;s cosine palette is the single most useful colour
                trick in shader programming. Four <Inline>vec3</Inline>{' '}
                knobs give you an infinitely-resampleable smooth gradient
                with no lookup tables.
              </P>
              <CodeSnippet lang="glsl" source={CODE_COSINE_PAL} />
              <Diagram kind="cosinePalette" caption="a + b·cos(2π(c·t + d))" />
              <P>
                Tweak <Inline>d</Inline> to rotate the hue. Lower{' '}
                <Inline>b</Inline> to desaturate. Raise <Inline>c</Inline>{' '}
                to repeat the palette inside one gradient. A handful of{' '}
                {`{a, b, c, d}`} sets covers almost every look you might
                want, which is why the same eight numbers appear in
                practically every Shadertoy front page.
              </P>
            </Article>
          ))}

          {wrapArt('hsv', (
            <Article id="hsv" group="Color" groupColor={SHADE.catEffect} title="HSV">
              <P>
                RGB is what the GPU stores, but HSV (Hue, Saturation,
                Value) is how humans think about colour. Useful for hue
                rotations, desaturation, and procedural rainbows.
              </P>
              <Diagram kind="hsvWheel" />
              <CodeSnippet lang="glsl" source={CODE_HSV}
                caption="iq's branchless HSV ↔ RGB" />
              <P>
                The conversions are branchless and fast. Use them
                sparingly — for solid blends, mix in linear RGB instead;
                HSV mixing produces weird mid-tones near the colour wheel
                singularities.
              </P>
            </Article>
          ))}

          {/* ============================================================
              GROUP 6 — Fractals
              ============================================================ */}
          {wrapArt('mandelbrot-julia', (
            <Article id="mandelbrot-julia" group="Fractals" groupColor={SHADE.ember} title="Mandelbrot / Julia escape-time">
              <P>
                Iterate <Inline>z ← z² + c</Inline> in the complex plane.
                For each pixel, set c to the pixel coordinate; count how
                many iterations it takes for <Inline>|z|</Inline> to
                exceed 2 (or never). That count is the colour.
              </P>
              <Diagram kind="mandelbrot" caption="32 max iterations — gold = quick escape" />
              <CodeSnippet lang="glsl" source={CODE_MANDELBROT} />
              <P>
                The <Strong>Julia set</Strong> uses the same iteration
                with a different setup: c is FIXED (a UI parameter), and
                z starts at the pixel coordinate. Each value of c gives a
                wildly different fractal.
              </P>
              <Diagram kind="julia" />
            </Article>
          ))}

          {wrapArt('burning-ship', (
            <Article id="burning-ship" group="Fractals" groupColor={SHADE.ember} title="Burning Ship">
              <P>
                One-line variant of Mandelbrot: take the absolute value
                of both components of <Inline>z</Inline> before each
                iteration. Symmetry across the real axis turns the
                familiar bulb into the silhouette of a burning ship.
              </P>
              <Diagram kind="burningShip" />
              <CodeSnippet lang="glsl" source={CODE_BURNING_SHIP} />
            </Article>
          ))}

          {wrapArt('newton', (
            <Article id="newton" group="Fractals" groupColor={SHADE.ember} title="Newton fractals">
              <P>
                Apply Newton's root-finding method to a complex polynomial.
                Iterate <Inline>z ← z - f(z) / f'(z)</Inline> until it
                converges. Colour each pixel by WHICH root it converges
                to. For <Inline>z³ - 1</Inline> you get three roots and
                three colour regions with intricate boundaries.
              </P>
              <CodeSnippet lang="glsl" source={CODE_NEWTON}
                caption="z ← z - f/f' for f(z) = z³ - 1" />
            </Article>
          ))}

          {wrapArt('ifs', (
            <Article id="ifs" group="Fractals" groupColor={SHADE.ember} title="IFS (iterated function systems)">
              <P>
                Instead of iterating ONE function, pick from a SET of
                contraction maps at each step. For the Sierpinski
                triangle: three corners, "halfway to a random corner"
                applied many times from any starting point — the
                trajectory converges to the fractal attractor.
              </P>
              <Diagram kind="ifsTriangle" caption="Sierpinski triangle via the chaos game" />
              <CodeSnippet lang="glsl" source={CODE_IFS} />
            </Article>
          ))}

          {wrapArt('mandelbulb', (
            <Article id="mandelbulb" group="Fractals" groupColor={SHADE.ember} title="Mandelbulb">
              <P>
                The 3D extension of Mandelbrot. Express{' '}
                <Inline>z</Inline> in spherical coords, raise{' '}
                <Inline>r</Inline> to a power (typically 8), multiply
                theta and phi by the same power, add back the original
                point. The "n=8" version is the canonical look — bulb-y,
                ridge-y, alien.
              </P>
              <CodeSnippet lang="glsl" source={CODE_MANDELBULB}
                caption="distance estimator — dr tracks the derivative" />
              <P>
                Render it by sphere-tracing with the returned distance
                estimate. <Strong>Orbit traps</Strong> — recording the
                minimum value of some quantity (distance to origin,
                distance to a plane…) during iteration — give you the
                colour. Different traps produce wildly different looks
                from the same fractal.
              </P>
            </Article>
          ))}

          {/* ============================================================
              GROUP 7 — Practical recipes
              ============================================================ */}
          {wrapArt('three-card-starter', (
            <Article id="three-card-starter" group="Recipes" groupColor={SHADE.goldDeep} title="The 3-card starter">
              <P>
                The shortest path to a shader that looks finished is three
                ingredients in order: a <Strong>shape</Strong> (a radial
                gradient is fine), a <Strong>palette</Strong> (iq&apos;s
                cosine), and a <Strong>vignette</Strong> (smoothstep on
                the radius). Snap those three together and nobody guesses
                you started this morning.
              </P>
              <CodeSnippet lang="glsl" source={CODE_3_CARD_STARTER} />
              <P>
                Every recipe in the Gallery is a riff on this. The taste
                is in CHOOSING the shape (worley? fbm? polar stripes?),
                TUNING the palette&apos;s d-vector, and dialling the
                vignette so it focuses the eye without making the corners
                look broken. Spend an hour on those three knobs and your
                output jumps a tier.
              </P>
            </Article>
          ))}

          {wrapArt('reaction-diffusion', (
            <Article id="reaction-diffusion" group="Recipes" groupColor={SHADE.goldDeep} title="Reaction-diffusion">
              <P>
                The <Strong>Gray-Scott</Strong> model simulates two
                chemicals that diffuse and react. Tune the parameters
                and the same equations produce zebra stripes, leopard
                spots, coral colonies, or fingerprints. Alan Turing
                wrote the original paper in 1952; the patterns turn up
                everywhere in nature because the maths is just right.
              </P>
              <Diagram kind="reactionDiffusion" caption="Gray-Scott spots (F=0.054, K=0.062)" />
              <P>
                It needs <Strong>state</Strong>, which a stateless
                fragment shader can't have alone. The workaround:{' '}
                <Strong>ping-pong</Strong>. Keep two textures; on each
                frame, read from one and write to the other; swap. Run
                10–50 steps per visible frame to advance the simulation.
              </P>
              <CodeSnippet lang="glsl" source={CODE_RD}
                caption="one Gray-Scott step, ping-pong between textures" />
            </Article>
          ))}

          {wrapArt('plasma', (
            <Article id="plasma" group="Recipes" groupColor={SHADE.goldDeep} title="Plasma demoscene effect">
              <P>
                The 80s and 90s demoscene staple. Sum a handful of sine
                waves at different frequencies and angles, then map the
                result through a cyclic palette. The interference between
                waves produces flowing rainbow patterns that never quite
                repeat &mdash; from four lines of maths. People had a
                whole subculture built on this.
              </P>
              <Diagram kind="plasma" />
              <CodeSnippet lang="glsl" source={CODE_PLASMA} />
            </Article>
          ))}

          {wrapArt('voronoi', (
            <Article id="voronoi" group="Recipes" groupColor={SHADE.goldDeep} title="Voronoi tessellation">
              <P>
                Scatter random points (seeds) on the plane. For each
                pixel, find the closest seed — that defines a{' '}
                <Strong>cell</Strong>. The result tiles space into
                irregular polygons (Voronoi cells).
              </P>
              <Diagram kind="voronoiF1F2" caption="cells defined by nearest-seed regions" />
              <P>
                In a shader you only search the 3×3 grid around the
                pixel's cell (assuming seeds live on a unit grid). Track
                two distances: <Inline>F1</Inline> (nearest) gives you
                cell IDs and the cell-coloured look;{' '}
                <Inline>F2 - F1</Inline> (gap to second-nearest) draws
                the seams between cells.
              </P>
              <CodeSnippet lang="glsl" source={CODE_VORONOI} />
            </Article>
          ))}

          {wrapArt('domain-warping', (
            <Article id="domain-warping" group="Recipes" groupColor={SHADE.goldDeep} title="Domain warping">
              <P>
                Sample fBm at the coordinates of another fBm, and that
                second fBm is itself the warped coordinates of a third.
                Two iterations gets you the famous iq-cloud look: a
                turbulent organic field with crisp ridges in some places
                and smooth puddles in others. The first time you write
                it you&apos;ll wonder how it&apos;s only a few lines.
              </P>
              <Diagram kind="domainWarp" caption="lines warped by a noise field" />
              <CodeSnippet lang="glsl" source={CODE_DOMAIN_WARP}
                caption="iq's iterated domain-warp recipe" />
              <P>
                Tune the strength (the 4.0 multiplier) to control how
                aggressive the warp is. Tiny values barely deform; large
                values produce chaos. The sweet spot is between 2 and 6
                — enough to look organic, not enough to lose structure.
              </P>
            </Article>
          ))}
        </main>
      </BodyLayout>
    </div>
  );
};

// Body layout — desktop renders sticky TOC sidebar + article column side-by-
// side; mobile collapses the TOC into a top-of-page <details> drawer so the
// article isn't squeezed into a one-word-per-line ribbon.
const BodyLayout = ({
  tocGroups, q, children,
}: { tocGroups: TocGroup[]; q: string; children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div style={{
        margin: '0 auto',
        padding: '16px 16px 80px',
        maxWidth: '100%',
      }}>
        <details style={{
          marginBottom: 20,
          background: SHADE.surface1,
          border: `1.5px solid ${SHADE.inkLine}`,
          borderRadius: 10,
          boxShadow: `0 3px 0 ${SHADE.inkLine}`,
        }}>
          <summary style={{
            cursor: 'pointer',
            padding: '14px 16px',
            font: `700 12px ${TYPE.bodyMono}`,
            letterSpacing: TYPE.trackEyebrow,
            textTransform: 'uppercase',
            color: SHADE.text,
            outline: 'none',
            userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span>Contents</span>
            <span style={{ marginLeft: 'auto', color: SHADE.textFaint }}>▾</span>
          </summary>
          <div style={{ padding: '4px 8px 14px' }}>
            <TOC groups={tocGroups} filter={q} />
          </div>
        </details>
        {children}
      </div>
    );
  }
  return (
    <div style={{
      maxWidth: 1240,
      margin: '0 auto',
      padding: '24px 24px 80px',
      display: 'flex',
      gap: 36,
      alignItems: 'flex-start',
    }}>
      <TOC groups={tocGroups} filter={q} />
      {children}
    </div>
  );
};

export default Library;
