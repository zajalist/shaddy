import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

// Hero backdrop — a full-bleed shader stage that cycles between several scenes
// every ~7s with a soft crossfade. Scene 0 is the "Arcane" fiery portal
// (chronos, shadertoy.com/view/wf3BWM) which keeps its built-in open-up splash;
// the others are self-contained raymarch scenes adapted from the supplied
// Shadertoy examples (orb/KIFS, log-polar field, camera-views). WebGL2 / GLSL
// ES 3.00. Each scene's helpers + macros are namespaced so they don't collide.
//
// (Inigo Quilez's clouds were skipped per his licence; the Neptune Racing scene
// needs texture channels we don't ship, so it's skipped too.)

const SCENE_COUNT = 3; // interior scenes: orb/KIFS, log-polar, camera-views
const HOLD = 5.6;   // seconds a scene is shown solid
const FADE = 1.4;   // seconds of crossfade into the next
const PERIOD = HOLD + FADE;

const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0., 1.); }
`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2  iResolution;
uniform float iTime;
uniform int   uA;     // current scene
uniform int   uB;     // next scene
uniform float uMix;   // 0..1 crossfade

out vec4 outColor;

// ============================ Scene 0 — Arcane portal ============================
float H = 1.8;
float f(vec3 p){
  float sdf = p.y;
  for(float j = .04; j < 6.; j+=j)
    sdf += (abs(dot(sin(p.z*.1 + p/j), vec3(.2)))-.1)*j;
  return sdf;
}
float sabs(float x){ float a = 0.3; return sqrt(x*x+a*a)-a; }
float f2(vec3 p){
  float sdf = p.y;
  for(float j = 2.56; j < 6.; j+=j)
    sdf += (sabs(dot(sin(p.z*.1 + p/j), vec3(.2)))-.1)*j;
  sdf = min(sdf, p.y+H);
  return sdf;
}
vec4 portal_target(float time, in vec3 ro, in vec3 rd){
  vec3 col = vec3(0);
  ro -= vec3(0,.8,4.*time);
  ro.x += -sin(time*.2) * 10.;
  rd.xy *= mat2(cos(cos(time*.2)*.25 + vec4(0,-11,11,0)));
  float t = 0.;
  ro.y += .2-1.5*f2(ro);
  ro.y = .5*(ro.y + H) + .5*sabs(ro.y + H)-H;
  float angle = .2 * (
    ((f2(ro) - f2(ro+vec3(0,0,1)))*.75+.15) +
    ((f2(ro+vec3(0,0,-.5)) - f2(ro+vec3(0,0,.5)))*.75+.15));
  float C = cos(angle), S = sin(angle);
  rd.yz *= mat2(C,S,-S,C);
  int i = 0; float T = 1.; float sdf = 9e9;
  for(; i < 60 && t < 1e2; i++){
    vec3 p = rd * t + ro;
    if(p.y < -H){ float fr = pow(clamp(1.+rd.y,0.,1.), 5.); p.y = abs(p.y+H)-H; T = fr; }
    sdf = f(p);
    float dt = sdf*.65 + 1e-3;
    t += dt;
    if(abs(sdf) < 1e-3){
      vec2 e = 5e-2*vec2(0,1);
      vec3 n = normalize(vec3(f(p+e.yxx), f(p+e.xyx), f(p+e.xxy))-sdf);
      col += pow(clamp(1.+dot(n,rd),0.,1.), 5.);
      break;
    }
    col += (.75+.25*sin(vec3(-1.75,2.5,1.3)+2.4*vec3(.3,.6,1)*sdf))*.1*sdf * exp2(-.5*sdf)*exp2(-.1*t) * T;
  }
  return vec4(col, 0);
}
vec3 triwave(vec3 x){ return abs(fract(.5*x/3.14159265-.25)-.5)*4.-1.; }

vec3 portalShell(out float insideMask){
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 r = iResolution.xy;
  vec2 uv = (fragCoord.xy*2.-r) / r.y;
  float t = iTime, d, i, z = 0.;
  float focal = 1.4;
  vec4 o = vec4(0,0,0,1);
  vec3 cam_pos = vec3(0, 1.5, 10.);
  vec3 rd = normalize(vec3(uv, -focal));
  {
    float time = iTime*.25;
    cam_pos += vec3(1.5*cos(time), 0, 2.*sin(time));
    float angle = cos(time)*.25;
    float c = cos(angle), s = sin(angle);
    rd.xz *= mat2(c,s,-s,c);
  }
  vec3 P = vec3(0,2.3,2.5);
  float h = 1.;
  float radius = smoothstep(0.,2., iTime)*3.;
  // The old ocean interior is disabled — the shell is just the fiery ring,
  // the energy field, glow and reflection. The interior is filled separately
  // by the cycling scenes (see main).
  vec4 portal_target_color = vec4(0);
  float D, D2; vec3 p = vec3(0); float transmission = 1.;
  for(i = 0.; i++<65. && z < 1e3;
    o += transmission*
      mix((cos(d/.1+vec4(1,2,2.5,0))+1.)/d*z, portal_target_color,
          smoothstep(0.0, -0.2, max(length(p-P) -radius, (p.z-P.z))))
      + 2.*(cos(-4.5*iTime+D/.1+vec4(1,2,2.5,0))+1.)*exp2(-D*D)*z
      + 10.*(cos(vec4(1,2,2.5,0))+1.)*exp2(-abs(D2))*z)
  {
    p = z*rd; vec3 q; p += cam_pos;
    D = length(p-P)-radius;
    D2 = length((p-vec3(P.x,-h,P.z))*vec3(1.5,10.,1.5))-radius;
    if(p.y < -h){ p.y= abs(p.y+h)-h; float F0=0.15; transmission = .8*(F0+(1.-F0)*pow(clamp(1.+rd.y,0.,1.),5.)); }
    else transmission = 1.;
    p.y += .8*sin(p.z*2. + iTime*2. - d*12.)*.3;
    float TT = 2.5*t-d*14.; float c = cos(TT), s = sin(TT);
    q = p-P; q.xy *= mat2(c,s,-s,c);
    for(d=1.;d++<9.;) q += triwave((q*d+t*2.)).yzx/d;
    d = .1*abs(length(p-P)-radius-p.z*.0) + abs(q.z)*.1;
    z += min(abs(p.y+h)*.4+.03, d);
  }
  o = o/1e4;
  o *= 1.-length(uv)*.2;
  o = sqrt(1.-exp(-1.5*o*o));
  float l = dot(o.rgb, vec3(0.299,0.587,0.114));
  o.rgb = mix(o.rgb, vec3(l)*vec3(1.05,0.97,0.80), 0.22);
  // how much this pixel falls inside the portal disc (drives the interior)
  float tca = max(dot(P - cam_pos, rd), 0.);
  float distAxis = length(P - (cam_pos + rd*tca));
  insideMask = (tca > 0.) ? smoothstep(radius, radius*0.78, distAxis) : 0.;
  return o.rgb;
}

// ============================ Interior scene 0 — Orb / KIFS ======================
#define ORB(c) ( length(p - vec3( sin(iTime*(c)*3e1)/2., sin(iTime*(c)*2e1)/2.+1.5, 1.2)) - (c)/4. )
float orbMap(vec3 p){
  float l, w;
  p.z += iTime*4.;
  p /= 3e1;
  p.xy -= 1.;
  p = clamp(p, -1.0, 1.0) * 2.0 - p;
  w = 1.;
  for (int j = 0; j++ < 8; w *= l)
    p = clamp(p, -4., 4.) * 2.0 - p,
    p *= l = 3./dot(p = sin(p), p);
  return length(p*3e1)/w - .0005;
}
vec3 sceneOrb(){
  vec2 u = gl_FragCoord.xy;
  float l = .001, i = 0., d = 0., s; vec4 o = vec4(0);
  vec3 D = normalize(vec3((u - iResolution.xy/2.)/iResolution.y, .4));
  D.y += 1.1;
  vec3 p;
  for(; i++ < 128.; o += s + vec4(1,2,3,0)/pow(l, d/2.))
    p = D * d,
    l = max(min(ORB(.02), min(ORB(.03), ORB(.04))), .001),
    d += s = min(l/2., orbMap(p));
  return tanh(o/d/1e1*exp(d/8e1)).rgb;
}

// ============================ Scene 2 — Log-polar field ==========================
vec3 sceneLog(){
  vec2 u = (gl_FragCoord.xy + gl_FragCoord.xy - iResolution.xy)/iResolution.y;
  vec3 p, D = normalize(vec3(u, .4));
  mat2 r = mat2(cos(iTime/4. + vec4(0,33,11,0)));
  float i = 0., d = 0., s, t = iTime;
  vec4 o = vec4(0);
  for(; i++ < 1e2;){
    p = D * d; p.z -= 1e1;
    p.xz *= r;
    for(s = .01; s < 3.; s += s){
      p += cos(2.*t + p.yzx/1e1)*.6;
      p -= abs(dot(sin(.03*p.z + t + p / s / 3.2), vec3(s)));
    }
    p.xy /= 4.;
    d += s = .08 + .5*abs(length(p) - 3e1);
    o += vec4(3.3,2,1,0)/s*d + 1e1*(1.+cos(i*.4 + vec4(2,1,0,0)))/s;
  }
  o = mix(o, o.zyxw, smoothstep(.2, 1., length(u)/2.));
  o = tanh(.2 + o*o/9e8);
  return o.rgb;
}

// ============================ Scene 3 — Camera views =============================
#define CM min(q.x, min(q.y, q.z))
#define CT (sin(iTime*.6)*234.+iTime*364.)
#define CR(a) mat2(cos((a)+vec4(0,33,11,0)))
float camMap(vec3 p){
  vec3 q; float s, c;
  q = p;
  q.z = p.z += iTime * 1e1;
  p.y -= 1e1;
  for (c = 7e1, s = 0.; c > .1; c *= .7){
    q = abs(fract(q/c)*c - c/2.) - c*.1;
    s = max(s, CM - c*.1);
    q.yz *= mat2(cos(CT/5e2 + vec4(0,33,11,0)));
    s = max(s, CM - c*.1);
    q = p;
  }
  c = .05 + .5*abs(6e2 - p.y + (cos(p.x/4e2) + cos(iTime*5. + (p.z - iTime*4.)/4e2)) * 8e1);
  return min(min(q.y + 1.75e2 - s/2., s), c);
}
vec3 sceneCam(){
  vec2 u = (gl_FragCoord.xy + gl_FragCoord.xy - iResolution.xy)/iResolution.y;
  float i = 0., d = 0., s, f = mod(iTime, 45.);
  vec3 p, D = vec3(u, 1);
  if (f < 15.){ p = vec3(0); D.xz *= CR(cos(-CT/1e3)*.5); }
  else if (f < 30.){ p = vec3(0, 1e2, 0); D.xz *= CR(CT/4e2); }
  else { p = vec3(0, -1e1, 0); D.yz *= CR(CT/8e2); }
  D = normalize(D);
  vec4 o = vec4(0);
  for (; i++ < 64.; o += (1. + cos(iTime))*s*4. + .01/max(s, .001))
    p += D * s,
    d += s = camMap(p);
  o *= mix(vec4(1), vec4(1,2,9,0), smoothstep(.025, .2, 1./d));
  o = tanh(o / 8. / max(d, 5e1));
  return o.rgb;
}

// =============================== Interior dispatcher =============================
vec3 evalScene(int idx){
  if (idx == 0) return sceneOrb();
  if (idx == 1) return sceneLog();
  return sceneCam();
}

void main(){
  // 1) the portal shell (fiery ring + energy + glow + reflection), always on
  float insideMask;
  vec3 col = portalShell(insideMask);

  // 2) the cycling scene, composited only inside the portal disc (the heavy
  //    raymarch is skipped for the ~80% of pixels outside the ring)
  if (insideMask > 0.001){
    vec3 scene = (uMix <= 0.001) ? evalScene(uA)
               : (uMix >= 0.999) ? evalScene(uB)
               : mix(evalScene(uA), evalScene(uB), uMix);
    float l = dot(scene, vec3(0.299, 0.587, 0.114));
    scene = mix(scene, vec3(l) * vec3(1.03, 0.99, 0.86), 0.12);
    col += scene * insideMask * 0.95;
  }

  col = max(col, vec3(0.015));
  outColor = vec4(col, 1.0);
}
`;

