import { describe, expect, it } from 'vitest';
import {
  FpsWatchdog,
  FPS_HALVE_THRESHOLD,
  FPS_HALVE_WINDOW_MS,
  MIN_DRAWING_BUFFER_SIDE_PX,
  MOBILE_MAX_LONG_SIDE_PX,
  halveBufferSize,
  initialBufferSize,
} from './mobile-perf';

describe('initialBufferSize', () => {
  it('returns css * dpr on desktop', () => {
    expect(
      initialBufferSize({
        cssWidth: 800,
        cssHeight: 600,
        devicePixelRatio: 2,
        isCoarsePointer: false,
      }),
    ).toEqual({ width: 1600, height: 1200 });
  });

  it('returns css * dpr on mobile when under the cap', () => {
    // 400x600 at dpr 2 → 800x1200, long side 1200 ≤ 1280, no clamp.
    expect(
      initialBufferSize({
        cssWidth: 400,
        cssHeight: 600,
        devicePixelRatio: 2,
        isCoarsePointer: true,
      }),
    ).toEqual({ width: 800, height: 1200 });
  });

  it('clamps the long side on mobile when over the cap', () => {
    // 400 * 4 = 1600 long side → over 1280. Scale = 1280/1600 = 0.8.
    const size = initialBufferSize({
      cssWidth: 200,
      cssHeight: 400,
      devicePixelRatio: 4,
      isCoarsePointer: true,
    });
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(MOBILE_MAX_LONG_SIDE_PX);
    // Aspect ratio is preserved.
    expect(size.height / size.width).toBeCloseTo(2, 1);
  });

  it('never drops below MIN_DRAWING_BUFFER_SIDE_PX', () => {
    const size = initialBufferSize({
      cssWidth: 10,
      cssHeight: 10,
      devicePixelRatio: 1,
      isCoarsePointer: true,
    });
    expect(size.width).toBeGreaterThanOrEqual(MIN_DRAWING_BUFFER_SIDE_PX > 10 ? 10 : MIN_DRAWING_BUFFER_SIDE_PX);
  });
});

describe('halveBufferSize', () => {
  it('halves both dimensions', () => {
    expect(halveBufferSize({ width: 800, height: 600 })).toEqual({ width: 400, height: 300 });
  });

  it('clamps to MIN_DRAWING_BUFFER_SIDE_PX', () => {
    const size = halveBufferSize({ width: 100, height: 100 });
    expect(size.width).toBe(MIN_DRAWING_BUFFER_SIDE_PX);
    expect(size.height).toBe(MIN_DRAWING_BUFFER_SIDE_PX);
  });
});

describe('FpsWatchdog', () => {
  it('does not fire while fps is healthy', () => {
    const w = new FpsWatchdog();
    expect(w.shouldHalve(60, 0)).toBe(false);
    expect(w.shouldHalve(60, FPS_HALVE_WINDOW_MS + 100)).toBe(false);
  });

  it('does not fire on a brief dip', () => {
    const w = new FpsWatchdog();
    expect(w.shouldHalve(30, 0)).toBe(false);
    expect(w.shouldHalve(60, 500)).toBe(false);
  });

  it('fires after FPS stays below threshold for the full window', () => {
    const w = new FpsWatchdog();
    expect(w.shouldHalve(FPS_HALVE_THRESHOLD - 1, 0)).toBe(false);
    expect(w.shouldHalve(FPS_HALVE_THRESHOLD - 1, FPS_HALVE_WINDOW_MS - 1)).toBe(false);
    expect(w.shouldHalve(FPS_HALVE_THRESHOLD - 1, FPS_HALVE_WINDOW_MS + 10)).toBe(true);
  });

  it('only fires once', () => {
    const w = new FpsWatchdog();
    w.shouldHalve(10, 0);
    w.shouldHalve(10, FPS_HALVE_WINDOW_MS + 1);
    expect(w.shouldHalve(10, FPS_HALVE_WINDOW_MS * 3)).toBe(false);
  });

  it('ignores fps === 0 (counter not yet warm)', () => {
    const w = new FpsWatchdog();
    for (let t = 0; t < FPS_HALVE_WINDOW_MS * 2; t += 100) {
      expect(w.shouldHalve(0, t)).toBe(false);
    }
  });
});
