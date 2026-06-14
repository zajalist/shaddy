import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { SHADE, TYPE } from './tokens';
import { DEFAULT_CAMERA } from '@/cards';
import type { UniformBinding } from '@/cards';
import { TEMPLATE_RECIPES } from './templateRecipes';
import { buildTileFragment, TILE_VERT } from './templateFragment';
import { encodeRecipeToHash } from './recipe-url';
import type { TemplateVariant } from './templateVariants';

// ONE WebGL2 context for all 12 template tiles. Each tile is a regular CSS
// grid item (transparent bg, just borders + labels); the canvas behind them
// renders the COMPILED output of that tile's Recipe into the corresponding
// scissored viewport per frame. The recipe is the single source of truth —
// the same `compile()` the editor uses — so the preview is exactly what opens
// when you click the tile. (One shared context, because the landing page
// already runs several other canvases and 12 more would exceed the browser's
// per-page WebGL limit.)

export type { TemplateVariant } from './templateVariants';

const STATIC_T = 14.0; // frozen "nice frame" time — un-hovered tiles read as still

// Camera orbit radius in the xz plane for the hovered 3D tile.
const CAM_DIST = Math.hypot(
  DEFAULT_CAMERA.eye[0] - DEFAULT_CAMERA.target[0],
  DEFAULT_CAMERA.eye[2] - DEFAULT_CAMERA.target[2],
);

type ProgEntry = {
  prog: WebGLProgram;
  is3d: boolean;
  uTime: WebGLUniformLocation | null;
  uRes: WebGLUniformLocation | null;
  uOrigin: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
  uCamEye: WebGLUniformLocation | null;
  uCamTarget: WebGLUniformLocation | null;
  uCamUp: WebGLUniformLocation | null;
};

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
  const tileRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  // index of the tile under the cursor — only its shader advances in time.
  const hoveredRef = useRef<number | null>(null);

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

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
    });
    if (!gl) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);

    const compileShader = (type: number, src: string, name: string) => {
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

    const vs = compileShader(gl.VERTEX_SHADER, TILE_VERT, 'vertex');
    if (!vs) return;

    const setStaticUniforms = (prog: WebGLProgram, bindings: UniformBinding[]) => {
      gl.useProgram(prog);
      for (const u of bindings) {
        if (typeof u.value === 'string') continue; // media params — not used here
        const loc = gl.getUniformLocation(prog, u.name);
        if (!loc) continue;
        if (Array.isArray(u.value)) gl.uniform3f(loc, u.value[0], u.value[1], u.value[2]);
        else gl.uniform1f(loc, u.value as number);
      }
    };

    const buildProgram = (variant: TemplateVariant): ProgEntry | null => {
      const recipe = TEMPLATE_RECIPES[variant];
      if (!recipe) return null;
      const { fragSrc, compiled, is3d } = buildTileFragment(recipe);
      const fs = compileShader(gl.FRAGMENT_SHADER, fragSrc, `fragment ${variant}`);
      if (!fs) return null;
      const prog = gl.createProgram();
      if (!prog) return null;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn(`TemplatesShared link ${variant}:`, gl.getProgramInfoLog(prog));
        return null;
      }
      const entry: ProgEntry = {
        prog,
        is3d,
        uTime: gl.getUniformLocation(prog, 'u_time'),
        uRes: gl.getUniformLocation(prog, 'u_resolution'),
        uOrigin: gl.getUniformLocation(prog, 'u_tile_origin'),
        uMouse: gl.getUniformLocation(prog, 'u_mouse'),
        uCamEye: gl.getUniformLocation(prog, 'u_cam_eye'),
        uCamTarget: gl.getUniformLocation(prog, 'u_cam_target'),
        uCamUp: gl.getUniformLocation(prog, 'u_cam_up'),
      };
      setStaticUniforms(prog, compiled.uniforms);
      return entry;
    };

    const programs = new Map<TemplateVariant, ProgEntry | null>();
    for (const tpl of templates) {
      if (!programs.has(tpl.variant)) programs.set(tpl.variant, buildProgram(tpl.variant));
    }

    let stopped = false;
    let raf = 0;
    const start = performance.now();

    const tick = () => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);

      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const wrapperRect = wrapper.getBoundingClientRect();
      const W = Math.max(1, Math.floor(wrapperRect.width * dpr));
      const H = Math.max(1, Math.floor(wrapperRect.height * dpr));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }

      gl.viewport(0, 0, W, H);
      gl.scissor(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const time = (performance.now() - start) / 1000;
      const hov = hoveredRef.current;

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

        const p = programs.get(tpl.variant);
        if (!p) continue;

        gl.useProgram(p.prog);
        gl.viewport(x, y, w, h);
        gl.scissor(x, y, w, h);
        const hovered = i === hov;
        const tSec = hovered ? time : STATIC_T;
        if (p.uRes) gl.uniform2f(p.uRes, w, h);
        if (p.uOrigin) gl.uniform2f(p.uOrigin, x, y);
        if (p.uMouse) gl.uniform2f(p.uMouse, 0.5, 0.5);
        if (p.uTime) gl.uniform1f(p.uTime, tSec);

        if (p.is3d) {
          // Hovered 3D tile orbits; otherwise a fixed default view.
          const theta = hovered ? time * 0.5 : 0.6;
          const ex = DEFAULT_CAMERA.target[0] + Math.sin(theta) * CAM_DIST;
          const ez = DEFAULT_CAMERA.target[2] + Math.cos(theta) * CAM_DIST;
          if (p.uCamEye) gl.uniform3f(p.uCamEye, ex, DEFAULT_CAMERA.eye[1], ez);
          if (p.uCamTarget) gl.uniform3f(p.uCamTarget, DEFAULT_CAMERA.target[0], DEFAULT_CAMERA.target[1], DEFAULT_CAMERA.target[2]);
          if (p.uCamUp) gl.uniform3f(p.uCamUp, DEFAULT_CAMERA.up[0], DEFAULT_CAMERA.up[1], DEFAULT_CAMERA.up[2]);
        }

        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
    tick();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      // No loseContext — DOM removal frees it.
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
          <a
            key={t.name}
            ref={(el) => { tileRefs.current[i] = el; }}
            href={`/design#${encodeRecipeToHash(TEMPLATE_RECIPES[t.variant])}`}
            onMouseEnter={() => { hoveredRef.current = i; }}
            onMouseLeave={() => { if (hoveredRef.current === i) hoveredRef.current = null; }}
            title="Open in editor — built from blocks"
            style={{
              position: 'relative',
              display: 'block',
              textDecoration: 'none',
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
          </a>
        ))}
      </div>
    </div>
  );
};
