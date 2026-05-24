// Tutorials — React to the mouse.

import type { DocPage } from './registry';
import { H2, P, OL, LI, Strong } from '../PageContent';
import { InlineCode as Code } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const GLSL = `// inside a wildcard, anywhere in the chain.
// u_mouse is in pixel coords; convert to the same centred uv space.
vec2 mouseUv = (u_mouse - 0.5 * u_resolution.xy) /
               min(u_resolution.x, u_resolution.y) * 2.0;
float dM = length(uv - mouseUv);

// soft glow centred on the cursor
col += vec3(0.9, 0.6, 0.2) * exp(-dM * dM * 12.0);`;

const page: DocPage = {
  id: 'tutorial-mouse',
  title: 'React to the mouse',
  groupLabel: 'Tutorials',
  lede: 'Three cards read u_mouse — mouse_glow, mouse_repel, mouse_paint_d. Drop them in and the canvas comes alive.',
  body: (
    <>
      <P>
        <Code>u_mouse</Code> is a vec2 the renderer pushes every frame —
        the pointer's position in pixel coords, or <Code>(-1, -1)</Code>{' '}
        when the pointer has left the canvas. Three cards read it directly
        and give you reactive behaviour without writing any GLSL.
      </P>

      <H2>mouse_glow</H2>
      <P>
        An <Code>effects</Code> card that adds a soft radial glow at the
        cursor position. Drop it at the end of any recipe. Three params:
      </P>
      <OL>
        <LI><Code>color</Code> — the glow tint.</LI>
        <LI><Code>radius</Code> — how wide the falloff spreads.</LI>
        <LI><Code>intensity</Code> — peak brightness at the cursor.</LI>
      </OL>
      <P>
        Works best on darker recipes — the glow gets lost on already-bright
        compositions. Pair with a low-<Code>amount</Code> vignette to keep
        the focus on the cursor.
      </P>

      <H2>mouse_repel</H2>
      <P>
        A <Code>distortions</Code> card that warps <Code>uv</Code> away from
        the cursor — like dropping a stone in a pond, but smoothly. Drop it
        early in the chain (after the shape card, before the colour card)
        so the distortion is visible in the colour map. Two params:
      </P>
      <OL>
        <LI><Code>strength</Code> — how hard <Code>uv</Code> bends.</LI>
        <LI><Code>radius</Code> — how far the effect reaches.</LI>
      </OL>
      <P>
        Crank <Code>strength</Code> too high and the warp flips inside out
        — kind of a fun glitch, sometimes a bug.
      </P>

      <H2>mouse_paint_d</H2>
      <P>
        A <Code>distortions</Code> card that splats a smooth distance bump
        into <Code>d</Code> at the cursor — useful for "paint" feedback
        loops. Combine with <Code>bands</Code> or <Code>contour</Code>{' '}
        downstream and the paint becomes visible rings.
      </P>

      <H2>Reading u_mouse yourself</H2>
      <P>
        <Strong>u_mouse is in pixel coords, not centred uv.</Strong> A
        typical wildcard wants the same centred-aspect-corrected space the
        chain runs in:
      </P>
      <CodeBlock language="glsl" source={GLSL} />

      <H2>Touch devices</H2>
      <P>
        On mobile the canvas treats the most recent touch as the
        "pointer"; lifting the finger resets <Code>u_mouse</Code> to{' '}
        <Code>(-1, -1)</Code>. <Code>mouse_glow</Code> goes invisible on
        lift — which is what you want. If your card needs to keep the
        last position after lift, snapshot it into a per-card local on
        the first frame the value comes in.
      </P>
    </>
  ),
};

export default page;
