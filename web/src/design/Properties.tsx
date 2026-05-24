import type { ReactNode } from 'react';
import { SHADE, TYPE } from './tokens';
import { Icon } from './icons';
import { PropSectionHeader, PropertySlider } from './components';

export const PropertyRow = ({
  label, value, animated, unit, children,
}: { label: string; value: number; animated?: boolean; unit?: string; children?: ReactNode }) => (
  <div>
    <PropertySlider label={label} value={value} animated={animated} unit={unit} />
    {children}
  </div>
);

const DrawerMini = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <span
      style={{
        font: `500 9px ${TYPE.body}`, color: SHADE.textDim,
        letterSpacing: '0.12em', textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
    <div
      style={{
        padding: '6px 9px',
        background: SHADE.surface1,
        border: `1px solid ${SHADE.border}`,
        borderRadius: 6,
        font: `500 11px ${TYPE.bodyMono}`,
        color: SHADE.text,
      }}
    >
      {value}
    </div>
  </div>
);

export const AnimationDrawer = () => {
  const path = (() => {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const x = (i / 60) * 244;
      const y = 24 + Math.sin((i / 60) * Math.PI * 2.2) * 14;
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  })();
  return (
    <div
      style={{
        marginTop: 10,
        border: `1px solid ${SHADE.border}`, borderRadius: 9,
        background: SHADE.surface4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 11px',
          borderBottom: `1px solid ${SHADE.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
          font: `600 10px ${TYPE.bodyMono}`,
          color: SHADE.textDim, letterSpacing: '0.18em', textTransform: 'uppercase',
        }}
      >
        <span style={{ color: SHADE.ember }}>Animating</span>
        <span style={{ color: SHADE.textFaint }}>· sine</span>
        <span style={{ marginLeft: 'auto', color: SHADE.cream }}>120 bpm</span>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <svg width="100%" height="48" viewBox="0 0 244 48" preserveAspectRatio="none" style={{ display: 'block' }}>
          <line x1="0" y1="24" x2="244" y2="24" stroke={SHADE.border} strokeDasharray="2 3" />
          <path d={path} stroke={SHADE.ember} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <DrawerMini label="min" value="0.180" />
          <DrawerMini label="max" value="0.840" />
          <DrawerMini label="speed" value="¼ bar" />
          <DrawerMini label="shape" value="sine" />
        </div>
      </div>
    </div>
  );
};

export const GlobalProps = () => (
  <>
    <PropSectionHeader title="Properties" />
    <div style={{ padding: '2px 14px 14px', font: `400 12px ${TYPE.body}`, color: SHADE.textDim, lineHeight: 1.55 }}>
      Select a block in the canvas to edit it. Or set global tempo + output below.
    </div>
    <div style={{ borderTop: `1px solid ${SHADE.border}` }} />
    <PropSectionHeader title="Tempo" />
    <div style={{ padding: '0 14px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ font: `600 38px ${TYPE.display}`, color: SHADE.text, lineHeight: 1, letterSpacing: TYPE.trackTighter }}>
          120
          <span style={{ color: SHADE.textDim, fontSize: 14, marginLeft: 8, fontWeight: 500, letterSpacing: 0 }}>bpm</span>
        </span>
        <button
          style={{
            background: SHADE.surface1, color: SHADE.text,
            border: `1px solid ${SHADE.border}`, borderRadius: 6,
            padding: '7px 12px', font: `500 11px ${TYPE.bodyMono}`,
            letterSpacing: '0.10em', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          tap
        </button>
      </div>
      <PropertySlider label="Tempo" value={0.5} />
    </div>
    <div style={{ borderTop: `1px solid ${SHADE.border}` }} />
    <PropSectionHeader title="Output" />
    <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {['1920×1080', '1080×1080', '1080×1920', '3840×2160'].map((s, i) => (
        <button
          key={s}
          style={{
            background: i === 0 ? SHADE.surface3 : SHADE.surface1,
            border: `1px solid ${i === 0 ? SHADE.borderHi : SHADE.border}`,
            borderRadius: 7, padding: '9px 10px',
            font: `500 11px ${TYPE.bodyMono}`,
            color: i === 0 ? SHADE.text : SHADE.textDim,
            textAlign: 'left', cursor: 'pointer',
          }}
        >
          {s}
        </button>
      ))}
    </div>
    <div style={{ borderTop: `1px solid ${SHADE.border}` }} />
    <PropSectionHeader title="Share" />
    <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        style={{
          background: SHADE.gold, color: '#1a1208',
          border: `1px solid ${SHADE.goldDeep}`, borderRadius: 3, padding: '11px 12px',
          font: `700 11.5px ${TYPE.body}`,
          letterSpacing: '0.10em', textTransform: 'uppercase',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
        }}
      >
        <Icon name="share" size={13} color="#1a1208" /> Publish to gallery
      </button>
    </div>
    <div style={{ flex: 1 }} />
    <div
      style={{
        borderTop: `1px solid ${SHADE.border}`,
        padding: '10px 14px',
        font: `500 9.5px ${TYPE.bodyMono}`,
        color: SHADE.textFaint, letterSpacing: '0.14em',
        display: 'flex', justifyContent: 'space-between',
      }}
    >
      <span>WEBGL · OK</span>
      <span>v0.4.2</span>
    </div>
  </>
);

export const RippleProps = () => (
  <>
    <div
      style={{
        padding: '14px 14px',
        borderBottom: `1px solid ${SHADE.border}`,
        display: 'flex', alignItems: 'center', gap: 11,
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${SHADE.catDistort}1f`,
          border: `1px solid ${SHADE.catDistort}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="b-ripple" size={20} color={SHADE.catDistort} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `600 15px ${TYPE.body}`, color: SHADE.text, letterSpacing: '-0.01em' }}>Ripple</div>
        <div style={{ font: `500 10px ${TYPE.bodyMono}`, color: SHADE.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Distortion · block 02
        </div>
      </div>
      <button
        style={{
          width: 28, height: 28, border: `1px solid ${SHADE.border}`, background: 'transparent',
          color: SHADE.textDim, cursor: 'pointer', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="dots" size={13} color={SHADE.textDim} />
      </button>
    </div>

    <div style={{ padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PropertyRow label="frequency" value={0.482} animated>
        <AnimationDrawer />
      </PropertyRow>
      <PropertyRow label="amplitude" value={0.165} />
      <PropertyRow label="phase" value={0.000} unit=" π" />
      <PropertyRow label="falloff" value={0.760} />
    </div>
  </>
);

export const PropertiesPanel = ({ mode = 'global' }: { mode?: 'global' | 'ripple' }) => (
  <div
    style={{
      flex: '1 1 auto',
      background: SHADE.surface2,
      display: 'flex', flexDirection: 'column',
      overflow: 'auto', minHeight: 0,
    }}
  >
    {mode === 'global' ? <GlobalProps /> : <RippleProps />}
  </div>
);
