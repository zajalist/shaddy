import { describe, expect, it } from 'vitest';
import {
  END_MARKER,
  MARKER_PREFIX,
  findAllMarkers,
  findEndLine,
  formatCardMarker,
  isEndMarker,
  parseCardMarker,
  sliceSpanBody,
} from './markers';

describe('formatCardMarker', () => {
  it('emits head-only marker when no param displays', () => {
    expect(formatCardMarker({ cardId: 'c0', friendlyName: 'Radial gradient' })).toBe(
      `${MARKER_PREFIX} c0 Radial gradient`,
    );
  });

  it('appends a {key:value, …} block when displays provided', () => {
    expect(
      formatCardMarker({
        cardId: 'c1',
        friendlyName: 'Ripple',
        paramDisplays: { frequency: '8', amplitude: '0.4' },
      }),
    ).toBe(`${MARKER_PREFIX} c1 Ripple { frequency:8, amplitude:0.4 }`);
  });

  it('drops the brace block when displays is empty', () => {
    expect(formatCardMarker({ cardId: 'c2', friendlyName: 'Palette', paramDisplays: {} })).toBe(
      `${MARKER_PREFIX} c2 Palette`,
    );
  });
});

describe('parseCardMarker', () => {
  it('parses a head-only marker', () => {
    expect(parseCardMarker(`${MARKER_PREFIX} c0 Radial gradient`, 5)).toEqual({
      lineNumber: 5,
      cardId: 'c0',
      friendlyName: 'Radial gradient',
    });
  });

  it('parses a marker with a param-display block', () => {
    expect(
      parseCardMarker(`${MARKER_PREFIX} c1 Ripple { frequency:8, amplitude:0.4 }`, 7),
    ).toEqual({ lineNumber: 7, cardId: 'c1', friendlyName: 'Ripple' });
  });

  it('tolerates leading whitespace and indentation', () => {
    expect(parseCardMarker(`    ${MARKER_PREFIX} c0 Vignette`, 3)).toEqual({
      lineNumber: 3,
      cardId: 'c0',
      friendlyName: 'Vignette',
    });
  });

  it('returns null for non-marker lines', () => {
    expect(parseCardMarker('void main() {', 1)).toBeNull();
    expect(parseCardMarker('// just a comment', 1)).toBeNull();
    expect(parseCardMarker('//#cardx not really', 1)).toBeNull();
    expect(parseCardMarker('', 1)).toBeNull();
    expect(parseCardMarker(END_MARKER, 1)).toBeNull();
  });

  it('returns null when the marker has no card id', () => {
    expect(parseCardMarker(`${MARKER_PREFIX}`, 1)).toBeNull();
    expect(parseCardMarker(`${MARKER_PREFIX}    `, 1)).toBeNull();
  });

  it('uses empty friendlyName when only the cardId is present', () => {
    expect(parseCardMarker(`${MARKER_PREFIX} c9`, 1)).toEqual({
      lineNumber: 1,
      cardId: 'c9',
      friendlyName: '',
    });
  });
});

describe('isEndMarker / findEndLine', () => {
  it('isEndMarker matches the //#end line exactly', () => {
    expect(isEndMarker(END_MARKER)).toBe(true);
    expect(isEndMarker(`  ${END_MARKER}  `)).toBe(true);
    expect(isEndMarker('//#end-of-something')).toBe(false);
    expect(isEndMarker('//#card c0 X')).toBe(false);
  });

  it('findEndLine returns 1-based line of the //#end', () => {
    const src = ['void main() {', '  // body', `${END_MARKER}`, '}'].join('\n');
    expect(findEndLine(src)).toBe(3);
  });

  it('findEndLine returns null when no //#end exists', () => {
    expect(findEndLine('void main() {}')).toBeNull();
  });
});

describe('findAllMarkers', () => {
  it('returns markers in document order with correct line numbers', () => {
    const src = [
      '// preamble',
      'void main() {',
      `  ${MARKER_PREFIX} c0 Radial gradient`,
      '  d = 1.0 - length(uv);',
      `  ${MARKER_PREFIX} c1 Ripple { frequency:8 }`,
      '  d = sin(d * u_card1_frequency);',
      `  ${END_MARKER}`,
      '}',
    ].join('\n');
    const markers = findAllMarkers(src);
    expect(markers.length).toBe(2);
    expect(markers[0]).toEqual({ lineNumber: 3, cardId: 'c0', friendlyName: 'Radial gradient' });
    expect(markers[1]).toEqual({ lineNumber: 5, cardId: 'c1', friendlyName: 'Ripple' });
  });
});

describe('sliceSpanBody', () => {
  it('returns the lines strictly between two markers', () => {
    const src = [
      `${MARKER_PREFIX} c0 X`, //          line 1
      'd = 1.0;', //                       line 2
      'd = d * 2.0;', //                   line 3
      `${MARKER_PREFIX} c1 Y`, //          line 4
      'col = vec3(d);', //                 line 5
      `${END_MARKER}`, //                  line 6
    ].join('\n');
    // c0 span: marker line 1, body lines 2-3.
    expect(sliceSpanBody(src, 1, 3)).toBe('d = 1.0;\nd = d * 2.0;');
  });

  it('returns empty when the span has no body lines', () => {
    const src = [`${MARKER_PREFIX} c0 X`, `${MARKER_PREFIX} c1 Y`].join('\n');
    expect(sliceSpanBody(src, 1, 1)).toBe('');
  });
});
