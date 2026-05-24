// Tutorials — Build a sunset gradient.

import type { DocPage } from './registry';
import { H2, P, OL, LI, Strong } from '../PageContent';
import { InlineCode as Code } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const RECIPE = `{
  "canvasAspect": "landscape",
  "mode": "2d",
  "cards": [
    { "kind": "typed", "id": "g1", "type": "gradient_linear",
      "enabled": true,
      "params": {
        "angle":  { "value": 1.57, "animation": null },
        "offset": { "value": 0.45, "animation": null }
      } },
    { "kind": "typed", "id": "c2", "type": "tritone",
      "enabled": true,
      "params": {
        "low":  { "value": [0.05, 0.04, 0.13], "animation": null },
        "mid":  { "value": [0.95, 0.42, 0.17], "animation": null },
        "high": { "value": [0.98, 0.86, 0.55], "animation": null }
      } },
    { "kind": "typed", "id": "v3", "type": "vignette",
      "enabled": true,
      "params": { "amount": { "value": 0.40, "animation": null } } },
    { "kind": "typed", "id": "g4", "type": "grain",
      "enabled": true,
      "params": { "amount": { "value": 0.06, "animation": null } } }
  ]
}`;

const page: DocPage = {
  id: 'tutorial-sunset',
  title: 'Build a sunset gradient',
  groupLabel: 'Tutorials',
  lede: 'Four cards: a linear gradient, a tritone palette, a soft vignette, and a touch of grain. Five minutes start to finish.',
  body: (
    <>
      <P>
        A "warm sunset poster" recipe — top-to-bottom gradient remapped
        through a navy → orange → cream palette, gently vignetted, with a
        few grains of noise to break up the banding. Four cards. Build
        order top to bottom matches the final recipe.
      </P>

      <H2>Step 1 — Linear gradient</H2>
      <P>
        Drop a <Code>shapes → gradient_linear</Code>. This writes a 0..1
        ramp into <Code>d</Code>. Set <Code>angle</Code> to{' '}
        <Code>π/2</Code> (about <Code>1.57</Code>) so the gradient runs
        top-to-bottom. Bump <Code>offset</Code> to <Code>0.45</Code> — the
        midpoint of the ramp will sit a touch below the horizon line.
      </P>

      <H2>Step 2 — Tritone palette</H2>
      <P>
        Drop a <Code>colors → tritone</Code>. This maps the <Code>d</Code>{' '}
        scalar through three swatches — <Code>low</Code>, <Code>mid</Code>,{' '}
        <Code>high</Code>. Set them to:
      </P>
      <OL>
        <LI><Code>low</Code> — deep navy, around <Code>(0.05, 0.04, 0.13)</Code>. The bottom of the gradient.</LI>
        <LI><Code>mid</Code> — orange flame, around <Code>(0.95, 0.42, 0.17)</Code>. The horizon.</LI>
        <LI><Code>high</Code> — cream, around <Code>(0.98, 0.86, 0.55)</Code>. The sky.</LI>
      </OL>
      <P>
        Remember colour params are in <Strong>linear</Strong> RGB — they'll
        look slightly different in the swatch picker than you'd expect from
        a sRGB hex value.
      </P>

      <H2>Step 3 — Vignette</H2>
      <P>
        Drop an <Code>effects → vignette</Code> with <Code>amount</Code>{' '}
        around <Code>0.4</Code>. The corners darken; the centre stays
        bright. Gives the image weight without going noir.
      </P>

      <H2>Step 4 — Grain</H2>
      <P>
        Drop an <Code>effects → grain</Code> with <Code>amount</Code>{' '}
        around <Code>0.06</Code>. The flat colour bands break up into a
        film-grain texture that hides the eight-bit-per-channel banding
        the gradient would otherwise show on a smooth display.
      </P>

      <H2>The recipe</H2>
      <CodeBlock language="json" source={RECIPE} />

      <H2>Where to take it next</H2>
      <OL>
        <LI>
          Swap <Code>gradient_linear</Code> for <Code>gradient_conic</Code>{' '}
          for a sunset rotating around a point in the canvas.
        </LI>
        <LI>
          Insert a <Code>shapes → fbm</Code> before the colour card, with
          a small contribution multiplier — adds painterly cloud texture
          to the sky.
        </LI>
        <LI>
          Insert an <Code>effects → bloom</Code> after the vignette for a
          softer "low-sun haze" feel.
        </LI>
      </OL>
    </>
  ),
};

export default page;
