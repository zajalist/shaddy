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
//
// 3D camera (mode === '3d' only):
//   - left-drag      orbit eye around target (yaw/pitch)
//   - alt+left-drag  pan: translate eye AND target together in the camera plane
//   - wheel          dolly: move eye toward/away along the look vector
//   - right-drag     free-look: rotate look direction in place
//   - WASDQE         while right-mouse is held — fly around in camera-local axes
//   - R / button     reset camera to defaults (animated, 350ms ease-out)
//
// While the user is dragging the camera, u_mouse updates are suppressed so
// mouse-driven 2D effects in any visible card don't jiggle in sympathy.

import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';

import {
  DEFAULT_CAMERA,
  compile,
  compileMultiPass,
  getPassCards,
  lookupCardDef,
  useCardsStore,
  uniformNameFor,
  type CameraVec3,
  type CameraView,
  type CompiledShader,
  type ParameterValue,
  type PassId,
} from '@/cards';
import { createRenderer, type MultiPassDef, type RendererAPI, type TextureSource, type Uniform } from '@/renderer';

import { CameraGizmo } from './CameraGizmo';

export type RecipeCanvasProps = {
  /** Style applied to the host div. Use this to control aspect ratio + size. */
  style?: CSSProperties;
  className?: string;
};

// Decay time after pointer leaves — short enough to feel responsive,
// long enough that nothing visibly snaps.
const MOUSE_DECAY_MS = 300;

// Orbit / free-look sensitivity (radians per pixel of mouse motion).
const ORBIT_SENSITIVITY = 0.0075;
const FREELOOK_SENSITIVITY = 0.0045;

// Dolly clamps — keep the eye sane so the user can't disappear into the
// target nor wander past the raymarcher's far plane.
const MIN_DISTANCE = 0.3;
const MAX_DISTANCE = 30;

// Pitch clamp — match the spec (±89°) so the camera can't flip upside-down.
const PITCH_LIMIT = (89 * Math.PI) / 180;

// WASD speeds — units per second. Shift × 3, Ctrl × 0.3.
const WASD_BASE_SPEED = 2.5;

// Reset animation duration.
const RESET_ANIM_MS = 350;

