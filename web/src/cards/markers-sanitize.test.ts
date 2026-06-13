import { describe, expect, it } from 'vitest';
import { formatCardMarker, findAllMarkers, sanitizeMarkerText } from './markers';

// A user-controlled friendlyName (macro name / wildcard display name) must not
// be able to inject a second marker line or forge a composition tag — that
// would desync the reverse parser's marker-count==card-count check and bail
// the whole document. See compiler-review roadmap (marker-injection-sanitize).
describe('marker text sanitization', () => {
  it('a newline-injected marker prefix cannot create a second //#card line', () => {
    const marker = formatCardMarker({ cardId: 'c0', friendlyName: 'foo\n//#card INJECTED hax' });
    // The whole marker stays ONE line → findAllMarkers sees exactly one marker.
    const source = `${marker}\n  d = 1.0;\n//#end`;
    expect(findAllMarkers(source).length).toBe(1);
    expect(marker.split('\n').length).toBe(1);
  });

  it('an embedded @{...} in the name cannot forge composition', () => {
    const marker = formatCardMarker({ cardId: 'c0', friendlyName: 'evil @{"alpha":0}' });
    const parsed = findAllMarkers(`${marker}\n//#end`)[0];
    expect(parsed?.alpha).toBeUndefined(); // no forged alpha
  });

  it('a genuine composition tag still parses on a sanitized marker', () => {
    const marker = formatCardMarker({ cardId: 'c0', friendlyName: 'Glow', alpha: 0.5, blend: 'add' });
    const parsed = findAllMarkers(`${marker}\n//#end`)[0];
    expect(parsed?.alpha).toBe(0.5);
    expect(parsed?.blend).toBe('add');
  });

  it('is idempotent and leaves clean names untouched', () => {
    expect(sanitizeMarkerText('Radial gradient')).toBe('Radial gradient');
    const once = sanitizeMarkerText('a\n//#b @{x}');
    expect(sanitizeMarkerText(once)).toBe(once);
  });
});
