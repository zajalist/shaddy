// The Recipe model — Blending + alpha.

import type { DocPage } from './registry';
import { H2, P, KvTable, Strong } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const WRAPPER = `// What the compiler emits when a card has alpha != 1
// or blendMode != 'normal'. The "above" is what the chain
// looked like before this card; the "below" is the card's body.
vec3 col_prev = col;

// === card body runs here, writes its own col ===
//   ... user/template-emitted GLSL ...

// === blend back ===
vec3 col_op = <op>(col_prev, col);          // op = mode function
col = mix(col_prev, col_op, u_card0_alpha); // alpha = the slider
`;

const FORMULA = `// the per-component formulas, where 'b' is the previous chain
// (col_prev) and 'a' is the current card's contribution.

normal   : a
add      : min(a + b, 1.0)
multiply : a * b
screen   : 1.0 - (1.0 - a) * (1.0 - b)
lighten  : max(a, b)
darken   : min(a, b)`;

const page: DocPage = {
  id: 'blending-alpha',
  title: 'Blending + alpha',
  groupLabel: 'The Recipe model',
  lede: 'Six per-channel ops plus alpha. The same model as a Photoshop adjustment layer, mapped to GLSL.',
  body: (
    <>
      <P>
        Every card carries optional <Code>alpha</Code> (default 1) and{' '}
        <Code>blendMode</Code> (default <Code>'normal'</Code>). When either
        differs from its default the compiler wraps the card's body in a{' '}
        <Term>snapshot / blend</Term> block: snapshot the running{' '}
        <Code>col</Code> into <Code>col_prev</Code>, run the card's body,
        compute the per-channel blend of the two, then mix back with the
        card's alpha.
      </P>

      <H2>The compiler wrapper</H2>
      <CodeBlock language="glsl" source={WRAPPER} />
      <P>
        For cards where both fields are at their default, this wrapper is
        skipped entirely — the card's body runs at the chain's bare
        accumulators. The wrapper is opt-in so the simple case stays cheap.
      </P>

      <H2>The six modes</H2>
      <CodeBlock language="glsl" source={FORMULA} />

      <H2>Mode reference</H2>
      <KvTable
        headers={['mode', 'feel']}
        rows={[
          { key: 'normal', value: (
            <>Straight replacement. With <Code>alpha&nbsp;&lt;&nbsp;1</Code>{' '}
            you get a partial overlay.</>) },
          { key: 'add', value: (
            <>Brightens. Saturated at 1.0 per channel — useful for glows
            and light sources.</>) },
          { key: 'multiply', value: (
            <>Darkens. Common for vignettes, shadows, tinted glass. White
            in the card is a no-op.</>) },
          { key: 'screen', value: (
            <>Inverse of multiply. Brightens softly without the saturation
            clip <Code>add</Code> hits.</>) },
          { key: 'lighten', value: (
            <>Per-channel max. Keeps whichever side is brighter — useful
            for additive masks.</>) },
          { key: 'darken', value: (
            <>Per-channel min. Keeps whichever side is darker — useful for
            subtractive masks.</>) },
        ]}
      />

      <H2>Why per-channel and not Porter–Duff</H2>
      <P>
        The chain produces opaque RGB; there is no premultiplied alpha
        channel and no compositor pass after main(). All six modes are
        per-channel RGB ops, then a final <Code>mix()</Code> by{' '}
        <Code>alpha</Code>. This matches what artists expect from "layer
        opacity in Photoshop" and avoids the conceptual overhead of a full
        Porter–Duff source-over pipeline that would never be exercised.
      </P>

      <H2>Visual intuition</H2>
      <P>
        Think of the chain top-down: each card paints onto the current
        canvas. <Strong>multiply</Strong> stains it (darker → leaves more of
        what's underneath); <Strong>screen</Strong> washes it (lighter →
        leaves less); <Strong>add</Strong> floods it. The mode is the brush
        feel; the alpha is the pressure.
      </P>
    </>
  ),
};

export default page;
