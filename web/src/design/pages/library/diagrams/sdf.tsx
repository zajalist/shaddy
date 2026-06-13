// SDF diagrams — SdfRings, SdfPrimitives2D/3D, SdfBoolean, SdfSmoothUnion,
// DomainRepeat, Raymarch. Moved verbatim from the old Diagram.tsx monolith.

import { DIA as C, DIA_STROKE as STROKE, DIA_FONT_MONO } from './shared';

export const SdfRings = () => {
  const cx = 230, cy = 70;
  return (
    <svg viewBox="0 0 460 140" width="100%" role="img">
      {[-30, -20, -10, 0, 10, 20, 30].map((d) => {
        const r = 50 + d;
        const colour = d < 0 ? C.distort : d > 0 ? C.shape : C.gold;
        return (
          <circle key={d} cx={cx} cy={cy} r={Math.max(2, r)}
            fill="none" stroke={colour} strokeWidth={d === 0 ? 3 : 1.4}
            strokeDasharray={d === 0 ? '0' : '4 4'} opacity={0.85} />
        );
      })}
      <text x={cx - 10} y={cy + 4} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.text}>d=0</text>
      <text x={20} y={28} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.distort}>d &lt; 0 (inside)</text>
      <text x={20} y={120} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.shape}>d &gt; 0 (outside)</text>
    </svg>
  );
};

export const SdfPrimitives2D = () => (
  <svg viewBox="0 0 460 140" width="100%" role="img">
    <circle cx={70} cy={70} r={40}
      fill="none" stroke={C.shape} strokeWidth={3} />
    <text x={70} y={130} fontSize={11} textAnchor="middle"
      fontFamily={DIA_FONT_MONO} fill={C.textDim}>circle</text>

    <rect x={140} y={32} width={76} height={76} rx={4}
      fill="none" stroke={C.distort} strokeWidth={3} />
    <text x={178} y={130} fontSize={11} textAnchor="middle"
      fontFamily={DIA_FONT_MONO} fill={C.textDim}>box</text>

    <polygon points="265,108 305,32 345,108"
      fill="none" stroke={C.color} strokeWidth={3} />
    <text x={305} y={130} fontSize={11} textAnchor="middle"
      fontFamily={DIA_FONT_MONO} fill={C.textDim}>triangle</text>

    <polygon points="400,40 432,56 432,86 400,102 368,86 368,56"
      fill="none" stroke={C.effect} strokeWidth={3} />
    <text x={400} y={130} fontSize={11} textAnchor="middle"
      fontFamily={DIA_FONT_MONO} fill={C.textDim}>hex</text>
  </svg>
);

export const SdfPrimitives3D = () => (
  <svg viewBox="0 0 460 150" width="100%" role="img">
    {/* sphere */}
    <ellipse cx={70} cy={70} rx={40} ry={40}
      fill={C.surface2} stroke={C.shape} strokeWidth={3} />
    <ellipse cx={70} cy={70} rx={40} ry={12}
      fill="none" stroke={C.shape} strokeWidth={1.5} opacity={0.6} />
    <text x={70} y={138} textAnchor="middle" fontSize={11}
      fontFamily={DIA_FONT_MONO} fill={C.textDim}>sphere</text>
    {/* box */}
    <g>
      <polygon points="148,46 210,38 210,90 148,98"
        fill={C.surface2} stroke={C.distort} strokeWidth={3} />
      <polygon points="148,46 168,30 230,22 210,38"
        fill={C.surface3} stroke={C.distort} strokeWidth={3} />
      <polygon points="210,38 230,22 230,74 210,90"
        fill={C.surface1} stroke={C.distort} strokeWidth={3} />
    </g>
    <text x={188} y={138} textAnchor="middle" fontSize={11}
      fontFamily={DIA_FONT_MONO} fill={C.textDim}>box</text>
    {/* torus */}
    <g>
      <ellipse cx={300} cy={70} rx={48} ry={28}
        fill="none" stroke={C.color} strokeWidth={3} />
      <ellipse cx={300} cy={70} rx={22} ry={10}
        fill={C.surface1} stroke={C.color} strokeWidth={3} />
    </g>
    <text x={300} y={138} textAnchor="middle" fontSize={11}
      fontFamily={DIA_FONT_MONO} fill={C.textDim}>torus</text>
    {/* capsule */}
    <g>
      <rect x={386} y={48} width={50} height={50} rx={25}
        fill={C.surface2} stroke={C.effect} strokeWidth={3} />
    </g>
    <text x={411} y={138} textAnchor="middle" fontSize={11}
      fontFamily={DIA_FONT_MONO} fill={C.textDim}>capsule</text>
  </svg>
);

