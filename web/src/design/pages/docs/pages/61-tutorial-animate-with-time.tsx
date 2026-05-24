// Tutorials — Animate with u_time.

import type { DocPage } from './registry';
import { H2, P, OL, LI, Strong } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const GLSL = `// inside a wildcard, after the colour card:
col *= 0.85 + 0.15 * sin(u_time * 2.0);

// inside a wildcard, BEFORE the colour card — shift hue over time:
// (requires the hsv2rgb helper, which lives in helpers.ts)
vec3 hsv = rgb2hsv(col);
hsv.x = fract(hsv.x + u_time * 0.05);
col = hsv2rgb(hsv);`;

const page: DocPage = {
  id: 'tutorial-animate',
  title: 'Animate with u_time',
  groupLabel: 'Tutorials',
  lede: 'Two cards do most animation: pulse_brightness and hue_cycle. Both read u_time. No setup needed.',
  body: (
    <>
      <P>
        Every recipe ships <Code>u_time</Code> as a uniform — seconds
        since the renderer mounted. Drop a card that reads it and you get
        animation for free; no animation system, no keyframes, no
        scheduler. Two ready-made cards cover most cases.
      </P>

      <H2>pulse_brightness</H2>
      <P>
        Drop <Code>effects → pulse_brightness</Code> at the end of an
        existing recipe. The card multiplies <Code>col</Code> by{' '}
        <Code>{'(centre + amount * sin(u_time * speed))'}</Code>. Three
        params:
      </P>
      <OL>
        <LI><Code>centre</Code> — the midpoint brightness (try <Code>0.85</Code>).</LI>
        <LI><Code>amount</Code> — the swing magnitude (try <Code>0.15</Code>).</LI>
        <LI><Code>speed</Code> — radians per second (try <Code>2.0</Code> for a comfortable heartbeat).</LI>
      </OL>
      <P>
        The whole image breathes. Good for a slow ambient pulse;
        cranking <Code>speed</Code> past about <Code>10</Code> starts to
        look frantic.
      </P>

      <H2>hue_cycle</H2>
      <P>
        Drop <Code>colors → hue_cycle</Code> <Strong>after</Strong> your
        colour card. It shifts the hue of <Code>col</Code> over time, so
        the whole palette slides through the colour wheel. Two params:
      </P>
      <OL>
        <LI><Code>speed</Code> — how fast (try <Code>0.05</Code> for a
          minute-long full cycle).</LI>
        <LI><Code>amount</Code> — how much hue shift to apply per second
          before the speed multiplier (try <Code>1.0</Code>).</LI>
      </OL>

      <H2>Combining them</H2>
      <P>
        Both cards are time-driven and totally independent. Stacking{' '}
        <Code>pulse_brightness</Code> + <Code>hue_cycle</Code> gives you a
        breathing canvas in a wandering palette — about as far as you can
        get with two cards' worth of effort.
      </P>

      <H2>Rolling your own</H2>
      <P>
        For animation a card doesn't cover, drop a wildcard and read{' '}
        <Code>u_time</Code> directly:
      </P>
      <CodeBlock language="glsl" source={GLSL} />
      <P>
        Note the second snippet uses the <Code>hsv2rgb</Code> +{' '}
        <Code>rgb2hsv</Code> helpers. The wildcard doesn't need to declare
        them — if any typed card in your recipe pulled them in (any{' '}
        <Code>palette*</Code> card does), they're already in scope for
        every card. If no other card pulled them in, the wildcard sees
        "<Code>undefined function hsv2rgb</Code>" — the fix is to add a
        typed colour card before the wildcard. See <Term>Cards reference ·
        Helpers</Term> for the long version.
      </P>

      <H2>Frame rate notes</H2>
      <P>
        <Code>u_time</Code> ticks at the renderer's draw rate — typically
        60 Hz on a desktop, less on a mobile device the perf system has
        downclocked. Don't compare <Code>u_time</Code> to a real clock for
        any sync-critical work; treat it as a smooth monotonic float.
      </P>
    </>
  ),
};

export default page;
