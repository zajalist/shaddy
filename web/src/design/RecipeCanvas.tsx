// Live WebGL preview for the design route.
//
// Mounts the renderer, compiles the recipe on structural changes, and pushes
// uniform values every frame the recipe params change. Mirrors the logic in
// integration/AppShell.tsx so the design/ route behaves identically — same
// structuralKey split between recompile and setUniform, same uniform value
// coercion.
//
// Also owns the live `u_mouse` wiring: pointer position is sampled in the
// SAME centred / aspect-corrected coordinate space as `uv` inside compiled
// card snippets, so cards like `mouse_glow` can simply write
// `length(uv - u_mouse)` and get the screen-space distance to the cursor.
// The mapping is `((px - W/2) / H, (py - H/2) / H)` with Y flipped so up is
// positive (matches the way the compiler builds `uv` from `gl_FragCoord`).
// Pushes are throttled via rAF — at most one setUniform call per frame —
// and the uniform decays back to (0, 0) over ~300ms after the pointer
// leaves the canvas so abruptly-still mouse shaders don't jerk.

import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';

import {
  compile,
  useCardsStore,
  type CompiledShader,
} from '@/cards';
import { createRenderer, type RendererAPI, type Uniform } from '@/renderer';

export type RecipeCanvasProps = {
  /** Style applied to the host div. Use this to control aspect ratio + size. */
  style?: CSSProperties;
  className?: string;
};

// Decay time after pointer leaves — short enough to feel responsive,
// long enough that nothing visibly snaps.
const MOUSE_DECAY_MS = 300;

export const RecipeCanvas = ({ style, className }: RecipeCanvasProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAPI | null>(null);
  const structuralKeyRef = useRef<string>('');

  const recipe = useCardsStore((s) => s.recipe);
  const compiled: CompiledShader = useMemo(() => compile(recipe), [recipe]);

  // Mount once. In dev, React 18 StrictMode runs the effect twice — without
  // wiping the host, the second `createRenderer().mount(host)` appends a
  // SECOND canvas on top of the first (the first one stays in the DOM,
  // black, with its WebGL context still bound) and the live render becomes
  // invisible. Wipe + remount on every effect run so we always end up with
  // exactly one live canvas.
  //
  // A ResizeObserver keeps the drawing buffer in lockstep with the host's
  // CSS size × devicePixelRatio so retina / 4K displays render crisp. The
  // canvas element itself is sized 100%/100% by the renderer's mount(), so
  // its CSS layout doesn't change — only the backing buffer scales up.
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

    // devicePixelRatio can change at runtime when the window moves to a
    // different monitor. Listen for it via the matchMedia trick.
    let mql: MediaQueryList | null = null;
    const onDprChange = () => applyDprSize();
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mql.addEventListener?.('change', onDprChange);
    }

    // ─── live mouse → u_mouse (centred uv space) ────────────────────
    // Target & current values are tracked separately so we can drive a
    // simple easing decay when the pointer leaves — the rAF loop pulls
    // `cur` toward `target` each frame and pushes via setUniform.
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;
    let active = false;
    let lastLeaveAt = 0;
    let raf: number | null = null;

    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // Match the compiler's MAIN_PRELUDE: uv = (frag/res)*2 - 1; uv.x *= W/H.
      // Equivalently: uv.x = (px - W/2) / (H/2), uv.y = -(py - H/2) / (H/2),
      // i.e. /(H/2) not /H — we need to match the *body* coords cards see.
      const cx = (e.clientX - rect.left - rect.width / 2) / (rect.height / 2);
      const cy = -(e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      targetX = cx;
      targetY = cy;
      active = true;
    };
    const onLeave = () => {
      active = false;
      lastLeaveAt = performance.now();
      targetX = 0;
      targetY = 0;
    };
    const onEnter = () => {
      active = true;
    };

    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerenter', onEnter);
    host.addEventListener('pointerleave', onLeave);

    const tick = () => {
      const renderer = rendererRef.current;
      if (renderer) {
        if (active) {
          // Snap to target while pointer is live — coordinate updates
          // per-frame, never per pointermove (rAF throttle).
          curX = targetX;
          curY = targetY;
        } else {
          // Ease back to (0, 0) over MOUSE_DECAY_MS.
          const t = Math.min(1, (performance.now() - lastLeaveAt) / MOUSE_DECAY_MS);
          // Quintic ease-out for a soft settle.
          const k = 1 - (1 - t) ** 5;
          curX = curX + (targetX - curX) * k;
          curY = curY + (targetY - curY) * k;
        }
        renderer.setUniform('u_mouse', { kind: 'vec2', value: [curX, curY] });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerenter', onEnter);
      host.removeEventListener('pointerleave', onLeave);
      if (ro) ro.disconnect();
      if (mql) mql.removeEventListener?.('change', onDprChange);
      host.replaceChildren();
      rendererRef.current = null;
    };
  }, []);

  // Drive the renderer from compiled output: split between recompile (heavy)
  // and setUniform (cheap).
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const nextKey = structuralKey(compiled);
    if (nextKey !== structuralKeyRef.current) {
      const result = r.compile(compiled.glsl);
      structuralKeyRef.current = nextKey;
      if (!result.ok) {
        console.warn('[design] renderer rejected compiled shader:', result.errors);
      }
    }
    for (const u of compiled.uniforms) {
      r.setUniform(u.name, toRendererUniform(u.value));
    }
  }, [compiled]);

  return <div ref={hostRef} className={className} style={style} />;
};

// ─── helpers (copied from AppShell so design/ stays self-contained) ────

function structuralKey(c: CompiledShader): string {
  // Anything that affects the GLSL beyond marker comments. Marker comments
  // contain param values which change at every tick — strip them so a param
  // tick doesn't trigger a renderer recompile.
  return c.glsl.replace(/\{[^{}]*\}/g, '{}');
}

function toRendererUniform(value: number | readonly [number, number, number]): Uniform {
  if (Array.isArray(value)) {
    return { kind: 'vec3', value: [value[0], value[1], value[2]] };
  }
  return { kind: 'float', value: value as number };
}
