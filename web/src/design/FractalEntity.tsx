import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

// Ported from the supplied Shadertoy raymarched fractal. Grayscale AO is
// remapped through our warm palette and the time rate is slowed for a calm
// pulse. Single-component, always-mounted (StrictMode-safe). IntersectionObserver
// pauses the rAF loop when offscreen but the WebGL context lives for the
// component's whole lifetime — no loseContext / no remount races.

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0., 1.); }
`;

const FRAG = `
precision highp float;
uniform vec2  iResolution;
uniform float iTime;

#define MAXDIST 20.0

void pR(inout vec2 p, float a){
  p = cos(a) * p + sin(a) * vec2(p.y, -p.x);
}

float length6(vec3 p){
  p = p * p * p; p = p * p;
  return pow(p.x + p.y + p.z, 1.0/6.0);
}

float fractal(vec3 p){
  float len = length(p);
  p = p.yxz;
  float scale = 1.25;
  const int iterations = 28;
  float t = iTime * 0.8;
  float l = 0.0;

  vec2 rotationAnimAmp = vec2(0.05, 0.04);
  vec2 rotationPhase = vec2(
    0.45 + sin(t + len * 0.4) * 0.025,
    0.15 + cos(-0.2 + t + len * 0.2) * 0.05
  );

  vec3 juliaOffset = vec3(-3.0, -1.15, -0.5);

  pR(p.xy, 0.5 + sin(-0.25 + t) * 0.1);

  for (int i = 0; i < iterations; i++) {
    p = abs(p);
    p = p * scale + juliaOffset;
    pR(p.xz, rotationPhase.x * 3.14 + cos(t + len) * rotationAnimAmp.y);
    pR(p.yz, rotationPhase.y * 3.14 + sin(t + len) * rotationAnimAmp.x);
    l = length6(p);
  }
  return l * pow(scale, -float(iterations)) - 0.25;
}

vec2 march(vec3 ro, vec3 rd){
  const int steps = 30;
  const float prec = 0.001;
  vec2 res = vec2(0.0);
  for (int i = 0; i < steps; i++) {
    float d = fractal(ro + rd * res.x);
    if (res.x > MAXDIST || d < prec) break;
    res.x += d;
    res.y = float(i);
  }
  return res;
}

vec3 calcNormal(vec3 pos){
  const vec3 eps = vec3(0.005, 0.0, 0.0);
  return normalize(vec3(
    fractal(pos + eps)        - fractal(pos - eps),
    fractal(pos + eps.yxz)    - fractal(pos - eps.yxz),
    fractal(pos + eps.yzx)    - fractal(pos - eps.yzx)
  ));
}

float calcAO(in vec3 pos, in vec3 nor){
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float hr = 0.2 * float(i) / 4.0;
    vec3 aopos = nor * hr + pos;
    float dd = fractal(aopos);
    occ += -(dd - hr) * sca;
    sca *= 0.95;
  }
  return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
}

vec3 palettize(float ao){
  vec3 c0 = vec3(0.030, 0.025, 0.045);
  vec3 c1 = vec3(0.156, 0.090, 0.055);
  vec3 c2 = vec3(0.710, 0.420, 0.110);
  vec3 c3 = vec3(0.988, 0.706, 0.153);
  vec3 c4 = vec3(0.996, 0.906, 0.780);
  vec3 col = mix(c0, c1, smoothstep(0.00, 0.18, ao));
  col = mix(col, c2, smoothstep(0.18, 0.40, ao));
  col = mix(col, c3, smoothstep(0.40, 0.68, ao));
  col = mix(col, c4, smoothstep(0.68, 0.92, ao) * 0.55);
  return col;
}

mat3 cameraMatrix(in vec3 ro, in vec3 rd){
  vec3 forward = normalize(rd - ro);
  vec3 worldUp = vec3(0.0, 1.0, 0.0);
  vec3 x = normalize(cross(forward, worldUp));
  vec3 y = normalize(cross(x, forward));
  return mat3(x, y, forward);
}

void main(){
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  uv = uv * 2.0 - 1.0;
  uv.x *= iResolution.x / iResolution.y;

  vec3 camPos = vec3(9.0, 6.5, 12.0);
  vec3 camTarget = camPos + vec3(-0.85, -0.5, -1.0);
  mat3 cam = cameraMatrix(camPos, camTarget);

  vec3 rayDir = cam * normalize(vec3(uv, 1.0 + sin(iTime * 0.8) * 0.05));
  vec2 res = march(camPos, rayDir);

  if (res.x > MAXDIST) {
    // missed — show fully transparent so the page bg shows
    gl_FragColor = vec4(0.0);
    return;
  }

  vec3 hitPos = camPos + rayDir * res.x;
  vec3 nor = calcNormal(hitPos);
  float ao = pow(calcAO(hitPos, nor), 3.2);

  float pulse = 0.85 + 0.25 * sin(iTime * 0.6);
  vec3 col = palettize(ao) * pulse;

  // distance fade
  col = mix(col, vec3(0.020, 0.018, 0.030), clamp(res.x / MAXDIST, 0.0, 1.0));
  col = pow(col, vec3(0.6));

  float alpha = clamp(1.0 - res.x / MAXDIST, 0.0, 1.0);
  // premultiplied
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

export const FractalEntity = ({ style }: { style?: CSSProperties }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const compile = (type: number, src: string, name: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        console.warn(`FractalEntity ${name} compile:`, log, 'isContextLost:', gl.isContextLost());
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT, 'vertex');
    const fs = compile(gl.FRAGMENT_SHADER, FRAG, 'fragment');
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('FractalEntity link:', gl.getProgramInfoLog(prog));
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

    // Pause rendering when offscreen, but never unmount the canvas / context.
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) visible = e.isIntersecting; },
      { rootMargin: '120px' },
    );
    io.observe(canvas);

    let stopped = false;
    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.0);
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw === 0 || ch === 0) return false;
      const w = Math.max(1, Math.floor(cw * dpr));
      const h = Math.max(1, Math.floor(ch * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(Rloc, w, h);
      }
      return true;
    };

    const tick = () => {
      if (stopped) return;
      if (visible) {
        const ready = resize();
        if (ready) {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.uniform1f(Tloc, (performance.now() - start) / 1000);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      // No loseContext — DOM removal handles cleanup; StrictMode re-run safe.
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  );
};
