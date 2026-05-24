// ASCII effect — actually renders shaped 5x7 character glyphs (not just flat
// quantised squares). For each pixel:
//   1. Snap to the enclosing `cell_size`-px cell.
//   2. Use the current pixel's luminance to pick a glyph from the ramp
//      ' .:-=+*#%@' (light → dark), trimmed to `levels` entries.
//   3. Compute the pixel's local (x, y) inside the cell, mapped to the
//      5×7 bitmap; look up the bit and draw foreground vs background.
// The 10 glyph bitmaps live in helpers.ts (`asciiGlyph5x7`).
//
// Palette: mono / green-amber / cyan-magenta / inherit-color.

import type { CardDef } from '../types';

export const ASCII: CardDef = {
  type: 'ascii',
  category: 'effect',
  friendlyName: 'ASCII',
  description: 'True ASCII art — shape-renders 5×7 glyphs from a luminance ramp.',
  icon: '#',
  params: {
    cell_size: { kind: 'float', label: 'cell size', default: 12, min: 6, max: 40, step: 1 },
    levels: { kind: 'float', label: 'levels', default: 8, min: 2, max: 10, step: 1 },
    palette: {
      kind: 'select',
      label: 'palette',
      default: 0,
      options: [
        { value: 0, label: 'mono' },
        { value: 1, label: 'green-amber' },
        { value: 2, label: 'cyan-magenta' },
        { value: 3, label: 'inherit-color' },
      ],
    },
  },
  snippetTemplate: `{
    float _cs = {{cell_size}};
    vec2 _cell = floor(gl_FragCoord.xy / _cs);
    vec2 _local = gl_FragCoord.xy / _cs - _cell;
    // Local (x, y) into a 5x7 bitmap. y inverted so y=0 is top.
    int _gx = int(floor(_local.x * 5.0));
    int _gy = int(floor((1.0 - _local.y) * 7.0));
    float _lum = clamp(dot(col, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    int _levels = int(clamp({{levels}}, 2.0, 10.0));
    // Quantise lum to N steps (N = levels), then stretch the bucket index
    // across the full 10-glyph ramp so even at low N you see the darkest
    // glyphs in the darkest cells.
    int _step = int(floor(_lum * float(_levels - 1) + 0.5));
    int _idx = (_step * 9) / max(_levels - 1, 1);
    float _bit = asciiGlyph5x7(_idx, _gx, _gy);
    int _pal = int({{palette}});
    vec3 _fg = vec3(1.0);
    vec3 _bg = vec3(0.0);
    if (_pal == 1) { _fg = vec3(1.0, 0.7, 0.1); _bg = vec3(0.02, 0.08, 0.02); }
    else if (_pal == 2) { _fg = vec3(0.2, 0.95, 1.0); _bg = vec3(0.08, 0.0, 0.12); }
    else if (_pal == 3) { _fg = col; _bg = vec3(0.0); }
    col = mix(_bg, _fg, _bit);
  }`,
  helpers: ['asciiGlyph5x7'],
};
