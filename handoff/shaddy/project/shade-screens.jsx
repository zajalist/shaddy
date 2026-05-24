// shade-screens.jsx — Desktop screens with Scratch-style layout.
//
//   ┌────────────────────────────────────────────────────────────┐
//   │ TopBar                                                     │
//   ├──────┬──────────────────────────────────────┬──────────────┤
//   │      │                                      │   PREVIEW    │
//   │ PAL  │         BLOCK CANVAS  (big)          │   (compact)  │
//   │ ETTE │         dot-grid, drag, snap         ├──────────────┤
//   │      │                                      │   PROPS      │
//   │      ├──────────────────────────────────────┤   panel      │
//   │      │  ▼ Generated GLSL   [⤢ expand]       │              │
//   │      │  collapsed = 40px header             │              │
//   └──────┴──────────────────────────────────────┴──────────────┘

const Frame = ({ children, w, h, screen }) => (
  <div data-screen-label={screen} style={{
    width: w, height: h, background: SHADE.bg, color: SHADE.text,
    display:'flex', flexDirection:'column', overflow:'hidden',
    font:'400 13px "IBM Plex Sans", "Inter", system-ui, sans-serif',
    position:'relative',
  }}>{children}</div>
);

const Chain = ({ items, selectedIdx = -1, snapIdx = -1 }) => (
  <div style={{ display:'flex', alignItems:'center', gap: 0 }}>
    {items.map((it, i) => {
      const variant = {
        left:  i === 0 ? 'flat' : 'notch',
        right: i === items.length - 1 ? 'flat' : 'tab',
      };
      return (
        <Block
          key={i} id={`${it.id}-${i}`} block={it} variant={variant}
          selected={selectedIdx === i} snapTarget={snapIdx === i}
          animated={it.animated}
        />
      );
    })}
  </div>
);

const EndCap = () => (
  <div style={{ marginLeft: -1, display:'flex', alignItems:'center' }}>
    <svg width="24" height={BLOCK_H} viewBox={`0 0 24 ${BLOCK_H}`} style={{ overflow:'visible' }}>
      <path
        d={`M 0 ${(BLOCK_H-26)/2} L 9 ${(BLOCK_H-26)/2 + 4} L 9 ${(BLOCK_H+26)/2 - 4} L 0 ${(BLOCK_H+26)/2} V ${BLOCK_H/2 + 12} Q 9 ${BLOCK_H/2 + 12} 9 ${BLOCK_H/2 + 4} L 20 ${BLOCK_H/2} L 9 ${BLOCK_H/2 - 4} Q 9 ${BLOCK_H/2 - 12} 0 ${BLOCK_H/2 - 12} Z`}
        fill="none" stroke={SHADE.border} strokeDasharray="3 3"
      />
      <circle cx="20" cy={BLOCK_H/2} r="3.5" fill={SHADE.gold} stroke={SHADE.cream} strokeWidth="1.5"
        style={{ filter:`drop-shadow(0 0 5px ${SHADE.gold})` }} />
    </svg>
  </div>
);

// Dot grid background — Scratch's editor has a soft grid. We use a CSS
// radial-gradient so it stays sharp at any zoom and never costs an asset.
const DotGridBg = () => (
  <div style={{
    position:'absolute', inset:0,
    background:
      `radial-gradient(${SHADE.border} 1px, transparent 1px)`,
    backgroundSize: '20px 20px',
    backgroundPosition: '-1px -1px',
    opacity: 0.55,
    pointerEvents:'none',
  }} />
);

