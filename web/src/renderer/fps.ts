// Rolling FPS counter over a fixed window (1 second by default). Pure data
// structure — pulled out of the runtime so it can be unit-tested without a
// WebGL context. The runtime calls `tick(now)` once per frame and reads
// `get()` whenever a consumer (e.g. UX debug HUD) asks.

export class FpsCounter {
  private readonly windowMs: number;
  private timestamps: number[] = [];

  constructor(windowMs = 1000) {
    this.windowMs = windowMs;
  }

  tick(nowMs: number): void {
    this.timestamps.push(nowMs);
    const cutoff = nowMs - this.windowMs;
    // Drop frames older than the window in one pass — typically O(1)
    // because rAF only ever drops at most one or two entries per call.
    let drop = 0;
    while (drop < this.timestamps.length && this.timestamps[drop]! < cutoff) drop++;
    if (drop > 0) this.timestamps.splice(0, drop);
  }

  get(): number {
    return this.timestamps.length;
  }

  reset(): void {
    this.timestamps = [];
  }
}
