import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

export type ShaderVariant = 'plasma' | 'ripple' | 'swirl';

const VERTEX_SRC = `
  attribute vec2 p;
  void main(){ gl_Position = vec4(p, 0., 1.); }
`;

// Gaea-spirit: terrain-render saturation in the defaults — richer color
// gradients than the original handoff's flat palette so the canvas reads as
// the hero of the page even when small.
const FRAGMENT_SRC: Record<ShaderVariant, string> = {
  plasma: `
    precision highp float;
    uniform vec2 R; uniform float T;
    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5*R) / R.y;
      float t = T * 0.35;
      float v = 0.0;
      v += sin(uv.x*3.5 + t);
      v += sin(uv.y*4.2 - t*1.1);
      v += sin((uv.x+uv.y)*2.8 + t*0.7);
      v += sin(length(uv*1.6 + vec2(sin(t*0.5), cos(t*0.4)))*5.0 - t);
      v *= 0.25;
      vec3 a = vec3(0.03, 0.02, 0.14);
      vec3 b = vec3(0.92, 0.30, 0.55);
      vec3 c = vec3(0.18, 0.78, 0.95);
      vec3 d = vec3(0.99, 0.78, 0.22);
      vec3 col = mix(a,b, 0.5+0.5*sin(v*3.14));
      col = mix(col, c, 0.5+0.5*sin(v*2.0 + 1.2));
      col = mix(col, d, 0.28*(0.5+0.5*sin(v*1.6 + t*0.3)));
      col = pow(col, vec3(0.94));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  ripple: `
    precision highp float;
    uniform vec2 R; uniform float T;
    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5*R) / R.y;
      float t = T*0.6;
      float r = length(uv);
      float a = atan(uv.y, uv.x);
      float w = sin(r*16.0 - t*2.0) * 0.5 + 0.5;
      float w2 = sin(a*5.0 + r*8.0 - t*1.3) * 0.5 + 0.5;
      vec3 c1 = vec3(0.06, 0.03, 0.20);
      vec3 c2 = vec3(0.98, 0.38, 0.62);
      vec3 c3 = vec3(0.26, 0.92, 1.0);
      vec3 col = mix(c1, c2, w);
      col = mix(col, c3, w2*0.55);
      col *= 1.0 - r*0.55;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  swirl: `
    precision highp float;
    uniform vec2 R; uniform float T;
    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5*R) / R.y;
      float t = T * 0.4;
      float r = length(uv);
      float a = atan(uv.y, uv.x) + r*3.0 - t;
      vec2 q = vec2(cos(a), sin(a)) * r;
      float v = sin(q.x*6.0 + t) + sin(q.y*7.0 - t*1.2);
      v *= 0.5;
      vec3 c1 = vec3(0.82, 0.18, 0.45);
      vec3 c2 = vec3(0.99, 0.80, 0.26);
      vec3 c3 = vec3(0.10, 0.04, 0.22);
      vec3 col = mix(c3, c1, 0.5+0.5*sin(v*3.14));
      col = mix(col, c2, 0.38*(0.5+0.5*cos(v*2.0+t*0.5)));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export const ShadeCanvas = ({
  variant = 'plasma',
  className,
  style,
}: {
  variant?: ShaderVariant;
  className?: string;
  style?: CSSProperties;
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC[variant]);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const ploc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(ploc);
    gl.vertexAttribPointer(ploc, 2, gl.FLOAT, false, 0, 0);

    const Rloc = gl.getUniformLocation(prog, 'R');
    const Tloc = gl.getUniformLocation(prog, 'T');

    const start = performance.now();
    let raf = 0;
    let canvasReady = false;
    // Resize is gated on a non-zero element box. The classic bug: on first
    // mount `canvas.clientWidth` is 0 because the parent uses `aspect-ratio`
    // and layout hasn't resolved; resize() then locks canvas.width to 1 and
    // R uniform to (1,1), and the next ticks don't notice because the
    // canvas.clientWidth/height comparison stays satisfied. Drive sizing
    // from a ResizeObserver against the parent (whose box-size is authoritative
    // even on first paint) and from a per-frame fallback inside tick().
    const applySize = (cw: number, ch: number) => {
      if (cw <= 0 || ch <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(cw * dpr));
      const h = Math.max(1, Math.floor(ch * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(Rloc, w, h);
      }
      canvasReady = true;
    };
    const resize = () => {
      const parent = canvas.parentElement;
      const cw = parent ? parent.clientWidth : canvas.clientWidth;
      const ch = parent ? parent.clientHeight : canvas.clientHeight;
      applySize(cw, ch);
    };

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((entries) => {
          for (const entry of entries) {
            const boxes = entry.borderBoxSize ?? entry.contentBoxSize;
            const box = Array.isArray(boxes) ? boxes[0] : (boxes as unknown as ResizeObserverSize | undefined);
            if (box) applySize(box.inlineSize, box.blockSize);
            else {
              const r = entry.target.getBoundingClientRect();
              applySize(r.width, r.height);
            }
          }
        })
      : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);

    // Belt-and-suspenders initial size attempts across the first few frames
    // in case ResizeObserver doesn't fire with non-zero dims immediately.
    resize();
    requestAnimationFrame(() => { resize(); });
    requestAnimationFrame(() => requestAnimationFrame(() => { resize(); }));

    const tick = () => {
      resize(); // per-frame fallback
      if (canvasReady) {
        gl.uniform1f(Tloc, (performance.now() - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [variant]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  );
};