// Wrap portal: SVG bezier connecting end-of-row-1 to start-of-row-2.
const PortalCurve = ({ topOffset = 0 }) => (
  <svg width="100%" height="44" style={{ position:'absolute', left:0, right:0, top: topOffset, pointerEvents:'none' }}>
    <path
      d={`M 96% 12 C 99% 12, 99% 56, 96% 56 L 4% 56 C 1% 56, 1% 12, 4% 12`}
      fill="none" stroke={SHADE.border} strokeWidth="1.2" strokeDasharray="3 3"
    />
    <circle r="3.5" fill={SHADE.gold} stroke={SHADE.cream} strokeWidth="1.2"
      style={{ filter:`drop-shadow(0 0 6px ${SHADE.gold})` }}>
      <animateMotion dur="2.4s" repeatCount="indefinite"
        path={`M 1000 12 C 1030 12, 1030 56, 1000 56 L 40 56 C 10 56, 10 12, 40 12`} />
    </circle>
  </svg>
);

const WrapArrow = ({ direction = 'down' }) => (
  <div style={{
    width: 30, height: 30, borderRadius: 8,
    background: SHADE.surface1, border:`1px solid ${SHADE.border}`,
    display:'flex', alignItems:'center', justifyContent:'center',
  }}>
    <Icon name={direction === 'down' ? 'arrow-down-right' : 'arrow-up-left'} size={15} color={SHADE.gold} />
  </div>
);

