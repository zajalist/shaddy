import { describe, expect, it } from 'vitest';
import {
  emitBlockOpen,
  emitBlockClose,
  emitRecipeHeader,
  parseAllBlockMarkers,
  parseRecipeHeader,
  BLOCK_OPEN_REGEX,
} from './markers';

describe('emit', () => {
  it('emitBlockOpen produces a single-line marker with id, type, JSON params', () => {
    const out = emitBlockOpen('b1', 'ripple', { freq: { value: 10 } });
    expect(out).toBe('// @shade:block id="b1" type="ripple" params={"freq":{"value":10}}');
    expect(out.includes('\n')).toBe(false);
  });

  it('emitBlockClose mirrors id', () => {
    expect(emitBlockClose('b1')).toBe('// @shade:end b1');
  });

  it('emitRecipeHeader carries tempo + aspect', () => {
    expect(emitRecipeHeader({ globalTempo: 132, canvasAspect: 'portrait' })).toBe(
      '// @shade:recipe tempo=132 aspect=portrait',
    );
  });
});

describe('parse', () => {
  it('parses all block markers in document order', () => {
    const src = [
      'void main() {',
      '  // @shade:block id="b1" type="radial_gradient" params={"softness":{"value":1}}',
      '  d = 1.0;',
      '  // @shade:end b1',
      '  // @shade:block id="b2" type="ripple" params={"freq":{"value":8,"animation":null}}',
      '  d = sin(d);',
      '  // @shade:end b2',
      '}',
    ].join('\n');
    const markers = parseAllBlockMarkers(src);
    expect(markers.length).toBe(2);
    expect(markers[0]).toMatchObject({ id: 'b1', type: 'radial_gradient' });
    expect(markers[0]!.params).toEqual({ softness: { value: 1 } });
    expect(markers[1]).toMatchObject({ id: 'b2', type: 'ripple' });
  });

  it('parseRecipeHeader extracts tempo + aspect', () => {
    const src = '// @shade:recipe tempo=120 aspect=square\nvoid main() {}';
    expect(parseRecipeHeader(src)).toEqual({ globalTempo: 120, canvasAspect: 'square' });
  });

  it('parseRecipeHeader returns null when absent', () => {
    expect(parseRecipeHeader('void main() {}')).toBeNull();
  });

  it('regex tolerates whitespace variation in the marker', () => {
    const line = '//   @shade:block  id="x"  type="y"  params={}';
    expect(BLOCK_OPEN_REGEX.test(line)).toBe(true);
  });

  it('silently skips markers whose params JSON is malformed', () => {
    // The contract says malformed JSON is dropped so the caller can detect
    // via count mismatch and surface the failure on its own terms.
    const src = '// @shade:block id="b1" type="ripple" params={not valid json}';
    expect(parseAllBlockMarkers(src)).toEqual([]);
  });

  it('round-trips an empty params object', () => {
    const emitted = emitBlockOpen('b1', 'ripple', {});
    const parsed = parseAllBlockMarkers(emitted);
    expect(parsed.length).toBe(1);
    expect(parsed[0]!.params).toEqual({});
  });

  it('parseAllBlockMarkers is robust to prior /g state on the exported regex', () => {
    // Trip the foot-gun: run `.test()` on the exported regex first so
    // lastIndex moves to a non-zero offset. parseAllBlockMarkers must
    // STILL return the marker because it clones internally.
    const src = '// @shade:block id="b1" type="ripple" params={"freq":{"value":10}}';
    BLOCK_OPEN_REGEX.test(src);
    expect(parseAllBlockMarkers(src).length).toBe(1);
  });
});