export const HeroPortal = ({ style }: { style?: CSSProperties }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) {
      console.warn('HeroPortal: WebGL2 unavailable');
      return;
    }

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn('HeroPortal compile:', gl.getShaderInfoLog(sh));
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
      console.warn('HeroPortal link:', gl.getProgramInfoLog(prog));
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
    const Aloc = gl.getUniformLocation(prog, 'uA');
    const Bloc = gl.getUniformLocation(prog, 'uB');
    const Mloc = gl.getUniformLocation(prog, 'uMix');

    let visible = true;
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) visible = e.isIntersecting; },
      { rootMargin: '120px' },
    );
    io.observe(canvas);

    // Cap render resolution — these raymarchers are heavy at full-bleed.
    const applySize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 0.85);
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
        const elapsed = (performance.now() - start) / 1000;
        const idx = Math.floor(elapsed / PERIOD);
        const phase = elapsed - idx * PERIOD;
        const a = idx % SCENE_COUNT;
        const b = (idx + 1) % SCENE_COUNT;
        const m = phase < HOLD ? 0 : (phase - HOLD) / FADE;
        gl.uniform2f(Rloc, canvas.width, canvas.height); // re-assert (StrictMode)
        gl.uniform1f(Tloc, elapsed);
        gl.uniform1i(Aloc, a);
        gl.uniform1i(Bloc, b);
        gl.uniform1f(Mloc, m);
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
