import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { SHADE, TYPE } from './tokens';
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

// Camera rig for 3D tiles — closer than the editor default so the shape fills
// the small preview, targeting the scene centre (origin).
const CAM_DIST = 3.0;
const CAM_EYE_Y = 1.1;

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
  // lets the JSX hover handlers kick the render loop (set inside the effect).
  const wakeRef = useRef<(() => void) | null>(null);

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
    let running = false; // is the per-frame loop active (only while hovering)?
    const start = performance.now();
    const dprNow = () => Math.min(window.devicePixelRatio || 1, 1.25);

    // Draw a single tile into its scissored sub-viewport at time tSec. When
    // clearRegion is true, clears only that tile's rect first (so the rest of
    // the preserved frame is untouched — used for the per-frame hover redraw).
    const drawTile = (i: number, tSec: number, wrapperRect: DOMRect, dpr: number, clearRegion: boolean) => {
      const tile = tileRefs.current[i];
      const tpl = templates[i];
      if (!tile || !tpl) return;
      const r = tile.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      // canvas/WebGL y is bottom-up; CSS rect.top is top-down.
      const localTop = r.top - wrapperRect.top;
      const tileH = r.height;
      const localBottom = wrapperRect.height - localTop - tileH;
      const x = Math.floor((r.left - wrapperRect.left) * dpr);
      const y = Math.floor(localBottom * dpr);
      const w = Math.max(1, Math.floor(r.width * dpr));
      const h = Math.max(1, Math.floor(tileH * dpr));
      const p = programs.get(tpl.variant);
      if (!p) return;
      gl.viewport(x, y, w, h);
      gl.scissor(x, y, w, h);
      if (clearRegion) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.useProgram(p.prog);
      const hovered = i === hoveredRef.current;
      if (p.uRes) gl.uniform2f(p.uRes, w, h);
      if (p.uOrigin) gl.uniform2f(p.uOrigin, x, y);
      if (p.uMouse) gl.uniform2f(p.uMouse, 0.5, 0.5);
      if (p.uTime) gl.uniform1f(p.uTime, tSec);
      if (p.is3d) {
        const theta = hovered ? tSec * 0.5 : 0.6;
        const ex = Math.sin(theta) * CAM_DIST;
        const ez = Math.cos(theta) * CAM_DIST;
        if (p.uCamEye) gl.uniform3f(p.uCamEye, ex, CAM_EYE_Y, ez);
        if (p.uCamTarget) gl.uniform3f(p.uCamTarget, 0, 0, 0);
        if (p.uCamUp) gl.uniform3f(p.uCamUp, 0, 1, 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Full repaint of every tile. Also (re)sizes the canvas. Non-hovered tiles
    // are frozen at STATIC_T so they read as still.
    const drawAll = () => {
      const dpr = dprNow();
      const wrapperRect = wrapper.getBoundingClientRect();
      const W = Math.max(1, Math.floor(wrapperRect.width * dpr));
      const H = Math.max(1, Math.floor(wrapperRect.height * dpr));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      gl.viewport(0, 0, W, H);
      gl.scissor(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const time = (performance.now() - start) / 1000;
      const hov = hoveredRef.current;
      for (let i = 0; i < templates.length; i++) {
        drawTile(i, i === hov ? time : STATIC_T, wrapperRect, dpr, false);
      }
    };

    // Per-frame loop runs ONLY while a tile is hovered, and redraws just that
    // one tile (the rest persist via preserveDrawingBuffer). Idle = no work.
    const frame = () => {
      if (stopped) return;
      const hov = hoveredRef.current;
      if (hov === null) { running = false; return; }
      const dpr = dprNow();
      const wrapperRect = wrapper.getBoundingClientRect();
      const time = (performance.now() - start) / 1000;
      drawTile(hov, time, wrapperRect, dpr, true);
      raf = requestAnimationFrame(frame);
    };

    // Repaint everything, then start the hover loop if a tile is hovered.
    const wake = () => {
      if (stopped) return;
      drawAll();
      if (hoveredRef.current !== null && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    wakeRef.current = wake;

    wake(); // initial static paint
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => wake()) : null;
    if (ro) ro.observe(wrapper);

    return () => {
      stopped = true;
      running = false;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      wakeRef.current = null;
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
            onMouseEnter={() => { hoveredRef.current = i; wakeRef.current?.(); }}
            onMouseLeave={() => { if (hoveredRef.current === i) { hoveredRef.current = null; wakeRef.current?.(); } }}
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
