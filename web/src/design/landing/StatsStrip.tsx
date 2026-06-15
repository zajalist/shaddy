import { SHADE, TYPE } from '../tokens';

// ─── Stats strip ────────────────────────────────────────────────────────
export const StatsStrip = () => (
  <div
    style={{
      maxWidth: 1100, margin: '4rem auto 0', padding: '0 2rem',
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 24,
    }}
  >
    {[
      { big: '12',     label: 'Starter templates' },
      { big: '0 kb',   label: 'Runtime install size' },
      { big: '60 fps', label: 'On any phone made after 2020' },
      { big: 'MIT',    label: 'License · forever free' },
    ].map((s) => (
      <div
        key={s.label}
        style={{
          borderTop: '1px solid rgba(255,255,255,0.10)',
          padding: '24px 0 0',
        }}
      >
        <div
          style={{
            font: `600 clamp(2.2rem, 4vw, 3.4rem) ${TYPE.display}`,
            letterSpacing: TYPE.trackTighter,
            color: SHADE.cream, lineHeight: 1,
          }}
        >
          {s.big}
        </div>
        <div
          style={{
            marginTop: 12,
            font: `500 11.5px ${TYPE.bodyMono}`,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(232,226,212,0.55)',
          }}
        >
          {s.label}
        </div>
      </div>
    ))}
  </div>
);
