import { SHADE, TYPE } from '../tokens';
import { RDHero } from '../RDHero';
import { ROUTES } from './constants';

// ─── Hero ────────────────────────────────────────────────────────────────
export const Hero = () => (
  <section
    id="top"
    style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: 'clamp(5rem, 9vw, 7rem) clamp(1.25rem, 4vw, 2rem) clamp(4rem, 7vw, 6rem)',
      overflow: 'hidden',
    }}
  >
    {/* live reaction-diffusion field */}
    <div style={{ position: 'absolute', inset: 0, opacity: 0.78 }}>
      <RDHero />
    </div>
    {/* vignette so text reads */}
    <div
      style={{
        position: 'absolute', inset: 0,
        background:
          `radial-gradient(ellipse 60% 50% at 50% 45%, rgba(11,12,14,0.0) 0%, rgba(11,12,14,0.4) 45%, rgba(11,12,14,0.92) 88%)`,
        pointerEvents: 'none',
      }}
    />
    {/* rising specks for life */}
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${8 + i * 9}%`, bottom: -20,
            width: 2, height: 2, borderRadius: '50%',
            background: 'rgba(252,180,39,0.55)',
            filter: 'blur(0.5px)',
            animation: `shadeSpeck ${26 + (i % 4) * 3}s linear ${-i * 2.4}s infinite`,
          }}
        />
      ))}
    </div>

    <div style={{ position: 'relative', zIndex: 1, animation: 'shadeFadeUp 1s ease-out 0.1s both' }}>
      <div
        style={{
          display: 'inline-block',
          font: `700 11px ${TYPE.bodyMono}`,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: SHADE.gold, marginBottom: 28,
        }}
      >
        Scratch for GPU shaders
      </div>
      <h1
        style={{
          margin: 0,
          font: `600 clamp(2.4rem, 5.4vw, 4.6rem) ${TYPE.display}`,
          color: SHADE.cream,
          letterSpacing: TYPE.trackTighter,
          lineHeight: 1.02,
          textShadow: '0 2px 24px rgba(0,0,0,0.55)',
          maxWidth: 900,
        }}
      >
        Will the real slim shader<br />
        please stand up?
      </h1>
      <p
        style={{
          margin: '24px auto 0',
          maxWidth: 600,
          font: `400 17px ${TYPE.body}`,
          color: 'rgba(232,226,212,0.72)',
          lineHeight: 1.55,
        }}
      >
        Shaddy snaps shader art together like puzzle blocks. Drag a card, see
        the canvas move, peek at the GLSL underneath. The code is the canvas
        and the canvas is the code. Drop a photo in, an AI turns it into
        editable cards. The GLSL it spits out is real — paste it into
        Shadertoy, drop it into your own WebGL page, send the share URL to
        a friend. Browser tab, no install, no account.
      </p>
      <div style={{ marginTop: 36, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href={ROUTES.composer}
          style={{
            background: SHADE.gold, color: '#1a1208',
            border: `1px solid ${SHADE.goldDeep}`,
            borderRadius: 3, padding: '12px 22px',
            font: `700 12px ${TYPE.body}`,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10,
          }}
        >
          Open the composer
          <span style={{ fontWeight: 400 }}>→</span>
        </a>
        <a
          href="#how"
          style={{
            background: 'transparent', color: SHADE.cream,
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 3, padding: '12px 22px',
            font: `500 12px ${TYPE.body}`,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          How it works
        </a>
      </div>
    </div>
  </section>
);
