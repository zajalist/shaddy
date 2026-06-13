import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

// Hero backdrop — a cosmic nebula ported faithfully from the supplied
// Shadertoy "nebula" shader (galaxy-spine filament, flowing wisps, hot knots,
// layered twinkling stars). Integrated touches from the second supplied shader:
// a soft centered floating orb glow + per-frame film grain.
//
// Palette is dialled toward austere/desaturated (Gaea-quiet): the saturated
// blue+orange is pulled toward warm ochre, and the black floor is lifted so
// "nothing reads too dark". Built on the same StrictMode-safe WebGL scaffold
// as FractalEntity (IntersectionObserver pause + ResizeObserver sizing).

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0., 1.); }
`;

const FRAG = `
precision highp float;
uniform vec2  iResolution;
uniform float iTime;

#define PI 3.14159265359

mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++){
    v += a * noise(p);
    p = rot(0.55) * p * 2.05 + 17.3;
    a *= 0.52;
  }
  return v;
}

float ridge(vec2 p){
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 7; i++){
    float n = noise(p);
    n = abs(n * 2.0 - 1.0);
    n = 1.0 - n;
    v += n * n * a;
    p = rot(0.7) * p * 2.0 + 4.0;
    a *= 0.5;
  }
  return v;
}

float star(vec2 uv, float flare){
  float d = length(uv);
  float m = 0.018 / max(d, 0.001);
  float rays = max(0.0, 1.0 - abs(uv.x * uv.y * 900.0));
  m += rays * flare;
  uv *= rot(PI * 0.25);
  rays = max(0.0, 1.0 - abs(uv.x * uv.y * 900.0));
  m += rays * flare * 0.35;
  m *= 1.0 - smoothstep(0.15, 1.0, d);
  return m;
}

// Austere tint helpers — the supplied shader uses a saturated cool/warm pair;
// we mute both and warm the orange toward ochre.
vec3 COOL = vec3(0.42, 0.56, 0.78);   // was ~(0.25,0.55,1.0)
vec3 WARM = vec3(0.82, 0.60, 0.34);   // austere ochre, was ~(1.0,0.62,0.28)

vec3 starLayer(vec2 uv){
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);
  for (int y = -1; y <= 1; y++){
    for (int x = -1; x <= 1; x++){
      vec2 offs = vec2(float(x), float(y));
      float h = hash21(id + offs);
      if (h > 0.82){
        vec2 pos = offs + vec2(hash21(id + offs + 13.1), hash21(id + offs + 91.7)) - 0.5;
        float size = mix(0.15, 0.75, pow(h, 8.0));
        float twinkle = 0.65 + 0.35 * sin(iTime * 2.0 + h * 60.0);
        vec3 tint = mix(COOL, WARM, hash21(id + offs + 4.7));
        col += tint * star(gv - pos, 0.018 * size) * size * twinkle;
      }
    }
  }
  return col;
}

vec2 flow(vec2 p){
  float t = iTime * 0.04;
  float n1 = fbm(p * 1.2 + vec2(t, -t));
  float n2 = fbm(p * 1.2 + vec2(12.4 - t, 8.7 + t));
  return vec2(n1 - 0.5, n2 - 0.5);
}

