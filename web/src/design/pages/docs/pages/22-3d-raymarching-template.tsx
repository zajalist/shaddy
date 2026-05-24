// The compiler — 3D raymarching template.

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong } from '../PageContent';
import { InlineCode as Code } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const SCENE = `// sdScene is built from each 3D card's contribution3d.sdfExpr,
// unioned by sdMin / sdSmoothMin in recipe order. domainExpr cards
// rebind p; smoothness cards change the next union's k.
float sdScene(vec3 p) {
  float d = 1e9;
  // sphere_3d (card s1)
  d = sdMin(d, length(p - vec3(0.0, 0.6, 0.0)) - 0.6);
  // domain_repeat (card r2) — rebinds p for subsequent cards
  p = mod(p + 1.0, 2.0) - 1.0;
  // torus_3d (card t3) — k=0.2 from a smoothness card before it
  d = sdSmoothMin(d, sdfTorus3(p, vec2(0.5, 0.12)), 0.2);
  return d;
}`;

const MAIN = `void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) /
            min(u_resolution.x, u_resolution.y) * 2.0;

  // Camera basis from uniforms (eye, target, up).
  vec3 fwd = normalize(u_target - u_eye);
  vec3 rt  = normalize(cross(fwd, u_up));
  vec3 up  = cross(rt, fwd);
  vec3 ro  = u_eye;
  vec3 rd  = normalize(fwd + uv.x * rt + uv.y * up);

  // Sphere-trace.
  float t = 0.0;
  for (int i = 0; i < 96; i++) {
    float h = sdScene(ro + rd * t);
    if (h < 0.001 || t > 40.0) break;
    t += h;
  }

  vec3 col;
  if (t > 40.0) {
    col = vec3(0.06, 0.08, 0.10);          // miss → background
  } else {
    vec3 hit = ro + rd * t;
    vec3 n   = sceneNormal3(hit);
    vec3 ld  = normalize(vec3(0.6, 1.0, 0.4));
    float lam = max(dot(n, ld), 0.0);
    float sh  = softShadow3(hit + n * 0.01, ld, 0.02, 10.0, 0.06);
    col = u_material * (0.15 + 0.85 * lam * sh);
  }

  outColor = vec4(col, 1.0);
}`;

const page: DocPage = {
  id: '3d-raymarching-template',
  title: '3D raymarching template',
  groupLabel: 'The compiler',
  lede: 'sdScene built from the recipe, a 96-step sphere trace, gradient-sampled normals, Lambert + soft shadow.',
  body: (
    <>
      <P>
        When <Code>recipe.mode === '3d'</Code> the compiler emits a
        raymarched template instead of the 2D fragment one. The scene SDF is
        built directly from each card's <Code>contribution3d</Code>; the
        shading pipeline is fixed (Lambert + iq's soft-shadow march). The
        camera comes from uniforms — the cards store carries an{' '}
        <Code>{'{ eye, target, up }'}</Code> the renderer pushes each frame.
      </P>

      <H2>sdScene</H2>
      <CodeBlock language="glsl" source={SCENE} />
      <P>
        Cards fold into <Code>sdScene</Code> in recipe order through their{' '}
        <Code>contribution3d</Code>:
      </P>
      <UL>
        <LI>
          <Strong>sdfExpr</Strong> — folds into the running <Code>d</Code>{' '}
          via <Code>sdMin</Code> or, when a smoothness card preceded it,{' '}
          <Code>sdSmoothMin</Code>.
        </LI>
        <LI>
          <Strong>domainExpr</Strong> — rebinds <Code>p</Code> for every card
          that follows. A repeat / mirror / twist sits here.
        </LI>
        <LI>
          <Strong>smoothness</Strong> — sets the union blend radius{' '}
          <Code>k</Code> for subsequent unions. <Code>0</Code> falls back to
          a hard <Code>min()</Code>.
        </LI>
        <LI>
          <Strong>material</Strong> — sets the global <Code>u_material</Code>{' '}
          vec3. Materials are global in v1 — the last material card before
          the raymarch wins.
        </LI>
      </UL>

      <H2>main()</H2>
      <CodeBlock language="glsl" source={MAIN} />

      <H2>Helpers — emitted in two halves</H2>
      <P>
        <Code>sceneNormal3</Code> and <Code>softShadow3</Code> both reference{' '}
        <Code>sdScene</Code> by name — they can't be emitted before{' '}
        <Code>sdScene</Code> exists. The compiler honours this by emitting
        them last, after the scene function. Every other helper goes in the
        preamble as usual. See <Code>HELPERS_AFTER_SCENE</Code> in{' '}
        <Code>cards/library/helpers.ts</Code> for the exact set.
      </P>

      <H2>Camera</H2>
      <P>
        Three uniforms — <Code>u_eye</Code>, <Code>u_target</Code>,{' '}
        <Code>u_up</Code> — describe the camera. They're pushed each frame
        from <Code>useCardsStore.getState().camera</Code>. The control
        bindings (mouse-drag to orbit, wheel to dolly, WASD to free-look)
        live in <Code>RecipeCanvas.tsx</Code> and just mutate the store. See{' '}
        <Code>The renderer · Camera (3D)</Code>.
      </P>
    </>
  ),
};

export default page;
