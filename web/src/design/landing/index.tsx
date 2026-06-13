import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { SHADE, TYPE } from '../tokens';
import { RoamingMascot } from '../RoamingMascot';
import { FractalEntity } from '../FractalEntity';

import { PAGE_BG, ROUTES } from './constants';
import { useLandingChrome } from './chrome';
import { SectionSeparator } from './Separator';
import { LandingNav } from './LandingNav';
import { PageTOC } from './PageTOC';
import { Hero } from './Hero';
import { FeatureRow, SectionShell, FeatureChain, FeatureSliders, FeatureCanvas } from './FeatureRow';
import { TemplatesGrid } from './TemplatesGrid';
import { ComposerShowcase } from './ComposerShowcase';
import { CodePanel } from './CodePanel';
import { StatsStrip } from './StatsStrip';
import { FAQ } from './FAQ';
import { Footer } from './Footer';

// ─── Landing root ───────────────────────────────────────────────────────
export const Landing = () => {
  useLandingChrome();
  const mainRef = useRef<HTMLDivElement>(null);

  const wrap: CSSProperties = {
    background: PAGE_BG, minHeight: '100vh',
    color: SHADE.cream,
    font: `400 14px ${TYPE.body}`,
    position: 'relative', // anchor for the document-space RoamingMascot
  };
  return (
    <div ref={mainRef} style={wrap}>
      <LandingNav />
      <PageTOC />
      <Hero />
      <RoamingMascot />
      <SectionShell
        id="how"
        eyebrow="How it works"
        title={<>Three moves.<br />That&apos;s the whole thing.</>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 100, marginTop: 80 }}>
          <FeatureRow
            eyebrow="01 · Compose"
            title={<>Snap blocks<br />into a chain.</>}
            body={
              <>
                Drag a shape onto the canvas. Snap a distortion on top. Add a
                colour, then an effect. You can&apos;t make an invalid chain.
                Each block shows the one knob you&apos;ll actually grab for.
                Double-click for the rest.
              </>
            }
            visual={<FeatureChain />}
          />
          <FeatureRow
            eyebrow="02 · Tune"
            title={<>Move a slider.<br />Watch the canvas breathe.</>}
            body={
              <>
                Every parameter is a slider with an Animate toggle. Animated
                ones loop in real time, locked to a global tempo. Leave the
                editor alone for a minute and the canvas keeps moving.
              </>
            }
            visual={<FeatureSliders />}
            reverse
          />
          <FeatureRow
            eyebrow="03 · Export"
            title={<>Real GLSL.<br />Drops into anything.</>}
            body={
              <>
                The code drawer is the actual GLSL the GPU runs. Copy it,
                paste it into Shadertoy or your own WebGL page — it just
                works. Edit the code in place and Ask Claude reparses your
                edits back into cards. Hit S to copy a share URL with the
                whole recipe in the hash. Plain text in, plain text out.
              </>
            }
            visual={<FeatureCanvas />}
          />
        </div>
      </SectionShell>

      <SectionSeparator />

      <section id="templates" style={{ padding: 'clamp(4rem, 8vw, 7rem) clamp(1.25rem, 4vw, 2rem) clamp(3.5rem, 7vw, 6rem)', position: 'relative' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ font: `700 11px ${TYPE.bodyMono}`, letterSpacing: '0.22em', textTransform: 'uppercase', color: SHADE.gold, marginBottom: 16 }}>
            12 starter templates
          </div>
          <h2
            style={{
              margin: 0,
              font: `600 clamp(1.9rem, 3.6vw, 2.9rem) ${TYPE.display}`,
              color: SHADE.cream, letterSpacing: TYPE.trackTighter, lineHeight: 1.12,
            }}
          >
            Twelve doors. Each one<br />a different bit of maths.
          </h2>
          <p
            style={{
              margin: '20px auto 0', maxWidth: 580,
              font: `400 15.5px ${TYPE.body}`,
              color: 'rgba(232,226,212,0.62)', lineHeight: 1.6,
            }}
          >
            Pick a template. Drag a slider. The annotations point at the
            specific trick — &ldquo;this is the bit where sin meets length&rdquo; — so
            you actually learn the move, not just admire the pixels.
          </p>
        </div>
        <TemplatesGrid />
      </section>

      <SectionSeparator />

      <SectionShell
        id="compose"
        eyebrow="The composer"
        title={<>Like Ableton<br />for fragment shaders.</>}
        subtitle="Chunky puzzle blocks in the middle. Live preview top-right. Properties on the right. Double-click any block to see the rest of its knobs."
      >
        <ComposerShowcase />
      </SectionShell>

      <SectionSeparator />

      <SectionShell
        id="code"
        eyebrow="GLSL underneath"
        title={<>The code and<br />the canvas are<br />the same thing.</>}
        subtitle="Drag a block — the corresponding line in the code drawer scrolls into view and flashes lime. Edit a number in the code — the slider in the panel jumps to match. No black boxes between you and the GPU."
      >
        <CodePanel />
      </SectionShell>

      <SectionSeparator />

      <section id="stats" style={{ padding: 'clamp(4rem, 8vw, 7rem) clamp(1.25rem, 4vw, 2rem) 6rem', position: 'relative' }}>
        <div
          style={{
            maxWidth: 1180, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 48,
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                font: `700 11px ${TYPE.bodyMono}`,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: SHADE.gold, marginBottom: 16,
              }}
            >
              Built for the web
            </div>
            <h2
              style={{
                margin: 0,
                font: `600 clamp(1.9rem, 3.6vw, 2.9rem) ${TYPE.display}`,
                color: SHADE.cream, letterSpacing: TYPE.trackTighter,
                lineHeight: 1.1,
              }}
            >
              Tiny. Fast.<br />Open from day one.
            </h2>
            <p
              style={{
                margin: '20px 0 0', maxWidth: 480,
                font: `400 15.5px ${TYPE.body}`,
                color: 'rgba(232,226,212,0.62)', lineHeight: 1.6,
              }}
            >
              No backend. No install. No account, unless you want to save your
              work. Whatever browser tab you have open is the whole app. That
              raymarched fractal on the right? It&apos;s the same GLSL pipeline,
              looping live on your GPU at 60 fps.
            </p>
            <div style={{ marginTop: 36 }}>
              <StatsStrip />
            </div>
          </div>
          {/* Transparent fractal — no card, no border. Sits on the page bg directly.
              Using padding-bottom:100% instead of aspect-ratio:1/1 because some
              browsers don't commit aspect-ratio-derived heights until a layout
              event, which made the fractal only appear after a window resize. */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 520,
              paddingBottom: 'min(100%, 520px)',
              height: 0,
              justifySelf: 'end',
            }}
          >
            <FractalEntity />
            <div
              style={{
                position: 'absolute', left: 4, top: 0,
                font: `700 9.5px ${TYPE.bodyMono}`,
                color: 'rgba(254,231,199,0.55)',
                letterSpacing: '0.22em', textTransform: 'uppercase',
                mixBlendMode: 'difference',
                pointerEvents: 'none',
              }}
            >
              // raymarched_fractal · pulse
            </div>
            <div
              style={{
                position: 'absolute', right: 4, bottom: 0,
                font: `500 10px ${TYPE.bodyMono}`,
                color: 'rgba(254,231,199,0.45)',
                letterSpacing: '0.20em', textTransform: 'uppercase',
                pointerEvents: 'none',
              }}
            >
              live · GLSL · 60 fps
            </div>
          </div>
        </div>
      </section>

      <SectionSeparator />

      <SectionShell
        id="faq"
        eyebrow="FAQ"
        title="Specific worries."
      >
        <FAQ />
      </SectionShell>

      <section style={{ padding: '6rem 2rem', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <h2
            style={{
              margin: 0,
              font: `600 clamp(2rem, 4vw, 3rem) ${TYPE.display}`,
              color: SHADE.cream,
              letterSpacing: TYPE.trackTighter,
              lineHeight: 1.1,
            }}
          >
            Drop a block.<br />Move a slider. Done.
          </h2>
          <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={ROUTES.composer}
              style={{
                background: SHADE.gold, color: '#1a1208',
                border: `1px solid ${SHADE.goldDeep}`,
                borderRadius: 3, padding: '14px 26px',
                font: `700 12px ${TYPE.body}`,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10,
              }}
            >
              Open the composer
              <span style={{ fontWeight: 400 }}>→</span>
            </a>
            <a
              href={ROUTES.gallery}
              style={{
                background: 'transparent', color: SHADE.cream,
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 3, padding: '14px 26px',
                font: `500 12px ${TYPE.body}`,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Browse the gallery
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
