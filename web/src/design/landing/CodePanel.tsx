import { SHADE, TYPE } from '../tokens';
import { Icon } from '../icons';

// ─── Code panel ─────────────────────────────────────────────────────────
export const CodePanel = () => (
  <div
    style={{
      maxWidth: 920, margin: '4rem auto 0',
      background: SHADE.surface4,
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 3,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.18)',
      }}
    >
      <Icon name="code" size={14} color={SHADE.gold} cream={SHADE.cream} />
      <span style={{ font: `700 11px ${TYPE.body}`, color: SHADE.cream, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
        Generated GLSL
      </span>
      <span style={{ marginLeft: 'auto', font: `500 10.5px ${TYPE.bodyMono}`, color: 'rgba(254,231,199,0.45)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        128 lines · auto-compile
      </span>
    </div>
    <pre
      style={{
        margin: 0, padding: '18px 20px',
        font: `500 13px ${TYPE.bodyMono}`,
        color: SHADE.cream, lineHeight: 1.7,
        whiteSpace: 'pre', overflowX: 'auto',
      }}
    >
<span style={{ color: 'rgba(254,231,199,0.4)' }}>{'#version 100\n'}</span>
<span style={{ color: SHADE.catDistort }}>precision</span> <span style={{ color: SHADE.catDistort }}>highp</span> <span style={{ color: SHADE.catShape }}>float</span>;{'\n'}
<span style={{ color: SHADE.catDistort }}>uniform</span> <span style={{ color: SHADE.catShape }}>vec2</span>  uResolution;{'\n'}
<span style={{ color: SHADE.catDistort }}>uniform</span> <span style={{ color: SHADE.catShape }}>float</span> uTime;{'\n'}
{'\n'}
<span style={{ color: 'rgba(254,231,199,0.4)' }}>{'// Block 02 — RIPPLE (animating: frequency)\n'}</span>
<span style={{ color: SHADE.catShape }}>vec2</span> <span style={{ color: SHADE.catColor }}>ripple</span>(<span style={{ color: SHADE.catShape }}>vec2</span> p) {'{'}{'\n'}
{'  '}<span style={{ color: SHADE.catShape }}>float</span> f = <span style={{ color: SHADE.gold }}>0.482</span> + <span style={{ color: SHADE.gold }}>0.30</span>*<span style={{ color: SHADE.catColor }}>sin</span>(uTime);{'\n'}
{'  '}<span style={{ color: SHADE.catShape }}>float</span> a = <span style={{ color: SHADE.cream }}>0.165</span>;{'\n'}
{'  '}<span style={{ color: SHADE.catDistort }}>return</span> p + a*<span style={{ color: SHADE.catColor }}>sin</span>(<span style={{ color: SHADE.catColor }}>length</span>(p)*f - uTime*<span style={{ color: SHADE.gold }}>1.7</span>) * <span style={{ color: SHADE.catColor }}>normalize</span>(p);{'\n'}
{'}'}
    </pre>
  </div>
);
