// Lighting diagrams — Lambert, FresnelCurve, AoSamples.
// Moved verbatim from the old Diagram.tsx monolith (pixel output identical).

import { DIA as C, DIA_STROKE as STROKE, DIA_FONT_MONO } from './shared';

export const Lambert = () => (
  <svg viewBox="0 0 460 150" width="100%" role="img">
    {/* hemisphere */}
    <path d="M 80 110 A 70 70 0 0 1 220 110"
      fill={C.surface2} stroke={C.ink} strokeWidth={STROKE * 1.4} />
    <line x1={80} y1={110} x2={220} y2={110}
      stroke={C.ink} strokeWidth={STROKE * 1.4} />
    {/* normal */}
    <line x1={150} y1={110} x2={150} y2={36}
      stroke={C.color} strokeWidth={3} />
    <polygon points="150,36 144,46 156,46" fill={C.color} />
    <text x={156} y={56} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.color}>N</text>
    {/* light */}
    <line x1={150} y1={110} x2={88} y2={48}
      stroke={C.gold} strokeWidth={3} />
    <polygon points="88,48 96,52 92,58" fill={C.gold} />
    <text x={70} y={42} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.gold}>L</text>
    {/* readout */}
    <text x={260} y={56} fontSize={12} fontFamily={DIA_FONT_MONO} fill={C.text}>brightness =</text>
    <text x={260} y={76} fontSize={14} fontFamily={DIA_FONT_MONO} fill={C.ember}>max(N · L, 0)</text>
    <text x={260} y={102} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
      N pointing AT L → bright
    </text>
    <text x={260} y={118} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
      perpendicular → dark
    </text>
  </svg>
);

export const FresnelCurve = () => {
  const w = 460, h = 140, x0 = 40, y0 = 16, gw = w - 80, gh = h - 40;
  const pts: string[] = [];
  // Schlick: F0 + (1-F0) * (1-cosθ)^5, F0 = 0.04
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    const v = 0.04 + 0.96 * Math.pow(1 - Math.cos((t * Math.PI) / 2), 5);
    const x = x0 + t * gw;
    const y = y0 + (1 - v) * gh;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      <line x1={x0} y1={y0 + gh} x2={x0 + gw} y2={y0 + gh}
        stroke={C.border} />
      <line x1={x0} y1={y0} x2={x0} y2={y0 + gh}
        stroke={C.border} />
      <polyline points={pts.join(' ')} fill="none"
        stroke={C.effect} strokeWidth={3} />
      <text x={x0 - 26} y={y0 + 6} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>1.0</text>
      <text x={x0 - 26} y={y0 + gh + 4} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>0.04</text>
      <text x={x0} y={y0 + gh + 18} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>face-on</text>
      <text x={x0 + gw - 60} y={y0 + gh + 18} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>grazing</text>
      <text x={x0 + 18} y={y0 + 18} fontSize={12}
        fontFamily={DIA_FONT_MONO} fill={C.effect}>schlick</text>
    </svg>
  );
};

export const AoSamples = () => (
  <svg viewBox="0 0 460 140" width="100%" role="img">
    <rect x={120} y={70} width={300} height={50}
      fill={C.surface2} stroke={C.ink} strokeWidth={STROKE} />
    <line x1={120} y1={70} x2={420} y2={70} stroke={C.ink} strokeWidth={2} />
    {[0, 1, 2, 3, 4].map((i) => {
      const x = 160 + i * 60;
      const len = 8 + i * 8;
      return (
        <g key={i}>
          <line x1={x} y1={70} x2={x} y2={70 - len}
            stroke={C.ember} strokeWidth={2} />
          <circle cx={x} cy={70 - len} r={4} fill={C.gold}
            stroke={C.ink} strokeWidth={STROKE} />
        </g>
      );
    })}
    <text x={30} y={66} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.text}>
      surface
    </text>
    <text x={30} y={28} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
      5-tap AO
    </text>
  </svg>
);
