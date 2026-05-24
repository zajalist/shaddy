// The Recipe model — Parameters.

import type { DocPage } from './registry';
import { H2, H3, P, KvTable, Strong } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const FLOAT_SRC = `// float — single scalar, clamped to [min, max]
{
  kind: 'float',
  label: 'softness',
  default: 0.2,
  min: 0,
  max: 1,
  step: 0.01,
}`;

const COLOR_SRC = `// color — RGB vec3, components in [0, 1] (linear, not sRGB)
{
  kind: 'color',
  label: 'tint',
  default: [0.95, 0.62, 0.18],
}`;

const SELECT_SRC = `// select — integer choice, emitted as a float uniform
// the shader casts via int(u_*) before switching on it.
{
  kind: 'select',
  label: 'palette',
  default: 0,
  options: [
    { value: 0, label: 'Sunset' },
    { value: 1, label: 'Iceberg' },
    { value: 2, label: 'Lava'    },
  ],
}`;

const page: DocPage = {
  id: 'parameters',
  title: 'Parameters',
  groupLabel: 'The Recipe model',
  lede: 'Three kinds — float, color, select — each emitted as one uniform per card per param.',
  body: (
    <>
      <P>
        A <Term>parameter</Term> is one knob on one card. Each card def
        declares its params as a <Code>Record&lt;string, ParamDef&gt;</Code>;
        the recipe carries the per-card values. The compiler emits one
        uniform per param, named{' '}
        <Code>u_card&lt;index&gt;_&lt;paramKey&gt;</Code>, and the
        integration layer pushes the live value every frame via{' '}
        <Code>renderer.setUniform</Code>.
      </P>

      <H2>The three kinds</H2>

      <H3>float</H3>
      <P>
        A scalar. Emitted as <Code>uniform float u_card0_softness;</Code> and
        read directly. The UI renders a slider clamped to{' '}
        <Code>[min, max]</Code> with the optional <Code>step</Code>{' '}
        granularity.
      </P>
      <CodeBlock language="ts" source={FLOAT_SRC} />

      <H3>color</H3>
      <P>
        Three-component RGB. Each component lives in <Code>[0, 1]</Code> —{' '}
        <Strong>linear</Strong>, not sRGB. Emitted as{' '}
        <Code>uniform vec3 u_card0_tint;</Code>. The UI renders a swatch +
        popover picker; the picker converts to and from sRGB for display
        only.
      </P>
      <CodeBlock language="ts" source={COLOR_SRC} />

      <H3>select</H3>
      <P>
        A discrete integer choice. Stored as a number under the hood and
        emitted as a <Code>float</Code> uniform the shader casts via{' '}
        <Code>int(u_card0_palette)</Code> before switching on it. Keeping
        the transport uniform (no <Code>int</Code> uniforms in v1) avoids a
        whole class of GL driver bugs around interpolation qualifiers on
        integer scalars.
      </P>
      <CodeBlock language="ts" source={SELECT_SRC} />

      <H2>Field reference</H2>
      <KvTable
        headers={['field', 'role']}
        rows={[
          { key: 'kind', value: (
            <>The discriminant — <Code>'float'</Code> |{' '}
            <Code>'color'</Code> | <Code>'select'</Code>. Drives both the UI
            control and the GLSL uniform type.</>) },
          { key: 'label', value: (
            <>Display name in the parameter row. Lowercase noun by
            convention; the UI capitalises.</>) },
          { key: 'default', value: (
            <>Used when a typed card is inserted, when a wildcard promotes
            back to a typed card, and as fallback when recipe JSON omits a
            param.</>) },
          { key: 'min, max, step', value: (
            <>Slider bounds and granularity (float only). <Code>step</Code>{' '}
            is optional — the UI falls back to a quantum derived from the
            range.</>) },
          { key: 'options', value: (
            <>Allowed values for a select param. Each option is{' '}
            <Code>{'{ value: number, label: string }'}</Code>; values are
            integers, labels are the menu strings.</>) },
        ]}
      />

      <H2>Emission rules</H2>
      <P>
        The compiler scans the active card's snippet template for{' '}
        <Code>{'{{paramKey}}'}</Code> placeholders and substitutes the
        corresponding uniform reference. A param the template doesn't
        reference still emits a uniform but is otherwise dead — the parser
        treats this as a card-def authoring bug, not a runtime concern. See{' '}
        <Term>The compiler · 2D shader template</Term> for the substitution
        pass.
      </P>
    </>
  ),
};

export default page;
