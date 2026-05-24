// §2 — ParamDef kinds.

import { CodeBlock } from './CodeBlock';
import { Code, P, SectionHeader, SECTIONS, H3, FieldRow } from './primitives';

const meta = SECTIONS.find((s) => s.id === 'paramdef')!;

const FLOAT_SRC = `// float — single uniform float, clamped to [min, max]
{
  kind: 'float',
  label: 'softness',
  default: 0.2,
  min: 0,
  max: 1,
  step: 0.01,
}`;

const COLOR_SRC = `// color — vec3 RGB, components in [0, 1]
{
  kind: 'color',
  label: 'tint',
  default: [0.95, 0.62, 0.18],
}`;

const SELECT_SRC = `// select — integer choice, emitted as a float uniform the
// shader casts via int(u_*). Use when behaviour branches discretely.
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

export const SectionParamDef = () => (
  <section data-section={meta.id}>
    <SectionHeader meta={meta} />

    <P>
      A <Code>ParamDef</Code> describes one knob on a card. The compiler
      emits one uniform per param (named{' '}
      <Code>u_card{'<index>'}_{'<paramKey>'}</Code>) and the integration
      layer pushes the live value every frame. There are three kinds.
    </P>

    <H3>float</H3>
    <P>
      A scalar value. Emitted as <Code>uniform float u_card0_softness;</Code>{' '}
      and read directly. The UI renders a slider clamped to{' '}
      <Code>[min, max]</Code> with the optional <Code>step</Code> granularity.
    </P>
    <CodeBlock language="ts" source={FLOAT_SRC} />

    <H3>color</H3>
    <P>
      Three-component RGB. Each component lives in <Code>[0, 1]</Code>{' '}
      (linear, not sRGB). Emitted as <Code>uniform vec3 u_card0_tint;</Code>.
      The UI renders a swatch + popover picker.
    </P>
    <CodeBlock language="ts" source={COLOR_SRC} />

    <H3>select</H3>
    <P>
      A discrete integer choice. Stored as a number under the hood and
      emitted as a <Code>float</Code> uniform that the shader casts via{' '}
      <Code>int(u_card0_palette)</Code> — keeps the param transport
      uniform across all three kinds while still giving the shader a clean
      int to switch on.
    </P>
    <CodeBlock language="ts" source={SELECT_SRC} />

    <H3>Field reference</H3>

    <FieldRow name="kind" type="'float' | 'color' | 'select'">
      The discriminant. Drives both the UI control and the GLSL uniform type.
    </FieldRow>
    <FieldRow name="label" type="string">
      Display name in the parameter row. Often a lowercase noun ("radius",
      "softness") — the UI handles capitalization.
    </FieldRow>
    <FieldRow name="default" type="number | ColorRgb">
      Used when a typed card is inserted, when a wildcard is converted back
      to a typed card, and as the fallback when a recipe doesn't specify
      the param's value.
    </FieldRow>
    <FieldRow name="min, max, step" type="number (float only)">
      Slider bounds and granularity. <Code>step</Code> is optional; the UI
      falls back to a sensible quantum derived from the range.
    </FieldRow>
    <FieldRow name="options" type="ReadonlyArray<{ value, label }> (select only)">
      Allowed values for a <Code>select</Code> param. Values are integers;
      labels are the menu strings.
    </FieldRow>
  </section>
);
