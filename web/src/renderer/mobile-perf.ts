// Mobile perf policy. Pure functions — pulled out so they're unit-testable
// without DOM/WebGL.
//
// Two guardrails (see issue #13 + renderer/README.md):
//   1. Initial drawing-buffer cap: on coarse-pointer devices, clamp the
//      longest side to MOBILE_MAX_LONG_SIDE_PX.
//   2. FPS watchdog: when the rolling FPS sits below FPS_HALVE_THRESHOLD
//      for FPS_HALVE_WINDOW_MS continuous milliseconds, halve the
//      drawing-buffer dimensions (at most once per mount).

export const MOBILE_MAX_LONG_SIDE_PX = 1280;
export const FPS_HALVE_THRESHOLD = 45;
export const FPS_HALVE_WINDOW_MS = 2000;
export const MIN_DRAWING_BUFFER_SIDE_PX = 256;

export type BufferSize = { width: number; height: number };

export function initialBufferSize(opts: {
  cssWidth: number;
  cssHeight: number;
  devicePixelRatio: number;
  isCoarsePointer: boolean;
}): BufferSize {
  const { cssWidth, cssHeight, devicePixelRatio: dpr, isCoarsePointer } = opts;
  const w = Math.max(1, cssWidth) * Math.max(0.25, dpr);
  const h = Math.max(1, cssHeight) * Math.max(0.25, dpr);

  if (!isCoarsePointer) {
    return { width: Math.floor(w), height: Math.floor(h) };
  }

  const longSide = Math.max(w, h);
  if (longSide <= MOBILE_MAX_LONG_SIDE_PX) {
    return { width: Math.floor(w), height: Math.floor(h) };
  }
  const scale = MOBILE_MAX_LONG_SIDE_PX / longSide;
  return {
    width: Math.max(MIN_DRAWING_BUFFER_SIDE_PX, Math.floor(w * scale)),
    height: Math.max(MIN_DRAWING_BUFFER_SIDE_PX, Math.floor(h * scale)),
  };
}

export function halveBufferSize(current: BufferSize): BufferSize {
  return {
    width: Math.max(MIN_DRAWING_BUFFER_SIDE_PX, Math.floor(current.width / 2)),
    height: Math.max(MIN_DRAWING_BUFFER_SIDE_PX, Math.floor(current.height / 2)),
  };
}

/**
 * Stateful watchdog: feed it the current fps + timestamp each frame, and it
 * returns true once when the rolling fps has stayed below the threshold
 * continuously for FPS_HALVE_WINDOW_MS. After firing once, it stays inert
 * for the lifetime of the watchdog (caller creates a fresh one to re-arm).
 */
export class FpsWatchdog {
  private lowSince: number | null = null;
  private fired = false;

  shouldHalve(fps: number, nowMs: number): boolean {
    if (this.fired) return false;
    // fps === 0 means the counter hasn't filled up yet — don't act on it.
    if (fps === 0 || fps >= FPS_HALVE_THRESHOLD) {
      this.lowSince = null;
      return false;
    }
    if (this.lowSince === null) {
      this.lowSince = nowMs;
      return false;
    }
    if (nowMs - this.lowSince >= FPS_HALVE_WINDOW_MS) {
      this.fired = true;
      return true;
    }
    return false;
  }
}

export function isCoarsePointerDevice(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(pointer: coarse)').matches;
}
