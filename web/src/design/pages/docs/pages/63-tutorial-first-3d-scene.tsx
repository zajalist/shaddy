// Tutorials — Your first 3D scene.

import type { DocPage } from './registry';
import { H2, P, OL, LI, Strong, Callout } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const RECIPE = `{
  "canvasAspect": "landscape",
  "mode": "3d",
  "cards": [
    { "kind": "typed", "id": "g1", "type": "ground_3d",
      "enabled": true,
      "params": { "y": { "value": 0, "animation": null } } },
    { "kind": "typed", "id": "s2", "type": "sphere_3d",
      "enabled": true,
      "params": {
        "r":  { "value": 0.6, "animation": null },
        "cx": { "value": 0,   "animation": null },
        "cy": { "value": 0.6, "animation": null },
        "cz": { "value": 0,   "animation": null }
      } },
    { "kind": "typed", "id": "m3", "type": "material_color_3d",
      "enabled": true,
      "params": {
        "color": { "value": [0.92, 0.42, 0.16], "animation": null }
      } }
  ]
}`;

const page: DocPage = {
  id: 'tutorial-first-3d',
  title: 'Your first 3D scene',
  groupLabel: 'Tutorials',
  lede: 'Flip the recipe to 3D, drop a sphere, drop a ground, choose a colour. The camera comes wired.',
  body: (
    <>
      <P>
        The 3D mode is its own template (raymarched SDF + Lambert + soft
        shadow), but as a user you don't have to think about that — you
        drop 3D cards and the compiler builds the scene. Five steps to a
        first scene.
      </P>

      <H2>Step 1 — Flip to 3D mode</H2>
      <P>
        Open the composer at <Code>/design</Code>. In the right inspector,
        change <Code>mode</Code> from <Code>2d</Code> to <Code>3d</Code>.
        The canvas goes dark — you've got an empty 3D scene with no
        geometry and no material. The camera defaults to <Code>{'(0, 1.2, 4)'}</Code>{' '}
        looking at <Code>{'(0, 0.5, 0)'}</Code>.
      </P>

      <Callout>
        Shortcut: any 3D card you insert into a 2D recipe auto-flips the
        mode for you. Step 1 is only relevant if you want an empty 3D
        scene to start from.
      </Callout>

      <H2>Step 2 — Drop a sphere</H2>
      <P>
        <Code>shapes → sphere (3D)</Code>. A soft grey sphere shows up at
        the origin. The four params are radius and the three centre
        coords; tweak them with the sliders. Drag the canvas to orbit, use
        the scroll wheel to dolly closer, and try WASD to fly around.
      </P>

      <H2>Step 3 — Drop a ground</H2>
      <P>
        <Code>shapes → ground (3D)</Code>. An infinite horizontal plane
        appears at <Code>y = 0</Code>. The sphere now casts a soft shadow
        onto the ground — that shadow is iq's soft-shadow march, automatic
        for any 3D recipe.
      </P>

      <H2>Step 4 — Material</H2>
      <P>
        <Code>effects → material (3D)</Code>. Pick a warm orange — say{' '}
        <Code>(0.92, 0.42, 0.16)</Code> in linear RGB. The whole scene
        takes that colour. <Strong>Materials are global in v1</Strong> —
        the last material card before the raymarch wins. Per-surface
        materials are a future enhancement.
      </P>

      <H2>Step 5 — Move the camera</H2>
      <P>
        Drag the canvas to orbit. Right-drag to pan. Scroll to dolly.{' '}
        <Code>R</Code> resets the camera to default. The camera state lives
        in the cards store — see <Term>The renderer · Camera (3D)</Term>.
        Each frame the integration layer pushes <Code>u_eye</Code>,{' '}
        <Code>u_target</Code>, <Code>u_up</Code> as uniforms. The shader
        rebuilds the ray basis from them and re-renders.
      </P>

      <H2>The recipe</H2>
      <CodeBlock language="json" source={RECIPE} />

      <H2>Where to take it next</H2>
      <OL>
        <LI>
          Add a <Code>torus (3D)</Code> next to the sphere. By default they
          union with a hard <Code>min()</Code> — drop a <Code>smooth
          union (3D)</Code> with <Code>k = 0.2</Code> before the torus to
          melt them together.
        </LI>
        <LI>
          Drop a <Code>repeat (3D)</Code> card to tile any subsequent
          geometry across the scene. The card writes the domain repeat
          expression <Strong>before</Strong> the geometry runs.
        </LI>
        <LI>
          The shading pipeline is fixed in v1 — Lambert + one directional
          light + soft shadow. For per-surface materials or a different
          shading model, you'd need either a new effect card or a wildcard
          that overrides the relevant section.
        </LI>
      </OL>
    </>
  ),
};

export default page;
