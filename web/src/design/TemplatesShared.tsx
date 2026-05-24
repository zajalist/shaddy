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
  | 'plasma' | 'ripples' | 'voronoi' | 'caustics' | 'stripes' | 'kaleido'
  | 'warp' | 'glow' | 'bloom' | 'feedback' | 'reaction' | 'tunnel';

const BODY: Record<TemplateVariant, string> = {
  plasma: `
    float t = T * 0.4;
    float v = sin(uv.x*4. + t) + sin(uv.y*3.5 - t*1.1) + sin((uv.x+uv.y)*2.5 + t*0.7);
    v += sin(length(uv*1.6) * 5.0 - t);
    v *= 0.25;
    vec3 c1 = vec3(0.04, 0.04, 0.10);
    vec3 c2 = vec3(0.71, 0.18, 0.36);
    vec3 c3 = vec3(0.99, 0.71, 0.15);
    col = mix(c1, c2, 0.5+0.5*sin(v*3.14));
    col = mix(col, c3, 0.5+0.5*cos(v*2. + t*0.5));
  `,
  ripples: `
    float t = T * 0.5;
    float dr = length(uv);
    float r = sin(dr*18.0 - t*3.0) * 0.5 + 0.5;
    vec3 c1 = vec3(0.04, 0.04, 0.12);
    vec3 c2 = vec3(0.99, 0.71, 0.15);
    vec3 c3 = vec3(0.71, 0.42, 0.11);
    col = mix(c1, c2, r * (1.0 - dr * 0.4));
    col = mix(col, c3, r*r * 0.45);
  `,
  voronoi: `
    vec2 q = uv * 3.4;
    vec2 vi = floor(q);
    vec2 vf = fract(q);
    float md = 8.0;
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        vec2 g = vec2(float(x), float(y));
        vec2 h = fract(sin(vec2(dot(vi+g, vec2(127.1, 311.7)), dot(vi+g, vec2(269.5, 183.3)))) * 43758.5453);
        vec2 o = 0.5 + 0.5 * sin(T * 1.2 + 6.2831 * h);
        vec2 r = g + o - vf;
        md = min(md, dot(r, r));
      }
    }
    float dv = sqrt(md);
    vec3 c1 = vec3(0.04, 0.05, 0.12);
    vec3 c2 = vec3(0.12, 0.5, 0.72);
    vec3 c3 = vec3(0.99, 0.71, 0.15);
    col = mix(c1, c2, smoothstep(0.0, 0.4, dv));
    col = mix(col, c3, smoothstep(0.4, 0.65, dv));
  `,
  caustics: `
    vec2 cp = uv * 3.0;
    vec2 cq = cp;
    float t = T * 0.3;
    for (int k = 0; k < 3; k++) {
      cp = vec2(sin(cq.y + t) + cos(cq.x * 0.7), cos(cq.x - t * 0.5) + sin(cq.y * 0.9));
      cq = cq + cp * 0.5;
    }
    float v = length(cp) * 0.4;
    vec3 c1 = vec3(0.04, 0.06, 0.12);
    vec3 c2 = vec3(0.99, 0.71, 0.15);
    vec3 c3 = vec3(0.12, 0.5, 0.72);
    col = mix(c1, c2, smoothstep(0.0, 0.5, fract(v)));
    col = mix(col, c3, 0.4 * sin(v * 6.0));
  `,
  stripes: `
    float t = T * 0.3;
    float a = sin(t) * 0.5;
    vec2 sr = vec2(cos(a) * uv.x + sin(a) * uv.y, -sin(a) * uv.x + cos(a) * uv.y);
    float s = sin(sr.x * 14.0 + t * 2.0) * 0.5 + 0.5;
    vec3 c1 = vec3(0.04, 0.04, 0.12);
    vec3 c2 = vec3(0.99, 0.71, 0.15);
    vec3 c3 = vec3(0.71, 0.42, 0.11);
    col = mix(c1, c2, s);
    col = mix(col, c3, step(0.5, fract(sr.y * 4.0 + t)) * 0.5);
  `,
  kaleido: `
    float t = T * 0.35;
    float a = atan(uv.y, uv.x);
    float rr = length(uv);
    a = mod(a, 6.2831 / 5.0) - 3.1415 / 5.0;
    vec2 q = vec2(cos(a), sin(a)) * rr;
    q += 0.14 * sin(q.yx * 4.0 + t);
    col = 0.5 + 0.5 * cos(t + vec3(q.x, q.y, q.x + q.y) + vec3(0.0, 2.0, 4.0));
    col = mix(col, vec3(0.71, 0.18, 0.36), 0.25);
    col = mix(col, vec3(0.36, 0.25, 0.65), 0.25);
  `,
  warp: `
    float t = T * 0.3;
    vec2 wp = uv;
    for (int k = 0; k < 3; k++) {
      wp += vec2(sin(wp.y * 3.0 + t), cos(wp.x * 3.0 + t * 0.7)) * 0.28;
    }
    float v = length(wp) * 0.45;
    vec3 c1 = vec3(0.04, 0.05, 0.12);
    vec3 c2 = vec3(0.43, 0.50, 0.10);
    vec3 c3 = vec3(0.36, 0.25, 0.65);
    col = mix(c1, c2, smoothstep(0.2, 0.6, v));
    col = mix(col, c3, 0.5 * sin(v * 5.0));
  `,
  glow: `
    float t = T * 0.5;
    vec2 off = vec2(sin(t) * 0.3, cos(t * 0.8) * 0.2);
    float dg = length(uv - off);
    float g = pow(max(1.0 - dg, 0.0), 3.0);
    vec3 c1 = vec3(0.04, 0.04, 0.10);
    vec3 c2 = vec3(0.99, 0.71, 0.15);
    vec3 c3 = vec3(0.99, 0.91, 0.7);
    col = mix(c1, c2, g);
    col = mix(col, c3, pow(g, 5.0));
  `,
  bloom: `
    float t = T * 0.3;
    vec2 off = vec2(sin(t) * 0.25, cos(t * 0.8) * 0.25);
    float db = length(uv - off);
    float ring = smoothstep(0.35, 0.0, db);
    ring += 0.7 * smoothstep(0.6, 0.2, db);
    ring += 0.3 * smoothstep(0.9, 0.5, db);
    vec3 c1 = vec3(0.05, 0.05, 0.10);
    vec3 c2 = vec3(0.99, 0.91, 0.7);
    vec3 c3 = vec3(0.71, 0.42, 0.11);
    col = mix(c1, c2, ring * 0.6);
    col = mix(col, c3, ring * ring * 0.5);
  `,
  feedback: `
    float t = T * 0.4;
    col = vec3(0.04, 0.04, 0.12);
    for (int k = 0; k < 5; k++) {
      float f = float(k) * 0.18;
      vec2 q = uv * (1.0 + f) + vec2(cos(t + f), sin(t + f * 1.3)) * 0.12;
      float dq = length(q);
      col = mix(col, vec3(0.99, 0.71, 0.15) * (1.0 - f * 0.6), smoothstep(0.4, 0.05, dq) * (1.0 - f * 0.6));
    }
  `,
  reaction: `
    float t = T * 0.25;
    vec2 rp = uv * 3.0;
    float v = 0.0;
    for (int k = 0; k < 4; k++) {
      v += sin(rp.x * 4.0 + t + v) * cos(rp.y * 3.5 - t + v) * 0.5;
      rp = rp.yx + 0.3 * v;
    }
    float spots = smoothstep(0.0, 0.35, abs(v));
    vec3 c1 = vec3(0.71, 0.13, 0.36);
    vec3 c2 = vec3(0.36, 0.25, 0.65);
    vec3 c3 = vec3(0.04, 0.04, 0.10);
    col = mix(c1, c2, spots);
    col = mix(col, c3, smoothstep(0.5, 0.85, abs(v)));
  `,
  tunnel: `
    float t = T * 0.4;
    float a = atan(uv.y, uv.x);
    float rr = length(uv) + 0.001;
    float depth = 1.0 / rr;
    col = 0.5 + 0.5 * cos(depth * 0.5 + a * 4.0 + vec3(0.0, 2.0, 4.0) + t);
    col = mix(col, vec3(0.99, 0.71, 0.15), 0.35 * sin(depth * 3.0 + t));
    col *= smoothstep(0.0, 0.04, rr);
    col = mix(vec3(0.04, 0.04, 0.10), col, smoothstep(0.0, 0.06, rr));
  `,
};

const fragSrc = (variant: TemplateVariant) => `
precision highp float;
uniform vec2 R;
uniform vec2 O;   // viewport origin in canvas pixels (this tile's bottom-left)
uniform float T;
void main(){
  // gl_FragCoord is framebuffer-absolute. Subtract the viewport origin so the
  // tile's center maps to uv=0 instead of the canvas center.
  vec2 uv = (gl_FragCoord.xy - O - 0.5 * R) / R.y;
  vec3 col = vec3(0.0);
  ${BODY[variant]}
  {
    float _vd = length(uv);
    col *= smoothstep(1.4, 0.4, _vd * 1.2);
  }
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
