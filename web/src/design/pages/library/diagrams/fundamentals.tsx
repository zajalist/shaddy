// Fundamentals diagrams — Pipeline, GpuGrid, UvGrid.
// Moved verbatim from the old Diagram.tsx monolith (pixel output identical).

import { DIA as C, DIA_STROKE as STROKE, DIA_FONT_MONO, DIA_FONT_DISPLAY } from './shared';

export const Pipeline = () => (
  <svg viewBox="0 0 480 140" width="100%" role="img">
    {(['vertex', 'rasterize', 'fragment'] as const).map((label, i) => {
      const x = 28 + i * 150;
      const fill = [C.shape, C.color, C.effect][i];
      return (
        <g key={label}>
          <rect x={x} y={36} width={120} height={64} rx={10}
            fill={fill} stroke={C.ink} strokeWidth={STROKE} />
          <rect x={x + 4} y={40} width={120} height={64} rx={10}
            fill={fill} stroke={C.ink} strokeWidth={STROKE} opacity={0.18} />
          <text x={x + 60} y={72} textAnchor="middle"
            fontSize={14} fontWeight={700} fill={C.cream}
            fontFamily={DIA_FONT_DISPLAY}>{label}</text>
        </g>
      );
    })}
    {[0, 1].map((i) => {
      const x = 148 + i * 150;
      return (
        <g key={i}>
          <path d={`M${x} 68 L${x + 28} 68`} stroke={C.ink}
            strokeWidth={STROKE * 1.5} fill="none" strokeLinecap="round" />
          <path d={`M${x + 22} 62 L${x + 30} 68 L${x + 22} 74`} stroke={C.ink}
            strokeWidth={STROKE * 1.5} fill="none" strokeLinecap="round"
            strokeLinejoin="round" />
        </g>
      );
    })}
    <text x={88} y={120} textAnchor="middle" fontSize={10} fill={C.textDim}
      fontFamily={DIA_FONT_MONO}>positions</text>
    <text x={238} y={120} textAnchor="middle" fontSize={10} fill={C.textDim}
      fontFamily={DIA_FONT_MONO}>covered pixels</text>
    <text x={388} y={120} textAnchor="middle" fontSize={10} fill={C.textDim}
      fontFamily={DIA_FONT_MONO}>per-pixel colour</text>
  </svg>
);

export const GpuGrid = () => (
  <svg viewBox="0 0 480 140" width="100%" role="img">
    <rect x={20} y={16} width={200} height={108} rx={10}
      fill={C.surface2} stroke={C.ink} strokeWidth={STROKE} />
    <text x={120} y={36} textAnchor="middle" fontSize={11}
      fontFamily={DIA_FONT_MONO} fill={C.textDim}>cpu — 4 big cores</text>
    {Array.from({ length: 4 }).map((_, i) => (
      <rect key={i} x={36 + (i % 2) * 88} y={50 + Math.floor(i / 2) * 36}
        width={76} height={26} rx={5}
        fill={C.distort} stroke={C.ink} strokeWidth={STROKE} />
    ))}

    <rect x={260} y={16} width={200} height={108} rx={10}
      fill={C.surface2} stroke={C.ink} strokeWidth={STROKE} />
    <text x={360} y={36} textAnchor="middle" fontSize={11}
      fontFamily={DIA_FONT_MONO} fill={C.textDim}>gpu — hundreds tiny</text>
    {Array.from({ length: 64 }).map((_, i) => {
      const col = i % 16;
      const row = Math.floor(i / 16);
      return (
        <circle key={i} cx={272 + col * 11.5} cy={56 + row * 14}
          r={3.4} fill={C.shape} stroke={C.ink} strokeWidth={0.6} />
      );
    })}
  </svg>
);

export const UvGrid = ({ centred = false }: { centred?: boolean }) => {
  const cells = 6;
  const size = 100;
  const x0 = 90;
  const y0 = 20;
  const origin = centred ? { cx: x0 + size / 2, cy: y0 + size / 2, label: '(0,0)' }
                         : { cx: x0,            cy: y0 + size,     label: '(0,0)' };
  const cornerLabel = centred ? '(1,1)' : '(1,1)';
  const cornerXY = { cx: x0 + size, cy: y0, label: cornerLabel };
  return (
    <svg viewBox="0 0 320 150" width="100%" role="img">
      <rect x={x0} y={y0} width={size} height={size}
        fill={C.surface2} stroke={C.ink} strokeWidth={STROKE} rx={4} />
      {Array.from({ length: cells - 1 }).map((_, i) => {
        const t = ((i + 1) / cells) * size;
        return (
          <g key={i}>
            <line x1={x0 + t} y1={y0} x2={x0 + t} y2={y0 + size}
              stroke={C.border} strokeWidth={1} />
            <line x1={x0} y1={y0 + t} x2={x0 + size} y2={y0 + t}
              stroke={C.border} strokeWidth={1} />
          </g>
        );
      })}
      <circle cx={origin.cx} cy={origin.cy} r={5}
        fill={C.gold} stroke={C.ink} strokeWidth={STROKE} />
      <circle cx={cornerXY.cx} cy={cornerXY.cy} r={5}
        fill={C.shape} stroke={C.ink} strokeWidth={STROKE} />
      <text x={origin.cx - 8} y={origin.cy + 18} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.text}>{origin.label}</text>
      <text x={cornerXY.cx - 10} y={cornerXY.cy - 8} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.text}>{cornerXY.label}</text>
      <text x={x0 + size + 18} y={y0 + 22} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>u →</text>
      <text x={x0 + size + 18} y={y0 + 38} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>v ↓</text>
      <text x={x0 - 78} y={y0 + 14} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.textDim}>
        {centred ? '[-1, +1]' : '[0, 1]'}
      </text>
    </svg>
  );
};