// ─── Compact preview (right-top) ──────────────────────────────────────────
const PreviewPanel = ({ variant = 'plasma', tempo = 120, blocks = 3 }) => (
  <div style={{
    flex:'0 0 auto',
    background: SHADE.surface2,
    borderBottom:`1px solid ${SHADE.border}`,
    display:'flex', flexDirection:'column',
  }}>
    <div style={{
      padding:'10px 14px',
      display:'flex', alignItems:'center', gap:8,
    }}>
      <Icon name="record" size={13} color={SHADE.gold} />
      <span style={{
        font:'600 11px "IBM Plex Sans", "Inter", sans-serif',
        color: SHADE.text, letterSpacing:'0.10em', textTransform:'uppercase',
      }}>Preview</span>
      <span style={{ marginLeft:'auto', font:'500 10px "JetBrains Mono", monospace', color: SHADE.textDim }}>
        {tempo} bpm · {blocks} blocks
      </span>
      <button title="Open fullscreen" style={{
        width:24, height:24, borderRadius:5, border:`1px solid ${SHADE.border}`,
        background:'transparent', color: SHADE.textDim, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9V4H9 M20 9V4H15 M4 15V20H9 M20 15V20H15"/>
        </svg>
      </button>
    </div>
    {/* The actual canvas in a 1:1 framed square */}
    <div style={{
      margin:'0 14px 12px', borderRadius: 10, overflow:'hidden',
      border:`1px solid ${SHADE.border}`,
      aspectRatio:'1 / 1', position:'relative', background:'#000',
    }}>
      <ShadeCanvas variant={variant} />
      {/* Floating negative-color chips */}
      <div style={{ position:'absolute', left:8, top:8, display:'flex', gap:5, flexWrap:'wrap' }}>
        <TogglePill active>1080²</TogglePill>
        <TogglePill active>60 fps</TogglePill>
      </div>
      <div style={{ position:'absolute', right:8, bottom:8 }}>
        <button style={{
          width:30, height:30, borderRadius:7,
          background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)',
          border:`1px solid rgba(255,255,255,0.15)`,
          color:'#fff', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Icon name="play" size={12} color="#fff" />
        </button>
      </div>
    </div>
  </div>
);

// ─── Properties panel (right-bottom) ──────────────────────────────────────
const PropertiesPanel = ({ mode = 'global' }) => (
  <div style={{
    flex:'1 1 auto',
    background: SHADE.surface2,
    display:'flex', flexDirection:'column',
    overflow:'auto', minHeight:0,
  }}>
    {mode === 'global' ? <GlobalProps /> : <RippleProps />}
  </div>
);

const GlobalProps = () => (
  <>
    <PropSectionHeader title="Properties" />
    <div style={{ padding:'2px 14px 14px', font:'400 12px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.textDim, lineHeight:1.55 }}>
      Select a block in the canvas to edit it. Or set global tempo + output below.
    </div>
    <div style={{ borderTop:`1px solid ${SHADE.border}` }} />
    <PropSectionHeader title="Tempo" />
    <div style={{ padding:'0 14px 14px' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 10 }}>
        <span style={{ font:'600 32px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.text, lineHeight:1, letterSpacing:'-0.04em' }}>
          120<span style={{ color: SHADE.textDim, fontSize:13, marginLeft:6, fontWeight:500 }}>bpm</span>
        </span>
        <button style={{
          background: SHADE.surface1, color: SHADE.text,
          border:`1px solid ${SHADE.border}`, borderRadius:6,
          padding:'7px 12px', font:'500 11px "JetBrains Mono", monospace',
          letterSpacing:'0.10em', textTransform:'uppercase', cursor:'pointer',
        }}>tap</button>
      </div>
      <PropertySlider label="Tempo" value={0.5} />
    </div>
    <div style={{ borderTop:`1px solid ${SHADE.border}` }} />
    <PropSectionHeader title="Output" />
    <div style={{ padding:'0 14px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 6 }}>
      {['1920×1080','1080×1080','1080×1920','3840×2160'].map((s,i) => (
        <button key={i} style={{
          background: i===0 ? SHADE.surface3 : SHADE.surface1,
          border: `1px solid ${i===0 ? SHADE.borderHi : SHADE.border}`,
          borderRadius:7, padding:'9px 10px',
          font:'500 11px "JetBrains Mono", monospace',
          color: i===0 ? SHADE.text : SHADE.textDim,
          textAlign:'left', cursor:'pointer',
        }}>{s}</button>
      ))}
    </div>
    <div style={{ borderTop:`1px solid ${SHADE.border}` }} />
    <PropSectionHeader title="Share" />
    <div style={{ padding:'0 14px 14px', display:'flex', flexDirection:'column', gap:8 }}>
      <button style={{
        background: SHADE.gold, color:'#1a1208',
        border:'none', borderRadius:8, padding:'11px 12px',
        font:'600 12.5px "IBM Plex Sans", "Inter", sans-serif',
        letterSpacing:'-0.005em',
        cursor:'pointer', display:'flex', alignItems:'center', gap:8, justifyContent:'center',
        boxShadow: `0 1px 0 ${SHADE.cream}66 inset, 0 0 0 1px ${SHADE.goldDeep}`,
      }}>
        <Icon name="share" size={14} color="#1a1208" /> Publish to gallery
      </button>
    </div>
    <div style={{ flex:1 }} />
    <div style={{
      borderTop:`1px solid ${SHADE.border}`,
      padding:'10px 14px',
      font:'500 9.5px "JetBrains Mono", monospace',
      color: SHADE.textFaint, letterSpacing:'0.14em',
      display:'flex', justifyContent:'space-between',
    }}>
      <span>WEBGL · OK</span><span>v0.4.2</span>
    </div>
  </>
);

const RippleProps = () => (
  <>
    <div style={{ padding:'14px 14px', borderBottom:`1px solid ${SHADE.border}`, display:'flex', alignItems:'center', gap:11 }}>
      <div style={{
        width:36, height:36, borderRadius:9,
        background: `${SHADE.catDistort}1f`,
        border:`1px solid ${SHADE.catDistort}55`,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <Icon name="b-ripple" size={20} color={SHADE.catDistort} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ font:'600 15px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.text, letterSpacing:'-0.01em' }}>Ripple</div>
        <div style={{ font:'500 10px "JetBrains Mono", monospace', color: SHADE.textDim, letterSpacing:'0.08em', textTransform:'uppercase' }}>
          Distortion · block 02
        </div>
      </div>
      <button style={{ width:28, height:28, border:`1px solid ${SHADE.border}`, background:'transparent', color: SHADE.textDim, cursor:'pointer', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon name="dots" size={13} color={SHADE.textDim} />
      </button>
    </div>

    <div style={{ padding:'14px 14px 8px', display:'flex', flexDirection:'column', gap:16 }}>
      <PropertyRow label="frequency" value={0.482} animated>
        <AnimationDrawer />
      </PropertyRow>
      <PropertyRow label="amplitude" value={0.165} />
      <PropertyRow label="phase"     value={0.000} unit=" π" />
      <PropertyRow label="falloff"   value={0.760} />
    </div>
  </>
);

const PropertyRow = ({ label, value, animated, unit, children }) => (
  <div>
    <PropertySlider label={label} value={value} animated={animated} unit={unit} />
    {children}
  </div>
);

const AnimationDrawer = () => {
  const path = (() => {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const x = (i/60) * 244;
      const y = 24 + Math.sin((i/60) * Math.PI * 2.2) * 14;
      pts.push(`${i===0?'M':'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  })();
  return (
    <div style={{
      marginTop: 10,
      border:`1px solid ${SHADE.border}`, borderRadius:9,
      background: SHADE.surface4,
      overflow:'hidden',
    }}>
      <div style={{
        padding:'8px 11px',
        borderBottom:`1px solid ${SHADE.border}`,
        display:'flex', alignItems:'center', gap:8,
        font:'500 10px "JetBrains Mono", monospace',
        color: SHADE.textDim, letterSpacing:'0.12em', textTransform:'uppercase',
      }}>
        <span style={{ width:6, height:6, borderRadius:3, background: SHADE.gold, border:`1px solid ${SHADE.cream}`, boxShadow:`0 0 6px ${SHADE.gold}` }} />
        <span style={{ color: SHADE.gold }}>animating</span>
        <span style={{ color: SHADE.textFaint }}>· sine</span>
        <span style={{ marginLeft:'auto', color: SHADE.text }}>120 bpm</span>
      </div>
      <div style={{ padding:'10px 12px' }}>
        <svg width="100%" height="48" viewBox="0 0 244 48" preserveAspectRatio="none" style={{ display:'block' }}>
          <line x1="0" y1="24" x2="244" y2="24" stroke={SHADE.border} strokeDasharray="2 3" />
          <path d={path} stroke={SHADE.gold} strokeWidth="1.5" fill="none" style={{ filter:`drop-shadow(0 0 4px ${SHADE.gold}aa)` }} />
          <circle cx="92" cy={24 + Math.sin((92/244)*Math.PI*2.2)*14} r="3.5" fill={SHADE.gold} stroke={SHADE.cream} strokeWidth="1.5" />
        </svg>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
          <DrawerMini label="min" value="0.180" />
          <DrawerMini label="max" value="0.840" />
          <DrawerMini label="speed" value="¼ bar" />
          <DrawerMini label="shape" value="sine" />
        </div>
      </div>
    </div>
  );
};

const DrawerMini = ({ label, value }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
    <span style={{ font:'500 9px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.textDim, letterSpacing:'0.12em', textTransform:'uppercase' }}>{label}</span>
    <div style={{
      padding:'6px 9px',
      background: SHADE.surface1,
      border:`1px solid ${SHADE.border}`,
      borderRadius: 6,
      font:'500 11px "JetBrains Mono", monospace',
      color: SHADE.text,
    }}>{value}</div>
  </div>
);

// ─── Code drawer (bottom of center column, collapsible) ──────────────────
const CodeDrawer = ({ expanded = false, lines, height }) => {
  const innerHeight = expanded ? (height ?? 240) : 0;
  const sample = lines || [
    {n:1, t:[['k','vec2'],[' ', null],['f','ripple'],['p','(p) {']]},
    {n:2, t:[['  ', null],['k','float'],[' f = '], ['g','0.482'],[' + '],['g','0.30'],['p','*'],['f','sin'],['p','(uT);']]},
    {n:3, t:[['  ', null],['k','float'],[' a = '], ['t','0.165'],[';']]},
    {n:4, t:[['  ', null],['k','return'],[' p + a*'], ['f','sin'],['p','('], ['f','length'],['p','(p)*f'],['p',' - uT*'],['g','1.7'],['p',') * '],['f','normalize'],['p','(p);']]},
    {n:5, t:[['p','}']]},
  ];
  return (
    <div style={{
      flex:'0 0 auto',
      borderTop:`1px solid ${SHADE.border}`,
      background: SHADE.bg,
      display:'flex', flexDirection:'column',
    }}>
      {/* Header */}
      <div style={{
        height: 44, flex:'0 0 auto',
        padding:'0 14px', display:'flex', alignItems:'center', gap:10,
        cursor:'pointer',
      }}>
        <Icon name="chevron" size={11} color={SHADE.textDim} rotate={expanded ? 0 : -90} />
        <Icon name="code" size={14} color={SHADE.gold} />
        <span style={{
          font:'600 11px "IBM Plex Sans", "Inter", sans-serif',
          color: SHADE.text, letterSpacing:'0.14em', textTransform:'uppercase',
        }}>Generated GLSL</span>
        <span style={{
          font:'500 10px "JetBrains Mono", monospace',
          color: SHADE.textDim, letterSpacing:'0.06em',
        }}>· auto-compile · {expanded ? '128 lines' : '128 lines'}</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button style={{
            background:'transparent', color: SHADE.textDim,
            border:`1px solid ${SHADE.border}`, borderRadius:6,
            padding:'5px 9px', font:'500 10.5px "JetBrains Mono", monospace',
            letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer',
            display:'flex', alignItems:'center', gap:6,
          }}>copy</button>
          <button title="Open fullscreen" style={{
            width:28, height:26, borderRadius:6, border:`1px solid ${SHADE.border}`,
            background:'transparent', color: SHADE.textDim, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9V4H9 M20 9V4H15 M4 15V20H9 M20 15V20H15"/>
            </svg>
          </button>
        </div>
      </div>
      {/* Expanded body */}
      {expanded && (
        <div style={{
          height: innerHeight, flex:'0 0 auto',
          borderTop:`1px solid ${SHADE.border}`,
          background: SHADE.surface4,
          padding: '12px 14px 12px 0',
          overflow:'auto',
          display:'flex',
          font:'500 12.5px "JetBrains Mono", monospace',
          lineHeight: 1.6,
        }}>
          <div style={{
            paddingRight:14, paddingLeft:14,
            color: SHADE.textFaint, textAlign:'right',
            borderRight: `1px solid ${SHADE.border}`,
            marginRight: 14, userSelect:'none',
          }}>
            {Array.from({length: 18}, (_,i) => <div key={i}>{i+1}</div>)}
          </div>
          <pre style={{ margin:0, color: SHADE.text, whiteSpace:'pre-wrap' }}>{`#version 100
precision highp float;
uniform vec2  uResolution;
uniform float uTime;
uniform float uTempo;

// Block 01 — CIRCLE
float circle(vec2 p, float r){ return smoothstep(r, r-0.01, length(p)); }

// Block 02 — RIPPLE   (animating: frequency)
vec2 ripple(vec2 p) {
  float f = `}<span style={{ color: SHADE.gold }}>0.482</span>{` + 0.30*sin(uTime);
  float a = `}<span style={{ color: SHADE.text }}>0.165</span>{`;
  return p + a*sin(length(p)*f - uTime*1.7) * normalize(p);
}

// Block 03 — PALETTE
vec3 palette(float t){
  return 0.5 + 0.5*cos(6.2831*(t + vec3(0,.33,.67)));
}`}</pre>
        </div>
      )}
    </div>
  );
};

// ─── The "block canvas" — a Scratch-style scripting surface ──────────────
const BlockCanvas = ({ children, label = 'CHAIN · row 1 / 1' }) => (
  <div style={{
    flex:'1 1 auto', position:'relative', minHeight:0,
    background: SHADE.bg, overflow:'hidden',
  }}>
    <DotGridBg />
    {/* Top-left meta */}
    <div style={{
      position:'absolute', left:14, top:12,
      font:'600 10px "IBM Plex Sans", "Inter", sans-serif',
      color: SHADE.textFaint, letterSpacing:'0.18em', textTransform:'uppercase',
      pointerEvents:'none',
    }}>{label}</div>
    {/* Top-right canvas tools */}
    <div style={{
      position:'absolute', right:14, top:10, display:'flex', gap:6,
    }}>
      <CanvasToolBtn icon="search" title="Zoom" />
      <CanvasToolBtn icon="plus" title="Add" />
    </div>
    {children}
  </div>
);

const CanvasToolBtn = ({ icon, title }) => (
  <button title={title} style={{
    width:28, height:28, borderRadius:7,
    background: SHADE.surface1, border:`1px solid ${SHADE.border}`,
    color: SHADE.textDim, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center',
  }}>
    <Icon name={icon} size={14} color={SHADE.textDim} />
  </button>
);

// ─── Screen 1: Empty state ────────────────────────────────────────────────
const Screen1_DesktopEmpty = () => (
  <Frame w={1280} h={800} screen="01 Empty state">
    <TopBar tempo={120} />
    <div style={{ flex:1, display:'flex', minHeight:0 }}>
      <Palette />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <BlockCanvas label="CHAIN · empty">
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{
              display:'flex', alignItems:'center', gap: 18,
              padding:'18px 24px 18px 18px',
              border:`1.5px dashed ${SHADE.borderHi}`,
              borderRadius:14,
              background:'rgba(255,255,255,0.82)',
              backdropFilter:'blur(6px)',
            }}>
              <ShadeMascot size={64} />
              <div>
                <div style={{ font:'600 22px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.text, letterSpacing:'-0.02em' }}>
                  Drag a block to start
                </div>
                <div style={{ font:'400 13px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.textDim, marginTop:4 }}>
                  Begin with a <span style={{ color: SHADE.catShape, fontWeight:600 }}>shape</span>, then snap on{' '}
                  <span style={{ color: SHADE.catDistort, fontWeight:600 }}>distortions</span>,{' '}
                  <span style={{ color: SHADE.catColor, fontWeight:600 }}>colors</span>, and{' '}
                  <span style={{ color: SHADE.catEffect, fontWeight:600 }}>effects</span>.
                </div>
              </div>
              <div style={{
                width:42, height:42, borderRadius:10,
                background: SHADE.gold,
                border:`1px solid ${SHADE.goldDeep}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: `0 1px 0 ${SHADE.cream}66 inset`,
              }}>
                <Icon name="plus" size={22} color="#1a1208" />
              </div>
            </div>
          </div>
        </BlockCanvas>
        <CodeDrawer expanded={false} />
      </div>
      <RightColumn previewVariant="plasma" propsMode="global" />
    </div>
  </Frame>
);

const RightColumn = ({ width = 304, previewVariant, propsMode = 'global', blocks = 0, tempo = 120 }) => (
  <div style={{
    width, flex:'0 0 auto',
    background: SHADE.surface2,
    borderLeft:`1px solid ${SHADE.border}`,
    display:'flex', flexDirection:'column',
    minHeight: 0, overflow:'hidden',
  }}>
    <PreviewPanel variant={previewVariant} tempo={tempo} blocks={blocks} />
    <PropertiesPanel mode={propsMode} />
  </div>
);

// ─── Screen 2: Active editing ─────────────────────────────────────────────
const Screen2_DesktopActive = () => {
  const chain = [
    { ...blockById('circle') },
    { ...blockById('ripple'), animated: true },
    { ...blockById('palette') },
  ];
  return (
    <Frame w={1280} h={800} screen="02 Active editing">
      <TopBar tempo={120} />
      <div style={{ flex:1, display:'flex', minHeight:0 }}>
        <Palette />
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <BlockCanvas label="CHAIN · row 1 / 1 · 3 blocks">
            <div style={{
              position:'absolute', inset:'56px 0 0 56px',
              display:'flex', alignItems:'flex-start',
            }}>
              <Chain items={chain} selectedIdx={1} />
              <EndCap />
            </div>
            {/* a faint guide line that suggests "row 1" baseline */}
            <div style={{
              position:'absolute', left:56, right:32,
              top: 56 + BLOCK_H + 18, height:1,
              borderTop: `1px dashed ${SHADE.border}`, opacity:0.6,
            }} />
            <div style={{
              position:'absolute', left:56, top: 56 + BLOCK_H + 24,
              font:'500 9.5px "JetBrains Mono", monospace',
              color: SHADE.textFaint, letterSpacing:'0.12em',
            }}>↓ next row autowraps here</div>
          </BlockCanvas>
          <CodeDrawer expanded={false} />
        </div>
        <RightColumn previewVariant="ripple" propsMode="ripple" blocks={3} tempo={120} />
      </div>
    </Frame>
  );
};

// ─── Screen 3: Chain auto-wrapping ────────────────────────────────────────
const Screen3_ChainWrap = () => {
  const row1 = [
    { ...blockById('circle') },
    { ...blockById('ripple'), animated: true },
    { ...blockById('swirl') },
    { ...blockById('voronoi') },
  ];
  const row2 = [
    { ...blockById('palette') },
    { ...blockById('hueshift'), animated: true },
    { ...blockById('glow') },
  ];
  return (
    <Frame w={1280} h={800} screen="03 Chain wrap">
      <TopBar tempo={128} />
      <div style={{ flex:1, display:'flex', minHeight:0 }}>
        <Palette />
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <BlockCanvas label="CHAIN · row 1 / 2 · 7 blocks">
            <div style={{
              position:'absolute', left:56, top:56, right:32,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:0, height: BLOCK_H }}>
                <Chain items={row1} />
                <div style={{ marginLeft: 6 }}><WrapArrow direction="down" /></div>
              </div>
              <PortalCurve topOffset={BLOCK_H - 10} />
              <div style={{ display:'flex', alignItems:'center', gap:0, height: BLOCK_H, marginTop: 22 }}>
                <div style={{ marginRight: 6 }}><WrapArrow direction="in" /></div>
                <Chain items={row2} />
                <EndCap />
              </div>
            </div>
          </BlockCanvas>
          <CodeDrawer expanded={false} />
        </div>
        <RightColumn previewVariant="swirl" propsMode="global" blocks={7} tempo={128} />
      </div>
    </Frame>
  );
};

// ─── Screen 3.5: Code expanded ────────────────────────────────────────────
const Screen_CodeExpanded = () => {
  const chain = [
    { ...blockById('circle') },
    { ...blockById('ripple'), animated: true },
    { ...blockById('palette') },
  ];
  return (
    <Frame w={1280} h={800} screen="04 Code expanded">
      <TopBar tempo={120} />
      <div style={{ flex:1, display:'flex', minHeight:0 }}>
        <Palette />
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <BlockCanvas label="CHAIN · row 1 / 1 · 3 blocks">
            <div style={{
              position:'absolute', inset:'56px 0 0 56px',
              display:'flex', alignItems:'flex-start',
            }}>
              <Chain items={chain} selectedIdx={1} />
              <EndCap />
            </div>
          </BlockCanvas>
          <CodeDrawer expanded={true} height={320} />
        </div>
        <RightColumn previewVariant="ripple" propsMode="ripple" blocks={3} tempo={120} />
      </div>
    </Frame>
  );
};

// ─── Screen 3.6: Preview fullscreen modal ─────────────────────────────────
const Screen_PreviewFullscreen = () => {
  const chain = [
    { ...blockById('circle') },
    { ...blockById('ripple'), animated: true },
    { ...blockById('palette') },
  ];
  return (
    <Frame w={1280} h={800} screen="05 Preview fullscreen">
      <TopBar tempo={120} />
      <div style={{ flex:1, display:'flex', minHeight:0, position:'relative' }}>
        <Palette />
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <BlockCanvas label="CHAIN · row 1 / 1 · 3 blocks">
            <div style={{
              position:'absolute', inset:'56px 0 0 56px',
              display:'flex', alignItems:'flex-start', opacity:0.45,
            }}>
              <Chain items={chain} selectedIdx={1} />
              <EndCap />
            </div>
          </BlockCanvas>
          <CodeDrawer expanded={false} />
        </div>
        <RightColumn previewVariant="ripple" propsMode="ripple" blocks={3} tempo={120} />

        {/* Fullscreen preview overlay */}
        <div style={{
          position:'absolute', inset:0,
          background: 'rgba(40,52,70,0.45)',
          backdropFilter: 'blur(8px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'24px',
        }}>
          <div style={{
            position:'relative',
            width: '90%', height: '90%',
            background:'#000',
            border:`1px solid ${SHADE.borderHi}`,
            borderRadius: 12, overflow:'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}>
            <ShadeCanvas variant="ripple" />
            <div style={{ position:'absolute', left:14, top:14, display:'flex', gap:6, flexWrap:'wrap' }}>
              <TogglePill active>1920 × 1080</TogglePill>
              <TogglePill active>60 fps</TogglePill>
              <TogglePill>safe area</TogglePill>
              <TogglePill>grid</TogglePill>
              <TogglePill active accent="#FCB427">● recording</TogglePill>
            </div>
            <div style={{
              position:'absolute', right:14, top:14, display:'flex', gap:6,
            }}>
              <FullscreenChromeBtn title="Settings">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008.9 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 8.9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              </FullscreenChromeBtn>
              <FullscreenChromeBtn title="Exit fullscreen">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 4H4V9 M15 4H20V9 M9 20H4V15 M15 20H20V15"/>
                </svg>
              </FullscreenChromeBtn>
            </div>
            <div style={{
              position:'absolute', left:0, right:0, bottom:0,
              padding:'18px 18px 18px',
              background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.75) 100%)',
              display:'flex', alignItems:'center', gap:14,
            }}>
              <button style={{
                width:46, height:46, borderRadius:23,
                background: SHADE.gold,
                border:`1px solid ${SHADE.goldDeep}`,
                color:'#1a1208', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 1px 0 ${SHADE.cream}66 inset`,
              }}>
                <Icon name="play" size={16} color="#1a1208" />
              </button>
              <div style={{ flex:1 }}>
                <div style={{ font:'600 14px "IBM Plex Sans", "Inter", sans-serif', color:'#fff' }}>Plasma → Ripple → Palette</div>
                <div style={{ font:'500 11px "JetBrains Mono", monospace', color:'rgba(255,255,255,0.55)', marginTop:2 }}>
                  120 bpm · 60 fps · 1 cycle = 2 bars · 3 blocks
                </div>
              </div>
              <button style={{
                background:'rgba(255,255,255,0.08)', color:'#fff',
                border:`1px solid rgba(255,255,255,0.15)`,
                borderRadius:8, padding:'9px 14px',
                font:'500 12px "IBM Plex Sans", "Inter",sans-serif',
                cursor:'pointer', display:'flex', alignItems:'center', gap:7,
              }}>
                <Icon name="share" size={13} color="#fff"/> Export MP4
              </button>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
};

const FullscreenChromeBtn = ({ children, title }) => (
  <button title={title} style={{
    width: 32, height: 32, borderRadius: 8,
    background: 'rgba(0,0,0,0.45)',
    border:`1px solid rgba(255,255,255,0.15)`,
    color:'#fff', cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center',
    backdropFilter:'blur(6px)',
  }}>{children}</button>
);

window.Screen1_DesktopEmpty = Screen1_DesktopEmpty;
window.Screen2_DesktopActive = Screen2_DesktopActive;
window.Screen3_ChainWrap = Screen3_ChainWrap;
window.Screen_CodeExpanded = Screen_CodeExpanded;
window.Screen_PreviewFullscreen = Screen_PreviewFullscreen;
window.Frame = Frame;
window.Chain = Chain;
window.EndCap = EndCap;
window.PropertiesPanel = PropertiesPanel;
window.GlobalProps = GlobalProps;
window.RippleProps = RippleProps;
window.PreviewPanel = PreviewPanel;
window.CodeDrawer = CodeDrawer;
window.BlockCanvas = BlockCanvas;
window.RightColumn = RightColumn;
