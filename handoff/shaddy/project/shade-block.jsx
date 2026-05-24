// shade-block.jsx — The puzzle-block component. Re-tuned for cool slate
// background so the category colors pop.

const BLOCK_W = 158;
const BLOCK_H = 94;
const TAB = 9;
const TAB_H = 26;
const RADIUS = 9;

function blockPath(W = BLOCK_W, H = BLOCK_H, td = TAB, th = TAB_H, r = RADIUS, variant = {}) {
  const left = variant.left || 'notch';
  const right = variant.right || 'tab';
  const tabY1 = (H - th) / 2;
  const tabY2 = (H + th) / 2;
  const parts = [];
  parts.push(`M ${r} 0`);
  parts.push(`H ${W - r}`);
  parts.push(`Q ${W} 0 ${W} ${r}`);
  if (right === 'tab') {
    parts.push(`V ${tabY1}`);
    parts.push(`L ${W + td} ${tabY1 + 4}`);
    parts.push(`L ${W + td} ${tabY2 - 4}`);
    parts.push(`L ${W} ${tabY2}`);
    parts.push(`V ${H - r}`);
  } else {
    parts.push(`V ${H - r}`);
  }
  parts.push(`Q ${W} ${H} ${W - r} ${H}`);
  parts.push(`H ${r}`);
  parts.push(`Q 0 ${H} 0 ${H - r}`);
  if (left === 'notch') {
    parts.push(`V ${tabY2}`);
    parts.push(`L ${td} ${tabY2 - 4}`);
    parts.push(`L ${td} ${tabY1 + 4}`);
    parts.push(`L 0 ${tabY1}`);
    parts.push(`V ${r}`);
  } else {
    parts.push(`V ${r}`);
  }
  parts.push(`Q 0 0 ${r} 0`);
  parts.push('Z');
  return parts.join(' ');
}

const MiniSlider = ({ label, value, animated }) => {
  const [t, setT] = React.useState(value);
  React.useEffect(() => {
    if (!animated) return;
    let raf;
    const start = performance.now();
    const tick = () => {
      const dt = (performance.now() - start) / 1000;
      setT(0.5 + 0.45 * Math.sin(dt * 1.7));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [animated]);
  const v = animated ? t : value;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, width:'100%' }}>
      <span style={{ font:'500 9px "JetBrains Mono", monospace', color: SHADE.textDim, textTransform:'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <div style={{
        position:'relative', flex:1, height:4, borderRadius:2,
        background: SHADE.surface3,
        boxShadow: 'inset 0 0 0 1px ' + SHADE.border,
      }}>
        <div style={{
          position:'absolute', left:0, top:0, bottom:0,
          width: `${v*100}%`,
          background: animated ? SHADE.gold : SHADE.textDim,
          opacity: animated ? 0.7 : 0.4,
          borderRadius: 2,
        }} />
        {animated && (
          <div style={{
            position:'absolute',
            left: `calc(${v*100}% - 4px)`, top: -2,
            width: 8, height: 8, borderRadius: 4,
            background: SHADE.gold,
            border: `1.5px solid ${SHADE.cream}`,
            boxShadow: `0 0 8px ${SHADE.gold}aa`,
          }} />
        )}
      </div>
    </div>
  );
};

const MiniSwatches = ({ values }) => (
  <div style={{ display:'flex', gap:3, alignItems:'center' }}>
    {values.map((c,i) => (
      <div key={i} style={{
        width: 16, height: 11, borderRadius: 3,
        background: c,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35)',
      }} />
    ))}
  </div>
);

