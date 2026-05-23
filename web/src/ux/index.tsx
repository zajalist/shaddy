import type { RendererAPI, GLSLError } from '../renderer';

export interface AppShellProps {
  renderer: RendererAPI;
  editorSource: string;
  onEditorSourceChange: (next: string) => void;
  errors: GLSLError[];
  onPhotoMatch: (file: File, templateId: string) => Promise<void>;
}

export function AppShell(_props: AppShellProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white">
      <h1 className="text-4xl font-bold tracking-tight">Shaddy</h1>
    </div>
  );
}

// ---- Share URL ----
// Format: #v=1&s=<base64url(source)>[&u=<base64url(json(uniforms))>]
// Source is base64url-encoded. Versioned via `v` so we can bump format later.

const _SHARE_VERSION = '1';

export function encodeShareUrl(state: { source: string; uniforms?: Record<string, number> }): string {
  const base =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  const s = _b64uEncode(state.source);
  const params = new URLSearchParams();
  params.set('v', _SHARE_VERSION);
  params.set('s', s);
  if (state.uniforms && Object.keys(state.uniforms).length > 0) {
    params.set('u', _b64uEncode(JSON.stringify(state.uniforms)));
  }
  return `${base}#${params.toString()}`;
}

export function decodeShareUrl(
  url: string,
): { source: string; uniforms?: Record<string, number> } | null {
  try {
    const hashIdx = url.indexOf('#');
    if (hashIdx < 0) return null;
    const params = new URLSearchParams(url.slice(hashIdx + 1));
    if (params.get('v') !== _SHARE_VERSION) return null;
    const s = params.get('s');
    if (!s) return null;
    const source = _b64uDecode(s);
    const uRaw = params.get('u');
    const uniforms = uRaw ? (JSON.parse(_b64uDecode(uRaw)) as Record<string, number>) : undefined;
    return uniforms ? { source, uniforms } : { source };
  } catch {
    return null;
  }
}

function _b64uEncode(s: string): string {
  const bytes =
    typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : _bytesFromUtf8Fallback(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  const b64 = typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function _b64uDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(bytes) : _utf8FromBytesFallback(bytes);
}

function _bytesFromUtf8Fallback(s: string): Uint8Array {
  return new Uint8Array(Array.from(s).map((c) => c.charCodeAt(0)));
}

function _utf8FromBytesFallback(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes);
}
