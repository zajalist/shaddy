import type { ReactNode } from 'react';
import { SHADE, TYPE, blockById } from '../tokens';
import { useIsMobile } from '../useIsMobile';
import { Block } from '../Block';
import type { BlockVariant } from '../Block';
import { ShadeCanvas } from '../ShadeCanvas';

// ─── Feature row (text + visual) ────────────────────────────────────────
export const FeatureRow = ({
  eyebrow, title, body, visual, reverse = false,
}: {
  eyebrow: string;
  title: ReactNode;
  body: ReactNode;
  visual: ReactNode;
  reverse?: boolean;
}) => {
  const isMobile = useIsMobile();
  return (
  <div
    style={{
      maxWidth: 1180, margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 1fr) minmax(280px, 1.2fr)',
      gap: isMobile ? 28 : 56,
      alignItems: 'center',
      padding: isMobile ? '0 1.25rem' : '0 2rem',
    }}
  >
    <div style={{ order: isMobile ? 1 : (reverse ? 2 : 1) }}>
      <div style={{ font: `700 11px ${TYPE.bodyMono}`, letterSpacing: '0.22em', textTransform: 'uppercase', color: SHADE.gold, marginBottom: 16 }}>
        {eyebrow}
      </div>
      <h2
        style={{
          margin: 0,
          font: `600 clamp(1.9rem, 3.4vw, 2.6rem) ${TYPE.display}`,
          color: SHADE.cream,
          letterSpacing: TYPE.trackTighter,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h2>
      <div style={{ marginTop: 20, color: 'rgba(232,226,212,0.62)', font: `400 15px ${TYPE.body}`, lineHeight: 1.65 }}>
        {body}
      </div>
    </div>
    <div style={{ order: isMobile ? 2 : (reverse ? 1 : 2), position: 'relative' }}>
      {visual}
    </div>
  </div>
  );
};

export const SectionShell = ({
  id, eyebrow, title, subtitle, children,
}: { id?: string; eyebrow: string; title: ReactNode; subtitle?: string; children?: ReactNode }) => (
  <section id={id} style={{ padding: 'clamp(4rem, 8vw, 7rem) clamp(1.25rem, 4vw, 2rem) clamp(3.5rem, 7vw, 6rem)' }}>
    <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
      <div
        style={{
          font: `700 11px ${TYPE.bodyMono}`,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: SHADE.gold, marginBottom: 16,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          margin: 0,
          font: `600 clamp(1.9rem, 3.6vw, 2.9rem) ${TYPE.display}`,
          color: SHADE.cream, letterSpacing: TYPE.trackTighter,
          lineHeight: 1.12,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            margin: '20px auto 0', maxWidth: 580,
            font: `400 15.5px ${TYPE.body}`,
            color: 'rgba(232,226,212,0.62)', lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
    {children}
  </section>
);

// Section visuals
export const FeatureChain = () => {
  const items = [blockById('circle')!, blockById('ripple')!];
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 3, padding: '40px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.4))' }}>
        {items.map((b, i) => {
          const variant: BlockVariant = {
            left: i === 0 ? 'flat' : 'notch',
            right: i === items.length - 1 ? 'flat' : 'tab',
          };
          return (
            <Block
              key={i}
              id={`f-chain-${i}`}
              block={b}
              variant={variant}
              animated={b.id === 'ripple'}
            />
          );
        })}
      </div>
    </div>
  );
};

export const FeatureSliders = () => (
  <div
    style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 3, padding: 28,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}
  >
    {[
      { label: 'Radius',    value: 0.482, animated: true,  v: '0.482' },
      { label: 'Amplitude', value: 0.165, animated: false, v: '0.165' },
      { label: 'Phase',     value: 0.0,   animated: false, v: '0.000 π' },
    ].map((row, i) => (
      <div key={i}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ font: `700 10.5px ${TYPE.body}`, color: 'rgba(232,226,212,0.62)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            {row.label}
            {row.animated && (
              <span style={{ marginLeft: 8, color: SHADE.gold, font: `500 9.5px ${TYPE.bodyMono}`, letterSpacing: '0.22em' }}>
                ANIM
              </span>
            )}
          </span>
          <span style={{ font: `500 12px ${TYPE.bodyMono}`, color: row.animated ? SHADE.gold : SHADE.cream }}>
            {row.v}
          </span>
        </div>
        <div style={{ position: 'relative', height: 18 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 6, height: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 1 }} />
          {[0.25, 0.5, 0.75].map((p) => (
            <div key={p} style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${p * 100}% - 0.5px)`, width: 1, background: 'rgba(255,255,255,0.08)' }} />
          ))}
          <div
            style={{
              position: 'absolute', left: 0, top: 6, height: 6, width: `${row.value * 100}%`,
              background: row.animated
                ? `repeating-linear-gradient(45deg, ${SHADE.gold} 0 5px, ${SHADE.goldDeep} 5px 10px)`
                : 'rgba(232,226,212,0.55)',
              borderTopLeftRadius: 1, borderBottomLeftRadius: 1,
            }}
          />
          <div
            style={{
              position: 'absolute', left: `calc(${row.value * 100}% - 8px)`, top: 1,
              width: 16, height: 16,
              background: '#15171b', border: `1.5px solid ${row.animated ? SHADE.gold : 'rgba(232,226,212,0.5)'}`,
              borderRadius: 3,
            }}
          >
            <span style={{ position: 'absolute', left: 3, right: 3, top: 4, height: 1, background: 'rgba(232,226,212,0.5)' }} />
            <span style={{ position: 'absolute', left: 3, right: 3, top: 7, height: 1, background: 'rgba(232,226,212,0.5)' }} />
            <span style={{ position: 'absolute', left: 3, right: 3, top: 10, height: 1, background: 'rgba(232,226,212,0.5)' }} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const FeatureCanvas = () => (
  <div
    style={{
      borderRadius: 3, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
      aspectRatio: '1 / 1', maxWidth: 460, marginInline: 'auto',
      background: '#000', position: 'relative',
    }}
  >
    <ShadeCanvas variant="ripple" />
  </div>
);
