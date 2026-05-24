// Dark theme tokens for the /docs route. Derived from SHADE for brand
// continuity (gold accent stays) but the surfaces are deep slate instead
// of warm cream — the docs site is meant to read like a reference, not a
// marketing page. Imported by every docs/* component so the colours live
// in one place.

import { SHADE, TYPE } from '@/design/tokens';

export const DOC = {
  // Page surfaces — deep slate, slightly cool.
  bg:            '#0e1014',
  surface:       '#15181f',   // panels (sidebar, on-this-page)
  surfaceRaised: '#1a1e26',   // sticky search bar background
  codeBg:        '#0a0c10',   // code block background — darker than page
  border:        '#22272f',   // hairlines between sections
  borderStrong:  '#2e3440',   // panel outlines

  // Text — cream-tinted so it sits warmly against the cool slate.
  textPrimary:   '#e8e2d4',
  textBody:      '#cfc8b8',
  textSecondary: '#8a8377',
  textFaint:     '#5d5950',

  // Brand
  accent:        SHADE.gold,        // active state, anchors, hot code
  accentDeep:    SHADE.goldDeep,    // eyebrows
  accentSoft:    'rgba(252, 180, 39, 0.12)',   // active-nav background
  accentLine:    'rgba(252, 180, 39, 0.35)',   // active-nav left bar

  // Inline code pill
  inlineBg:      '#1c2029',
  inlineBorder:  '#262b35',
} as const;

export { TYPE };
