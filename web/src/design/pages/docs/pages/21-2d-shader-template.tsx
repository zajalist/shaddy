// The compiler — 2D shader template.

import type { DocPage } from './registry';
import { H2, P, Strong } from '../PageContent';
import { InlineCode as Code } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const PREAMBLE = `#version 300 es
precision highp float;

uniform vec2  u_resolution;   // pixel size of the drawing buffer
uniform float u_time;         // seconds since renderer.mount()
uniform vec2  u_mouse;        // pixel coords; (-1,-1) when no pointer

// ─── per-card param uniforms ───────────────────────────────────────────
uniform float u_card0_softness;
uniform vec3  u_card1_tint;
uniform float u_card2_amount;

// ─── helpers — emitted once, only when used ────────────────────────────
float hash21(vec2 p) { /* ... */ }
float noise2 (vec2 p) { /* ... */ }
float fbm2   (vec2 p) { /* ... */ }

out vec4 outColor;`;

const MAIN = `void main() {
  // Centred uv in [-1, 1] on the long edge, aspect-corrected.
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) /
            min(u_resolution.x, u_resolution.y) * 2.0;

  // Accumulators every card mutates.
  float d   = 0.0;
  vec3  col = vec3(0.0);

  //#card c1                      // radial_gradient
  d = 1.0 - clamp(length(uv) * u_card0_softness, 0.0, 1.0);
  //#end c1

  //#card c2                      // cosine_palette
  col = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + d));
  //#end c2

  //#card c3                      // vignette
  col *= 1.0 - u_card2_amount * length(uv) * length(uv);
  //#end c3

  outColor = vec4(col, 1.0);
}`;

const page: DocPage = {
  id: '2d-shader-template',
  title: '2D shader template',
  groupLabel: 'The compiler',
  lede: 'A preamble, the helper closure, then a main() body sliced into per-card marker blocks.',
  body: (
    <>
      <P>
        The 2D compiler always emits the same outer shape — a preamble of
        uniforms, the helper closure, and a <Code>main()</Code> that
        initialises three locals (<Code>uv</Code>, <Code>d</Code>,{' '}
        <Code>col</Code>) and runs each card's snippet against them. Only
        what lives inside the marker blocks changes from recipe to recipe.
      </P>

      <H2>Preamble</H2>
      <CodeBlock language="glsl" source={PREAMBLE} />
      <P>
        Global uniforms come first, then one per-param uniform per active
        card in recipe order, then the union of helper functions every card
        pulled in. The helper set is closed transitively — a card that
        declares <Code>fbm2</Code> as a dep also gets <Code>noise2</Code>{' '}
        and <Code>hash21</Code> emitted automatically.
      </P>

      <H2>main()</H2>
      <CodeBlock language="glsl" source={MAIN} />
      <P>
        Three locals carry the chain:
      </P>
      <ul style={{ paddingLeft: 22, margin: '12px 0 18px 0', color: '#cfc8b8', fontSize: 15.5, lineHeight: 1.7 }}>
        <li><Code>uv</Code> — centred, aspect-corrected, in roughly{' '}
          <Code>[-1, 1]</Code> on the long edge. Distortion cards rewrite this.</li>
        <li><Code>d</Code> — a scalar most shape cards write into (often a
          signed distance or a falloff). Distortion cards transform it;
          colour cards read it.</li>
        <li><Code>col</Code> — RGB. Colour cards write it; effect cards
          modify it.</li>
      </ul>

      <H2>Marker blocks</H2>
      <P>
        <Strong>Every card sits inside a <Code>{'//#card <cardId>'}</Code>{' '}
        ... <Code>{'//#end <cardId>'}</Code> pair.</Strong> The reverse
        parser uses the markers to slice the source into per-card regions,
        normalise whitespace, and decide whether each region still matches
        its card def's template. A user can edit anywhere inside a block —
        the parser will silently update the param values; an edit that
        breaks the template's shape demotes the card to a wildcard.
      </P>

      <H2>Blend wrappers</H2>
      <P>
        If a card has <Code>alpha&nbsp;!==&nbsp;1</Code> or a non-default{' '}
        <Code>blendMode</Code>, the compiler wraps the card's body in a
        snapshot/blend block (see <Code>Recipe model · Blending + alpha</Code>).
        The marker block is the outermost layer; the blend wrapper sits
        inside it.
      </P>
    </>
  ),
};

export default page;
