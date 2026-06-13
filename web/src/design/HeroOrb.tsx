import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

// Hero backdrop — a raymarched floating orb over a warped plane with a glowing
// radial line and per-frame gaussian film grain. Ported faithfully from the
// supplied Shadertoy shader (WebGL2 / GLSL ES 3.00 — it needs floatBitsToUint
// + iFrame). A light austere grade desaturates the vivid palette toward warm
// brand ochre and lifts the floor so nothing reads pure black.

const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0., 1.); }
`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2  iResolution;
uniform float iTime;
uniform int   iFrame;
out vec4 outColor;

float isphere(vec3 ro, vec3 rd, vec3 pos, float r){
  float t = dot(pos-ro, rd);
  vec3 p = rd * t + ro;
  float y2 = dot(p-pos,p-pos);
  float x2 = r * r - y2;
  return x2 < 0. ? -1. : t-sqrt(x2);
}

float sRGBencode(float C){ return C > 0.0031308 ? (1.055 * pow(C, 1./2.4) - 0.055) : (12.92 * C); }
vec3 sRGBencode(vec3 C){ C = clamp(C, 0., 1.); return vec3(sRGBencode(C.x), sRGBencode(C.y), sRGBencode(C.z)); }

float hash(vec3 uv){
  uint x = floatBitsToUint(uv.x) | 1u;
  uint y = floatBitsToUint(uv.y);
  uint z = floatBitsToUint(uv.z);
  y ^= y >> 13; y ^= y << 17; y ^= y >> 5; y *= 0x2545F491u;
  x ^= y; x ^= x >> 13; x ^= x << 17; x ^= x >> 5; x *= 0x4F6CDD1Du;
  z ^= x; z ^= z >> 13; z ^= z << 17; z ^= z >> 5; z *= 0x1D6C45F4u;
  uint w = (z>>9) | 0x3f000000u;
  return 2. * uintBitsToFloat(w) - 1.;
}

float gaussian_noise(vec2 uv, int frame){
  float U0 = hash(vec3(uv, float(0 + 2*((frame*24)/60))));
  float U1 = hash(vec3(uv, float(1 + 2*((frame*24)/60))));
  const float PI = 3.14159265;
  vec2 bm = sqrt(-2. * log(max(U0, 1e-6))) * cos(2. * PI * U1 + vec2(0, PI/2.));
  return bm.x;
}

void main(){
  vec2 uv = (2. * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
  vec3 color = vec3(0);

  float focal = 2.;
  vec3 ro = vec3(0, 0.025, 2.7);
  vec3 rd = normalize(vec3(uv, -focal));

  float angle = .5;
  float c = cos(angle), s = sin(angle);
  mat2 R = mat2(c, s, -s, c);
  ro.yz *= R;
  rd.yz *= R;

  vec3 orb_pos = vec3(0, sin(iTime*.3)*.04, 0);

  vec3 q = ro;
  vec3 p = ro;
  float t = 0.;
  float r = .67;
  for (float i = 0.; i < 99. && t < 3e3; i++){
    q = p;
    for (float j = 0.01; j < 1.; j += j) q += cos(q.zxy / j + iTime) * j * .05;

    float sphere_sdf = length(q) - 1.;
    float sdf = (p.y + .2 + .1 * sin(cos(5.*p.x + iTime) * cos(4.*p.z + iTime)) - dot(p.xz, p.xz)*.15);
    float plane_sdf = sdf;
    plane_sdf = max(plane_sdf, -(length(p)-1.75));
    sdf = max(sdf, sphere_sdf);
    float sdf2 = min(sdf, length(p-orb_pos)-r);
    sdf2 = min(sdf2, plane_sdf);
    float line_sdf = length(p.xz)-4e-3;
    sdf2 = min(sdf2, line_sdf);

    float dt = abs(sdf2) * .2 + 1e-3;
    float kernel = .02/(sdf * sdf + dt);
    vec3 cmap = exp(cos(i/29. + sdf + vec3(0,1,2) - length(p)*.65));
    color += dt * kernel * cmap;

    float kernel2 = .02/(line_sdf * line_sdf + dt);
    vec3 cmap2 = exp(cos(i*.04 - sdf + vec3(2,1,0) + p.y*6. + iTime));
    color += dt * kernel2 * cmap2;

    t += dt;
    p += dt * rd;
  }

  t = isphere(ro, rd, orb_pos, r+.025);
  if (t > 0.){
    p = rd * t + ro;
    vec3 N = normalize(p);
    vec3 ref = reflect(rd, N);
    float sdf = (p.y + .2 + .1 * sin(cos(5.*p.x + iTime) * cos(4.*p.z + iTime)) - dot(p.xz, p.xz)*.15);
    vec3 cmap = exp(cos(1.*.04 - sdf + vec3(2,1,0) + r*6. + iTime));
    color += max(ref.y*ref.y*ref.y, 0.)*.5 * cmap;
    color += max(N.z, 0.)*max(N.y*N.y*N.y*N.y*N.y, 0.) * cmap;
  }

  // gentle radial falloff — the component is CSS-masked to a disc, so the
  // shader only needs to keep the corners from glowing
  color *= 1. - dot(uv, uv)*.28;
  // exposure — vivid enough to be a focal object, still austere
  color *= 0.72;
  color = 1. - exp(-sqrt(color*color*color));

  // austere grade — pull the vivid palette toward muted warm ochre
  float l = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, vec3(l) * vec3(1.05, 0.98, 0.82), 0.40);

  color = sRGBencode(color);

  vec3 G = vec3(
    gaussian_noise(uv, iFrame+0),
    gaussian_noise(uv, iFrame+1),
    gaussian_noise(uv, iFrame+2)
  );
  G.xy += G.yz;
  G.z += gaussian_noise(uv, iFrame+3);
  G *= .5;
  color += (.05*G + .01)*.2;

  // lift the floor so the backdrop never reads pure black
  color = max(color, vec3(0.04, 0.042, 0.05));

  outColor = vec4(color, 1);
}
`;

export const HeroOrb = ({ style }: { style?: CSSProperties }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) {
      console.warn('HeroOrb: WebGL2 unavailable');
      return;
    }

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn('HeroOrb compile:', gl.getShaderInfoLog(sh));
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
      console.warn('HeroOrb link:', gl.getProgramInfoLog(prog));
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
    const Floc = gl.getUniformLocation(prog, 'iFrame');

    let visible = true;
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) visible = e.isIntersecting; },
      { rootMargin: '120px' },
    );
    io.observe(canvas);

    // The orb raymarch is heavy; cap DPR low so the full-bleed hero holds fps.
    const applySize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.0);
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
    let frame = 0;
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
        gl.uniform1i(Floc, frame++);
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
