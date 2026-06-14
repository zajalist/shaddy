import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { SHADE, TYPE } from './tokens';

// ONE WebGL context for all 12 template tiles. Each tile is a regular CSS
// grid item (transparent bg, just borders + labels); the canvas behind them
// renders all 12 shaders into the corresponding viewport region per frame.
// Replaces the previous per-tile-canvas approach which spun up too many
// WebGL contexts and Chromium killed them all.

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0., 1.); }
`;

export type TemplateVariant =
  | 'terrain' | 'nebula' | 'dna' | 'ocean' | 'lava' | 'molecule'
  | 'galaxy' | 'aurora' | 'fire' | 'crystals' | 'wormhole' | 'raymarch';

const BODY: Record<TemplateVariant, string> = {
  // procedural terrain — fbm heightfield with sun hill-shading + sky
  terrain: `
    vec2 p = uv*1.6 + vec2(T*0.035, 0.0);
    float e = 0.012;
    float h  = fbm(p*1.7);
    float hx = fbm((p + vec2(e, 0.0))*1.7);
    float hy = fbm((p + vec2(0.0, e))*1.7);
    vec3 nor = normalize(vec3(h - hx, e*2.2, h - hy));
    vec3 sun = normalize(vec3(-0.55, 0.6, -0.35));
    float dif = clamp(dot(nor, sun), 0.0, 1.0);
    float sky = clamp(0.5 + 0.5*nor.y, 0.0, 1.0);
    vec3 c = mix(vec3(0.03,0.20,0.46), vec3(0.80,0.71,0.46), smoothstep(0.42,0.47,h));
    c = mix(c, vec3(0.16,0.43,0.18), smoothstep(0.47,0.57,h));
    c = mix(c, vec3(0.40,0.34,0.30), smoothstep(0.64,0.74,h));
    c = mix(c, vec3(0.95,0.96,1.00), smoothstep(0.80,0.88,h));
    col = c * (0.25*sky + 1.05*dif) + vec3(0.04,0.05,0.08)*sky;
  `,
  // interstellar gas cloud + sprinkled stars
  nebula: `
    vec2 p = uv*1.2;
    float n = fbm(p*2.0 + vec2(T*0.04, 0.0));
    n = fbm(p*3.0 + n*1.6 + T*0.02);
    col = mix(vec3(0.05,0.02,0.12), vec3(0.48,0.10,0.58), smoothstep(0.30,0.70,n));
    col = mix(col, vec3(0.13,0.34,0.88), smoothstep(0.52,0.92,n));
    col += vec3(0.95) * pow(max(0.0, hash(floor(uv*130.0)) - 0.985)*60.0, 2.0);
  `,
  // double helix — two glowing strands with depth + base-pair rungs
  dna: `
    float t = T*0.9;
    float ph = uv.y*9.0 + t;
    float x1 = 0.34*sin(ph);
    float x2 = 0.34*sin(ph + 3.14159);
    float d1 = cos(ph)*0.5 + 0.5;          // depth cue (front strand brighter)
    float d2 = cos(ph + 3.14159)*0.5 + 0.5;
    col = vec3(0.02,0.03,0.07);
    // base-pair rungs between the strands, only on the front half
    float bar = smoothstep(0.035, 0.0, abs(fract(uv.y*4.5 + t*0.16) - 0.5));
    float between = step(min(x1,x2), uv.x) * step(uv.x, max(x1,x2));
    col += vec3(0.92,0.86,0.55) * bar * between * 0.55;
    // strands (drawn after, so they sit on top)
    col += vec3(0.10,0.95,0.85) * (0.35 + 0.65*d1) * smoothstep(0.055, 0.0, abs(uv.x - x1));
    col += vec3(0.98,0.26,0.66) * (0.35 + 0.65*d2) * smoothstep(0.055, 0.0, abs(uv.x - x2));
  `,
  // open water — the real Seascape raymarcher (see PRE.ocean)
  ocean: `
    float time = T*0.3;
    vec3 ang = vec3(sin(time*3.0)*0.06, sin(time)*0.12 + 0.06, time);
    vec3 ori = vec3(0.0, 2.2, time*5.0);
    vec2 suv = uv*2.0;
    vec3 dir = normalize(vec3(suv, -1.7)); dir.z += length(suv)*0.14;
    dir = normalize(dir) * oc_euler(ang);
    vec3 p;
    oc_trace(ori, dir, p);
    vec3 dist = p - ori;
    vec3 n = oc_normal(p, dot(dist,dist) * (0.1 / R.x));
    vec3 light = normalize(vec3(0.0, 1.0, 0.8));
    col = mix(oc_sky(dir), oc_sea(p, n, light, dir, dist), pow(smoothstep(0.0, -0.02, dir.y), 0.2));
    col = pow(col, vec3(0.65));
  `,
  // molten rock — turbulent flow with hot cracks
  lava: `
    vec2 p = uv*1.6;
    float f = fbm(p*2.0 + vec2(0.0, T*0.15));
    float cracks = fbm(p*4.0 - T*0.1);
    col = mix(vec3(0.06,0.01,0.0), vec3(0.62,0.05,0.0), smoothstep(0.30,0.55,f));
    col = mix(col, vec3(1.0,0.50,0.0), smoothstep(0.55,0.75,f));
    col = mix(col, vec3(1.0,0.95,0.55), pow(smoothstep(0.70,0.86,f), 2.0));
    col *= 0.65 + 0.7*cracks;
  `,
  // molecule — metaball atoms orbiting, glowing bonds
  molecule: `
    float t = T*0.7;
    float m = 0.0;
    for (int k = 0; k < 5; k++) {
      float fk = float(k);
      vec2 c = 0.55*vec2(sin(t + fk*1.3), cos(t*0.8 + fk*2.1));
      m += 0.055 / (dot(uv-c, uv-c) + 0.02);
    }
    col = mix(vec3(0.02,0.04,0.10), vec3(0.20,0.70,0.96), smoothstep(0.6,1.4,m));
    col += vec3(0.85,0.96,1.0) * pow(smoothstep(1.6,2.7,m), 2.0);
  `,
  // spiral galaxy — bright core, sweeping arms, stars
  galaxy: `
    float t = T*0.2;
    float a = atan(uv.y, uv.x);
    float r = length(uv);
    float arms = sin(a*2.0 + r*9.0 - t*4.0)*0.5 + 0.5;
    col = mix(vec3(0.03,0.02,0.08), vec3(0.50,0.22,0.66), arms*smoothstep(1.2,0.1,r));
    col += vec3(1.0,0.86,0.52) * pow(max(0.0, 1.0 - r*1.7), 3.0);
    col += vec3(0.9) * step(0.975, hash(floor(uv*110.0))) * 0.6;
  `,
  // aurora — drifting light curtains over a starfield
  aurora: `
    float t = T*0.4;
    float curtain = fbm(vec2(uv.x*2.0 + t*0.3, t*0.1));
    float mid = (curtain - 0.5)*1.2;
    col = vec3(0.02,0.03,0.08);
    col += vec3(0.10,0.92,0.52) * smoothstep(0.26, 0.0, abs(uv.y - mid));
    col += vec3(0.42,0.20,0.92) * smoothstep(0.40, 0.0, abs(uv.y - mid - 0.22)) * 0.55;
    col += vec3(0.9) * step(0.985, hash(floor(uv*95.0))) * 0.5;
  `,
  // fire — turbulent flame shaped by an envelope so it reads as a flame
  fire: `
    vec2 p = uv*vec2(1.3, 1.0);
    float n  = fbm(p*3.0 + vec2(0.0, -T*1.6));
    n += 0.5 * fbm(p*6.0 - vec2(0.0, T*2.4));
    float env = 1.0 - smoothstep(0.0, 1.05, length(vec2(uv.x*1.7, uv.y + 0.55)));
    float fl = clamp(n * env * 1.7, 0.0, 1.0);
    col = vec3(0.03,0.01,0.0);
    col = mix(col, vec3(0.85,0.10,0.0), smoothstep(0.12,0.40,fl));
    col = mix(col, vec3(1.0,0.55,0.0),  smoothstep(0.40,0.66,fl));
    col = mix(col, vec3(1.0,0.95,0.62), smoothstep(0.72,0.95,fl));
  `,
  // crystals — voronoi cells, each a different gem colour
  crystals: `
    vec2 q = uv*3.0; vec2 vi = floor(q); vec2 vf = fract(q);
    float md = 8.0; vec2 mc = vec2(0.0);
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
      vec2 g = vec2(float(x), float(y));
      vec2 hh = fract(sin(vec2(dot(vi+g, vec2(127.1,311.7)), dot(vi+g, vec2(269.5,183.3)))) * 43758.5);
      vec2 rr = g + (0.5 + 0.5*sin(T + 6.2831*hh)) - vf;
      float d = dot(rr, rr);
      if (d < md) { md = d; mc = vi + g; }
    }
    float ch = fract(sin(dot(mc, vec2(12.9, 78.2))) * 43758.5);
    vec3 gem = 0.55 + 0.45*cos(6.2831*(ch + vec3(0.0, 0.33, 0.66)));
    col = gem * (0.35 + 0.65*smoothstep(0.0, 0.42, sqrt(md)));
  `,
  // wormhole — rainbow polar tunnel rushing inward
  wormhole: `
    float t = T*0.4;
    float a = atan(uv.y, uv.x);
    float rr = length(uv) + 0.001;
    float depth = 1.0 / rr;
    col = 0.5 + 0.5*cos(depth*0.6 + a*3.0 + vec3(0.0, 2.0, 4.0) + t);
    col *= smoothstep(0.0, 0.06, rr);
  `,
  // raymarched 3D ball — lambert + specular, the "game graphics" door
  raymarch: `
    vec3 ro = vec3(0.0, 0.0, -2.6);
    vec3 rd = normalize(vec3(uv, 1.5));
    float b = dot(ro, rd);
    float c = dot(ro, ro) - 1.0;
    float disc = b*b - c;
    col = mix(vec3(0.04,0.05,0.09), vec3(0.10,0.12,0.22), 0.5 + 0.5*uv.y);
    if (disc > 0.0) {
      float tHit = -b - sqrt(disc);
      vec3 pos = ro + rd*tHit;
      vec3 nor = normalize(pos);
      vec3 ld = normalize(vec3(sin(T), 0.7, -0.6));
      float dif = max(dot(nor, ld), 0.0);
      float spec = pow(max(dot(reflect(-ld, nor), -rd), 0.0), 32.0);
      vec3 base = vec3(0.97,0.46,0.16);
      col = base*(0.14 + 0.95*dif) + spec*vec3(1.0);
    }
  `,
};

// Global-scope helper functions some variants need (defined before main()).
const PRE: Partial<Record<TemplateVariant, string>> = {
  // Adapted from "Seascape" by Alexander Alekseev / TDM (CC BY-NC-SA 3.0).
  // Trimmed iteration counts; reuses the shared hash(). Renders at tile size,
  // so full quality is cheap.
  ocean: `
    float oc_noise(vec2 p){
      vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
      return -1.0+2.0*mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }
    mat3 oc_euler(vec3 a){
      vec2 a1=vec2(sin(a.x),cos(a.x)),a2=vec2(sin(a.y),cos(a.y)),a3=vec2(sin(a.z),cos(a.z));
      mat3 m;
      m[0]=vec3(a1.y*a3.y+a1.x*a2.x*a3.x,a1.y*a2.x*a3.x+a3.y*a1.x,-a2.y*a3.x);
      m[1]=vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
      m[2]=vec3(a3.y*a1.x*a2.x+a1.y*a3.x,a1.x*a3.x-a1.y*a3.y*a2.x,a2.y*a3.y);
      return m;
    }
    float oc_diffuse(vec3 n,vec3 l,float p){ return pow(dot(n,l)*0.4+0.6,p); }
    float oc_specular(vec3 n,vec3 l,vec3 e,float s){ float nrm=(s+8.0)/(3.141592*8.0); return pow(max(dot(reflect(e,n),l),0.0),s)*nrm; }
    vec3 oc_sky(vec3 e){ e.y=(max(e.y,0.0)*0.8+0.2)*0.8; return vec3(pow(1.0-e.y,2.0),1.0-e.y,0.6+(1.0-e.y)*0.4)*1.1; }
    float oc_oct(vec2 uv,float choppy){ uv+=oc_noise(uv); vec2 wv=1.0-abs(sin(uv)); vec2 swv=abs(cos(uv)); wv=mix(wv,swv,wv); return pow(1.0-pow(wv.x*wv.y,0.65),choppy); }
    float oc_map(vec3 p){
      float freq=0.16,amp=0.6,choppy=4.0; float st=1.0+T*0.8; vec2 uv=p.xz; uv.x*=0.75;
      float d,h=0.0; mat2 m=mat2(1.6,1.2,-1.2,1.6);
      for(int i=0;i<2;i++){ d=oc_oct((uv+st)*freq,choppy); d+=oc_oct((uv-st)*freq,choppy); h+=d*amp; uv*=m; freq*=1.9; amp*=0.22; choppy=mix(choppy,1.0,0.2); }
      return p.y-h;
    }
    float oc_mapD(vec3 p){
      float freq=0.16,amp=0.6,choppy=4.0; float st=1.0+T*0.8; vec2 uv=p.xz; uv.x*=0.75;
      float d,h=0.0; mat2 m=mat2(1.6,1.2,-1.2,1.6);
      for(int i=0;i<4;i++){ d=oc_oct((uv+st)*freq,choppy); d+=oc_oct((uv-st)*freq,choppy); h+=d*amp; uv*=m; freq*=1.9; amp*=0.22; choppy=mix(choppy,1.0,0.2); }
      return p.y-h;
    }
    vec3 oc_sea(vec3 p,vec3 n,vec3 l,vec3 eye,vec3 dist){
      float fr=clamp(1.0-dot(n,-eye),0.0,1.0); fr=min(fr*fr*fr,0.5);
      vec3 refl=oc_sky(reflect(eye,n));
      vec3 refr=vec3(0.0,0.09,0.18)+oc_diffuse(n,l,80.0)*vec3(0.48,0.54,0.36)*0.12;
      vec3 c=mix(refr,refl,fr);
      float att=max(1.0-dot(dist,dist)*0.001,0.0);
      c+=vec3(0.48,0.54,0.36)*(p.y-0.6)*0.18*att;
      c+=oc_specular(n,l,eye,60.0);
      return c;
    }
    vec3 oc_normal(vec3 p,float eps){ vec3 n; n.y=oc_mapD(p); n.x=oc_mapD(vec3(p.x+eps,p.y,p.z))-n.y; n.z=oc_mapD(vec3(p.x,p.y,p.z+eps))-n.y; n.y=eps; return normalize(n); }
    float oc_trace(vec3 ori,vec3 dir,out vec3 p){
      float tm=0.0,tx=1000.0; float hx=oc_map(ori+dir*tx);
      if(hx>0.0){ p=ori+dir*tx; return tx; }
      float hm=oc_map(ori);
      for(int i=0;i<8;i++){ float tmid=mix(tm,tx,hm/(hm-hx)); p=ori+dir*tmid; float hmid=oc_map(p); if(hmid<0.0){tx=tmid;hx=hmid;}else{tm=tmid;hm=hmid;} }
      return mix(tm,tx,hm/(hm-hx));
    }
  `,
};

const fragSrc = (variant: TemplateVariant) => `
precision highp float;
uniform vec2 R;
uniform vec2 O;   // viewport origin in canvas pixels (this tile's bottom-left)
uniform float T;

