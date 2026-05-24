import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BLOCK_LIB, CATEGORIES, SHADE, TYPE, blockById } from './tokens';
import { Icon, ShadeLogo, ShadeMascot } from './icons';
import { ShadeCanvas } from './ShadeCanvas';
import { DotGridBg, TogglePill } from './components';

const MobileTopBar = ({ tempo = 120 }: { tempo?: number }) => (
  <div
    style={{
      height: 52, flex: '0 0 auto',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 12,
      borderBottom: `1px solid ${SHADE.border}`, background: SHADE.bg,
    }}
  >
    <button
      style={{
        width: 32, height: 32, borderRadius: 7, background: 'transparent',
        border: `1px solid ${SHADE.border}`, color: SHADE.textDim,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}
    >
      <Icon name="menu" size={16} color={SHADE.textDim} />
    </button>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <ShadeLogo size={20} />
      <span style={{ font: `600 17px ${TYPE.body}`, letterSpacing: TYPE.trackTight }}>Shaddy</span>
    </div>
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: SHADE.textDim }}>
        <Icon name="metro" size={14} color={SHADE.textDim} />
        <span style={{ font: `500 12px ${TYPE.bodyMono}`, color: SHADE.text }}>{tempo}</span>
      </div>
      <button
        style={{
          width: 32, height: 32, borderRadius: 7, background: 'transparent',
          border: `1px solid ${SHADE.border}`, color: SHADE.textDim,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="dots" size={14} color={SHADE.textDim} />
      </button>
    </div>
  </div>
);

const Sheet = ({ children, onClose }: { children: ReactNode; onClose?: () => void }) => (
  <>
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 5 }} />
    <div
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 6,
        maxHeight: '82%',
        background: SHADE.surface2,
        borderTop: `1px solid ${SHADE.border}`,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', padding: '9px 0 4px' }}>
        <div style={{ width: 44, height: 4, borderRadius: 2, background: SHADE.border }} />
      </div>
      {children}
    </div>
  </>
);

