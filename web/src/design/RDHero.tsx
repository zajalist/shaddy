import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

// Faithful port of Shadertoy fX23WD. Single-channel reaction-diffusion where
// the diffusion is realized as a separable two-pass Gaussian blur and the
// reaction is anti-diffusion (raw - blurred). Four-pass-per-frame pipeline:
//   1. Buffer A  : update state    (reads prev A + C + noise)            → A'
//   2. Buffer B  : horizontal blur (reads A)                              → B
//   3. Buffer C  : vertical blur   (reads B)                              → C
//   4. Image     : final shading   (reads A + C + noise, light at u_lp)  → screen
// Mouse-warp and mouse-tracking buffer dropped (passive hero); light is a
// slowly drifting point so the spotlight still moves across the field.
// Recolor remapped from the original blue+gold to our warm-gold palette.

const SIM_RES = 512;
const NOISE_RES = 256;

const VERTEX_SRC = `#version 300 es
in vec2 p;
out vec2 v_uv;
void main(){
  v_uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0., 1.);
}`;

// ─── Buffer A: state update ──────────────────────────────────────────────
const STATE_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_state;     // iChannel0 — previous A (raw)
uniform sampler2D u_blur;      // iChannel1 — C (fully blurred A)
uniform sampler2D u_noise;     // iChannel3 — noise texture
uniform vec2  u_simRes;
uniform vec2  u_noiseRes;
uniform float u_time;
uniform float u_frame;
out vec4 o;

void main(){
  vec2 uv = v_uv;
  vec2 pixelSize = 1.0 / u_simRes;

  vec4 noise = texture(u_noise, gl_FragCoord.xy / u_noiseRes + fract(vec2(42.0, 56.0) * u_time));

  // gradient of the heavily-blurred field (diffusive expansion direction)
  vec2 d = pixelSize * 4.0;
  vec4 dx = (texture(u_blur, fract(uv + vec2(1.0, 0.0) * d)) - texture(u_blur, fract(uv - vec2(1.0, 0.0) * d))) * 0.5;
  vec4 dy = (texture(u_blur, fract(uv + vec2(0.0, 1.0) * d)) - texture(u_blur, fract(uv - vec2(0.0, 1.0) * d))) * 0.5;

  vec2 uv_red = uv + vec2(dx.x, dy.x) * pixelSize * 8.0;

  float new_red = texture(u_state, fract(uv_red)).x + (noise.x - 0.5) * 0.0025 - 0.002; // stochastic decay
  new_red -= (texture(u_blur,  fract(uv_red + (noise.xy - 0.5) * pixelSize)).x
            - texture(u_state, fract(uv_red + (noise.xy - 0.5) * pixelSize)).x) * 0.047; // anti-diffusion

  if (u_frame < 10.0) {
    o = noise;
  } else {
    o = vec4(clamp(new_red, 0.0, 1.0), 0.0, 0.0, 1.0);
  }
}`;

// ─── Buffer B: horizontal 9-tap Gaussian blur ────────────────────────────
const HBLUR_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
uniform vec2 u_srcRes;
out vec4 o;
void main(){
  vec2 px = 1.0 / u_srcRes;
  vec2 uv = v_uv;
  float h = px.x;
  vec4 sum = vec4(0.0);
  sum += texture(u_src, fract(vec2(uv.x - 4.0*h, uv.y))) * 0.05;
  sum += texture(u_src, fract(vec2(uv.x - 3.0*h, uv.y))) * 0.09;
  sum += texture(u_src, fract(vec2(uv.x - 2.0*h, uv.y))) * 0.12;
  sum += texture(u_src, fract(vec2(uv.x - 1.0*h, uv.y))) * 0.15;
  sum += texture(u_src, fract(vec2(uv.x      , uv.y))) * 0.16;
  sum += texture(u_src, fract(vec2(uv.x + 1.0*h, uv.y))) * 0.15;
  sum += texture(u_src, fract(vec2(uv.x + 2.0*h, uv.y))) * 0.12;
  sum += texture(u_src, fract(vec2(uv.x + 3.0*h, uv.y))) * 0.09;
  sum += texture(u_src, fract(vec2(uv.x + 4.0*h, uv.y))) * 0.05;
  o = vec4(sum.xyz / 0.98, 1.0);
}`;

