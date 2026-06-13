// Color diagrams — GammaCurve, TonemapCurves, CosinePalette, HsvWheel.
// Moved verbatim from the old Diagram.tsx monolith (pixel output identical).

import { DIA as C, DIA_STROKE as STROKE, DIA_FONT_MONO } from './shared';

export const GammaCurve = () => {
  const w = 460, h = 140, x0 = 40, y0 = 16, gw = w - 80, gh = h - 40;
  const ptsLinear: string[] = [];
  const ptsSrgb: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const lx = x0 + t * gw;
    const ly = y0 + (1 - t) * gh;
    const sy = y0 + (1 - Math.pow(t, 1 / 2.2)) * gh;
    ptsLinear.push(`${lx.toFixed(1)},${ly.toFixed(1)}`);
    ptsSrgb.push(`${lx.toFixed(1)},${sy.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      <line x1={x0} y1={y0 + gh} x2={x0 + gw} y2={y0 + gh}
        stroke={C.border} />
      <line x1={x0} y1={y0} x2={x0} y2={y0 + gh}
        stroke={C.border} />
      <polyline points={ptsLinear.join(' ')} fill="none"
        stroke={C.textDim} strokeWidth={2} strokeDasharray="4 3" />
      <polyline points={ptsSrgb.join(' ')} fill="none"
        stroke={C.gold} strokeWidth={3} />
      <text x={x0 + 14} y={y0 + 18} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.gold}>sRGB (≈ x^1/2.2)</text>
      <text x={x0 + 14} y={y0 + 32} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>linear</text>
    </svg>
  );
};

export const TonemapCurves = () => {
  const w = 460, h = 140, x0 = 40, y0 = 16, gw = w - 80, gh = h - 40;
  const curves: Array<{ name: string; col: string; fn: (x: number) => number }> = [
    { name: 'reinhard', col: C.shape, fn: (x) => x / (1 + x) },
    { name: 'aces', col: C.distort, fn: (x) => {
      const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return Math.max(0, Math.min(1, (x * (a * x + b)) / (x * (c * x + d) + e)));
    } },
    { name: 'filmic', col: C.color, fn: (x) => {
      const v = Math.max(0, x - 0.004);
      return (v * (6.2 * v + 0.5)) / (v * (6.2 * v + 1.7) + 0.06);
    } },
  ];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      <line x1={x0} y1={y0 + gh} x2={x0 + gw} y2={y0 + gh}
        stroke={C.border} />
      <line x1={x0} y1={y0} x2={x0} y2={y0 + gh}
        stroke={C.border} />
      {curves.map((c, idx) => {
        const pts: string[] = [];
        for (let i = 0; i <= 100; i++) {
          const t = (i / 100) * 4;          // input HDR up to 4
          const v = Math.max(0, Math.min(1, c.fn(t)));
          const x = x0 + (t / 4) * gw;
          const y = y0 + (1 - v) * gh;
          pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        return (
          <g key={c.name}>
            <polyline points={pts.join(' ')} fill="none"
              stroke={c.col} strokeWidth={2.5} />
            <text x={x0 + gw - 80} y={y0 + 16 + idx * 14} fontSize={11}
              fontFamily={DIA_FONT_MONO} fill={c.col}>{c.name}</text>
          </g>
        );
      })}
      <text x={x0 - 24} y={y0 + 8} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>1</text>
      <text x={x0 - 24} y={y0 + gh + 4} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>0</text>
      <text x={x0 + gw - 12} y={y0 + gh + 18} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>HDR in</text>
    </svg>
  );
};

export const CosinePalette = () => {
  const w = 460, h = 140;
  // a + b * cos(2π(c*t + d)); paint a horizontal strip
  const a: [number, number, number] = [0.5, 0.5, 0.5];
  const b: [number, number, number] = [0.5, 0.5, 0.5];
  const c: [number, number, number] = [1, 1, 1];
  const d: [number, number, number] = [0.0, 0.33, 0.67];
  const bands: React.ReactNode[] = [];
  for (let i = 0; i < 60; i++) {
    const t = i / 60;
    const r = a[0] + b[0] * Math.cos(2 * Math.PI * (c[0] * t + d[0]));
    const g = a[1] + b[1] * Math.cos(2 * Math.PI * (c[1] * t + d[1]));
    const bl = a[2] + b[2] * Math.cos(2 * Math.PI * (c[2] * t + d[2]));
    bands.push(
      <rect key={i} x={40 + i * 6.5} y={42} width={6.5} height={56}
        fill={`rgb(${(r * 255) | 0},${(g * 255) | 0},${(bl * 255) | 0})`} />,
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      {bands}
      <rect x={40} y={42} width={60 * 6.5} height={56}
        fill="none" stroke={C.ink} strokeWidth={STROKE} />
      <text x={40} y={28} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
        a + b · cos(2π(c·t + d))
      </text>
      <text x={40} y={120} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
        a=0.5  b=0.5  c=1  d=(0, 0.33, 0.67)
      </text>
    </svg>
  );
};

export const HsvWheel = () => {
  const cx = 80, cy = 70, r = 50;
  const wedges: React.ReactNode[] = [];
  const STEPS = 12;
  for (let i = 0; i < STEPS; i++) {
    const a0 = (i / STEPS) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / STEPS) * Math.PI * 2 - Math.PI / 2;
    const hue = (i / STEPS) * 360;
    const x0 = cx + Math.cos(a0) * r;
    const y0 = cy + Math.sin(a0) * r;
    const x1 = cx + Math.cos(a1) * r;
    const y1 = cy + Math.sin(a1) * r;
    wedges.push(
      <path key={i}
        d={`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`}
        fill={`hsl(${hue} 80% 55%)`}
        stroke={C.ink} strokeWidth={0.7} />,
    );
  }
  return (
    <svg viewBox="0 0 460 140" width="100%" role="img">
      {wedges}
      <circle cx={cx} cy={cy} r={r}
        fill="none" stroke={C.ink} strokeWidth={STROKE} />
      <text x={170} y={50} fontSize={12} fontFamily={DIA_FONT_MONO} fill={C.text}>
        H — hue around the wheel
      </text>
      <text x={170} y={72} fontSize={12} fontFamily={DIA_FONT_MONO} fill={C.text}>
        S — saturation, centre → edge
      </text>
      <text x={170} y={94} fontSize={12} fontFamily={DIA_FONT_MONO} fill={C.text}>
        V — value, brightness
      </text>
    </svg>
  );
};
