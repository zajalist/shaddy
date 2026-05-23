import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { optimizePhoto } from './backend-client';

// JSDOM doesn't ship a WebSocket; provide a tiny mock for the test.
class FakeWebSocket {
  static last: FakeWebSocket | null = null;
  url: string;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e?: unknown) => void) | null = null;
  onerror: ((e?: unknown) => void) | null = null;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.last = this;
  }
  pump(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  close() {
    this.onclose?.();
  }
}

const origFetch = globalThis.fetch;
const origWS = (globalThis as any).WebSocket;

beforeEach(() => {
  (globalThis as any).WebSocket = FakeWebSocket;
});

afterEach(() => {
  globalThis.fetch = origFetch;
  (globalThis as any).WebSocket = origWS;
  FakeWebSocket.last = null;
});

describe('optimizePhoto', () => {
  it('POSTs the request and forwards frames from the WS', async () => {
    globalThis.fetch = vi.fn(async (_input, init) => {
      // Verify body shape
      const body = JSON.parse(String((init as RequestInit | undefined)?.body));
      expect(body.template_id).toBe('plasma');
      expect(typeof body.image_base64).toBe('string');
      expect(body.image_base64.startsWith('data:image/png;base64,')).toBe(true);
      return new Response(
        JSON.stringify({
          job_id: 'j1',
          ws_url: '/optimize/stream/j1',
          resolved_device: 'cpu',
        }),
        { status: 202, headers: { 'content-type': 'application/json' } },
      ) as unknown as Response;
    }) as unknown as typeof fetch;

    const file = new File(
      [Uint8Array.from([0x89, 0x50, 0x4e, 0x47])],
      'pixel.png',
      { type: 'image/png' },
    );

    const frames: unknown[] = [];
    const promise = optimizePhoto(file, 'plasma', (f) => frames.push(f));

    // Poll for the FakeWebSocket to be constructed (FileReader + fetch + JSON
    // parse all need a few ticks). 200ms max — exits fast on success.
    const deadline = Date.now() + 200;
    while (FakeWebSocket.last === null && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(FakeWebSocket.last).not.toBeNull();

    // Stream a couple of frames + close.
    FakeWebSocket.last!.pump({
      type: 'progress',
      step: 0,
      total: 100,
      loss: 0.8,
      preview_b64: 'data:image/jpeg;base64,xx',
    });
    FakeWebSocket.last!.pump({
      type: 'done',
      final_params: { freq_x: 8.3 },
      glsl: '// final',
      loss: 0.05,
    });
    FakeWebSocket.last!.close();

    await promise;
    expect(frames).toHaveLength(2);
    expect((frames[0] as { type: string }).type).toBe('progress');
    expect((frames[1] as { type: string }).type).toBe('done');
  });

  it('throws when the POST returns a 4xx error', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'cuda requested but unavailable' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }) as unknown as Response,
    ) as unknown as typeof fetch;

    const file = new File([new Uint8Array(8)], 'pixel.png', { type: 'image/png' });
    await expect(optimizePhoto(file, 'plasma', () => {}, { device: 'cuda' })).rejects.toThrow(
      /cuda requested/,
    );
  });
});
