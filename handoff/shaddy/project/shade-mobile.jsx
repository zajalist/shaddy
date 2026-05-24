// shade-mobile.jsx — Mobile screens + AI import dialog, cool palette.

const MOBILE_W = 390;
const MOBILE_H = 844;

const MobileFrame = ({ children, screen }) => (
  <div data-screen-label={screen} style={{
    width: MOBILE_W, height: MOBILE_H,
    background: SHADE.bg, color: SHADE.text,
    overflow:'hidden', display:'flex', flexDirection:'column',
    font:'400 13px "IBM Plex Sans", "Inter", system-ui, sans-serif',
    position:'relative',
  }}>{children}</div>
);

const MobileStatusBar = () => (
  <div style={{
    height: 44, flex:'0 0 auto',
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'0 26px', font:'600 15px "IBM Plex Sans", "Inter", sans-serif',
    color: SHADE.text, background: SHADE.bg, letterSpacing:'-0.01em',
  }}>
    <span>9:41</span>
    <span style={{ display:'flex', alignItems:'center', gap:5 }}>
      <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><path d="M0 8h2v2H0zM4 6h2v4H4zM8 4h2v6H8zM12 2h2v8h-2z"/></svg>
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 4a8 8 0 0112 0M3 6.5a5 5 0 018 0M7 9v.1"/></svg>
      <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="1" y="1" width="18" height="8" rx="2"/><rect x="3" y="3" width="12" height="4" fill="currentColor"/><rect x="20" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor"/></svg>
    </span>
  </div>
);