// ─── Buffer C: vertical 9-tap Gaussian blur ──────────────────────────────
const VBLUR_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
uniform vec2 u_srcRes;
out vec4 o;
void main(){
  vec2 px = 1.0 / u_srcRes;
  vec2 uv = v_uv;
  float v = px.y;
  vec4 sum = vec4(0.0);
  sum += texture(u_src, fract(vec2(uv.x, uv.y - 4.0*v))) * 0.05;
  sum += texture(u_src, fract(vec2(uv.x, uv.y - 3.0*v))) * 0.09;
  sum += texture(u_src, fract(vec2(uv.x, uv.y - 2.0*v))) * 0.12;
  sum += texture(u_src, fract(vec2(uv.x, uv.y - 1.0*v))) * 0.15;
  sum += texture(u_src, fract(vec2(uv.x, uv.y      ))) * 0.16;
  sum += texture(u_src, fract(vec2(uv.x, uv.y + 1.0*v))) * 0.15;
  sum += texture(u_src, fract(vec2(uv.x, uv.y + 2.0*v))) * 0.12;
  sum += texture(u_src, fract(vec2(uv.x, uv.y + 3.0*v))) * 0.09;
  sum += texture(u_src, fract(vec2(uv.x, uv.y + 4.0*v))) * 0.05;
  o = vec4(sum.xyz / 0.98, 1.0);
}`;

// ─── Image: RD recolor + corkscrew-tunnel substrate (mix of fX23WD + 7cfGzn) ─
const IMAGE_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_state;     // iChannel0 — A (raw)
uniform sampler2D u_blur;      // iChannel2 — C (fully blurred)
uniform sampler2D u_noise;     // iChannel3 — noise (for grain)
uniform vec2  u_simRes;
uniform vec2  u_noiseRes;
uniform vec2  u_resolution;
uniform vec2  u_lightPos;      // light center (animated)
uniform float u_time;
out vec4 o;

// IQ cosine palette — warm midtones, matches our brand
vec3 pal(float i){
  return vec3(0.50, 0.38, 0.26) + vec3(0.50, 0.35, 0.25) *
         cos(6.2831853 * (vec3(1.0) * i + vec3(0.00, 0.12, 0.25)));
}

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// Raymarched corkscrew tunnel (ported from Shadertoy 7cfGzn).
// No tanh here — tone compression is applied once after the mix.
vec4 tunnel(vec2 u, float tT, vec2 iRes){
  vec2 uv = (u - 0.5*iRes + 0.5) / iRes.y;
  float i = 0.0, s;
  float t = mod(tT, 6.283185);
  vec3 p = vec3(0.0);
  vec3 d = normalize(vec3(2.0 * u - iRes, iRes.y));
  p.z = t;
  vec4 col = vec4(0.0);
  for (; i < 20.0; i++) {
    p.xy = rot(-p.z * 0.01 - t * 0.05) * p.xy;
    s = 0.6;
    s = max(s, 4.0 * (-length(p.xy) + 10.0));
    s += abs(p.y * 0.004 + sin(t - p.x * 0.5) * 0.9 + 1.0);
    p += d * s;
    col += 1.0 / (s * 0.2);
  }
  col *= vec4(pal(length(p) / (abs(sin(tT * 0.02) * 50.0) + 6.0)), 1.0);

  // pulsating dot interference (rate slowed to 1 Hz from 5 Hz)
  col -= 10.0 * smoothstep(
    0.001,
    abs(sin(tT * 1.0)),
    0.7 - length(sin(uv * 200.0) / 1.5) - abs(uv.y) + 0.2
  );

  col /= 50.0;
  float l = length(uv);
  col *= 1.2 - l;
  // center glow
  vec3 g = pal(l - 0.23);
  col = mix(col, vec4(g, g.r), 1.0 - smoothstep(0.01, 0.95, l));
  return col;
}

void main(){
  vec2 uv = v_uv;
  vec2 pixelSize = 1.0 / u_simRes;
  vec2 aspect = vec2(1.0, u_resolution.y / u_resolution.x);

  vec2 lightSize = vec2(4.0);

  // gradients from blurred (low-freq) field
  vec2 d = pixelSize * 2.0;
  vec4 dx = (texture(u_blur, uv + vec2(1.0, 0.0) * d) - texture(u_blur, uv - vec2(1.0, 0.0) * d)) * 0.5;
  vec4 dy = (texture(u_blur, uv + vec2(0.0, 1.0) * d) - texture(u_blur, uv - vec2(0.0, 1.0) * d)) * 0.5;
  // sharpen gradients with raw field
  d = pixelSize;
  dx += texture(u_state, uv + vec2(1.0, 0.0) * d) - texture(u_state, uv - vec2(1.0, 0.0) * d);
  dy += texture(u_state, uv + vec2(0.0, 1.0) * d) - texture(u_state, uv - vec2(0.0, 1.0) * d);

  vec2 displacement = vec2(dx.x, dy.x) * lightSize;
  float light = pow(max(1.0 - distance(
    0.5 + (uv - 0.5) * aspect * lightSize + displacement,
    0.5 + (u_lightPos - 0.5) * aspect * lightSize
  ), 0.0), 4.0);

  // RD recolor — warm-gold palette
  float r = texture(u_state, uv + vec2(dx.x, dy.x) * pixelSize * 8.0).x;
  vec4 rd = vec4(r) * vec4(2.0, 1.4, 0.6, 1.0) - vec4(1.0, 1.0, 0.5, 1.0);
  vec4 lightCol = vec4(4.0, 2.8, 1.0, 1.0);
  vec4 rdLayer = mix(rd, lightCol, light * 0.75 * vec4(1.0 - r));

  // Tunnel substrate — slowed time, RD gradient subtly displaces sample
  // (spatial coupling: where the RD field has activity, the tunnel warps with it)
  vec2 fragC = gl_FragCoord.xy + vec2(dx.x, dy.x) * u_resolution.y * 0.06;
  vec4 tn = tunnel(fragC, u_time * 0.22, u_resolution);

  // Mix — RD is the primary layer, tunnel is a quiet ambient substrate.
  // The (r * 0.20) keeps the tunnel mildly responsive to RD activity so the
  // two layers feel coupled rather than independent.
  vec4 col = tn * (0.32 + r * 0.20) + rdLayer * 0.85;

  // subtle film grain
  vec4 noise = texture(u_noise, gl_FragCoord.xy / u_noiseRes + fract(vec2(42.0, 56.0) * u_time));
  col.rgb += (noise.x - 0.5) * 0.015;

  // single tanh tone compression at the very end
  o = tanh(col);
}`;

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('shader compile:', gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
};