export const RecipeCanvas = ({ style, className }: RecipeCanvasProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAPI | null>(null);
  const structuralKeyRef = useRef<string>('');

  const recipe = useCardsStore((s) => s.recipe);
  const camera = useCardsStore((s) => s.camera);
  const setCamera = useCardsStore((s) => s.setCamera);
  // Multi-pass when any buffer passes are enabled, else fall through to the
  // back-compat single-pass path (which lets RendererAPI.compile stay the
  // happy path for single-pass recipes — and keeps existing tests stable).
  const hasBufferPasses = (recipe.passes?.length ?? 0) > 0;
  const compiled: CompiledShader = useMemo(() => compile(recipe), [recipe]);
  const compiledMulti = useMemo(
    () => (hasBufferPasses ? compileMultiPass(recipe) : null),
    [recipe, hasBufferPasses],
  );

  // Snapshot of the current recipe kept in a ref so the per-frame loop can
  // walk image/video params and push their texture uniforms without
  // re-attaching the rAF closure every recipe edit. The recipe itself is
  // the source of truth — we only read from this; never mutate.
  const recipeRef = useRef(recipe);
  useEffect(() => { recipeRef.current = recipe; }, [recipe]);

  const is3d = recipe.mode === '3d';

  // Snapshot of the current camera kept in a ref so the per-frame loop and
  // imperative event handlers always see the latest values without paying
  // the React re-render tax. The store is still the source of truth — we
  // setCamera() at the end of each interaction (and every few frames during
  // continuous WASD motion) so external readers (gizmo, future panels)
  // stay current.
  const cameraRef = useRef<CameraView>(camera);
  useEffect(() => { cameraRef.current = camera; }, [camera]);

  // Flag the per-frame mouse pusher checks — when true, u_mouse stops
  // tracking the cursor (so dragging the camera doesn't wobble cards that
  // use u_mouse for their own effects).
  const draggingRef = useRef(false);

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
      // While the camera controller is dragging, don't update the target.
      // The decay logic still runs so a card's u_mouse glow gently settles.
      if (draggingRef.current) return;
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

        // Per-frame camera uniform push. Cheap (3 vec3s) and always-on; the
        // 3D shader template references these uniforms and a no-op set on
        // the 2D template just silently lands in the renderer's uniform map.
        const cam = cameraRef.current;
        renderer.setUniform('u_cam_eye',    { kind: 'vec3', value: [cam.eye[0],    cam.eye[1],    cam.eye[2]   ] });
        renderer.setUniform('u_cam_target', { kind: 'vec3', value: [cam.target[0], cam.target[1], cam.target[2]] });
        renderer.setUniform('u_cam_up',     { kind: 'vec3', value: [cam.up[0],     cam.up[1],     cam.up[2]    ] });

        // Per-frame texture uniform push for image/video params. The
        // renderer's sampler2D path no-ops on identical non-video sources,
        // so images are effectively a one-shot upload while videos get a
        // fresh texImage2D every frame.
        pushTextureUniforms(renderer, recipeRef.current);
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
  // and setUniform (cheap). For multi-pass recipes we hand the renderer the
  // whole pipeline via compileMulti(); for single-pass we keep the original
  // compile() path so the back-compat single-pass surface is untouched.
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    if (compiledMulti) {
      const allGlsl = compiledMulti.passes.map((p) => `${p.id}::${structuralKey(p.shader)}`).join('||');
      if (allGlsl !== structuralKeyRef.current) {
        const defs: MultiPassDef[] = compiledMulti.passes.map((p) => ({
          id: p.id,
          fragmentSource: p.shader.glsl,
        }));
        const result = r.compileMulti(defs);
        structuralKeyRef.current = allGlsl;
        if (!result.ok) {
          console.warn('[design] renderer rejected multi-pass pipeline:', result.failures);
        }
      }
      // Push every pass's uniforms. Buffer-ref param values are STRINGS
      // ('a'..'d') and route to the sampler2D-buffer Uniform variant; the
      // multi-pass renderer resolves them to the appropriate FBO texture.
      // Other string values (image/video) skip — they're pushed every frame
      // by pushTextureUniforms.
      for (const pass of compiledMulti.passes) {
        for (const u of pass.shader.uniforms) {
          if (typeof u.value === 'string') {
            if (u.value === 'a' || u.value === 'b' || u.value === 'c' || u.value === 'd') {
              r.setUniform(u.name, { kind: 'sampler2D-buffer', value: u.value });
            }
            continue;
          }
          r.setUniform(u.name, toRendererUniform(u.value));
        }
      }
      return;
    }
    const nextKey = structuralKey(compiled);
    if (nextKey !== structuralKeyRef.current) {
      const result = r.compile(compiled.glsl);
      structuralKeyRef.current = nextKey;
      if (!result.ok) {
        console.warn('[design] renderer rejected compiled shader:', result.errors);
      }
    }
    for (const u of compiled.uniforms) {
      // Skip media-backed uniforms — those are pushed every frame by the
      // rAF loop's pushTextureUniforms (which has live access to the
      // HTMLImageElement / HTMLVideoElement via the Parameter.sourceRef).
      if (typeof u.value === 'string') continue;
      r.setUniform(u.name, toRendererUniform(u.value));
    }
  }, [compiled, compiledMulti]);

  // ─── 3D camera controller ──────────────────────────────────────────
  // Mouse buttons:
  //   left          → orbit around target
  //   alt + left    → pan (move eye + target together)
  //   right         → free-look (rotate look from eye, eye fixed); enables WASD
  //   wheel         → dolly
  // Reset (R key OR the on-canvas button) animates over RESET_ANIM_MS.
  //
  // The controller installs on the wrapper div that ALSO contains the
  // canvas. We need pointer events on this wrapper (not the canvas inside)
  // so the existing u_mouse pipeline above continues to receive raw events
  // — we just gate it via draggingRef while the user is camera-dragging.

  // Animated-reset state — when non-null, a rAF loop is interpolating
  // toward `to` and overrides any other camera mutation until done.
  const resetAnimRef = useRef<{ from: CameraView; to: CameraView; startedAt: number } | null>(null);

  // WASD continuous-motion state.
  const keysDownRef = useRef<Set<string>>(new Set());
  const wasdRafRef = useRef<number | null>(null);
  const wasdLastTickRef = useRef<number>(0);
  const rightMouseDownRef = useRef(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Reset animator — pulls the live camera from `from` to `to` over
  // RESET_ANIM_MS with an ease-out. Cancels itself on any non-anim camera
  // edit (drag handlers null out resetAnimRef before mutating).
  useEffect(() => {
    let raf: number | null = null;
    const step = () => {
      const anim = resetAnimRef.current;
      if (anim) {
        const t = Math.min(1, (performance.now() - anim.startedAt) / RESET_ANIM_MS);
        const k = 1 - (1 - t) ** 3;
        const next: CameraView = {
          eye:    lerp3(anim.from.eye,    anim.to.eye,    k),
          target: lerp3(anim.from.target, anim.to.target, k),
          up:     lerp3(anim.from.up,     anim.to.up,     k),
        };
        cameraRef.current = next;
        setCamera(next);
        if (t >= 1) resetAnimRef.current = null;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf !== null) cancelAnimationFrame(raf); };
  }, [setCamera]);

  const resetCamera = () => {
    resetAnimRef.current = {
      from: cameraRef.current,
      to: { ...DEFAULT_CAMERA },
      startedAt: performance.now(),
    };
  };

  // Mouse handlers + WASD loop. Installed only when 3D — in 2D mode the
  // controls would do nothing (uniforms are ignored) and we'd rather not
  // capture pointer events that the camera can't influence.
  useEffect(() => {
    if (!is3d) return;
    const el = wrapperRef.current;
    if (!el) return;

    // Local drag state — kept in closure so dragstart→move→end stays
    // consistent even if React re-renders mid-drag.
    type DragMode = 'orbit' | 'pan' | 'freelook' | null;
    let mode: DragMode = null;
    let lastX = 0, lastY = 0;
    let activePointerId: number | null = null;

    const beginDrag = (e: PointerEvent, m: DragMode) => {
      mode = m;
      lastX = e.clientX;
      lastY = e.clientY;
      activePointerId = e.pointerId;
      draggingRef.current = true;
      resetAnimRef.current = null;
      try { el.setPointerCapture(e.pointerId); } catch { /* no-op */ }
    };
    const endDrag = (e?: PointerEvent) => {
      mode = null;
      draggingRef.current = false;
      if (e && activePointerId !== null) {
        try { el.releasePointerCapture(activePointerId); } catch { /* no-op */ }
      }
      activePointerId = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      // Right-button: free-look (+ WASD enabled while held).
      if (e.button === 2) {
        e.preventDefault();
        rightMouseDownRef.current = true;
        beginDrag(e, 'freelook');
        startWasdLoop();
        return;
      }
      // Left-button: pan if Alt is held, otherwise orbit.
      if (e.button === 0) {
        e.preventDefault();
        beginDrag(e, e.altKey ? 'pan' : 'orbit');
        return;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!mode) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (mode === 'orbit')    applyOrbit(dx, dy);
      else if (mode === 'pan') applyPan(dx, dy, el.clientHeight);
      else if (mode === 'freelook') applyFreelook(dx, dy);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 2) {
        rightMouseDownRef.current = false;
        stopWasdLoop();
      }
      if (mode) endDrag(e);
    };

    // The browser's default context menu must NOT pop up on right-click —
    // we're consuming the right button for camera free-look.
    const onContextMenu = (e: MouseEvent) => { e.preventDefault(); };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Negative deltaY → wheel forward → zoom in (decrease distance).
      const factor = e.deltaY < 0 ? 1 / 1.12 : 1.12;
      applyDolly(factor);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('contextmenu', onContextMenu);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('contextmenu', onContextMenu);
      el.removeEventListener('wheel', onWheel as EventListener);
      stopWasdLoop();
      rightMouseDownRef.current = false;
      draggingRef.current = false;
    };
  }, [is3d]);

  // Keyboard tracking — global because the canvas isn't a focusable element
  // and we want WASD to work as soon as the right-mouse is held, regardless
  // of focus.
  useEffect(() => {
    if (!is3d) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture WASD while the user is typing into an input.
      if (isTextInputTarget(e.target)) return;
      if (e.key === 'r' || e.key === 'R') {
        // Only treat R as reset when the user isn't typing; mirrors the
        // PreviewFullscreen R-to-reset shortcut elsewhere in the app.
        resetCamera();
        return;
      }
      keysDownRef.current.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [is3d]);

  // ─── camera math (all closures over cameraRef + setCamera) ─────────
  // These are defined inside the component so they close over setCamera /
  // cameraRef. They mutate cameraRef synchronously so subsequent events in
  // the same frame compose correctly; setCamera() then publishes the
  // result back into the store so the gizmo + future panels re-render.

  function commit(next: CameraView): void {
    cameraRef.current = next;
    setCamera(next);
  }

  function applyOrbit(dxPx: number, dyPx: number): void {
    const cam = cameraRef.current;
    const offset = sub(cam.eye, cam.target);
    const dist = length(offset);
    // Convert the offset to spherical (yaw around world Y, pitch from XZ).
    let yaw   = Math.atan2(offset[0], offset[2]);
    let pitch = Math.asin(clamp(offset[1] / Math.max(1e-6, dist), -1, 1));
    yaw   -= dxPx * ORBIT_SENSITIVITY;
    pitch += dyPx * ORBIT_SENSITIVITY;
    pitch = clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
    const cp = Math.cos(pitch);
    const newOffset: CameraVec3 = [
      dist * cp * Math.sin(yaw),
      dist * Math.sin(pitch),
      dist * cp * Math.cos(yaw),
    ];
    commit({
      eye: add(cam.target, newOffset),
      target: cam.target,
      up: [0, 1, 0],
    });
  }

  function applyPan(dxPx: number, dyPx: number, canvasH: number): void {
    const cam = cameraRef.current;
    const forward = normalize(sub(cam.target, cam.eye));
    const right = normalize(cross(forward, cam.up));
    const up = cross(right, forward);
    // Convert screen pixels to world units. The 3D template uses an
    // implicit fov of atan(1/1.6) ≈ 32° half-angle, so the world span at
    // the focal plane is roughly distance / 1.6 per radius. The formula
    // below matches that scaling closely enough that 1px = ~1px on screen.
    const dist = length(sub(cam.target, cam.eye));
    const worldPerPx = (dist / 1.6) / Math.max(1, canvasH / 2);
    const dxWorld = -dxPx * worldPerPx;
    const dyWorld =  dyPx * worldPerPx;
    const delta: CameraVec3 = add(scale(right, dxWorld), scale(up, dyWorld));
    commit({
      eye:    add(cam.eye,    delta),
      target: add(cam.target, delta),
      up:     cam.up,
    });
  }

  function applyDolly(factor: number): void {
    const cam = cameraRef.current;
    const offset = sub(cam.eye, cam.target);
    const dist = length(offset);
    const nextDist = clamp(dist * factor, MIN_DISTANCE, MAX_DISTANCE);
    const dir = scale(offset, 1 / Math.max(1e-6, dist));
    commit({
      eye: add(cam.target, scale(dir, nextDist)),
      target: cam.target,
      up: cam.up,
    });
  }

  function applyFreelook(dxPx: number, dyPx: number): void {
    const cam = cameraRef.current;
    const forward = normalize(sub(cam.target, cam.eye));
    let yaw   = Math.atan2(forward[0], forward[2]);
    let pitch = Math.asin(clamp(forward[1], -1, 1));
    yaw   -= dxPx * FREELOOK_SENSITIVITY;
    pitch -= dyPx * FREELOOK_SENSITIVITY;
    pitch = clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
    const cp = Math.cos(pitch);
    const newForward: CameraVec3 = [
      cp * Math.sin(yaw),
      Math.sin(pitch),
      cp * Math.cos(yaw),
    ];
    const dist = length(sub(cam.target, cam.eye));
    commit({
      eye: cam.eye,
      target: add(cam.eye, scale(newForward, dist)),
      up: [0, 1, 0],
    });
  }

  function startWasdLoop(): void {
    if (wasdRafRef.current !== null) return;
    wasdLastTickRef.current = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - wasdLastTickRef.current) / 1000);
      wasdLastTickRef.current = now;
      if (rightMouseDownRef.current) {
        applyWasd(dt);
        wasdRafRef.current = requestAnimationFrame(tick);
      } else {
        wasdRafRef.current = null;
      }
    };
    wasdRafRef.current = requestAnimationFrame(tick);
  }

  function stopWasdLoop(): void {
    if (wasdRafRef.current !== null) {
      cancelAnimationFrame(wasdRafRef.current);
      wasdRafRef.current = null;
    }
  }

  function applyWasd(dt: number): void {
    const keys = keysDownRef.current;
    if (keys.size === 0) return;
    let mult = 1;
    if (keys.has('shift')) mult *= 3;
    if (keys.has('control')) mult *= 0.3;
    const speed = WASD_BASE_SPEED * mult * dt;

    const cam = cameraRef.current;
    const forward = normalize(sub(cam.target, cam.eye));
    const right = normalize(cross(forward, cam.up));
    const worldUp: CameraVec3 = [0, 1, 0];

    let delta: CameraVec3 = [0, 0, 0];
    if (keys.has('w')) delta = add(delta, scale(forward,  speed));
    if (keys.has('s')) delta = add(delta, scale(forward, -speed));
    if (keys.has('d')) delta = add(delta, scale(right,    speed));
    if (keys.has('a')) delta = add(delta, scale(right,   -speed));
    if (keys.has('e')) delta = add(delta, scale(worldUp,  speed));
    if (keys.has('q')) delta = add(delta, scale(worldUp, -speed));

    if (delta[0] === 0 && delta[1] === 0 && delta[2] === 0) return;
    commit({
      eye:    add(cam.eye,    delta),
      target: add(cam.target, delta),
      up:     cam.up,
    });
  }

  // ─── render ────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ ...style, position: style?.position ?? 'relative', overflow: 'hidden' }}
    >
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      {is3d && (
        <>
          <CameraGizmo
            camera={camera}
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              pointerEvents: 'none',
            }}
          />
          <button
            type="button"
            onClick={resetCamera}
            title="Reset camera (R)"
            aria-label="Reset camera to origin"
            style={originBtnStyle}
            // Stop pointerdown from bubbling to the camera controller; the
            // button is inside the wrapper and we don't want a click on it
            // to be misread as a left-drag orbit start.
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ResetGlyph />
            <span style={{ marginLeft: 6 }}>origin</span>
          </button>
        </>
      )}
    </div>
  );
};

