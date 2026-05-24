// shade-ui.jsx — Layout primitives in the new cool palette.
// New: TogglePill (text-only chip with negative-color blend),
// CodeDrawer (collapsible bottom strip), MiniPreview (compact right-top
// canvas with fullscreen button), redesigned right column.

// ─── Text-only toggle pill (mix-blend-mode: difference) ──────────────────
// Floats over the canvas with no fill — text auto-inverts against whatever
// pixels sit behind it. Active = solid outline; off = dashed + faded.
const TogglePill = ({ children, active = true, accent }) => {
  const c = accent || '#fff';
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'4px 10px',
      borderRadius:999,
      border: `1px ${active ? 'solid' : 'dashed'} ${c}`,
      color: c,
      mixBlendMode: 'difference',
      font: '500 10.5px "JetBrains Mono", monospace',
      letterSpacing: '0.04em',
      opacity: active ? 1 : 0.45,
      whiteSpace:'nowrap',
      cursor:'pointer',
      userSelect:'none',
    }}>
      {active && <span style={{ width:5, height:5, borderRadius:3, background: c, display:'block' }} />}
      {children}
    </span>
  );
};

// ─── Top bar ──────────────────────────────────────────────────────────────
const TopBar = ({ tempo = 120, tapping = false }) => (
  <div style={{
    height: 52, flex:'0 0 auto',
    display:'flex', alignItems:'center',
    padding: '0 18px',
    borderBottom: `1px solid ${SHADE.topbarBorder}`,
    background: SHADE.topbar,
    color: SHADE.topbarText,
    gap: 18,
    font: '500 13px "IBM Plex Sans", "Inter", system-ui, sans-serif',
    position:'relative',
  }}>
    {/* Subtle star-field flavor like Quadspinner's site (very faint dots) */}
    <div style={{
      position:'absolute', inset:0, pointerEvents:'none', opacity:0.35,
      backgroundImage: `radial-gradient(rgba(255,255,255,0.18) 0.8px, transparent 1px)`,
      backgroundSize: '24px 24px', backgroundPosition: '4px 6px',
    }} />
    {/* Logo + wordmark */}
    <div style={{ display:'flex', alignItems:'center', gap: 11, position:'relative' }}>
      <ShadeLogo size={22} />
      <span style={{
        font:'600 20px "IBM Plex Sans", "Inter", sans-serif',
        letterSpacing:'-0.01em', color: SHADE.topbarText,
      }}>Shade</span>
    </div>
    <div style={{ width:1, height:22, background: SHADE.topbarBorder, position:'relative' }} />

    {/* Tempo */}
    <div style={{ display:'flex', alignItems:'center', gap:10, color: SHADE.topbarDim, position:'relative' }}>
      <Icon name="metro" size={17} color={SHADE.topbarDim} />
      <span style={{ font:'500 13px "JetBrains Mono", monospace', color: SHADE.topbarText }}>{tempo} BPM</span>
      <button style={{
        background: tapping ? SHADE.gold : 'transparent',
        color: tapping ? '#1a1208' : SHADE.topbarText,
        border:`1px solid ${tapping ? SHADE.gold : SHADE.topbarBorder}`,
        borderRadius: 6, padding:'4px 10px',
        font: '500 10.5px "JetBrains Mono", monospace',
        letterSpacing: '0.10em', textTransform:'uppercase',
        cursor:'pointer',
        boxShadow: tapping ? `0 0 14px ${SHADE.gold}66` : 'none',
        transition:'all 0.15s',
      }}>tap</button>
    </div>

    <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:7, position:'relative' }}>
      <ToolbarButton icon="camera" label="Photo" />
      <ToolbarButton icon="code"   label="Paste" />
      <button style={{
        background: SHADE.gold, color:'#1a1208',
        border:'none', borderRadius:8, padding:'8px 14px',
        font:'600 13px "IBM Plex Sans", "Inter", sans-serif',
        letterSpacing:'-0.005em',
        cursor:'pointer', display:'flex', alignItems:'center', gap:7,
        boxShadow: `0 1px 0 ${SHADE.cream}66 inset, 0 0 0 1px ${SHADE.goldDeep}`,
      }}>
        <Icon name="share" size={14} color="#1a1208" /> Share
      </button>
      <button style={{
        width:32, height:30, border:`1px solid ${SHADE.topbarBorder}`, background:'transparent',
        color: SHADE.topbarDim, borderRadius:7, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}><Icon name="dots" size={14} color={SHADE.topbarDim} /></button>
    </div>
  </div>
);

const ToolbarButton = ({ icon, label }) => (
  <button style={{
    background:'transparent', color: SHADE.topbarText,
    border:`1px solid ${SHADE.topbarBorder}`, borderRadius:7,
    padding:'6px 11px', font:'500 13px "IBM Plex Sans", "Inter", sans-serif',
    display:'flex', alignItems:'center', gap:7, cursor:'pointer',
  }}>
    <Icon name={icon} size={14} color={SHADE.topbarDim} />
    <span>{label}</span>
  </button>
);

// ─── Palette (chunky category headers, color-saturated) ──────────────────
const PaletteItem = ({ block }) => {
  const cat = CATEGORIES[block.cat];
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:9,
      padding:'8px 10px 8px 14px',
      borderRadius:8,
      background: SHADE.surface1,
      border:`1px solid ${SHADE.border}`,
      cursor:'grab',
      position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background: cat.color }} />
      <Icon name={block.icon} size={15} color={cat.color} />
      <span style={{
        font:'500 11.5px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.text,
        letterSpacing:'0.04em',
      }}>{block.name}</span>
      {block.mini?.animated && (
        <span style={{
          marginLeft:'auto', width:7, height:7, borderRadius:4,
          background: SHADE.gold, border:`1.2px solid ${SHADE.cream}`,
          boxShadow:`0 0 7px ${SHADE.gold}`,
        }} />
      )}
    </div>
  );
};

