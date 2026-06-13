// Math diagrams — TrigWave, DotProduct, SmoothstepCurve, NoiseStack, FbmOctaves.
// Moved verbatim from the old Diagram.tsx monolith (pixel output identical).

import { DIA as C, DIA_FONT_MONO } from './shared';

export const TrigWave = () => {
  const w = 460, h = 120, midY = h / 2;
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const x = 20 + (i / 80) * (w - 40);
    const y = midY - Math.sin((i / 80) * Math.PI * 2) * 36;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      <line x1={20} y1={midY} x2={w - 20} y2={midY}
        stroke={C.border} strokeWidth={1} />
      <line x1={20} y1={midY + 36} x2={w - 20} y2={midY + 36}
        stroke={C.border} strokeWidth={1} strokeDasharray="3 3" />
      <line x1={20} y1={midY - 36} x2={w - 20} y2={midY - 36}
        stroke={C.border} strokeWidth={1} strokeDasharray="3 3" />
      <polyline points={pts.join(' ')} fill="none"
        stroke={C.ember} strokeWidth={2.5} strokeLinejoin="round" />
      <text x={20} y={midY - 42} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>+1</text>
      <text x={20} y={midY + 50} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>-1</text>
      <text x={w - 90} y={midY - 14} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.ember}>sin(x)</text>
    </svg>
  );
};

export const DotProduct = () => (
  <svg viewBox="0 0 360 160" width="100%" role="img">
    <line x1={40} y1={80} x2={200} y2={80} stroke={C.border} strokeDasharray="3 3" />
    {/* Vector A */}
    <line x1={40} y1={80} x2={200} y2={80} stroke={C.shape} strokeWidth={3} />
    <polygon points="200,80 192,76 192,84" fill={C.shape} />
    <text x={120} y={70} fontSize={12} fontFamily={DIA_FONT_MONO} fill={C.shape}>A</text>
    {/* Vector B */}
    <line x1={40} y1={80} x2={140} y2={20} stroke={C.distort} strokeWidth={3} />
    <polygon points="140,20 134,28 132,20" fill={C.distort} />
    <text x={84} y={42} fontSize={12} fontFamily={DIA_FONT_MONO} fill={C.distort}>B</text>
    {/* projection */}
    <line x1={140} y1={20} x2={140} y2={80}
      stroke={C.textDim} strokeWidth={1} strokeDasharray="2 3" />
    <line x1={40} y1={88} x2={140} y2={88} stroke={C.gold} strokeWidth={3} />
    <text x={70} y={104} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.gold}>
      |A| |B| cos θ
    </text>
    {/* readout */}
    <text x={240} y={50} fontSize={12} fontFamily={DIA_FONT_MONO} fill={C.text}>θ = angle</text>
    <text x={240} y={70} fontSize={12} fontFamily={DIA_FONT_MONO} fill={C.text}>=1 → aligned</text>
    <text x={240} y={88} fontSize={12} fontFamily={DIA_FONT_MONO} fill={C.text}>=0 → 90°</text>
    <text x={240} y={106} fontSize={12} fontFamily={DIA_FONT_MONO} fill={C.text}>=-1 → opposite</text>
  </svg>
);