const MobileTopBar = ({ tempo = 120 }) => (
  <div style={{
    height: 52, flex:'0 0 auto',
    display:'flex', alignItems:'center', padding:'0 14px', gap: 12,
    borderBottom:`1px solid ${SHADE.border}`, background: SHADE.bg,
  }}>
    <button style={{ width:32, height:32, borderRadius:7, background:'transparent', border:`1px solid ${SHADE.border}`, color: SHADE.textDim, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
      <Icon name="menu" size={16} color={SHADE.textDim} />
    </button>
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <ShadeLogo size={20} />
      <span style={{ font:'600 17px "IBM Plex Sans", "Inter", sans-serif', letterSpacing:'-0.02em' }}>Shade</span>
    </div>
    <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, color: SHADE.textDim }}>
        <Icon name="metro" size={14} color={SHADE.textDim} />
        <span style={{ font:'500 12px "JetBrains Mono", monospace', color: SHADE.text }}>{tempo}</span>
      </div>
      <button style={{ width:32, height:32, borderRadius:7, background:'transparent', border:`1px solid ${SHADE.border}`, color: SHADE.textDim, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon name="dots" size={14} color={SHADE.textDim} />
      </button>
    </div>
  </div>
);

const HomeIndicator = () => (
  <div style={{ height: 24, flex:'0 0 auto', display:'flex', alignItems:'center', justifyContent:'center' }}>
    <div style={{ width:120, height:4, borderRadius:2, background: SHADE.text, opacity:0.85 }} />
  </div>
);

// ─── Screen: mobile empty ─────────────────────────────────────────────────
const Screen4_MobileEmpty = () => (
  <MobileFrame screen="06 Mobile empty">
    <MobileStatusBar />
    <MobileTopBar />
    <div style={{ flex:'1 1 auto', minHeight:0, position:'relative', background:'#000' }}>
      <ShadeCanvas variant="plasma" />
      <div style={{ position:'absolute', left:12, top:12, display:'flex', gap:5, flexWrap:'wrap' }}>
        <TogglePill active>1080²</TogglePill>
        <TogglePill active>60 fps</TogglePill>
      </div>
    </div>
    <div style={{ height: 12, flex:'0 0 auto', display:'flex', alignItems:'center', justifyContent:'center', background: SHADE.bg }}>
      <div style={{ width:38, height:4, borderRadius:2, background: SHADE.border }} />
    </div>
    <div style={{ height: 196, flex:'0 0 auto', background: SHADE.bg, position:'relative' }}>
      <DotGridBg />
      <div style={{
        position:'absolute', left:14, top:8,
        font:'600 9.5px "IBM Plex Sans", "Inter", sans-serif',
        color: SHADE.textFaint, letterSpacing:'0.18em', textTransform:'uppercase',
      }}>CHAIN · empty</div>
      <div style={{ position:'absolute', inset:'28px 16px 60px', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'10px 14px 10px 10px',
          border:`1.5px dashed ${SHADE.borderHi}`,
          borderRadius:12,
          background:'rgba(255,255,255,0.85)',
          backdropFilter:'blur(4px)',
        }}>
          <ShadeMascot size={48} />
          <div>
            <div style={{ font:'600 15px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.text, letterSpacing:'-0.01em' }}>Tap to add a block</div>
            <div style={{ font:'400 12px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.textDim, marginTop:2 }}>
              Start with a <span style={{ color: SHADE.catShape, fontWeight:600 }}>shape</span>.
            </div>
          </div>
        </div>
      </div>
      <div style={{
        position:'absolute', left:0, right:0, bottom:0,
        height: 56, borderTop:`1px solid ${SHADE.border}`,
        background: SHADE.bg,
        display:'flex', padding:'0 12px', gap:8, alignItems:'center',
      }}>
        <button style={{
          flex:1, height:40, borderRadius:9,
          background: SHADE.gold, color:'#1a1208',
          border:`1px solid ${SHADE.goldDeep}`,
          font:'600 13.5px "IBM Plex Sans", "Inter", sans-serif',
          letterSpacing:'-0.005em',
          display:'flex', alignItems:'center', justifyContent:'center', gap:7,
          cursor:'pointer',
          boxShadow:`0 1px 0 ${SHADE.cream}66 inset`,
        }}>
          <Icon name="plus" size={15} color="#1a1208" /> Add block
        </button>
        <button style={{
          width: 124, height:40, borderRadius:9,
          background: SHADE.surface1, color: SHADE.text,
          border:`1px solid ${SHADE.border}`,
          font:'500 12.5px "IBM Plex Sans", "Inter", sans-serif',
          display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          cursor:'pointer',
        }}>
          <Icon name="menu" size={13} color={SHADE.textDim} />
          props
        </button>
      </div>
    </div>
    <HomeIndicator />
  </MobileFrame>
);

// ─── Screen: mobile palette sheet ────────────────────────────────────────
const Screen5_MobilePalette = () => {
  const activeCat = 'distort';
  const blocks = BLOCK_LIB.filter((b) => b.cat === activeCat);
  return (
    <MobileFrame screen="07 Mobile palette">
      <MobileStatusBar />
      <MobileTopBar />
      <div style={{ flex:'1 1 auto', position:'relative', background:'#000', minHeight:0 }}>
        <ShadeCanvas variant="plasma" />
        <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.55)' }} />
      </div>
      <div style={{
        position:'absolute', left:0, right:0, bottom:0,
        height: 552,
        background: SHADE.surface2,
        borderTop:`1px solid ${SHADE.border}`,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        display:'flex', flexDirection:'column',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'9px 0 4px' }}>
          <div style={{ width:44, height:4, borderRadius:2, background: SHADE.border }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', padding:'4px 18px 12px' }}>
          <span style={{ font:'600 18px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.text, letterSpacing:'-0.02em' }}>Block library</span>
          <span style={{ marginLeft: 10, font:'500 11px "JetBrains Mono", monospace', color: SHADE.textDim }}>{BLOCK_LIB.length} blocks</span>
          <button style={{ marginLeft:'auto', width:30, height:30, borderRadius:7, background:'transparent', border:`1px solid ${SHADE.border}`, color: SHADE.textDim, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Icon name="close" size={14} color={SHADE.textDim} />
          </button>
        </div>
        <div style={{ padding:'0 16px 12px' }}>
          <div style={{
            display:'flex', alignItems:'center', gap:9,
            background: SHADE.surface1, border:`1px solid ${SHADE.border}`,
            borderRadius:10, padding:'11px 13px',
          }}>
            <Icon name="search" size={15} color={SHADE.textDim} />
            <span style={{ font:'500 14px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.textDim }}>search blocks…</span>
          </div>
        </div>
        {/* Category pills — chunky, color-saturated */}
        <div style={{ display:'flex', gap:6, padding:'4px 16px 14px', overflowX:'auto' }}>
          {Object.entries(CATEGORIES).map(([k, c]) => {
            const active = k === activeCat;
            return (
              <button key={k} style={{
                display:'flex', alignItems:'center', gap:7, flex:'0 0 auto',
                padding: '9px 14px',
                borderRadius: 999,
                background: active ? c.color : SHADE.surface1,
                border:`1px solid ${active ? c.color : SHADE.border}`,
                color: active ? SHADE.bg : SHADE.text,
                font:'600 12.5px "IBM Plex Sans", "Inter", sans-serif',
                letterSpacing:'-0.005em',
                cursor:'pointer',
              }}>
                <Icon name={c.icon} size={14} color={active ? SHADE.bg : c.color} cream={active ? SHADE.bg : SHADE.cream} />
                {c.label}
              </button>
            );
          })}
        </div>
        <div style={{ padding:'2px 16px 16px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 10, flex:1, overflowY:'auto' }}>
          {blocks.map((b) => {
            const cat = CATEGORIES[b.cat];
            return (
              <div key={b.id} style={{
                background: SHADE.surface1,
                border:`1px solid ${SHADE.border}`,
                borderRadius: 12,
                padding: '12px 10px 12px',
                display:'flex', flexDirection:'column', gap:10,
                position:'relative', overflow:'hidden',
              }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:3.5, background: cat.color }} />
                <div style={{
                  width: 40, height:40, borderRadius:10,
                  background: `${cat.color}1a`,
                  border:`1px solid ${cat.color}40`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <Icon name={b.icon} size={22} color={cat.color} />
                </div>
                <div>
                  <div style={{ font:'600 12px "IBM Plex Sans", "Inter",sans-serif', letterSpacing:'-0.005em', color: SHADE.text }}>{b.name}</div>
                  <div style={{ font:'500 9.5px "JetBrains Mono", monospace', color: SHADE.textDim, letterSpacing:'0.08em', marginTop:2, textTransform:'uppercase' }}>
                    {b.mini?.kind === 'slider' ? b.mini.label : 'palette'}
                  </div>
                </div>
                {b.mini?.animated && (
                  <span style={{ position:'absolute', top:9, right:9, width:7, height:7, borderRadius:4, background: SHADE.gold, border:`1.2px solid ${SHADE.cream}`, boxShadow:`0 0 6px ${SHADE.gold}` }} />
                )}
              </div>
            );
          })}
        </div>
        <HomeIndicator />
      </div>
    </MobileFrame>
  );
};

// ─── Screen: mobile properties sheet ─────────────────────────────────────
const Screen6_MobileProps = () => (
  <MobileFrame screen="08 Mobile props">
    <MobileStatusBar />
    <MobileTopBar />
    <div style={{ flex:'1 1 auto', position:'relative', background:'#000', minHeight:0 }}>
      <ShadeCanvas variant="ripple" />
      <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.55)' }} />
    </div>
    <div style={{
      position:'absolute', left:0, right:0, bottom:0,
      height: 600,
      background: SHADE.surface2,
      borderTop:`1px solid ${SHADE.border}`,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      display:'flex', flexDirection:'column',
      boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display:'flex', justifyContent:'center', padding:'9px 0 4px' }}>
        <div style={{ width:44, height:4, borderRadius:2, background: SHADE.border }} />
      </div>
      <div style={{ padding:'8px 18px 14px', display:'flex', alignItems:'center', gap:11 }}>
        <div style={{
          width:44, height:44, borderRadius:10,
          background: `${SHADE.catDistort}1f`, border:`1px solid ${SHADE.catDistort}55`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Icon name="b-ripple" size={24} color={SHADE.catDistort} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ font:'600 17px "IBM Plex Sans", "Inter", sans-serif', letterSpacing:'-0.02em' }}>Ripple</div>
          <div style={{ font:'500 10px "JetBrains Mono", monospace', color: SHADE.textDim, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            Distortion · block 02
          </div>
        </div>
        <button style={{
          padding:'8px 12px', borderRadius:8,
          background: SHADE.surface1, border:`1px solid ${SHADE.border}`,
          color: SHADE.text, font:'500 12px "IBM Plex Sans", "Inter", sans-serif',
          display:'flex', alignItems:'center', gap:6, cursor:'pointer',
        }}><Icon name="code" size={13} color={SHADE.textDim} /> code</button>
        <button style={{ width:36, height:36, borderRadius:8, background: SHADE.surface1, border:`1px solid ${SHADE.border}`, color: SHADE.textDim, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="close" size={14} color={SHADE.textDim} />
        </button>
      </div>
      <div style={{ padding:'4px 18px 16px', display:'flex', flexDirection:'column', gap:22, overflowY:'auto', flex:1 }}>
        <BigSlider label="frequency" value={0.482} animated />
        <AnimationDrawerCompact />
        <BigSlider label="amplitude" value={0.165} />
        <BigSlider label="phase" value={0.000} unit=" π" />
        <BigSlider label="falloff" value={0.760} />
      </div>
      <div style={{ borderTop:`1px solid ${SHADE.border}`, padding:'10px 16px', display:'flex', gap:8 }}>
        <button style={{
          flex:1, height:46, borderRadius:10,
          background: SHADE.gold, color:'#1a1208',
          border:`1px solid ${SHADE.goldDeep}`,
          font:'600 15px "IBM Plex Sans", "Inter", sans-serif',
          letterSpacing:'-0.01em', cursor:'pointer',
          boxShadow:`0 1px 0 ${SHADE.cream}66 inset`,
        }}>Done</button>
        <button style={{
          width:56, height:46, borderRadius:10,
          background: SHADE.surface1, color: SHADE.text,
          border:`1px solid ${SHADE.border}`,
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
        }}>
          <Icon name="trash" size={17} color={SHADE.textDim} />
        </button>
      </div>
      <HomeIndicator />
    </div>
  </MobileFrame>
);

const BigSlider = ({ label, value, animated = false, unit = '' }) => {
  const [t, setT] = React.useState(value);
  React.useEffect(() => {
    if (!animated) return;
    let raf; const start = performance.now();
    const tick = () => {
      setT(0.5 + 0.4*Math.sin((performance.now() - start)/1000 * 1.6));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [animated]);
  const v = animated ? t : value;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 9 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ font:'500 11.5px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.textDim, letterSpacing:'0.10em', textTransform:'uppercase' }}>{label}</span>
          {animated && (
            <span style={{ display:'flex', alignItems:'center', gap:5, font:'500 10px "JetBrains Mono", monospace', color: SHADE.gold, letterSpacing:'0.1em' }}>
              <span style={{ width:6, height:6, borderRadius:3, background: SHADE.gold, border:`1px solid ${SHADE.cream}` }} />
              ANIM
            </span>
          )}
        </div>
        <span style={{ font:'500 14px "JetBrains Mono", monospace', color: animated ? SHADE.gold : SHADE.text }}>{v.toFixed(3)}{unit}</span>
      </div>
      <div style={{
        position:'relative', height: 14, borderRadius: 7,
        background: SHADE.surface4,
        boxShadow: `inset 0 0 0 1px ${SHADE.border}`,
      }}>
        <div style={{
          position:'absolute', left:0, top:0, bottom:0,
          width: `${v*100}%`,
          background: animated ? `linear-gradient(90deg, ${SHADE.goldDeep}, ${SHADE.gold})` : SHADE.surface3,
          borderRadius: 7,
        }} />
        <div style={{
          position:'absolute',
          left: `calc(${v*100}% - 11px)`, top: -4,
          width: 22, height: 22, borderRadius: 11,
          background: animated ? SHADE.gold : SHADE.text,
          border: animated ? `2px solid ${SHADE.cream}` : 'none',
          boxShadow: animated ? `0 0 14px ${SHADE.gold}, 0 0 0 2px ${SHADE.surface2}` : `0 0 0 2px ${SHADE.surface2}`,
        }} />
      </div>
    </div>
  );
};

const AnimationDrawerCompact = () => {
  const path = (() => {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const x = (i/60) * 320;
      const y = 24 + Math.sin((i/60) * Math.PI * 2.2) * 14;
      pts.push(`${i===0?'M':'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  })();
  return (
    <div style={{
      border:`1px solid ${SHADE.border}`, borderRadius:10,
      background: SHADE.surface4, overflow:'hidden',
    }}>
      <div style={{
        padding:'9px 13px',
        borderBottom:`1px solid ${SHADE.border}`,
        display:'flex', alignItems:'center', gap:8,
        font:'500 10.5px "JetBrains Mono", monospace',
        color: SHADE.textDim, letterSpacing:'0.12em', textTransform:'uppercase',
      }}>
        <span style={{ width:6, height:6, borderRadius:3, background: SHADE.gold, border:`1px solid ${SHADE.cream}`, boxShadow:`0 0 6px ${SHADE.gold}` }} />
        <span style={{ color: SHADE.gold }}>sine</span>
        <span style={{ color: SHADE.textFaint }}>· ¼ bar</span>
        <span style={{ marginLeft:'auto', color: SHADE.text }}>120 bpm</span>
      </div>
      <div style={{ padding:'10px 14px' }}>
        <svg width="100%" height="48" viewBox="0 0 320 48" preserveAspectRatio="none" style={{ display:'block' }}>
          <line x1="0" y1="24" x2="320" y2="24" stroke={SHADE.border} strokeDasharray="2 3" />
          <path d={path} stroke={SHADE.gold} strokeWidth="1.5" fill="none" style={{ filter:`drop-shadow(0 0 4px ${SHADE.gold}aa)` }} />
        </svg>
      </div>
    </div>
  );
};

// ─── AI import dialog ─────────────────────────────────────────────────────
const Screen7_AIImport = () => (
  <Frame w={1280} h={800} screen="09 AI import">
    <TopBar tempo={120} />
    <div style={{ flex:1, display:'flex', minHeight:0 }}>
      <Palette />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, position:'relative' }}>
        <BlockCanvas label="CHAIN · empty">
          <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.55)' }} />
        </BlockCanvas>
        <CodeDrawer expanded={false} />
      </div>
      <RightColumn previewVariant="swirl" propsMode="global" />
    </div>
    {/* Backdrop dim */}
    <div style={{ position:'absolute', inset:0, background:'rgba(40,52,70,0.35)', backdropFilter:'blur(4px)', pointerEvents:'none' }} />
    {/* Modal */}
    <div style={{
      position:'absolute', inset:0,
      display:'flex', alignItems:'center', justifyContent:'center',
      pointerEvents:'none',
    }}>
      <div style={{
        width: 780, maxWidth: '92%',
        background: SHADE.surface2,
        border:`1px solid ${SHADE.borderHi}`,
        borderRadius: 16,
        overflow:'hidden',
        boxShadow: '0 30px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.4)',
        pointerEvents:'auto',
        display:'flex', flexDirection:'column',
      }}>
        <div style={{
          padding:'16px 20px',
          borderBottom:`1px solid ${SHADE.border}`,
          display:'flex', alignItems:'center', gap:13,
        }}>
          <div style={{
            width:40, height:40, borderRadius:10,
            background: `linear-gradient(135deg, ${SHADE.gold} 0%, ${SHADE.goldDeep} 100%)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: `0 1px 0 ${SHADE.cream}aa inset`,
          }}>
            <Icon name="sparkle" size={20} color="#1a1208" cream={SHADE.cream} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ font:'600 18px "IBM Plex Sans", "Inter", sans-serif', letterSpacing:'-0.02em' }}>Import shader with AI</div>
            <div style={{ font:'400 12.5px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.textDim, marginTop:2 }}>Paste GLSL — Shade will extract blocks you can edit.</div>
          </div>
          <button style={{ width:32, height:32, borderRadius:8, background:'transparent', border:`1px solid ${SHADE.border}`, color: SHADE.textDim, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Icon name="close" size={15} color={SHADE.textDim} />
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 0 }}>
          <div style={{ borderRight:`1px solid ${SHADE.border}` }}>
            <div style={{
              padding:'10px 16px',
              borderBottom:`1px solid ${SHADE.border}`,
              display:'flex', alignItems:'center', gap:8,
              font:'500 10.5px "JetBrains Mono", monospace',
              color: SHADE.textDim, letterSpacing:'0.12em', textTransform:'uppercase',
            }}>
              <Icon name="code" size={13} color={SHADE.textDim} />
              <span>fragment.glsl</span>
              <span style={{ marginLeft:'auto', color: SHADE.textFaint }}>248 lines · 4.1 kb</span>
            </div>
            <div style={{ position:'relative', height: 348, background: SHADE.surface4, overflow:'hidden' }}>
              <GLSLPreview />
            </div>
          </div>
          <div>
            <div style={{
              padding:'10px 16px',
              borderBottom:`1px solid ${SHADE.border}`,
              display:'flex', alignItems:'center', gap:8,
              font:'500 10.5px "JetBrains Mono", monospace',
              color: SHADE.textDim, letterSpacing:'0.12em', textTransform:'uppercase',
            }}>
              <Icon name="sparkle" size={13} color={SHADE.gold} cream={SHADE.cream} />
              <span>Detected blocks</span>
              <span style={{ marginLeft:'auto', color: SHADE.gold }}>5 found</span>
            </div>
            <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8, height: 348, overflowY:'auto' }}>
              {[
                { id:'voronoi', conf: 0.92 },
                { id:'warp', conf: 0.87 },
                { id:'kaleido', conf: 0.71 },
                { id:'palette', conf: 0.95 },
                { id:'glow', conf: 0.65 },
              ].map((r) => {
                const b = blockById(r.id);
                const cat = CATEGORIES[b.cat];
                return (
                  <div key={r.id} style={{
                    display:'flex', alignItems:'center', gap:11,
                    padding:'10px 12px 10px 14px',
                    background: SHADE.surface1,
                    border:`1px solid ${SHADE.border}`,
                    borderRadius:9,
                    position:'relative', overflow:'hidden',
                  }}>
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background: cat.color }} />
                    <div style={{
                      width:30, height:30, borderRadius:7,
                      background: `${cat.color}1a`, border:`1px solid ${cat.color}55`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Icon name={b.icon} size={16} color={cat.color} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ font:'600 13px "IBM Plex Sans", "Inter", sans-serif', letterSpacing:'-0.005em' }}>{b.name}</div>
                      <div style={{ font:'500 10px "JetBrains Mono", monospace', color: SHADE.textDim, letterSpacing:'0.06em', textTransform:'uppercase' }}>{cat.label}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:56, height:6, borderRadius:3, background: SHADE.surface4, boxShadow:`inset 0 0 0 1px ${SHADE.border}`, overflow:'hidden' }}>
                        <div style={{ width:`${r.conf*100}%`, height:'100%', background: r.conf > 0.7 ? SHADE.gold : SHADE.textDim }} />
                      </div>
                      <span style={{ font:'500 11px "JetBrains Mono", monospace', color: r.conf > 0.7 ? SHADE.gold : SHADE.textDim, width: 32, textAlign:'right' }}>{Math.round(r.conf*100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{
          borderTop:`1px solid ${SHADE.border}`,
          padding:'14px 20px',
          display:'flex', alignItems:'center', gap:12,
          background: SHADE.bg,
        }}>
          <Icon name="lock" size={15} color={SHADE.textDim} />
          <div style={{
            flex:1, display:'flex', alignItems:'center', gap:8,
            background: SHADE.surface1, border:`1px solid ${SHADE.border}`,
            borderRadius: 8, padding:'9px 12px',
            font:'500 11.5px "JetBrains Mono", monospace', color: SHADE.textDim,
          }}>
            <span style={{ color: SHADE.text }}>sk-ant-•••••••••••••••••••••••</span>
            <span style={{ marginLeft:'auto', color: SHADE.textFaint, fontSize:10, fontFamily:'"IBM Plex Sans", "Inter", sans-serif' }}>Saved in browser only — never sent to Shade servers</span>
          </div>
          <button style={{
            background:'transparent', color: SHADE.textDim, border:`1px solid ${SHADE.border}`,
            borderRadius:8, padding:'9px 14px', font:'500 12px "IBM Plex Sans", "Inter", sans-serif', cursor:'pointer',
          }}>Cancel</button>
          <button style={{
            background: SHADE.gold, color:'#1a1208',
            border:`1px solid ${SHADE.goldDeep}`, borderRadius:8, padding:'9px 16px',
            font:'600 13px "IBM Plex Sans", "Inter", sans-serif', letterSpacing:'-0.005em',
            cursor:'pointer', display:'flex', alignItems:'center', gap:7,
            boxShadow:`0 1px 0 ${SHADE.cream}66 inset`,
          }}>
            <Icon name="sparkle" size={14} color="#1a1208" cream={SHADE.cream} />
            Convert with AI
          </button>
        </div>
      </div>
    </div>
  </Frame>
);

const GLSLPreview = () => {
  const K = { color: SHADE.catDistort };
  const T = { color: SHADE.catShape };
  const N = { color: SHADE.gold };
  const C = { color: SHADE.textFaint, fontStyle:'italic' };
  const D = { color: SHADE.text };
  const F = { color: SHADE.catColor };
  return (
    <pre style={{
      margin:0, padding:'10px 14px 10px 50px',
      font:'500 12px "JetBrains Mono", monospace',
      color: SHADE.text, lineHeight: 1.65, whiteSpace:'pre',
    }}>
      <span style={C}>{'// shadertoy port — kaleidoscopic warp\n'}</span>
      <span style={K}>precision</span> <span style={K}>highp</span> <span style={T}>float</span>;{'\n'}
      <span style={K}>uniform</span> <span style={T}>vec2</span>  uResolution;{'\n'}
      <span style={K}>uniform</span> <span style={T}>float</span> uTime;{'\n'}
      {'\n'}
      <span style={T}>vec2</span> <span style={F}>kaleido</span>(<span style={T}>vec2</span> p, <span style={T}>float</span> n) {'{'}{'\n'}
      {'  '}<span style={T}>float</span> a = <span style={F}>atan</span>(p.y, p.x);{'\n'}
      {'  '}<span style={T}>float</span> r = <span style={F}>length</span>(p);{'\n'}
      {'  '}a = <span style={F}>mod</span>(a, <span style={N}>6.2831</span> / n) - <span style={N}>3.1415</span>/n;{'\n'}
      {'  '}<span style={K}>return</span> <span style={T}>vec2</span>(<span style={F}>cos</span>(a), <span style={F}>sin</span>(a)) * r;{'\n'}
      {'}'}{'\n'}
      {'\n'}
      <span style={T}>void</span> <span style={F}>main</span>() {'{'}{'\n'}
      {'  '}<span style={T}>vec2</span> uv = (<span style={D}>gl_FragCoord</span>.xy - <span style={N}>0.5</span>*uResolution) / uResolution.y;{'\n'}
      {'  '}uv = <span style={F}>kaleido</span>(uv, <span style={N}>5.0</span>);{'\n'}
      {'  '}uv += <span style={N}>0.12</span> * <span style={F}>sin</span>(uv.yx*<span style={N}>4.0</span> + uTime);{'\n'}
      {'  '}<span style={T}>vec3</span> col = <span style={N}>0.5</span> + <span style={N}>0.5</span>*<span style={F}>cos</span>(uTime + uv.xyx + <span style={T}>vec3</span>(<span style={N}>0</span>,<span style={N}>2</span>,<span style={N}>4</span>));{'\n'}
      {'  '}<span style={D}>gl_FragColor</span> = <span style={T}>vec4</span>(col, <span style={N}>1.0</span>);{'\n'}
      {'}'}{'\n'}
      <span style={{
        position:'absolute', left:0, top:0, bottom:0, width:38,
        padding:'10px 0', textAlign:'right',
        font:'500 12px "JetBrains Mono", monospace',
        color: SHADE.textFaint, lineHeight: 1.65,
        borderRight:`1px solid ${SHADE.border}`,
        background: SHADE.surface4,
        userSelect:'none',
      }}>{Array.from({length: 16}, (_,i) => (
        <div key={i} style={{ padding:'0 10px' }}>{i+1}</div>
      ))}</span>
    </pre>
  );
};

window.Screen4_MobileEmpty = Screen4_MobileEmpty;
window.Screen5_MobilePalette = Screen5_MobilePalette;
window.Screen6_MobileProps = Screen6_MobileProps;
window.Screen7_AIImport = Screen7_AIImport;
window.MOBILE_W = MOBILE_W; window.MOBILE_H = MOBILE_H;
