// The renderer — Uniforms + setUniform.

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong, KvTable, Callout } from '../PageContent';
import { InlineCode as Code } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const PUSH = `// What the integration layer does each animation frame.
const r = createRenderer();
r.mount(host);

// On recipe structural changes — RECOMPILE.
const compiled = compile(recipe);
r.compile(compiled.glsl);

// On any param value change — SET UNIFORM, no recompile.
for (const u of compiled.uniforms) {
  r.setUniform(u.name, packUniform(u));
}

// Per frame — push the globals.
r.setUniform('u_time',     { kind: 'float', value: tSeconds });
r.setUniform('u_mouse',    { kind: 'vec2',  value: mouseXY });
r.setUniform('u_resolution', { kind: 'vec2', value: [w, h] });`;

const PACK = `// Pack a UniformBinding (from the compiler) into a renderer Uniform.
function packUniform(u: UniformBinding): Uniform {
  if (typeof u.value === 'number') {
    return { kind: 'float', value: u.value };
  }
  // ColorRgb tuple → vec3.
  return { kind: 'vec3', value: [u.value[0], u.value[1], u.value[2]] };
}`;

const page: DocPage = {
  id: 'uniforms',
  title: 'Uniforms — when to recompile vs setUniform',
  groupLabel: 'The renderer',
  lede: 'Structural change recompiles. Value change just sets a uniform. Mixing them up wastes a frame; mixing the other way drops a value.',
  body: (
    <>
      <P>
        Two fast paths sit side by side:{' '}
        <Code>renderer.compile(fragmentSource)</Code> swaps the program (full
        link + uniform-table rebuild), and{' '}
        <Code>renderer.setUniform(name, value)</Code> writes one uniform
        slot in the current program. Knowing which one to call on which
        recipe edit is the whole game.
      </P>

      <H2>Decision rule</H2>
      <KvTable
        headers={['recipe edit', 'response']}
        rows={[
          { key: 'card inserted / removed / reordered', value: <>recompile — the marker block layout changed</> },
          { key: 'card enabled toggle', value: <>recompile — the body is in/out of <Code>main()</Code></> },
          { key: 'alpha or blendMode changed', value: <>recompile — the body wraps differently</> },
          { key: 'mode flipped 2D ↔ 3D', value: <>recompile — entire template differs</> },
          { key: 'param value changed (slider drag)', value: <>setUniform only — same program, new value</> },
          { key: 'camera moved (3D)', value: <>setUniform on u_eye / u_target / u_up</> },
          { key: 'window resize', value: <>resize + setUniform on u_resolution</> },
        ]}
      />

      <H2>What the integration layer does</H2>
      <CodeBlock language="ts" source={PUSH} />

      <H2>Packing a UniformBinding into a renderer Uniform</H2>
      <P>
        The compiler hands back a <Code>UniformBinding[]</Code> — typed in
        the cards module as <Code>{'{ name, cardId, paramKey, value }'}</Code>.
        The integration layer converts each to the renderer's tagged{' '}
        <Code>Uniform</Code> based on the param's kind. The vast majority
        are <Code>float</Code> or <Code>vec3</Code>; the larger ones exist
        for matrices and 4-channel data the user-extensible layer may
        eventually push in.
      </P>
      <CodeBlock language="ts" source={PACK} />

      <H2>Persistence across compiles</H2>
      <P>
        <Strong>setUniform values persist across compiles by name.</Strong>{' '}
        When the recipe undergoes a structural change and the integration
        layer recompiles, every uniform whose name still exists in the new
        program keeps its last-set value. This is why param sliders don't
        snap back when you toggle a card enabled — the slider edits the
        store, the recompile happens because the body shape changed, but
        the per-param uniform value rides through.
      </P>

      <Callout>
        <Strong>Clearing a uniform.</Strong> Pass <Code>null</Code> as the
        value — the renderer drops it from its persistence table. Useful
        when a card is removed and its uniform name will never reappear.
      </Callout>

      <H2>Globals</H2>
      <UL>
        <LI><Code>u_resolution</Code> — vec2, pixel size of the drawing buffer.</LI>
        <LI><Code>u_time</Code> — float, seconds since <Code>mount()</Code>.</LI>
        <LI><Code>u_mouse</Code> — vec2, pixel coords; <Code>(-1, -1)</Code> when the pointer leaves the canvas.</LI>
        <LI>3D-only: <Code>u_eye</Code>, <Code>u_target</Code>, <Code>u_up</Code>, <Code>u_material</Code>.</LI>
      </UL>
    </>
  ),
};

export default page;
