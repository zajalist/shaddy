/* eslint-disable @typescript-eslint/no-explicit-any */
// Backend client. UX never touches WebSockets directly — it calls
// optimizePhoto() and gets an async iterator of frames (or a final result).
//
// In dev, VITE_BACKEND_URL=http://localhost:8000 by default. Set to a Modal /
// cloudflared URL for prod / phone testing.

import type { OptimizeAccepted, OptimizeFrame, OptimizeRequest, TemplateId } from '../shared/backend-types';

export const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL ?? 'http://localhost:8000';

export type ProgressCallback = (frame: OptimizeFrame) => void;

/**
 * POST the image to the backend, open the WS to its job stream, forward each
 * frame to `onFrame`. Resolves when the server closes the WS (after a done /
 * error frame) or when the connection drops.
 *
 * Throws on initial POST failure (e.g. 400 cuda unavailable, 503 busy, 422
 * validation). After the WS opens, all errors arrive as `ErrorFrame`s.
 */
export async function optimizePhoto(
  file: File,
  templateId: TemplateId,
  onFrame: ProgressCallback,
  opts?: { device?: 'auto' | 'cuda' | 'cpu' },
): Promise<void> {
  const image_base64 = await _fileToBase64(file);
  const body: OptimizeRequest = {
    template_id: templateId,
    image_base64,
    device: opts?.device ?? 'auto',
  };

  const r = await fetch(`${BACKEND_URL}/optimize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      if (typeof j?.error === 'string') msg = j.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const accepted: OptimizeAccepted = await r.json();
  const wsUrl = _toWsUrl(BACKEND_URL, accepted.ws_url);

  await _streamWs(wsUrl, onFrame);
}

async function _fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function _toWsUrl(httpBase: string, path: string): string {
  // ws://localhost:8000/optimize/stream/<id>
  const base = httpBase.replace(/^http/, 'ws');
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
}

function _streamWs(url: string, onFrame: ProgressCallback): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.onmessage = (evt) => {
      try {
        const frame: OptimizeFrame = JSON.parse(String(evt.data));
        onFrame(frame);
      } catch (e) {
        reject(e instanceof Error ? e : new Error('bad frame'));
      }
    };
    ws.onclose = () => resolve();
    ws.onerror = () => reject(new Error('websocket connection error'));
  });
}
