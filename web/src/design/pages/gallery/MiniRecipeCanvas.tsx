// Tiny self-contained WebGL preview for the gallery thumbnails.
//
// Independent of the cards Zustand store — takes a Recipe by prop and runs
// its own renderer instance. Mirrors the minimal subset of RecipeCanvas
// needed for a thumbnail:
//   - compile once per recipe change
//   - push uniforms on the same change
//   - keep the drawing buffer in sync with the host's CSS size × DPR
//   - for 3D recipes, drive a slow auto-orbit camera so the preview moves
//
// No mouse/keyboard controls, no animation system wiring — the renderer's
// internal u_time uniform already advances every frame so card snippets
// that read u_time animate on their own.

import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';

import {
  DEFAULT_CAMERA,
  compile,
  type CompiledShader,
  type Recipe,
} from '@/cards';
import { createRenderer, type RendererAPI, type Uniform } from '@/renderer';

export type MiniRecipeCanvasProps = {
  recipe: Recipe;
  /** When true, 3D thumbnails orbit slowly so the preview isn't a still frame.
   *  Defaults to true; pass false for snapshot-only contexts later. */
  autoOrbit?: boolean;
  style?: CSSProperties;
  className?: string;
};

// Slow orbit so the thumbnail is alive but not distracting. One full
// revolution every ~24 seconds.
const ORBIT_PERIOD_S = 24;

export const MiniRecipeCanvas = ({
  recipe,
  autoOrbit = true,
  style,
  className,
}: MiniRecipeCanvasProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAPI | null>(null);
  const structuralKeyRef = useRef<string>('');

  const compiled: CompiledShader = useMemo(() => compile(recipe), [recipe]);
  const is3d = recipe.mode === '3d';

  // Mount once per host element. Wipes children on every effect run so
  // React 18 StrictMode's double-mount doesn't leave a dead canvas behind.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();

    const r = createRenderer();
    r.mount(host);
    rendererRef.current = r;
    structuralKeyRef.current = '';

    const applyDprSize = () => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const w = Math.max(1, Math.floor(host.clientWidth * dpr));
      const h = Math.max(1, Math.floor(host.clientHeight * dpr));
      r.resize(w, h);
    };
    applyDprSize();

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => applyDprSize())
      : null;
    if (ro) ro.observe(host);

    // ─── slow auto-orbit ─────────────────────────────────────────
    // Always running — for 2D recipes the u_cam_* uniforms are inert,
    // so the per-frame writes are free.
    const startedAt = performance.now();
    let raf: number | null = null;
    const tick = () => {
      const renderer = rendererRef.current;
      if (renderer) {
        if (is3d && autoOrbit) {
          const t = (performance.now() - startedAt) / 1000;
          const theta = (t / ORBIT_PERIOD_S) * Math.PI * 2;
          const baseDist = Math.hypot(
            DEFAULT_CAMERA.eye[0] - DEFAULT_CAMERA.target[0],
            DEFAULT_CAMERA.eye[2] - DEFAULT_CAMERA.target[2],
          );
          const eyeX = DEFAULT_CAMERA.target[0] + Math.sin(theta) * baseDist;
          const eyeZ = DEFAULT_CAMERA.target[2] + Math.cos(theta) * baseDist;
          renderer.setUniform('u_cam_eye',    { kind: 'vec3', value: [eyeX, DEFAULT_CAMERA.eye[1], eyeZ] });
          renderer.setUniform('u_cam_target', { kind: 'vec3', value: [DEFAULT_CAMERA.target[0], DEFAULT_CAMERA.target[1], DEFAULT_CAMERA.target[2]] });
          renderer.setUniform('u_cam_up',     { kind: 'vec3', value: [DEFAULT_CAMERA.up[0], DEFAULT_CAMERA.up[1], DEFAULT_CAMERA.up[2]] });
        } else if (is3d) {
          // Static defaults — still push so the shader's `u_cam_*` reads
          // resolve (the renderer initialises floats/vecs to zero
          // otherwise and the scene would be locked at the origin).
          renderer.setUniform('u_cam_eye',    { kind: 'vec3', value: [DEFAULT_CAMERA.eye[0],    DEFAULT_CAMERA.eye[1],    DEFAULT_CAMERA.eye[2]   ] });
          renderer.setUniform('u_cam_target', { kind: 'vec3', value: [DEFAULT_CAMERA.target[0], DEFAULT_CAMERA.target[1], DEFAULT_CAMERA.target[2]] });
          renderer.setUniform('u_cam_up',     { kind: 'vec3', value: [DEFAULT_CAMERA.up[0],     DEFAULT_CAMERA.up[1],     DEFAULT_CAMERA.up[2]    ] });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      host.replaceChildren();
      rendererRef.current = null;
    };
  }, [is3d, autoOrbit]);

  // Compile + push uniforms whenever the compiled output changes. Same
  // structural-key trick as RecipeCanvas — only pay for a recompile when
  // the GLSL shape changed; otherwise just push uniform values.
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const nextKey = structuralKey(compiled);
    if (nextKey !== structuralKeyRef.current) {
      const result = r.compile(compiled.glsl);
      structuralKeyRef.current = nextKey;
      if (!result.ok) {
        // Thumbnails are non-critical — log once, don't surface to the UI.
        console.warn('[gallery] thumbnail shader rejected:', result.errors);
      }
    }
    for (const u of compiled.uniforms) {
      // Skip media param uniforms (image/video) — gallery thumbnails don't
      // wire texture sources and would crash if string values went to the
      // float/vec3 path.
      if (typeof u.value === 'string') continue;
      r.setUniform(u.name, toRendererUniform(u.value));
    }
  }, [compiled]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ ...style, position: style?.position ?? 'relative', overflow: 'hidden' }}
    />
  );
};

// ─── helpers (mirror RecipeCanvas) ────────────────────────────────────────

function structuralKey(c: CompiledShader): string {
  return c.glsl.replace(/\{[^{}]*\}/g, '{}');
}

function toRendererUniform(value: number | readonly [number, number, number]): Uniform {
  if (Array.isArray(value)) {
    return { kind: 'vec3', value: [value[0], value[1], value[2]] };
  }
  return { kind: 'float', value: value as number };
}