const PaletteCategoryHeader = ({ cat, count }) => (
  <div style={{
    display:'flex', alignItems:'center', gap:9,
    margin:'2px 6px 8px',
    padding:'7px 10px',
    background: `${cat.color}15`,
    border: `1px solid ${cat.color}40`,
    borderRadius: 8,
    font:'600 11px "IBM Plex Sans", "Inter", sans-serif',
    color: cat.color,
    letterSpacing:'0.04em',
  }}>
    <span style={{
      width:20, height:20, borderRadius:5,
      background: cat.color, color: '#fff',
      display:'flex', alignItems:'center', justifyContent:'center',
      flex:'0 0 auto',
    }}>
      <Icon name={cat.icon} size={13} color="#fff" cream="#fff" />
    </span>
    <span style={{ textTransform:'uppercase' }}>{cat.label}</span>
    <span style={{ marginLeft:'auto', font:'500 10px "JetBrains Mono", monospace', opacity:0.7 }}>{count}</span>
  </div>
);

const Palette = ({ width = 240 }) => {
  const grouped = Object.keys(CATEGORIES).map((k) => ({
    k, blocks: BLOCK_LIB.filter((b) => b.cat === k),
  }));
  return (
    <div style={{
      width, flex:'0 0 auto',
      background: SHADE.bg,
      borderRight: `1px solid ${SHADE.border}`,
      display:'flex', flexDirection:'column',
      overflow:'hidden',
    }}>
      <div style={{ padding:'14px 12px 10px' }}>
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          background: SHADE.surface1, border:`1px solid ${SHADE.border}`,
          borderRadius:8, padding:'8px 11px',
        }}>
          <Icon name="search" size={14} color={SHADE.textDim} />
          <input
            type="text" placeholder="search blocks"
            style={{
              flex:1, background:'transparent', border:'none', outline:'none',
              color: SHADE.text,
              font:'500 12px "IBM Plex Sans", "Inter", sans-serif',
            }}
          />
          <span style={{ font:'500 9.5px "JetBrains Mono", monospace', color: SHADE.textFaint, padding:'2px 5px', border:`1px solid ${SHADE.border}`, borderRadius:3 }}>⌘K</span>
        </div>
      </div>
      <div style={{ padding:'2px 8px 16px', overflowY:'auto', flex:1 }}>
        {grouped.map(({ k, blocks }) => (
          <div key={k} style={{ marginBottom: 14 }}>
            <PaletteCategoryHeader cat={CATEGORIES[k]} count={blocks.length} />
            <div style={{ display:'flex', flexDirection:'column', gap:5, paddingLeft:2 }}>
              {blocks.map((b) => <PaletteItem key={b.id} block={b} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Property slider ──────────────────────────────────────────────────────
const PropertySlider = ({ label, value, unit = '', animated = false }) => {
  const [t, setT] = React.useState(value);
  React.useEffect(() => {
    if (!animated) return;
    let raf; const start = performance.now();
    const tick = () => {
      const dt = (performance.now() - start)/1000;
      setT(0.5 + 0.4*Math.sin(dt * 1.6));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [animated]);
  const v = animated ? t : value;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:7 }}>
        <span style={{ font:'500 10.5px "IBM Plex Sans", "Inter", sans-serif', color: SHADE.textDim, letterSpacing:'0.10em', textTransform:'uppercase' }}>{label}</span>
        <span style={{ font:'500 12px "JetBrains Mono", monospace', color: animated ? SHADE.gold : SHADE.text }}>
          {v.toFixed(3)}{unit}
        </span>
      </div>
      <div style={{
        position:'relative', height: 8, borderRadius: 4,
        background: SHADE.surface3,
        boxShadow: `inset 0 0 0 1px ${SHADE.border}`,
      }}>
        <div style={{
          position:'absolute', left:0, top:0, bottom:0,
          width: `${v*100}%`,
          background: animated
            ? `linear-gradient(90deg, ${SHADE.goldDeep}, ${SHADE.gold})`
            : SHADE.surface3,
          borderRadius: 4,
        }} />
        <div style={{
          position:'absolute',
          left: `calc(${v*100}% - 7px)`, top: -3,
          width: 14, height: 14, borderRadius: 7,
          background: animated ? SHADE.gold : SHADE.text,
          border: animated ? `2px solid ${SHADE.cream}` : 'none',
          boxShadow: animated
            ? `0 0 10px ${SHADE.gold}, 0 0 0 1px ${SHADE.bg}`
            : `0 0 0 1px ${SHADE.bg}`,
        }} />
      </div>
    </div>
  );
};

const PropSectionHeader = ({ title, right }) => (
  <div style={{
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'14px 14px 8px',
  }}>
    <span style={{
      font:'600 10.5px "IBM Plex Sans", "Inter", sans-serif',
      color: SHADE.textDim,
      letterSpacing:'0.16em', textTransform:'uppercase',
    }}>{title}</span>
    {right}
  </div>
);

window.Palette = Palette;
window.TopBar = TopBar;
window.PaletteItem = PaletteItem;
window.PropertySlider = PropertySlider;
window.PropSectionHeader = PropSectionHeader;
window.TogglePill = TogglePill;
