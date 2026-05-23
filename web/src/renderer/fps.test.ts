import { describe, expect, it } from 'vitest';
import { FpsCounter } from './fps';

describe('FpsCounter', () => {
  it('returns 0 before any tick', () => {
    expect(new FpsCounter().get()).toBe(0);
  });

  it('returns the count of frames in the rolling window', () => {
    const c = new FpsCounter(1000);
    // 60 ticks at ~16.67ms spans ~1000ms — should report 60.
    for (let i = 0; i < 60; i++) c.tick(i * (1000 / 60));
    expect(c.get()).toBe(60);
  });

  it('drops timestamps older than the window', () => {
    const c = new FpsCounter(1000);
    for (let i = 0; i < 60; i++) c.tick(i * 16);
    // Jump 5 seconds forward, then push one new frame.
    c.tick(60 * 16 + 5000);
    expect(c.get()).toBe(1);
  });

  it('reflects partial-second activity', () => {
    const c = new FpsCounter(1000);
    // 30 ticks at 33.3ms spans 1 second exactly — but only the last 1000ms
    // worth count.
    for (let i = 0; i < 30; i++) c.tick(i * (1000 / 30));
    expect(c.get()).toBeGreaterThanOrEqual(30);
  });

  it('reset clears state', () => {
    const c = new FpsCounter(1000);
    for (let i = 0; i < 10; i++) c.tick(i * 16);
    c.reset();
    expect(c.get()).toBe(0);
  });

  it('respects a custom window', () => {
    const c = new FpsCounter(500);
    for (let i = 0; i < 60; i++) c.tick(i * 16); // 60 frames over ~960ms
    // Only the last ~500ms (~31 frames) should remain.
    expect(c.get()).toBeLessThan(60);
    expect(c.get()).toBeGreaterThan(20);
  });
});