// ─── helpers (copied from AppShell so design/ stays self-contained) ────

function structuralKey(c: CompiledShader): string {
  // Anything that affects the GLSL beyond marker comments. Marker comments
  // contain param values which change at every tick — strip them so a param
  // tick doesn't trigger a renderer recompile.
  return c.glsl.replace(/\{[^{}]*\}/g, '{}');
}

function toRendererUniform(value: ParameterValue): Uniform {
  if (Array.isArray(value)) {
    const v = value as readonly [number, number, number];
    return { kind: 'vec3', value: [v[0], v[1], v[2]] };
  }
  // String values are media references handled out-of-band; the caller
  // filters them before reaching here. Falling through with float(0) is
  // defensive — keeps the shader from latching the previous frame's value.
  if (typeof value === 'string') return { kind: 'float', value: 0 };
  return { kind: 'float', value: value as number };
}

// ─── Texture uniform pusher ────────────────────────────────────────────
// Walks the current recipe, finds image/video params with a live source
// attached, and pushes them as sampler2D uniforms. Cheap to call every
// frame: the renderer's sampler2D path no-ops identical non-video sources
// and re-uploads video frames automatically.

function pushTextureUniforms(renderer: RendererAPI, recipe: ReturnType<typeof useCardsStore.getState>['recipe']): void {
  // Walk EVERY pass (image + any enabled buffers) so multi-pass recipes
  // also get their image/video params bound. Each pass's uniform names are
  // independent (cardIndex is scoped per pass at compile time), so a
  // buffer pass's u_card0_source doesn't collide with image's.
  const allPasses: Array<{ id: PassId; cards: typeof recipe.cards }> = [
    { id: 'image', cards: recipe.cards },
    ...(recipe.passes ?? []).map((p) => ({ id: p.id, cards: p.cards })),
  ];
  for (const pass of allPasses) {
    pass.cards.forEach((card, cardIndex) => {
      if (card.kind !== 'typed') return;
      const def = lookupCardDef(card.type);
      if (!def) return;
      for (const [paramKey, paramDef] of Object.entries(def.params)) {
        if (paramDef.kind !== 'image' && paramDef.kind !== 'video') continue;
        const p = card.params[paramKey];
        const ref = p?.sourceRef;
        if (!ref) continue;
        const name = uniformNameFor(cardIndex, paramKey);
        renderer.setUniform(name, { kind: 'sampler2D', value: ref.element as TextureSource });
      }
    });
  }
  // Suppress unused-var lint in case getPassCards isn't otherwise used here.
  void getPassCards;
}

// ─── vector math (3D camera) ───────────────────────────────────────────

function add(a: CameraVec3, b: CameraVec3): CameraVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function sub(a: CameraVec3, b: CameraVec3): CameraVec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function scale(a: CameraVec3, s: number): CameraVec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function cross(a: CameraVec3, b: CameraVec3): CameraVec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function length(v: CameraVec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}
function normalize(v: CameraVec3): CameraVec3 {
  const len = length(v) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}
function lerp3(a: CameraVec3, b: CameraVec3, k: number): CameraVec3 {
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}
function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

function isTextInputTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return t.isContentEditable;
}

// ─── reset-camera button chrome ────────────────────────────────────────

const originBtnStyle: CSSProperties = {
  position: 'absolute',
  left: 8,
  bottom: 8,
  display: 'inline-flex',
  alignItems: 'center',
  height: 26,
  padding: '0 10px 0 8px',
  borderRadius: 4,
  background: 'rgba(0, 0, 0, 0.42)',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  cursor: 'pointer',
  font: '700 10px ui-monospace, SFMono-Regular, Menlo, monospace',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  backdropFilter: 'blur(4px)',
};

const ResetGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12 A9 9 0 1 0 6 5.5" />
    <path d="M3 5 V11 H9" />
  </svg>
);