export const SmoothstepCurve = () => {
  const w = 460, h = 140;
  const x0 = 40, y0 = 16, gw = w - 80, gh = h - 40;
  const stepPts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const x = x0 + t * gw;
    const y = t < 0.5 ? y0 + gh : y0;
    stepPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const smoothPts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const e = t * t * (3 - 2 * t);
    const x = x0 + t * gw;
    const y = y0 + (1 - e) * gh;
    smoothPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      <line x1={x0} y1={y0 + gh} x2={x0 + gw} y2={y0 + gh}
        stroke={C.border} strokeWidth={1} />
      <line x1={x0} y1={y0} x2={x0} y2={y0 + gh}
        stroke={C.border} strokeWidth={1} />
      <polyline points={stepPts.join(' ')} fill="none"
        stroke={C.distort} strokeWidth={2} strokeDasharray="4 3" />
      <polyline points={smoothPts.join(' ')} fill="none"
        stroke={C.color} strokeWidth={3} />
      <text x={x0 + gw - 100} y={y0 + 16} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.color}>smoothstep</text>
      <text x={x0 + gw - 100} y={y0 + 30} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.distort}>step</text>
      <text x={x0 - 22} y={y0 + 6} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>1</text>
      <text x={x0 - 22} y={y0 + gh + 4} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>0</text>
      <text x={x0 + gw - 20} y={y0 + gh + 18} fontSize={10}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>x</text>
    </svg>
  );
};

export const NoiseStack = () => (
  <svg viewBox="0 0 460 140" width="100%" role="img">
    {/* value noise — grid of squares */}
    <text x={20} y={18} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
      value
    </text>
    {Array.from({ length: 36 }).map((_, i) => {
      const col = i % 9;
      const row = Math.floor(i / 9);
      const v = ((i * 53) % 9) / 9;
      return (
        <rect key={i} x={20 + col * 14} y={26 + row * 14}
          width={13} height={13}
          fill={`rgba(31,28,20,${0.15 + v * 0.6})`} />
      );
    })}

    {/* gradient noise — smoother circles */}
    <text x={170} y={18} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
      gradient
    </text>
    {Array.from({ length: 36 }).map((_, i) => {
      const col = i % 9;
      const row = Math.floor(i / 9);
      const fx = col - 4, fy = row - 2;
      const v = (Math.sin(fx * 0.7) + Math.cos(fy * 0.9)) * 0.5 + 0.5;
      return (
        <circle key={i} cx={177 + col * 14} cy={33 + row * 14}
          r={5.5}
          fill={`rgba(181,54,94,${0.2 + v * 0.6})`} />
      );
    })}

    {/* simplex — hex packed */}
    <text x={320} y={18} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
      simplex
    </text>
    {Array.from({ length: 36 }).map((_, i) => {
      const col = i % 9;
      const row = Math.floor(i / 9);
      const fx = col, fy = row;
      const v = (Math.sin(fx * 1.2 + fy * 0.5) + Math.cos(fy * 1.3)) * 0.5 + 0.5;
      const offset = row % 2 === 0 ? 0 : 7;
      return (
        <polygon key={i}
          points={`${325 + col * 14 + offset},${30 + row * 14} ${330 + col * 14 + offset},${33 + row * 14} ${330 + col * 14 + offset},${39 + row * 14} ${325 + col * 14 + offset},${42 + row * 14} ${320 + col * 14 + offset},${39 + row * 14} ${320 + col * 14 + offset},${33 + row * 14}`}
          fill={`rgba(111,127,26,${0.25 + v * 0.6})`} />
      );
    })}
  </svg>
);

export const FbmOctaves = () => {
  const w = 460, h = 140;
  const lanes = 4;
  const laneH = (h - 20) / lanes;
  const lines: React.ReactNode[] = [];
  for (let oct = 0; oct < lanes; oct++) {
    const freq = 1 << oct;
    const amp = 1 / freq;
    const yMid = 14 + oct * laneH + laneH / 2;
    const pts: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = 60 + (i / 100) * (w - 80);
      const y = yMid - Math.sin((i / 100) * Math.PI * 2 * freq) * (laneH * 0.4 * amp + 4);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    lines.push(
      <g key={oct}>
        <text x={12} y={yMid + 4} fontSize={11}
          fontFamily={DIA_FONT_MONO} fill={C.textDim}>
          {`oct ${oct + 1}`}
        </text>
        <polyline points={pts.join(' ')} fill="none"
          stroke={[C.shape, C.distort, C.color, C.effect][oct]}
          strokeWidth={2} />
      </g>,
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      {lines}
    </svg>
  );
};