const Block = ({
  id, block, selected = false, snapTarget = false, dragging = false,
  variant = {}, animated, onClick,
}) => {
  const def = block;
  const cat = CATEGORIES[def.cat];
  const path = blockPath(BLOCK_W, BLOCK_H, TAB, TAB_H, RADIUS, variant);
  const totalW = BLOCK_W + (variant.right === 'flat' ? 0 : TAB);
  const isAnimated = animated ?? def.mini?.animated;

  // White block faces with a subtle stroke read like physical chips on a table.
  const fill = '#ffffff';
  const stroke = selected ? SHADE.borderHi : SHADE.border;
  const strokeWidth = selected ? 1.5 : 1;

  return (
    <div
      data-comment-anchor={`block-${id}`}
      onClick={onClick}
      style={{
        position:'relative',
        width: totalW, height: BLOCK_H,
        flex: '0 0 auto',
        cursor: 'pointer',
        transform: dragging ? 'scale(1.04)' : 'none',
        transition: 'transform 150ms cubic-bezier(.2,.7,.2,1.2)',
      }}
    >
      <svg
        width={totalW + 2} height={BLOCK_H + 2}
        viewBox={`-1 -1 ${totalW + 2} ${BLOCK_H + 2}`}
        style={{ position:'absolute', inset:'-1px 0 0 0', overflow:'visible', pointerEvents:'none' }}
      >
        <defs>
          <linearGradient id={`stripe-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={cat.color} stopOpacity="0.55" />
            <stop offset="50%"  stopColor={cat.color} stopOpacity="1.0" />
            <stop offset="100%" stopColor={cat.color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <path d={path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <clipPath id={`clip-${id}`}><path d={path} /></clipPath>
        <rect x="0" y="0" width={BLOCK_W} height="3.5" fill={`url(#stripe-${id})`} clipPath={`url(#clip-${id})`} />
        {snapTarget && (
          <path d={path} fill="none" stroke={SHADE.gold} strokeWidth="2"
            style={{ filter:`drop-shadow(0 0 6px ${SHADE.gold})`, opacity:0.9 }} />
        )}
      </svg>

      <div style={{
        position:'absolute',
        left: TAB + 10, right: 10,
        top: 8, bottom: 7,
        display:'flex', flexDirection:'column',
        pointerEvents:'none',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: `${cat.color}18`,
            border:`1px solid ${cat.color}66`,
            display:'flex', alignItems:'center', justifyContent:'center',
            flex:'0 0 auto',
          }}>
            <Icon name={def.icon} size={14} color={cat.color} />
          </div>
          <span style={{
            font:'600 11px "IBM Plex Sans", "Inter", sans-serif',
            color: SHADE.text,
            letterSpacing: '0.06em',
          }}>{def.name}</span>
          {isAnimated && (
            <span style={{
              width:7, height:7, borderRadius:4,
              background: SHADE.gold,
              border: `1.2px solid ${SHADE.cream}`,
              boxShadow: `0 0 6px ${SHADE.gold}`,
              marginLeft: 'auto',
              animation: 'shadeBreath 1.4s ease-in-out infinite',
            }} />
          )}
        </div>
        <div style={{ marginTop: 'auto', marginBottom: 2 }}>
          {def.mini?.kind === 'slider' && (
            <MiniSlider label={def.mini.label} value={def.mini.value} animated={isAnimated} />
          )}
          {def.mini?.kind === 'swatches' && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ font:'500 9px "JetBrains Mono", monospace', color: SHADE.textDim, textTransform:'uppercase', letterSpacing:'0.05em' }}>palette</span>
              <MiniSwatches values={def.mini.values} />
            </div>
          )}
        </div>
        <button style={{
          position:'absolute', right:-3, bottom:-3,
          width:19, height:19, borderRadius:6,
          background: SHADE.surface3, border:`1px solid ${SHADE.border}`,
          color: SHADE.textDim,
          display:'flex', alignItems:'center', justifyContent:'center',
          pointerEvents:'auto', cursor:'pointer', padding:0,
        }} title="Add animation">
          <Icon name="plus" size={11} color={SHADE.textDim}/>
        </button>
      </div>
    </div>
  );
};

window.Block = Block;
window.BLOCK_W = BLOCK_W; window.BLOCK_H = BLOCK_H; window.TAB = TAB;
window.blockPath = blockPath;
window.MiniSlider = MiniSlider;