export const SdfBoolean = () => (
  <svg viewBox="0 0 460 140" width="100%" role="img">
    {(['union', 'intersect', 'subtract'] as const).map((kind, idx) => {
      const cx = 80 + idx * 150;
      const cy = 70;
      let leftFill = 'none';
      let rightFill = 'none';
      let strokeL = C.shape;
      let strokeR = C.distort;
      if (kind === 'union') { leftFill = C.shape; rightFill = C.distort; }
      if (kind === 'intersect') { strokeL = C.textDim; strokeR = C.textDim; }
      return (
        <g key={kind}>
          <circle cx={cx - 14} cy={cy} r={32}
            fill={leftFill} stroke={strokeL} strokeWidth={STROKE}
            opacity={kind === 'subtract' ? 0.85 : 0.7} />
          <circle cx={cx + 14} cy={cy} r={32}
            fill={kind === 'subtract' ? C.surface1 : rightFill}
            stroke={strokeR} strokeWidth={STROKE}
            opacity={kind === 'subtract' ? 1 : 0.7} />
          {kind === 'intersect' && (
            <path d={`M ${cx - 2} ${cy - 28} A 32 32 0 0 1 ${cx - 2} ${cy + 28} A 32 32 0 0 1 ${cx - 2} ${cy - 28} Z`}
              fill={C.color} opacity={0.85} />
          )}
          <text x={cx} y={126} textAnchor="middle" fontSize={11}
            fontFamily={DIA_FONT_MONO} fill={C.textDim}>{kind}</text>
        </g>
      );
    })}
  </svg>
);

export const SdfSmoothUnion = () => {
  const w = 460, h = 140, mid = h / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      {/* hard min */}
      <text x={20} y={20} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.distort}>
        min — corner
      </text>
      <path d="M 20 60 L 80 60 L 100 90 L 160 90"
        stroke={C.distort} strokeWidth={3} fill="none" />
      {/* smooth min */}
      <text x={240} y={20} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.color}>
        smin(k) — blended
      </text>
      <path d="M 240 60 Q 300 60 320 75 Q 340 90 380 90"
        stroke={C.color} strokeWidth={3} fill="none" />
      {/* baseline */}
      <line x1={20} y1={mid + 50} x2={w - 20} y2={mid + 50}
        stroke={C.border} />
    </svg>
  );
};

export const DomainRepeat = () => (
  <svg viewBox="0 0 460 140" width="100%" role="img">
    {Array.from({ length: 5 }).map((_, col) =>
      Array.from({ length: 3 }).map((__, row) => {
        const cx = 40 + col * 90;
        const cy = 30 + row * 36;
        return (
          <g key={`${col}-${row}`}>
            <rect x={cx} y={cy} width={70} height={26} rx={3}
              fill={C.surface3} stroke={C.ink} strokeWidth={STROKE} />
            <circle cx={cx + 14} cy={cy + 13} r={6}
              fill={C.shape} stroke={C.ink} strokeWidth={STROKE} />
          </g>
        );
      }),
    )}
  </svg>
);

export const Raymarch = () => {
  const w = 460, h = 150;
  const ox = 30, oy = h / 2;
  const surface: Array<[number, number]> = [
    [240, 60], [260, 64], [285, 76], [300, 90], [310, 110], [320, 134],
  ];
  const distances = [80, 60, 40, 24, 10, 4];
  const steps = distances.map((d, i) => {
    const x = ox + distances.slice(0, i + 1).reduce((a, b) => a + b, 0);
    return { x, d };
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      {/* surface */}
      <path d={`M ${surface.map((p) => p.join(' ')).join(' L ')}`}
        stroke={C.ink} strokeWidth={STROKE * 1.4}
        fill={C.surface2} />
      {/* ray + step circles */}
      <line x1={ox} y1={oy} x2={steps[steps.length - 1]?.x ?? ox} y2={oy}
        stroke={C.ember} strokeWidth={2} strokeDasharray="4 4" />
      {steps.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={oy} r={s.d} stroke={C.shape}
            strokeWidth={1} fill="none" opacity={0.4} />
          <circle cx={s.x} cy={oy} r={3.5} fill={C.ember}
            stroke={C.ink} strokeWidth={STROKE} />
        </g>
      ))}
      {/* origin */}
      <circle cx={ox} cy={oy} r={6} fill={C.gold}
        stroke={C.ink} strokeWidth={STROKE} />
      <text x={ox - 4} y={oy - 12} fontSize={11}
        fontFamily={DIA_FONT_MONO} fill={C.text}>ray</text>
    </svg>
  );
};
