import { describe, expect, it } from 'vitest';

import { decodeShareUrl, encodeShareUrl } from './index';

describe('share URL round-trip', () => {
  it('encodes and decodes a simple source', () => {
    const source = `void main() {\n  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n}`;
    const url = encodeShareUrl({ source });
    const decoded = decodeShareUrl(url);
    expect(decoded).not.toBeNull();
    expect(decoded?.source).toBe(source);
  });

  it('preserves unicode in source', () => {
    const source = 'void main() { /* ☆★ */ gl_FragColor = vec4(0.0); }';
    const decoded = decodeShareUrl(encodeShareUrl({ source }));
    expect(decoded?.source).toBe(source);
  });

  it('returns null for url with no hash', () => {
    expect(decodeShareUrl('https://shaddy.app/')).toBeNull();
  });

  it('returns null for wrong version', () => {
    expect(decodeShareUrl('https://shaddy.app/#v=99&s=x')).toBeNull();
  });

  it('preserves uniforms when present', () => {
    const source = 'void main() {}';
    const uniforms = { u_freq: 3.14, u_amp: 0.5 };
    const decoded = decodeShareUrl(encodeShareUrl({ source, uniforms }));
    expect(decoded?.uniforms).toEqual(uniforms);
  });
});