const BigSlider = ({
  label, value, animated = false, unit = '',
}: { label: string; value: number; animated?: boolean; unit?: string }) => {
  const [t, setT] = useState(value);
  useEffect(() => {
    if (!animated) return;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      setT(0.5 + 0.4 * Math.sin(((performance.now() - start) / 1000) * 1.6));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [animated]);
  const v = animated ? t : value;
  const handleW = 22;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
        <span style={{ font: `600 11.5px ${TYPE.body}`, color: SHADE.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {label}
          {animated && (
            <span style={{ marginLeft: 8, color: SHADE.ember, font: `500 10px ${TYPE.bodyMono}`, letterSpacing: '0.18em' }}>
              ANIM
            </span>
          )}
        </span>
        <span style={{ font: `500 14px ${TYPE.bodyMono}`, color: animated ? SHADE.ember : SHADE.text }}>
          {v.toFixed(3)}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: handleW + 4 }}>
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: (handleW + 4 - 7) / 2,
            height: 7,
            background: SHADE.surface3,
            border: `1px solid ${SHADE.border}`,
            borderRadius: 1,
          }}
        />
        {[0.25, 0.5, 0.75].map((p) => (
          <div
            key={p}
            style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `calc(${p * 100}% - 0.5px)`, width: 1,
              background: p === 0.5 ? SHADE.textDim : SHADE.border, opacity: 0.55,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute', left: 0, top: (handleW + 4 - 7) / 2,
            height: 7, width: `${v * 100}%`,
            background: animated
              ? `repeating-linear-gradient(45deg, ${SHADE.ember} 0 5px, ${SHADE.goldDeep} 5px 10px)`
              : SHADE.inkLine,
            borderTopLeftRadius: 1, borderBottomLeftRadius: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${v * 100}% - ${handleW / 2}px)`, top: 2,
            width: handleW, height: handleW,
            background: SHADE.surface1,
            border: `2px solid ${animated ? SHADE.ember : SHADE.inkLine}`,
            borderRadius: 3,
          }}
        >
          <span style={{ position: 'absolute', left: 5, right: 5, top: 6,  height: 1, background: SHADE.textDim, opacity: 0.6 }} />
          <span style={{ position: 'absolute', left: 5, right: 5, top: 10, height: 1, background: SHADE.textDim, opacity: 0.6 }} />
          <span style={{ position: 'absolute', left: 5, right: 5, top: 14, height: 1, background: SHADE.textDim, opacity: 0.6 }} />
        </div>
      </div>
    </div>
  );
};

const PaletteSheet = ({ onClose }: { onClose: () => void }) => {
  const [activeCat, setActiveCat] = useState<keyof typeof CATEGORIES>('shape');
  const blocks = BLOCK_LIB.filter((b) => b.cat === activeCat);
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 18px 12px' }}>
        <span style={{ font: `600 18px ${TYPE.body}`, color: SHADE.text, letterSpacing: TYPE.trackTight }}>Block library</span>
        <span style={{ marginLeft: 10, font: `500 11px ${TYPE.bodyMono}`, color: SHADE.textDim }}>
          {BLOCK_LIB.length} blocks
        </span>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto', width: 30, height: 30, borderRadius: 7,
            background: 'transparent', border: `1px solid ${SHADE.border}`,
            color: SHADE.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Icon name="close" size={14} color={SHADE.textDim} />
        </button>
      </div>
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
            borderRadius: 10, padding: '11px 13px',
          }}
        >
          <Icon name="search" size={15} color={SHADE.textDim} />
          <span style={{ font: `500 14px ${TYPE.body}`, color: SHADE.textDim }}>search blocks…</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '4px 16px 14px', overflowX: 'auto' }}>
        {(Object.entries(CATEGORIES) as Array<[keyof typeof CATEGORIES, (typeof CATEGORIES)[keyof typeof CATEGORIES]]>).map(([k, c]) => {
          const active = k === activeCat;
          return (
            <button
              key={k}
              onClick={() => setActiveCat(k)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto',
                padding: '9px 14px',
                borderRadius: 999,
                background: active ? c.color : SHADE.surface1,
                border: `1px solid ${active ? c.color : SHADE.border}`,
                color: active ? SHADE.bg : SHADE.text,
                font: `600 12.5px ${TYPE.body}`,
                letterSpacing: '-0.005em',
                cursor: 'pointer',
              }}
            >
              <Icon name={c.icon} size={14} color={active ? SHADE.bg : c.color} cream={active ? SHADE.bg : SHADE.cream} />
              {c.label}
            </button>
          );
        })}
      </div>
      <div
        style={{
          padding: '2px 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10, flex: 1, overflowY: 'auto', minHeight: 0,
        }}
      >
        {blocks.map((b) => {
          const cat = CATEGORIES[b.cat];
          const isAnim = b.mini.kind === 'slider' && b.mini.animated;
          return (
            <div
              key={b.id}
              style={{
                background: SHADE.surface1,
                border: `1px solid ${SHADE.border}`,
                borderRadius: 12,
                padding: '12px 10px 12px',
                display: 'flex', flexDirection: 'column', gap: 10,
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3.5, background: cat.color }} />
              <div
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${cat.color}1a`,
                  border: `1px solid ${cat.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name={b.icon} size={22} color={cat.color} />
              </div>
              <div>
                <div style={{ font: `600 12px ${TYPE.body}`, letterSpacing: '-0.005em', color: SHADE.text }}>
                  {b.name}
                </div>
                <div style={{ font: `500 9.5px ${TYPE.bodyMono}`, color: SHADE.textDim, letterSpacing: '0.08em', marginTop: 2, textTransform: 'uppercase' }}>
                  {b.mini.kind === 'slider' ? b.mini.label : 'palette'}
                </div>
              </div>
              {isAnim && (
                <span
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    font: `700 8.5px ${TYPE.bodyMono}`,
                    color: SHADE.ember, letterSpacing: '0.18em',
                  }}
                >
                  ANIM
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
};

const AnimationDrawerCompact = () => {
  const path = (() => {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const x = (i / 60) * 320;
      const y = 24 + Math.sin((i / 60) * Math.PI * 2.2) * 14;
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  })();
  return (
    <div style={{ border: `1px solid ${SHADE.border}`, borderRadius: 10, background: SHADE.surface4, overflow: 'hidden' }}>
      <div
        style={{
          padding: '9px 13px',
          borderBottom: `1px solid ${SHADE.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
          font: `600 10.5px ${TYPE.bodyMono}`,
          color: SHADE.textDim, letterSpacing: '0.18em', textTransform: 'uppercase',
        }}
      >
        <span style={{ color: SHADE.ember }}>Sine</span>
        <span style={{ color: SHADE.textFaint }}>· ¼ bar</span>
        <span style={{ marginLeft: 'auto', color: SHADE.cream }}>120 bpm</span>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <svg width="100%" height="48" viewBox="0 0 320 48" preserveAspectRatio="none" style={{ display: 'block' }}>
          <line x1="0" y1="24" x2="320" y2="24" stroke={SHADE.border} strokeDasharray="2 3" />
          <path d={path} stroke={SHADE.ember} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

const PropsSheet = ({ onClose }: { onClose: () => void }) => {
  const ripple = blockById('ripple')!;
  return (
    <Sheet onClose={onClose}>
      <div style={{ padding: '8px 18px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 10,
            background: `${SHADE.catDistort}1f`, border: `1px solid ${SHADE.catDistort}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name={ripple.icon} size={24} color={SHADE.catDistort} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: `600 17px ${TYPE.body}`, letterSpacing: TYPE.trackTight }}>Ripple</div>
          <div style={{ font: `500 10px ${TYPE.bodyMono}`, color: SHADE.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Distortion · block 02
          </div>
        </div>
        <button
          style={{
            padding: '8px 12px', borderRadius: 8,
            background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
            color: SHADE.text, font: `500 12px ${TYPE.body}`,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}
        >
          <Icon name="code" size={13} color={SHADE.textDim} /> code
        </button>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: SHADE.surface1, border: `1px solid ${SHADE.border}`,
            color: SHADE.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="close" size={14} color={SHADE.textDim} />
        </button>
      </div>
      <div style={{ padding: '4px 18px 16px', display: 'flex', flexDirection: 'column', gap: 22, overflowY: 'auto', flex: 1 }}>
        <BigSlider label="frequency" value={0.482} animated />
        <AnimationDrawerCompact />
        <BigSlider label="amplitude" value={0.165} />
        <BigSlider label="phase" value={0.000} unit=" π" />
        <BigSlider label="falloff" value={0.760} />
      </div>
      <div style={{ borderTop: `1px solid ${SHADE.border}`, padding: '10px 16px', display: 'flex', gap: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, height: 46, borderRadius: 10,
            background: SHADE.gold, color: '#1a1208',
            border: `1px solid ${SHADE.goldDeep}`,
            font: `600 15px ${TYPE.body}`,
            letterSpacing: TYPE.trackTight, cursor: 'pointer',
            boxShadow: `0 1px 0 ${SHADE.cream}66 inset`,
          }}
        >
          Done
        </button>
        <button
          style={{
            width: 56, height: 46, borderRadius: 10,
            background: SHADE.surface1, color: SHADE.text,
            border: `1px solid ${SHADE.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Icon name="trash" size={17} color={SHADE.textDim} />
        </button>
      </div>
    </Sheet>
  );
};

export const MobileApp = () => {
  const [sheet, setSheet] = useState<'none' | 'palette' | 'props'>('none');
  return (
    <div
      style={{
        width: '100vw', height: '100vh', background: SHADE.bg, color: SHADE.text,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        font: `400 13px ${TYPE.body}`, position: 'relative',
      }}
    >
      <MobileTopBar />
      <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative', background: '#000' }}>
        <ShadeCanvas variant="plasma" />
        <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <TogglePill active>1080²</TogglePill>
          <TogglePill active>60 fps</TogglePill>
        </div>
      </div>
      <div style={{ height: 12, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: SHADE.bg }}>
        <div style={{ width: 38, height: 4, borderRadius: 2, background: SHADE.border }} />
      </div>
      <div style={{ height: 196, flex: '0 0 auto', background: SHADE.bg, position: 'relative' }}>
        <DotGridBg />
        <div
          style={{
            position: 'absolute', left: 14, top: 8,
            font: `600 9.5px ${TYPE.body}`,
            color: SHADE.textFaint, letterSpacing: '0.18em', textTransform: 'uppercase',
          }}
        >
          CHAIN · empty
        </div>
        <div style={{ position: 'absolute', inset: '28px 16px 60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px 10px 10px',
              border: `1.5px dashed ${SHADE.borderHi}`,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <ShadeMascot size={48} />
            <div>
              <div style={{ font: `600 15px ${TYPE.body}`, color: SHADE.text, letterSpacing: TYPE.trackTight }}>
                Tap to add a block
              </div>
              <div style={{ font: `400 12px ${TYPE.body}`, color: SHADE.textDim, marginTop: 2 }}>
                Start with a <span style={{ color: SHADE.catShape, fontWeight: 600 }}>shape</span>.
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: 56, borderTop: `1px solid ${SHADE.border}`,
            background: SHADE.bg,
            display: 'flex', padding: '0 12px', gap: 8, alignItems: 'center',
          }}
        >
          <button
            onClick={() => setSheet('palette')}
            style={{
              flex: 1, height: 40, borderRadius: 9,
              background: SHADE.gold, color: '#1a1208',
              border: `1px solid ${SHADE.goldDeep}`,
              font: `600 13.5px ${TYPE.body}`,
              letterSpacing: '-0.005em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              cursor: 'pointer',
              boxShadow: `0 1px 0 ${SHADE.cream}66 inset`,
            }}
          >
            <Icon name="plus" size={15} color="#1a1208" /> Add block
          </button>
          <button
            onClick={() => setSheet('props')}
            style={{
              width: 124, height: 40, borderRadius: 9,
              background: SHADE.surface1, color: SHADE.text,
              border: `1px solid ${SHADE.border}`,
              font: `500 12.5px ${TYPE.body}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer',
            }}
          >
            <Icon name="menu" size={13} color={SHADE.textDim} /> props
          </button>
        </div>
      </div>
      {sheet === 'palette' && <PaletteSheet onClose={() => setSheet('none')} />}
      {sheet === 'props' && <PropsSheet onClose={() => setSheet('none')} />}
    </div>
  );
};
