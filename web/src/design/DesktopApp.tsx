import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { SHADE, TYPE, blockById } from './tokens';
import type { BlockDef } from './tokens';
import { Icon, ShadeMascot } from './icons';
import { Block, BLOCK_H } from './Block';
import type { BlockVariant } from './Block';
import {
  Palette, TopBar, TogglePill, DotGridBg, CanvasToolBtn, fullscreenBtnStyle,
} from './components';
import { PropertiesPanel } from './Properties';
import { ShadeCanvas } from './ShadeCanvas';
import type { ShaderVariant } from './ShadeCanvas';
import { BlockEditor } from './BlockEditor';
import { initialActiveParams } from './params';
import type { ParamInstance } from './params';

type ChainBlock = {
  uid: string;
  def: BlockDef;
  animated?: boolean;
  params: ParamInstance[];
};

const makeChain = (defs: BlockDef[]): ChainBlock[] =>
  defs.map((def, i) => ({
    uid: `${def.id}-${i}`,
    def,
    animated: def.id === 'ripple' || def.id === 'hueshift',
    params: initialActiveParams(def.id, def.cat),
  }));

const Chain = ({
  items, selectedIdx = -1, snapIdx = -1, onSelect, onOpen,
}: {
  items: ChainBlock[];
  selectedIdx?: number;
  snapIdx?: number;
  onSelect?: (i: number) => void;
  onOpen?: (i: number) => void;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
    {items.map((it, i) => {
      const variant: BlockVariant = {
        left: i === 0 ? 'flat' : 'notch',
        right: i === items.length - 1 ? 'flat' : 'tab',
      };
      return (
        <Block
          key={it.uid}
          id={it.uid}
          block={it.def}
          variant={variant}
          selected={selectedIdx === i}
          snapTarget={snapIdx === i}
          animated={it.animated}
          paramCount={it.params.length}
          onClick={() => onSelect?.(i)}
          onDoubleClick={() => onOpen?.(i)}
        />
      );
    })}
  </div>
);

const EndCap = () => (
  <div style={{ marginLeft: -1, display: 'flex', alignItems: 'center' }}>
    <svg width="24" height={BLOCK_H} viewBox={`0 0 24 ${BLOCK_H}`} style={{ overflow: 'visible' }}>
      <path
        d={`M 0 ${(BLOCK_H - 26) / 2} L 9 ${(BLOCK_H - 26) / 2 + 4} L 9 ${(BLOCK_H + 26) / 2 - 4} L 0 ${(BLOCK_H + 26) / 2} V ${BLOCK_H / 2 + 12} Q 9 ${BLOCK_H / 2 + 12} 9 ${BLOCK_H / 2 + 4} L 20 ${BLOCK_H / 2} L 9 ${BLOCK_H / 2 - 4} Q 9 ${BLOCK_H / 2 - 12} 0 ${BLOCK_H / 2 - 12} Z`}
        fill="none" stroke={SHADE.border} strokeDasharray="3 3"
      />
      <path
        d={`M 12 ${BLOCK_H / 2 - 5} L 20 ${BLOCK_H / 2} L 12 ${BLOCK_H / 2 + 5}`}
        fill="none" stroke={SHADE.inkLine} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  </div>
);

const BlockCanvas = ({ children, label = 'CHAIN · row 1 / 1' }: { children?: ReactNode; label?: string }) => (
  <div
    style={{
      flex: '1 1 auto', position: 'relative', minHeight: 0,
      background: SHADE.bg, overflow: 'hidden',
    }}
  >
    <DotGridBg />
    <div
      style={{
        position: 'absolute', left: 14, top: 12,
        font: `700 10px ${TYPE.bodyMono}`,
        color: SHADE.textFaint, letterSpacing: '0.22em', textTransform: 'uppercase',
        pointerEvents: 'none',
      }}
    >
      {label}
    </div>
    <div style={{ position: 'absolute', right: 14, top: 10, display: 'flex', gap: 6 }}>
      <CanvasToolBtn icon="search" title="Zoom" />
      <CanvasToolBtn icon="plus" title="Add" />
    </div>
    {children}
  </div>
);

const CodeDrawer = ({
  expanded, onToggle, height = 240,
}: { expanded: boolean; onToggle: () => void; height?: number }) => (
  <div
    style={{
      flex: '0 0 auto',
      borderTop: `1px solid ${SHADE.border}`,
      background: SHADE.bg,
      display: 'flex', flexDirection: 'column',
    }}
  >
    <div
      onClick={onToggle}
      style={{
        height: 44, flex: '0 0 auto',
        padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', userSelect: 'none',
        background: SHADE.surface4,
        color: SHADE.cream,
      }}
    >
      <Icon name="chevron" size={12} color={SHADE.cream} rotate={expanded ? 0 : -90} />
      <Icon name="code" size={15} color={SHADE.gold} cream={SHADE.cream} />
      <span
        style={{
          font: `700 11px ${TYPE.body}`,
          color: SHADE.cream, letterSpacing: '0.22em', textTransform: 'uppercase',
        }}
      >
        Generated GLSL
      </span>
      <span style={{ font: `500 10.5px ${TYPE.bodyMono}`, color: 'rgba(254,231,199,0.55)', letterSpacing: '0.06em' }}>
        · auto-compile · 128 lines
      </span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        <button
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'transparent', color: SHADE.cream,
            border: '1px solid rgba(254,231,199,0.20)', borderRadius: 3,
            padding: '5px 9px', font: `600 10.5px ${TYPE.bodyMono}`,
            letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          copy
        </button>
        <button
          title="Open fullscreen"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 28, height: 26, borderRadius: 3,
            border: '1px solid rgba(254,231,199,0.20)',
            background: 'transparent', color: SHADE.cream, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9V4H9 M20 9V4H15 M4 15V20H9 M20 15V20H15" />
          </svg>
        </button>
      </div>
    </div>
    {expanded && (
      <div
        style={{
          height, flex: '0 0 auto',
          borderTop: `1px solid ${SHADE.border}`,
          background: SHADE.surface4,
          padding: '12px 14px 12px 0',
          overflow: 'auto',
          display: 'flex',
          font: `500 12.5px ${TYPE.bodyMono}`,
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            paddingRight: 14, paddingLeft: 14,
            color: SHADE.textFaint, textAlign: 'right',
            borderRight: `1px solid ${SHADE.border}`,
            marginRight: 14, userSelect: 'none',
          }}
        >
          {Array.from({ length: 18 }, (_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <pre style={{ margin: 0, color: SHADE.cream, whiteSpace: 'pre-wrap' }}>
{`#version 100
precision highp float;
uniform vec2  uResolution;
uniform float uTime;
uniform float uTempo;

// Block 01 — CIRCLE
float circle(vec2 p, float r){ return smoothstep(r, r-0.01, length(p)); }

// Block 02 — RIPPLE   (animating: frequency)
vec2 ripple(vec2 p) {
  float f = `}<span style={{ color: SHADE.gold }}>0.482</span>{` + 0.30*sin(uTime);
  float a = `}<span style={{ color: SHADE.cream }}>0.165</span>{`;
  return p + a*sin(length(p)*f - uTime*1.7) * normalize(p);
}

// Block 03 — PALETTE
vec3 palette(float t){
  return 0.5 + 0.5*cos(6.2831*(t + vec3(0,.33,.67)));
}`}
        </pre>
      </div>
    )}
  </div>
);

const PreviewPanel = ({
  variant = 'plasma', tempo = 120, blocks = 3, onFullscreen,
}: { variant?: ShaderVariant; tempo?: number; blocks?: number; onFullscreen?: () => void }) => (
  <div
    style={{
      flex: '0 0 auto',
      background: SHADE.surface2,
      borderBottom: `1px solid ${SHADE.border}`,
      display: 'flex', flexDirection: 'column',
    }}
  >
    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon name="record" size={13} color={SHADE.ember} />
      <span
        style={{
          font: `700 10.5px ${TYPE.body}`,
          color: SHADE.text, letterSpacing: '0.18em', textTransform: 'uppercase',
        }}
      >
        Preview
      </span>
      <span style={{ marginLeft: 'auto', font: `500 10px ${TYPE.bodyMono}`, color: SHADE.textDim }}>
        {tempo} bpm · {blocks} blocks
      </span>
      <button title="Open fullscreen" onClick={onFullscreen} style={fullscreenBtnStyle}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9V4H9 M20 9V4H15 M4 15V20H9 M20 15V20H15" />
        </svg>
      </button>
    </div>
    <div
      style={{
        margin: '0 14px 12px', borderRadius: 3, overflow: 'hidden',
        border: `1px solid ${SHADE.inkLine}`,
        aspectRatio: '1 / 1', position: 'relative', background: '#000',
      }}
    >
      <ShadeCanvas variant={variant} />
      <div style={{ position: 'absolute', left: 8, top: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <TogglePill active>1080²</TogglePill>
        <TogglePill active>60 fps</TogglePill>
      </div>
      <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
        <button
          style={{
            width: 30, height: 30, borderRadius: 3,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="play" size={12} color="#fff" />
        </button>
      </div>
    </div>
  </div>
);

const RightColumn = ({
  width = 304, previewVariant, propsMode = 'global', blocks = 0, tempo = 120, onFullscreen,
}: {
  width?: number;
  previewVariant: ShaderVariant;
  propsMode?: 'global' | 'ripple';
  blocks?: number;
  tempo?: number;
  onFullscreen?: () => void;
}) => (
  <div
    style={{
      width, flex: '0 0 auto',
      background: SHADE.surface2,
      borderLeft: `1px solid ${SHADE.border}`,
      display: 'flex', flexDirection: 'column',
      minHeight: 0, overflow: 'hidden',
    }}
  >
    <PreviewPanel variant={previewVariant} tempo={tempo} blocks={blocks} onFullscreen={onFullscreen} />
    <PropertiesPanel mode={propsMode} />
  </div>
);

const FullscreenChromeBtn = ({ children, title, onClick }: { children: ReactNode; title: string; onClick?: () => void }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: 32, height: 32, borderRadius: 3,
      background: 'rgba(0,0,0,0.45)',
      border: '1px solid rgba(255,255,255,0.15)',
      color: '#fff', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }}
  >
    {children}
  </button>
);

const PreviewFullscreen = ({ variant, onClose }: { variant: ShaderVariant; onClose: () => void }) => (
  <div
    style={{
      position: 'absolute', inset: 0,
      background: 'rgba(15, 18, 26, 0.45)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, zIndex: 20,
    }}
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        width: '90%', height: '90%',
        background: '#000',
        border: `1px solid ${SHADE.inkLine}`,
        borderRadius: 3, overflow: 'hidden',
      }}
    >
      <ShadeCanvas variant={variant} />
      <div style={{ position: 'absolute', left: 14, top: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <TogglePill active>1920 × 1080</TogglePill>
        <TogglePill active>60 fps</TogglePill>
        <TogglePill>safe area</TogglePill>
        <TogglePill>grid</TogglePill>
        <TogglePill active accent="#FCB427">recording</TogglePill>
      </div>
      <div style={{ position: 'absolute', right: 14, top: 14, display: 'flex', gap: 6 }}>
        <FullscreenChromeBtn title="Settings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008.9 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 8.9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </FullscreenChromeBtn>
        <FullscreenChromeBtn title="Exit fullscreen" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4H4V9 M15 4H20V9 M9 20H4V15 M15 20H20V15" />
          </svg>
        </FullscreenChromeBtn>
      </div>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: 18,
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.75) 100%)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        <button
          style={{
            width: 46, height: 46, borderRadius: 3,
            background: SHADE.gold,
            border: `1px solid ${SHADE.goldDeep}`,
            color: '#1a1208', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="play" size={16} color="#1a1208" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ font: `700 14px ${TYPE.body}`, color: '#fff' }}>Plasma → Ripple → Palette</div>
          <div style={{ font: `500 11px ${TYPE.bodyMono}`, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            120 bpm · 60 fps · 1 cycle = 2 bars · 3 blocks
          </div>
        </div>
        <button
          style={{
            background: 'rgba(255,255,255,0.08)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 3, padding: '9px 14px',
            font: `600 11px ${TYPE.body}`,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
          }}
        >
          <Icon name="share" size={12} color="#fff" /> Export MP4
        </button>
      </div>
    </div>
  </div>
);

const EmptyHero = () => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 22,
        padding: '22px 28px 22px 22px',
        border: `1.5px dashed ${SHADE.borderHi}`,
        borderRadius: 4,
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(6px)',
        maxWidth: 620,
      }}
    >
      <ShadeMascot size={72} />
      <div>
        <div
          style={{
            font: `700 28px ${TYPE.display}`, color: SHADE.text,
            letterSpacing: TYPE.trackTighter, lineHeight: 1.05,
          }}
        >
          Drag a block to start.
        </div>
        <div
          style={{
            font: `400 14px ${TYPE.body}`,
            color: SHADE.textDim, marginTop: 8, lineHeight: 1.5,
          }}
        >
          Begin with a <span style={{ color: SHADE.catShape, fontWeight: 600 }}>shape</span>, then snap on{' '}
          <span style={{ color: SHADE.catDistort, fontWeight: 600 }}>distortions</span>,{' '}
          <span style={{ color: SHADE.catColor, fontWeight: 600 }}>colors</span>, and{' '}
          <span style={{ color: SHADE.catEffect, fontWeight: 600 }}>effects</span>.
        </div>
      </div>
    </div>
  </div>
);

type Mode = 'editing' | 'empty' | 'wrap';

const buildChain = (mode: Mode): ChainBlock[] => {
  if (mode === 'empty') return [];
  if (mode === 'wrap') {
    return makeChain([
      blockById('circle')!,
      blockById('ripple')!,
      blockById('swirl')!,
      blockById('voronoi')!,
      blockById('palette')!,
      blockById('hueshift')!,
      blockById('glow')!,
    ]);
  }
  return makeChain([
    blockById('circle')!,
    blockById('ripple')!,
    blockById('palette')!,
  ]);
};

const ModeSwitcher = ({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) => {
  const opts: Array<{ k: Mode; label: string }> = [
    { k: 'editing', label: 'Editing' },
    { k: 'wrap', label: 'Auto-wrap' },
    { k: 'empty', label: 'Empty' },
  ];
  return (
    <div
      style={{
        position: 'absolute', left: '50%', top: 18, transform: 'translateX(-50%)',
        display: 'flex', gap: 0, padding: 0,
        background: SHADE.surface1,
        border: `1px solid ${SHADE.inkLine}`,
        borderRadius: 3,
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          style={{
            background: mode === o.k ? SHADE.inkLine : 'transparent',
            color: mode === o.k ? SHADE.surface1 : SHADE.text,
            border: 'none',
            borderLeft: o.k !== 'editing' ? `1px solid ${SHADE.inkLine}` : 'none',
            padding: '6px 14px',
            font: `600 10.5px ${TYPE.body}`,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

const WrapArrow = ({ direction = 'down' }: { direction?: 'down' | 'in' }) => (
  <div
    style={{
      width: 30, height: 30, borderRadius: 3,
      background: SHADE.surface1, border: `1px solid ${SHADE.inkLine}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <Icon name={direction === 'down' ? 'arrow-down-right' : 'arrow-up-left'} size={15} color={SHADE.inkLine} />
  </div>
);

const PortalCurve = ({ topOffset = 0 }: { topOffset?: number }) => (
  <svg width="100%" height="44" style={{ position: 'absolute', left: 0, right: 0, top: topOffset, pointerEvents: 'none' }}>
    <path
      d="M 96% 12 C 99% 12, 99% 56, 96% 56 L 4% 56 C 1% 56, 1% 12, 4% 12"
      fill="none" stroke={SHADE.border} strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round"
    />
  </svg>
);

const ChainAutowrap = ({
  row1, row2, onSelect, onOpen, selectedIdx,
}: {
  row1: ChainBlock[];
  row2: ChainBlock[];
  onSelect: (i: number) => void;
  onOpen: (i: number) => void;
  selectedIdx: number;
}) => (
  <div style={{ position: 'absolute', left: 56, top: 76, right: 32 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, height: BLOCK_H }}>
      <Chain items={row1} selectedIdx={selectedIdx} onSelect={onSelect} onOpen={onOpen} />
      <div style={{ marginLeft: 6 }}><WrapArrow direction="down" /></div>
    </div>
    <PortalCurve topOffset={BLOCK_H - 10} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, height: BLOCK_H, marginTop: 22 }}>
      <div style={{ marginRight: 6 }}><WrapArrow direction="in" /></div>
      <Chain
        items={row2}
        selectedIdx={selectedIdx >= row1.length ? selectedIdx - row1.length : -1}
        onSelect={(i) => onSelect(i + row1.length)}
        onOpen={(i) => onOpen(i + row1.length)}
      />
      <EndCap />
    </div>
  </div>
);

export const DesktopApp = () => {
  const [mode, setMode] = useState<Mode>('editing');
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(1);
  const [editorIdx, setEditorIdx] = useState<number | null>(null);

  // Chain state per mode — rebuilt when mode changes
  const [chain, setChain] = useState<ChainBlock[]>(() => buildChain('editing'));
  const switchMode = (m: Mode) => {
    setMode(m);
    setChain(buildChain(m));
    setSelectedIdx(m === 'empty' ? -1 : 0);
    setEditorIdx(null);
  };

  const blocksCount = chain.length;
  const previewVariant: ShaderVariant = mode === 'empty' ? 'plasma' : mode === 'wrap' ? 'swirl' : 'ripple';
  const propsMode: 'global' | 'ripple' =
    mode === 'editing' && chain[selectedIdx]?.def.id === 'ripple' ? 'ripple' : 'global';
  const label =
    mode === 'empty' ? 'CHAIN · empty'
    : mode === 'wrap' ? 'CHAIN · row 1 / 2 · 7 blocks'
    : `CHAIN · row 1 / 1 · ${blocksCount} blocks`;

  const editorBlock = useMemo(
    () => (editorIdx != null ? chain[editorIdx] : null),
    [editorIdx, chain],
  );

  const updateParams = (idx: number, next: ParamInstance[]) =>
    setChain((cs) => cs.map((c, i) => (i === idx ? { ...c, params: next } : c)));

  const containerStyle: CSSProperties = {
    width: '100vw', height: '100vh', background: SHADE.bg, color: SHADE.text,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    font: `400 13px ${TYPE.body}`, position: 'relative',
  };

  return (
    <div style={containerStyle}>
      <TopBar tempo={120} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <Palette />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          <BlockCanvas label={label}>
            <ModeSwitcher mode={mode} onChange={switchMode} />
            {mode === 'editing' && (
              <>
                <div style={{ position: 'absolute', inset: '76px 0 0 56px', display: 'flex', alignItems: 'flex-start' }}>
                  <Chain
                    items={chain}
                    selectedIdx={selectedIdx}
                    onSelect={setSelectedIdx}
                    onOpen={setEditorIdx}
                  />
                  <EndCap />
                </div>
                <div
                  style={{
                    position: 'absolute', left: 56, right: 32,
                    top: 76 + BLOCK_H + 18, height: 1,
                    borderTop: `1px dashed ${SHADE.border}`, opacity: 0.6,
                  }}
                />
                <div
                  style={{
                    position: 'absolute', left: 56, top: 76 + BLOCK_H + 24,
                    font: `500 9.5px ${TYPE.bodyMono}`,
                    color: SHADE.textFaint, letterSpacing: '0.18em', textTransform: 'uppercase',
                  }}
                >
                  Double-click any block to edit all parameters
                </div>
              </>
            )}
            {mode === 'wrap' && (() => {
              const row1 = chain.slice(0, 4);
              const row2 = chain.slice(4);
              return (
                <ChainAutowrap
                  row1={row1}
                  row2={row2}
                  selectedIdx={selectedIdx}
                  onSelect={setSelectedIdx}
                  onOpen={setEditorIdx}
                />
              );
            })()}
            {mode === 'empty' && <EmptyHero />}
          </BlockCanvas>
          <CodeDrawer expanded={drawerExpanded} onToggle={() => setDrawerExpanded((x) => !x)} height={300} />
        </div>
        <RightColumn
          previewVariant={previewVariant}
          propsMode={propsMode}
          blocks={blocksCount}
          tempo={120}
          onFullscreen={() => setFullscreen(true)}
        />
        {fullscreen && <PreviewFullscreen variant={previewVariant} onClose={() => setFullscreen(false)} />}
        {editorBlock && (
          <BlockEditor
            block={editorBlock.def}
            active={editorBlock.params}
            onChange={(next) => updateParams(editorIdx!, next)}
            onClose={() => setEditorIdx(null)}
          />
        )}
      </div>
    </div>
  );
};