const linkProgram = (gl: WebGL2RenderingContext, vs: string, fs: string) => {
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn('program link:', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
};

const makeHalfFloatTarget = (gl: WebGL2RenderingContext, w: number, h: number) => {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fb };
};

const makeNoiseTexture = (gl: WebGL2RenderingContext, size: number) => {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i++) data[i] = Math.floor(Math.random() * 256);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return tex;
};

export const RDHero = ({ style }: { style?: CSSProperties }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false }) as WebGL2RenderingContext | null;
    if (!gl) return;
    if (!gl.getExtension('EXT_color_buffer_float')) {
      console.warn('RDHero: EXT_color_buffer_float not available; RD may misbehave');
    }

    const stateProg  = linkProgram(gl, VERTEX_SRC, STATE_SRC);
    const hblurProg  = linkProgram(gl, VERTEX_SRC, HBLUR_SRC);
    const vblurProg  = linkProgram(gl, VERTEX_SRC, VBLUR_SRC);
    const imageProg  = linkProgram(gl, VERTEX_SRC, IMAGE_SRC);
    if (!stateProg || !hblurProg || !vblurProg || !imageProg) return;

    // fullscreen triangle
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const bindTri = (prog: WebGLProgram) => {
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    };
    bindTri(stateProg);

    // FBOs
    let a = makeHalfFloatTarget(gl, SIM_RES, SIM_RES);   // ping-pong A
    let b = makeHalfFloatTarget(gl, SIM_RES, SIM_RES);
    const B = makeHalfFloatTarget(gl, SIM_RES, SIM_RES); // horizontal blur target
    const C = makeHalfFloatTarget(gl, SIM_RES, SIM_RES); // vertical blur target

    // Noise (RGBA8, repeats)
    const noiseTex = makeNoiseTexture(gl, NOISE_RES);

    // Uniform locations
    const u = {
      state: {
        state:    gl.getUniformLocation(stateProg, 'u_state'),
        blur:     gl.getUniformLocation(stateProg, 'u_blur'),
        noise:    gl.getUniformLocation(stateProg, 'u_noise'),
        simRes:   gl.getUniformLocation(stateProg, 'u_simRes'),
        noiseRes: gl.getUniformLocation(stateProg, 'u_noiseRes'),
        time:     gl.getUniformLocation(stateProg, 'u_time'),
        frame:    gl.getUniformLocation(stateProg, 'u_frame'),
      },
      hblur: {
        src:    gl.getUniformLocation(hblurProg, 'u_src'),
        srcRes: gl.getUniformLocation(hblurProg, 'u_srcRes'),
      },
      vblur: {
        src:    gl.getUniformLocation(vblurProg, 'u_src'),
        srcRes: gl.getUniformLocation(vblurProg, 'u_srcRes'),
      },
      image: {
        state:    gl.getUniformLocation(imageProg, 'u_state'),
        blur:     gl.getUniformLocation(imageProg, 'u_blur'),
        noise:    gl.getUniformLocation(imageProg, 'u_noise'),
        simRes:   gl.getUniformLocation(imageProg, 'u_simRes'),
        noiseRes: gl.getUniformLocation(imageProg, 'u_noiseRes'),
        resolution: gl.getUniformLocation(imageProg, 'u_resolution'),
        lightPos: gl.getUniformLocation(imageProg, 'u_lightPos'),
        time:     gl.getUniformLocation(imageProg, 'u_time'),
      },
    };

    const start = performance.now();
    let frame = 0;
    let renderFrame = 0;
    let raf = 0;
    let stopped = false;

    // Resize is layout-aware: read the parent's box (authoritative on first
    // paint, unlike `canvas.clientWidth` which can be 0 when the parent uses
    // `aspect-ratio` / `inset:0`). The previous bug: cw=0 on first frame
    // locked canvas.width to 1 and the hero rendered into a 1x1 buffer until
    // the user resized the window.
    const applySize = (cw: number, ch: number) => {
      if (cw <= 0 || ch <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(cw * dpr));
      const h = Math.max(1, Math.floor(ch * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
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

    const drawTri = () => gl.drawArrays(gl.TRIANGLES, 0, 3);

    const runStateStep = (t: number) => {
      gl.useProgram(stateProg);
      bindTri(stateProg);
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.fb);
      gl.viewport(0, 0, SIM_RES, SIM_RES);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex);    gl.uniform1i(u.state.state, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, C.tex);    gl.uniform1i(u.state.blur, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, noiseTex); gl.uniform1i(u.state.noise, 2);
      gl.uniform2f(u.state.simRes, SIM_RES, SIM_RES);
      gl.uniform2f(u.state.noiseRes, NOISE_RES, NOISE_RES);
      gl.uniform1f(u.state.time, t);
      gl.uniform1f(u.state.frame, frame);
      drawTri();
      const tmp = a; a = b; b = tmp;
      frame++;
    };

    const runBlur = () => {
      // horizontal: A → B
      gl.useProgram(hblurProg);
      bindTri(hblurProg);
      gl.bindFramebuffer(gl.FRAMEBUFFER, B.fb);
      gl.viewport(0, 0, SIM_RES, SIM_RES);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex); gl.uniform1i(u.hblur.src, 0);
      gl.uniform2f(u.hblur.srcRes, SIM_RES, SIM_RES);
      drawTri();
      // vertical: B → C
      gl.useProgram(vblurProg);
      bindTri(vblurProg);
      gl.bindFramebuffer(gl.FRAMEBUFFER, C.fb);
      gl.viewport(0, 0, SIM_RES, SIM_RES);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, B.tex); gl.uniform1i(u.vblur.src, 0);
      gl.uniform2f(u.vblur.srcRes, SIM_RES, SIM_RES);
      drawTri();
    };

    const runImage = (t: number) => {
      gl.useProgram(imageProg);
      bindTri(imageProg);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex);    gl.uniform1i(u.image.state, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, C.tex);    gl.uniform1i(u.image.blur, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, noiseTex); gl.uniform1i(u.image.noise, 2);
      gl.uniform2f(u.image.simRes, SIM_RES, SIM_RES);
      gl.uniform2f(u.image.noiseRes, NOISE_RES, NOISE_RES);
      gl.uniform2f(u.image.resolution, canvas.width, canvas.height);
      // light drifts very slowly in a Lissajous curve
      const lp = [
        0.5 + Math.sin(t * 0.035) * 0.28,
        0.5 + Math.cos(t * 0.028) * 0.22,
      ];
      gl.uniform2f(u.image.lightPos, lp[0]!, lp[1]!);
      gl.uniform1f(u.image.time, t);
      drawTri();
    };

    const tick = () => {
      if (stopped) return;
      resize();
      const t = (performance.now() - start) / 1000;

      // sim substeps — front-load during warmup so patterns develop, then
      // tick once every 5 animation frames (~12 Hz) so the field barely breathes
      const substeps = frame < 120 ? 2 : (renderFrame % 5 === 0 ? 1 : 0);
      for (let i = 0; i < substeps; i++) {
        runStateStep(t);
        runBlur();
      }
      runImage(t);
      renderFrame++;

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        display: 'block', width: '100%', height: '100%',
        ...style,
      }}
    />
  );
};
