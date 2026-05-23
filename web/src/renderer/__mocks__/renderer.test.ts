import { afterEach, describe, expect, it } from 'vitest';
import { createRenderer } from './renderer';

afterEach(() => {
  document.body.innerHTML = '';
  document.getElementById('shaddy-mock-renderer-keyframes')?.remove();
});

describe('mock renderer', () => {
  it('compile always returns { ok: true }', () => {
    const r = createRenderer();
    expect(r.compile('whatever')).toEqual({ ok: true });
    expect(r.compile('still anything')).toEqual({ ok: true });
  });

  it('mount appends an animated gradient div to the host', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const r = createRenderer();
    r.mount(host);
    const surface = host.querySelector<HTMLDivElement>('[data-shaddy-mock="true"]');
    expect(surface).not.toBeNull();
    expect(surface?.style.backgroundImage).toContain('linear-gradient');
    expect(surface?.style.animation).toContain('shaddy-mock-gradient');
  });

  it('mount is idempotent and does not duplicate the surface', () => {
    const host = document.createElement('div');
    const r = createRenderer();
    r.mount(host);
    r.mount(host);
    r.mount(host);
    expect(host.querySelectorAll('[data-shaddy-mock="true"]').length).toBe(1);
  });

  it('snapshot returns a PNG data URL', async () => {
    const r = createRenderer();
    const url = await r.snapshot();
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('getFps returns a positive number', () => {
    expect(createRenderer().getFps()).toBeGreaterThan(0);
  });

  it('setUniform and resize never throw', () => {
    const r = createRenderer();
    expect(() => r.setUniform('u_color', { kind: 'vec3', value: [1, 0, 0] })).not.toThrow();
    expect(() => r.setUniform('u_color', null)).not.toThrow();
    expect(() => r.resize(800, 600)).not.toThrow();
  });

  it('onCompile fires exactly once on first compile, not on later compiles', () => {
    const r = createRenderer();
    const calls: Array<{ ok: boolean }> = [];
    r.onCompile((res) => calls.push(res));
    r.compile('one');
    r.compile('two');
    r.compile('three');
    expect(calls.length).toBe(1);
    expect(calls[0]).toEqual({ ok: true });
  });

  it('onCompile subscribers added after first compile fire immediately', () => {
    const r = createRenderer();
    r.compile('first');
    const calls: Array<{ ok: boolean }> = [];
    r.onCompile((res) => calls.push(res));
    expect(calls.length).toBe(1);
    expect(calls[0]).toEqual({ ok: true });
  });

  it('onCompile returns a working unsubscribe', () => {
    const r = createRenderer();
    const calls: number[] = [];
    const off = r.onCompile(() => calls.push(1));
    off();
    r.compile('first');
    expect(calls.length).toBe(0);
  });
});