// shared helpers — value noise + 5-octave fbm (used by terrain/nebula/ocean/…)
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a*vnoise(p); p *= 2.02; a *= 0.5; }
  return v;
}

// Per-variant global helper functions (Seascape etc. need real functions, which
// can't live inside main()).
${PRE[variant] ?? ''}

void main(){
  // gl_FragCoord is framebuffer-absolute. Subtract the viewport origin so the
  // tile's center maps to uv=0 instead of the canvas center.
  vec2 uv = (gl_FragCoord.xy - O - 0.5 * R) / R.y;
  vec3 col = vec3(0.0);
  ${BODY[variant]}
  // gentle edge fade only — keep the tile bright and readable
  col *= 1.0 - 0.30 * smoothstep(0.55, 1.5, length(uv));
  gl_FragColor = vec4(col, 1.0);
}
`;

export type Template = {
  name: string;
  hint: string;
  variant: TemplateVariant;
};

export const TemplatesShared = ({
  templates,
  style,
}: { templates: Template[]; style?: CSSProperties }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<Array<HTMLDivElement | null>>([]);

  // lazy mount the WebGL context only when the section is near the viewport
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e) setActive(e.isIntersecting);
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);

    const compile = (type: number, src: string, name: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn(`TemplatesShared ${name} compile:`, gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT, 'vertex');
    if (!vs) return;

    type ProgEntry = {
      prog: WebGLProgram;
      Rloc: WebGLUniformLocation | null;
      Tloc: WebGLUniformLocation | null;
      Oloc: WebGLUniformLocation | null;
    };
    const programs: Partial<Record<TemplateVariant, ProgEntry>> = {};

    const variants = new Set<TemplateVariant>(templates.map((t) => t.variant));
    for (const v of variants) {
      const fs = compile(gl.FRAGMENT_SHADER, fragSrc(v), `fragment ${v}`);
      if (!fs) continue;
      const prog = gl.createProgram();
      if (!prog) continue;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, 'p');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn(`TemplatesShared link ${v}:`, gl.getProgramInfoLog(prog));
        continue;
      }
      programs[v] = {
        prog,
        Rloc: gl.getUniformLocation(prog, 'R'),
        Tloc: gl.getUniformLocation(prog, 'T'),
        Oloc: gl.getUniformLocation(prog, 'O'),
      };
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    let stopped = false;
    let raf = 0;
    const start = performance.now();

    const tick = () => {
      if (stopped) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const wrapperRect = wrapper.getBoundingClientRect();
      const W = Math.max(1, Math.floor(wrapperRect.width * dpr));
      const H = Math.max(1, Math.floor(wrapperRect.height * dpr));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }

      // clear the whole canvas first
      gl.viewport(0, 0, W, H);
      gl.scissor(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const time = (performance.now() - start) / 1000;

      // render each tile into its own viewport region
      for (let i = 0; i < templates.length; i++) {
        const tile = tileRefs.current[i];
        const tpl = templates[i];
        if (!tile || !tpl) continue;
        const r = tile.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;

        // canvas/WebGL y is bottom-up; CSS rect.top is top-down.
        const localX = r.left - wrapperRect.left;
        const localTop = r.top - wrapperRect.top;
        const tileH = r.height;
        const localBottom = wrapperRect.height - localTop - tileH;

        const x = Math.floor(localX * dpr);
        const y = Math.floor(localBottom * dpr);
        const w = Math.max(1, Math.floor(r.width * dpr));
        const h = Math.max(1, Math.floor(tileH * dpr));

        const p = programs[tpl.variant];
        if (!p) continue;
        gl.useProgram(p.prog);
        gl.viewport(x, y, w, h);
        gl.scissor(x, y, w, h);
        if (p.Rloc) gl.uniform2f(p.Rloc, w, h);
        if (p.Oloc) gl.uniform2f(p.Oloc, x, y);
        if (p.Tloc) gl.uniform1f(p.Tloc, time);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      // No loseContext — see FractalEntity for why. DOM removal frees it.
    };
  }, [active, templates]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        maxWidth: 1180, margin: '4rem auto 0', padding: '0 2rem',
        ...style,
      }}
    >
      {/* shared canvas behind all tiles — covers full wrapper so its
          coordinate system matches getBoundingClientRect math below. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        ref={gridRef}
        style={{
          position: 'relative', zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        {templates.map((t, i) => (
          <div
            key={t.name}
            ref={(el) => { tileRefs.current[i] = el; }}
            style={{
              position: 'relative',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 3,
              overflow: 'hidden',
              aspectRatio: '4 / 3',
              cursor: 'pointer',
              transition: 'border-color 0.25s',
            }}
          >
            {/* scrim for label legibility */}
            <div
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(11,12,14,0.0) 50%, rgba(11,12,14,0.78) 100%)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute', left: 12, top: 12,
                font: `700 9px ${TYPE.bodyMono}`,
                color: 'rgba(254,231,199,0.65)',
                letterSpacing: '0.22em', textTransform: 'uppercase',
                mixBlendMode: 'difference',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>
            <div
              style={{
                position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 1,
              }}
            >
              <div style={{ font: `700 15px ${TYPE.display}`, color: SHADE.cream, letterSpacing: '-0.01em' }}>
                {t.name}
              </div>
              <div
                style={{
                  font: `500 10.5px ${TYPE.bodyMono}`,
                  color: 'rgba(254,231,199,0.7)',
                  letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 3,
                }}
              >
                {t.hint}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