// Cheap film grain — a nod to the second shader's gaussian grain, kept simple
// for WebGL1.
float grain(vec2 uv){
  return hash21(uv + fract(iTime) * 13.7) - 0.5;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
  uv *= 1.15;
  float t = iTime * 0.08;

  // base gradient — lifted off pure black (nothing too dark)
  vec3 col = vec3(0.045, 0.050, 0.072);
  col += vec3(0.03, 0.045, 0.07) * (uv.y + 0.6);

  // galaxy-spine filament
  vec2 p = uv;
  p *= rot(-0.62);
  float curve = 0.18 * sin(p.y * 2.0 + t * 1.4) + 0.08 * sin(p.y * 5.0 - t);
  float coreD = abs(p.x + curve);
  float core = exp(-coreD * 5.5) * (1.0 - smoothstep(-0.45, 1.25, abs(p.y)));
  float coreFine = ridge(p * vec2(3.5, 1.4) + flow(p * 1.5) * 1.2);
  vec3 coreCol = mix(COOL, WARM, smoothstep(-0.1, 0.8, p.y + 0.2));
  col += coreCol * core * (0.45 + 1.1 * coreFine);

  // broad glows
  float leftGlow  = exp(-length((uv - vec2(-0.95, 0.45)) * vec2(0.8, 1.2)) * 1.6);
  float rightGlow = exp(-length((uv - vec2(0.95, -0.55)) * vec2(0.9, 1.0)) * 1.8);
  float blueGlow  = exp(-length((uv - vec2(0.35, 0.2))  * vec2(0.9, 1.0)) * 1.5);
  col += WARM * leftGlow * 0.85;
  col += WARM * rightGlow * 0.55;
  col += COOL * blueGlow * 0.55;

  // flowing wisps
  vec3 wisps = vec3(0.0);
  for (int i = 0; i < 5; i++){
    float fi = float(i);
    vec2 q = uv;
    q *= rot(0.45 + fi * 0.7);
    q += flow(q * (1.1 + fi * 0.18) + fi * 9.1) * 0.55;
    float w = ridge(q * vec2(1.2, 4.5) + vec2(t * (0.4 + fi * 0.1), fi));
    w = smoothstep(0.55, 1.15, w);
    float strand = exp(-abs(q.x + 0.22 * sin(q.y * 2.5 + fi + t)) * 7.0);
    vec3 wc = mix(COOL, WARM, step(2.0, fi));
    wisps += wc * w * strand * 0.26;
  }
  col += wisps;

  // hot knots
  vec2 knots[7];
  knots[0] = vec2(-0.85,  0.42);
  knots[1] = vec2(-0.55,  0.18);
  knots[2] = vec2(-0.25, -0.28);
  knots[3] = vec2( 0.10, -0.08);
  knots[4] = vec2( 0.32,  0.32);
  knots[5] = vec2( 0.58, -0.35);
  knots[6] = vec2(-0.15,  0.70);
  for (int i = 0; i < 7; i++){
    vec2 k = knots[i];
    float d = length(uv - k);
    float glow = exp(-d * 12.0);
    float hot  = exp(-d * 75.0);
    vec3 kc = mix(COOL, WARM, hash21(k * 10.0));
    col += kc * glow * 0.5;
    col += vec3(0.95, 0.86, 0.66) * hot * 1.9;
  }

  // centered floating orb glow — integrated from the second shader's orb
  vec2 orbP = uv - vec2(0.0, sin(iTime * 0.3) * 0.04 + 0.04);
  float orb = exp(-length(orbP * vec2(1.0, 1.05)) * 2.4);
  col += mix(WARM, vec3(0.95, 0.88, 0.7), 0.4) * orb * 0.45;

  // star layers
  col += starLayer(uv * 18.0) * 0.42;
  col += starLayer(uv * 34.0 + 12.7) * 0.20;
  col += starLayer(uv * 70.0 - 3.3) * 0.07;

  // dust
  float dust = fbm(uv * 7.0 + flow(uv * 2.0));
  col += COOL * pow(dust, 5.0) * 0.22;

  // gentle vignette — soft so edges aren't crushed (use the defined
  // smoothstep orientation; reversed edges are undefined on ANGLE → NaN)
  float vignette = 1.0 - smoothstep(0.1, 1.7, length(uv * vec2(0.85, 1.0)));
  col *= mix(0.82, 1.0, vignette);

  // austere grade: lightly desaturate toward warm grey, then filmic tone-map.
  // Exposure kept moderate so colour survives (it backs the fractal, so an
  // over-exposed white wash would drown the silhouette) while staying lifted
  // enough that nothing reads pure black.
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(l) * vec3(1.04, 0.99, 0.88), 0.12);
  col = 1.0 - exp(-col * 1.0);
  col = pow(max(col, 0.0), vec3(0.88));

  // lift the floor so nothing reads pure black
  col = max(col, vec3(0.04, 0.043, 0.056));

  // film grain
  col += grain(gl_FragCoord.xy) * 0.025;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const NebulaSide = ({ style }: { style?: CSSProperties }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn('NebulaHero compile:', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('NebulaHero link:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const ploc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(ploc);
    gl.vertexAttribPointer(ploc, 2, gl.FLOAT, false, 0, 0);

    const Rloc = gl.getUniformLocation(prog, 'iResolution');
    const Tloc = gl.getUniformLocation(prog, 'iTime');

    let visible = true;
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) visible = e.isIntersecting; },
      { rootMargin: '120px' },
    );
    io.observe(canvas);

    const applySize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(Rloc, w, h);
      }
    };
    const resizeObs = new ResizeObserver(applySize);
    if (canvas.parentElement) resizeObs.observe(canvas.parentElement);
    applySize();

    let stopped = false;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      if (stopped) return;
      applySize();
      if (visible && canvas.width > 1) {
        // Set iResolution every frame — under StrictMode the effect runs
        // twice on the same canvas, and a size-change-guarded uniform set
        // would skip the second (drawing) program, leaving iResolution at 0.
        gl.uniform2f(Rloc, canvas.width, canvas.height);
        gl.uniform1f(Tloc, (performance.now() - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      resizeObs.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%', ...style }}
    />
  );
};
