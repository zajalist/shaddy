// The renderer — Camera (3D).

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong, KvTable } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const TS = `// web/src/cards/state.ts
export type CameraVec3 = readonly [number, number, number];
export type CameraView = {
  eye:    CameraVec3;   // world-space camera position
  target: CameraVec3;   // what the camera looks at
  up:     CameraVec3;   // up vector — usually [0,1,0]
};

export const DEFAULT_CAMERA: CameraView = {
  eye:    [0, 1.2, 4],
  target: [0, 0.5, 0],
  up:     [0, 1, 0],
};`;

const PUSH = `// Per-frame, when recipe.mode === '3d':
const { camera } = useCardsStore.getState();
renderer.setUniform('u_eye',    { kind: 'vec3', value: [...camera.eye] });
renderer.setUniform('u_target', { kind: 'vec3', value: [...camera.target] });
renderer.setUniform('u_up',     { kind: 'vec3', value: [...camera.up] });`;

const page: DocPage = {
  id: 'camera-3d',
  title: 'Camera (3D)',
  groupLabel: 'The renderer',
  lede: 'Three vec3 uniforms — eye, target, up — pushed each frame from the cards store.',
  body: (
    <>
      <P>
        The 3D template needs to know where the camera is. The cards store
        carries a <Code>CameraView</Code> ({' '}
        <Code>{'{ eye, target, up }'}</Code> ) that the integration layer
        pushes to the renderer each frame as three vec3 uniforms. The 3D{' '}
        <Code>main()</Code> rebuilds the ray basis from those uniforms.
      </P>

      <H2>The shape</H2>
      <CodeBlock language="ts" source={TS} />

      <H2>Pushing it to the renderer</H2>
      <CodeBlock language="ts" source={PUSH} />

      <H2>Controls</H2>
      <P>
        The 3D canvas has its own input controller (in{' '}
        <Code>RecipeCanvas.tsx</Code>) that mutates{' '}
        <Code>useCardsStore.getState().camera</Code> in response to mouse
        and keyboard input. Bindings:
      </P>
      <KvTable
        headers={['input', 'action']}
        rows={[
          { key: 'drag (LMB)',  value: <>orbit around <Code>target</Code></> },
          { key: 'drag (RMB)',  value: <>pan — slides both <Code>eye</Code> and <Code>target</Code></> },
          { key: 'scroll wheel', value: <>dolly — moves <Code>eye</Code> toward / away from <Code>target</Code></> },
          { key: 'W / S',        value: <>fly forward / backward along view direction</> },
          { key: 'A / D',        value: <>strafe left / right</> },
          { key: 'Q / E',        value: <>fly down / up along world up</> },
        ]}
      />

      <H2>Why a single source of truth</H2>
      <UL>
        <LI>
          <Strong>Recipe-aware tooling.</Strong> Camera state is read by
          the snapshot path (gallery thumbnails want the user's framing),
          the share URL encoder (a 3D recipe ships its camera so the
          recipient sees the same view), and the future "rec a clip"
          export.
        </LI>
        <LI>
          <Strong>Composability.</Strong> The on-canvas <Code>CameraGizmo</Code>{' '}
          reads and writes the same store, so dragging the gizmo arrows and
          orbiting via mouse-drag stay coherent without a custom sync.
        </LI>
      </UL>

      <H2>Limits</H2>
      <P>
        The camera is view-only in v1 — there's no FOV, no near / far, no
        roll. The fragment template builds the ray basis from{' '}
        <Code>fwd = normalize(target - eye)</Code>, an aspect-corrected pixel
        offset, and the provided <Code>up</Code> vector — that's it. If you
        need orthographic projection or a non-90-degree FOV today, the path
        is a wildcard card that overrides the camera section of{' '}
        <Code>main()</Code>. See <Term>The compiler · 3D raymarching template</Term>.
      </P>
    </>
  ),
};

export default page;
