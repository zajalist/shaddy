// Diagram — chunky hand-drawn SVG illustrations for the Library encyclopedia.
//
// Each named diagram is a self-contained SVG that fits inside a cream
// surface card with a 1.5px ink outline. Stroke language matches the rest
// of the site: SHADE.inkLine for the outline, flat multi-colour fills
// using the category palette (catShape blue, catDistort red, catColor
// olive, catEffect purple), cream highlights for accents.
//
// All diagrams are deliberately small and conceptual — they explain the
// IDEA, not the actual maths. They're meant to be glanceable while reading
// the surrounding article copy.
//
// Add a diagram: extend the `kind` union below and add a `case` in render().

import type { CSSProperties } from 'react';
import { SHADE } from '../../tokens';

export type DiagramKind =
  | 'pipeline'           // vertex → raster → fragment
  | 'gpuGrid'            // many tiny worker dots
  | 'uvGrid'             // normalised UV with origin marker
  | 'uvCentred'          // centred -1..1 UV with origin marker
  | 'trigWave'           // sin curve from -1..1
  | 'dotProduct'         // two vectors + dot meaning
  | 'smoothstepCurve'    // cubic ramp shape
  | 'noiseStack'         // value vs fbm
  | 'fbmOctaves'         // 4 octaves stacking
  | 'sdfRings'           // signed distance rings
  | 'sdfPrimitives2D'    // circle/box/triangle outlines
  | 'sdfPrimitives3D'    // sphere/box/torus iso outlines
  | 'sdfBoolean'         // union / intersection / subtract
  | 'sdfSmoothUnion'     // smooth-min comparison
  | 'domainRepeat'       // tiled domain
  | 'raymarch'           // sphere tracing steps
  | 'lambert'            // light dot normal hemisphere
  | 'fresnelCurve'       // Schlick approximation curve
  | 'aoSamples'          // 5 tap AO short rays
  | 'gammaCurve'         // linear vs sRGB curve
  | 'tonemapCurves'      // reinhard / aces / filmic
  | 'cosinePalette'      // 4 bands a/b/c/d
  | 'hsvWheel'           // colour wheel
  | 'mandelbrot'         // tiny rendering of the set
  | 'julia'              // Julia outline
  | 'burningShip'        // ship silhouette
  | 'ifsTriangle'        // Sierpinski triangle
  | 'voronoiF1F2'        // F1 cells vs F2 edges
  | 'domainWarp'         // wavy domain
  | 'reactionDiffusion'  // Gray-Scott spots
  | 'plasma';            // sinusoidal interference

export type DiagramProps = {
  kind: DiagramKind;
  /** Optional caption rendered beneath the SVG (small monospace label). */
  caption?: string;
  /** Aspect-ratio override. Defaults to 16:9. */
  height?: number;
};

const wrap: CSSProperties = {
  position: 'relative',
  background: SHADE.surface1,
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 10,
  boxShadow: `0 3px 0 ${SHADE.inkLine}`,
  padding: 14,
  margin: '18px 0',
  display: 'block',
};

const cap: CSSProperties = {
  margin: '8px 2px 0',
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontSize: 11.5,
  letterSpacing: '0.04em',
  color: SHADE.textFaint,
};

// Shorthand colour aliases used in the diagrams below. Each entry is
// typed as plain `string` so the compiler doesn't lock us into the
// specific hex literal of the first assignment (lets us reassign
// strokeL/strokeR colours inside the boolean diagram without errors).
const C = {
  ink: SHADE.inkLine as string,
  shape: SHADE.catShape as string,
  distort: SHADE.catDistort as string,
  color: SHADE.catColor as string,
  effect: SHADE.catEffect as string,
  gold: SHADE.gold as string,
  ember: SHADE.ember as string,
  cream: SHADE.cream as string,
  text: SHADE.text as string,
  textDim: SHADE.textDim as string,
  textFaint: SHADE.textFaint as string,
  surface1: SHADE.surface1 as string,
  surface2: SHADE.surface2 as string,
  surface3: SHADE.surface3 as string,
  border: SHADE.border as string,
};

const STROKE = 1.5;

// ── individual diagram renderers ───────────────────────────────────────

const Pipeline = () => (
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
            fontFamily="Bricolage Grotesque">{label}</text>
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
      fontFamily="Geist Mono">positions</text>
    <text x={238} y={120} textAnchor="middle" fontSize={10} fill={C.textDim}
      fontFamily="Geist Mono">covered pixels</text>
    <text x={388} y={120} textAnchor="middle" fontSize={10} fill={C.textDim}
      fontFamily="Geist Mono">per-pixel colour</text>
  </svg>
);

const GpuGrid = () => (
  <svg viewBox="0 0 480 140" width="100%" role="img">
    <rect x={20} y={16} width={200} height={108} rx={10}
      fill={C.surface2} stroke={C.ink} strokeWidth={STROKE} />
    <text x={120} y={36} textAnchor="middle" fontSize={11}
      fontFamily="Geist Mono" fill={C.textDim}>cpu — 4 big cores</text>
    {Array.from({ length: 4 }).map((_, i) => (
      <rect key={i} x={36 + (i % 2) * 88} y={50 + Math.floor(i / 2) * 36}
        width={76} height={26} rx={5}
        fill={C.distort} stroke={C.ink} strokeWidth={STROKE} />
    ))}

    <rect x={260} y={16} width={200} height={108} rx={10}
      fill={C.surface2} stroke={C.ink} strokeWidth={STROKE} />
    <text x={360} y={36} textAnchor="middle" fontSize={11}
      fontFamily="Geist Mono" fill={C.textDim}>gpu — hundreds tiny</text>
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

const UvGrid = ({ centred = false }: { centred?: boolean }) => {
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
        fontFamily="Geist Mono" fill={C.text}>{origin.label}</text>
      <text x={cornerXY.cx - 10} y={cornerXY.cy - 8} fontSize={11}
        fontFamily="Geist Mono" fill={C.text}>{cornerXY.label}</text>
      <text x={x0 + size + 18} y={y0 + 22} fontSize={11}
        fontFamily="Geist Mono" fill={C.textDim}>u →</text>
      <text x={x0 + size + 18} y={y0 + 38} fontSize={11}
        fontFamily="Geist Mono" fill={C.textDim}>v ↓</text>
      <text x={x0 - 78} y={y0 + 14} fontSize={11}
        fontFamily="Geist Mono" fill={C.textDim}>
        {centred ? '[-1, +1]' : '[0, 1]'}
      </text>
    </svg>
  );
};

const TrigWave = () => {
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
        fontFamily="Geist Mono" fill={C.textDim}>+1</text>
      <text x={20} y={midY + 50} fontSize={10}
        fontFamily="Geist Mono" fill={C.textDim}>-1</text>
      <text x={w - 90} y={midY - 14} fontSize={11}
        fontFamily="Geist Mono" fill={C.ember}>sin(x)</text>
    </svg>
  );
};

const DotProduct = () => (
  <svg viewBox="0 0 360 160" width="100%" role="img">
    <line x1={40} y1={80} x2={200} y2={80} stroke={C.border} strokeDasharray="3 3" />
    {/* Vector A */}
    <line x1={40} y1={80} x2={200} y2={80} stroke={C.shape} strokeWidth={3} />
    <polygon points="200,80 192,76 192,84" fill={C.shape} />
    <text x={120} y={70} fontSize={12} fontFamily="Geist Mono" fill={C.shape}>A</text>
    {/* Vector B */}
    <line x1={40} y1={80} x2={140} y2={20} stroke={C.distort} strokeWidth={3} />
    <polygon points="140,20 134,28 132,20" fill={C.distort} />
    <text x={84} y={42} fontSize={12} fontFamily="Geist Mono" fill={C.distort}>B</text>
    {/* projection */}
    <line x1={140} y1={20} x2={140} y2={80}
      stroke={C.textDim} strokeWidth={1} strokeDasharray="2 3" />
    <line x1={40} y1={88} x2={140} y2={88} stroke={C.gold} strokeWidth={3} />
    <text x={70} y={104} fontSize={11} fontFamily="Geist Mono" fill={C.gold}>
      |A| |B| cos θ
    </text>
    {/* readout */}
    <text x={240} y={50} fontSize={12} fontFamily="Geist Mono" fill={C.text}>θ = angle</text>
    <text x={240} y={70} fontSize={12} fontFamily="Geist Mono" fill={C.text}>=1 → aligned</text>
    <text x={240} y={88} fontSize={12} fontFamily="Geist Mono" fill={C.text}>=0 → 90°</text>
    <text x={240} y={106} fontSize={12} fontFamily="Geist Mono" fill={C.text}>=-1 → opposite</text>
  </svg>
);

const SmoothstepCurve = () => {
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
        fontFamily="Geist Mono" fill={C.color}>smoothstep</text>
      <text x={x0 + gw - 100} y={y0 + 30} fontSize={11}
        fontFamily="Geist Mono" fill={C.distort}>step</text>
      <text x={x0 - 22} y={y0 + 6} fontSize={10}
        fontFamily="Geist Mono" fill={C.textDim}>1</text>
      <text x={x0 - 22} y={y0 + gh + 4} fontSize={10}
        fontFamily="Geist Mono" fill={C.textDim}>0</text>
      <text x={x0 + gw - 20} y={y0 + gh + 18} fontSize={10}
        fontFamily="Geist Mono" fill={C.textDim}>x</text>
    </svg>
  );
};

const NoiseStack = () => (
  <svg viewBox="0 0 460 140" width="100%" role="img">
    {/* value noise — grid of squares */}
    <text x={20} y={18} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
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
    <text x={170} y={18} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
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
    <text x={320} y={18} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
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

const FbmOctaves = () => {
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
          fontFamily="Geist Mono" fill={C.textDim}>
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

const SdfRings = () => {
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
        fontFamily="Geist Mono" fill={C.text}>d=0</text>
      <text x={20} y={28} fontSize={11}
        fontFamily="Geist Mono" fill={C.distort}>d &lt; 0 (inside)</text>
      <text x={20} y={120} fontSize={11}
        fontFamily="Geist Mono" fill={C.shape}>d &gt; 0 (outside)</text>
    </svg>
  );
};

const SdfPrimitives2D = () => (
  <svg viewBox="0 0 460 140" width="100%" role="img">
    <circle cx={70} cy={70} r={40}
      fill="none" stroke={C.shape} strokeWidth={3} />
    <text x={70} y={130} fontSize={11} textAnchor="middle"
      fontFamily="Geist Mono" fill={C.textDim}>circle</text>

    <rect x={140} y={32} width={76} height={76} rx={4}
      fill="none" stroke={C.distort} strokeWidth={3} />
    <text x={178} y={130} fontSize={11} textAnchor="middle"
      fontFamily="Geist Mono" fill={C.textDim}>box</text>

    <polygon points="265,108 305,32 345,108"
      fill="none" stroke={C.color} strokeWidth={3} />
    <text x={305} y={130} fontSize={11} textAnchor="middle"
      fontFamily="Geist Mono" fill={C.textDim}>triangle</text>

    <polygon points="400,40 432,56 432,86 400,102 368,86 368,56"
      fill="none" stroke={C.effect} strokeWidth={3} />
    <text x={400} y={130} fontSize={11} textAnchor="middle"
      fontFamily="Geist Mono" fill={C.textDim}>hex</text>
  </svg>
);

const SdfPrimitives3D = () => (
  <svg viewBox="0 0 460 150" width="100%" role="img">
    {/* sphere */}
    <ellipse cx={70} cy={70} rx={40} ry={40}
      fill={C.surface2} stroke={C.shape} strokeWidth={3} />
    <ellipse cx={70} cy={70} rx={40} ry={12}
      fill="none" stroke={C.shape} strokeWidth={1.5} opacity={0.6} />
    <text x={70} y={138} textAnchor="middle" fontSize={11}
      fontFamily="Geist Mono" fill={C.textDim}>sphere</text>
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
      fontFamily="Geist Mono" fill={C.textDim}>box</text>
    {/* torus */}
    <g>
      <ellipse cx={300} cy={70} rx={48} ry={28}
        fill="none" stroke={C.color} strokeWidth={3} />
      <ellipse cx={300} cy={70} rx={22} ry={10}
        fill={C.surface1} stroke={C.color} strokeWidth={3} />
    </g>
    <text x={300} y={138} textAnchor="middle" fontSize={11}
      fontFamily="Geist Mono" fill={C.textDim}>torus</text>
    {/* capsule */}
    <g>
      <rect x={386} y={48} width={50} height={50} rx={25}
        fill={C.surface2} stroke={C.effect} strokeWidth={3} />
    </g>
    <text x={411} y={138} textAnchor="middle" fontSize={11}
      fontFamily="Geist Mono" fill={C.textDim}>capsule</text>
  </svg>
);

const SdfBoolean = () => (
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
            fontFamily="Geist Mono" fill={C.textDim}>{kind}</text>
        </g>
      );
    })}
  </svg>
);

const SdfSmoothUnion = () => {
  const w = 460, h = 140, mid = h / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      {/* hard min */}
      <text x={20} y={20} fontSize={11} fontFamily="Geist Mono" fill={C.distort}>
        min — corner
      </text>
      <path d="M 20 60 L 80 60 L 100 90 L 160 90"
        stroke={C.distort} strokeWidth={3} fill="none" />
      {/* smooth min */}
      <text x={240} y={20} fontSize={11} fontFamily="Geist Mono" fill={C.color}>
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

const DomainRepeat = () => (
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

const Raymarch = () => {
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
        fontFamily="Geist Mono" fill={C.text}>ray</text>
    </svg>
  );
};

const Lambert = () => (
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
    <text x={156} y={56} fontSize={11} fontFamily="Geist Mono" fill={C.color}>N</text>
    {/* light */}
    <line x1={150} y1={110} x2={88} y2={48}
      stroke={C.gold} strokeWidth={3} />
    <polygon points="88,48 96,52 92,58" fill={C.gold} />
    <text x={70} y={42} fontSize={11} fontFamily="Geist Mono" fill={C.gold}>L</text>
    {/* readout */}
    <text x={260} y={56} fontSize={12} fontFamily="Geist Mono" fill={C.text}>brightness =</text>
    <text x={260} y={76} fontSize={14} fontFamily="Geist Mono" fill={C.ember}>max(N · L, 0)</text>
    <text x={260} y={102} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
      N pointing AT L → bright
    </text>
    <text x={260} y={118} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
      perpendicular → dark
    </text>
  </svg>
);

const FresnelCurve = () => {
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
        fontFamily="Geist Mono" fill={C.textDim}>1.0</text>
      <text x={x0 - 26} y={y0 + gh + 4} fontSize={10}
        fontFamily="Geist Mono" fill={C.textDim}>0.04</text>
      <text x={x0} y={y0 + gh + 18} fontSize={10}
        fontFamily="Geist Mono" fill={C.textDim}>face-on</text>
      <text x={x0 + gw - 60} y={y0 + gh + 18} fontSize={10}
        fontFamily="Geist Mono" fill={C.textDim}>grazing</text>
      <text x={x0 + 18} y={y0 + 18} fontSize={12}
        fontFamily="Geist Mono" fill={C.effect}>schlick</text>
    </svg>
  );
};

const AoSamples = () => (
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
    <text x={30} y={66} fontSize={11} fontFamily="Geist Mono" fill={C.text}>
      surface
    </text>
    <text x={30} y={28} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
      5-tap AO
    </text>
  </svg>
);

const GammaCurve = () => {
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
        fontFamily="Geist Mono" fill={C.gold}>sRGB (≈ x^1/2.2)</text>
      <text x={x0 + 14} y={y0 + 32} fontSize={11}
        fontFamily="Geist Mono" fill={C.textDim}>linear</text>
    </svg>
  );
};

const TonemapCurves = () => {
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
              fontFamily="Geist Mono" fill={c.col}>{c.name}</text>
          </g>
        );
      })}
      <text x={x0 - 24} y={y0 + 8} fontSize={10}
        fontFamily="Geist Mono" fill={C.textDim}>1</text>
      <text x={x0 - 24} y={y0 + gh + 4} fontSize={10}
        fontFamily="Geist Mono" fill={C.textDim}>0</text>
      <text x={x0 + gw - 12} y={y0 + gh + 18} fontSize={10}
        fontFamily="Geist Mono" fill={C.textDim}>HDR in</text>
    </svg>
  );
};

const CosinePalette = () => {
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
      <text x={40} y={28} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
        a + b · cos(2π(c·t + d))
      </text>
      <text x={40} y={120} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
        a=0.5  b=0.5  c=1  d=(0, 0.33, 0.67)
      </text>
    </svg>
  );
};

const HsvWheel = () => {
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
      <text x={170} y={50} fontSize={12} fontFamily="Geist Mono" fill={C.text}>
        H — hue around the wheel
      </text>
      <text x={170} y={72} fontSize={12} fontFamily="Geist Mono" fill={C.text}>
        S — saturation, centre → edge
      </text>
      <text x={170} y={94} fontSize={12} fontFamily="Geist Mono" fill={C.text}>
        V — value, brightness
      </text>
    </svg>
  );
};

const Mandelbrot = () => {
  // Plot a small low-resolution Mandelbrot.
  const w = 460, h = 140;
  const cellsX = 90, cellsY = 30;
  const cellW = (w - 80) / cellsX;
  const cellH = (h - 20) / cellsY;
  const cells: React.ReactNode[] = [];
  for (let py = 0; py < cellsY; py++) {
    for (let px = 0; px < cellsX; px++) {
      const x0 = (px / cellsX) * 3.0 - 2.0;
      const y0 = (py / cellsY) * 1.6 - 0.8;
      let x = 0, y = 0, i = 0;
      const MAX = 28;
      while (x * x + y * y <= 4 && i < MAX) {
        const xt = x * x - y * y + x0;
        y = 2 * x * y + y0;
        x = xt;
        i++;
      }
      if (i < MAX) {
        const v = i / MAX;
        cells.push(
          <rect key={`${px}-${py}`}
            x={40 + px * cellW} y={10 + py * cellH}
            width={cellW + 0.5} height={cellH + 0.5}
            fill={`rgba(252,180,39,${0.15 + v * 0.85})`} />,
        );
      } else {
        cells.push(
          <rect key={`${px}-${py}`}
            x={40 + px * cellW} y={10 + py * cellH}
            width={cellW + 0.5} height={cellH + 0.5}
            fill={C.text} />,
        );
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      {cells}
    </svg>
  );
};

// Real Julia set plotted at low res — c = (-0.7, 0.27015) which gives the
// classic dendritic "lightning fractal" everyone recognises. Same plotting
// machinery as the Mandelbrot diagram above (cell grid + escape-time
// coloured ramp + black interior).
const Julia = () => {
  const w = 460, h = 140;
  const cellsX = 90, cellsY = 30;
  const cellW = (w - 80) / cellsX;
  const cellH = (h - 20) / cellsY;
  const CRX = -0.7;
  const CRY = 0.27015;
  const cells: React.ReactNode[] = [];
  for (let py = 0; py < cellsY; py++) {
    for (let px = 0; px < cellsX; px++) {
      // Map cells across the complex plane centred on (0, 0). Wider than
      // tall to fit the strip; matches the visible canvas's letterbox.
      let x = (px / cellsX) * 3.0 - 1.5;
      let y = (py / cellsY) * 1.6 - 0.8;
      let i = 0;
      const MAX = 40;
      while (x * x + y * y <= 4 && i < MAX) {
        const xt = x * x - y * y + CRX;
        y = 2 * x * y + CRY;
        x = xt;
        i++;
      }
      const key = `${px}-${py}`;
      const left = 40 + px * cellW;
      const top = 10 + py * cellH;
      const cw = cellW + 0.5;
      const ch = cellH + 0.5;
      if (i < MAX) {
        const v = i / MAX;
        // Lavender → magenta escape ramp (uses the distort cat color).
        cells.push(
          <rect key={key} x={left} y={top} width={cw} height={ch}
            fill={`rgba(181,54,94,${0.2 + v * 0.8})`} />,
        );
      } else {
        cells.push(
          <rect key={key} x={left} y={top} width={cw} height={ch}
            fill={C.ink} />,
        );
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      {cells}
      <text x={20} y={130} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
        z ← z² + c    (c = -0.7 + 0.27015i)
      </text>
    </svg>
  );
};

// Real Burning Ship plotted at low res. Mandelbrot iteration with abs() on
// both components before squaring — produces the iconic boat-armada
// silhouette around (-1.75, 0).
const BurningShip = () => {
  const w = 460, h = 140;
  const cellsX = 90, cellsY = 30;
  const cellW = (w - 80) / cellsX;
  const cellH = (h - 20) / cellsY;
  const cells: React.ReactNode[] = [];
  for (let py = 0; py < cellsY; py++) {
    for (let px = 0; px < cellsX; px++) {
      // Window centred on the main "ship" hull.
      const x0 = (px / cellsX) * 2.4 - 2.0;
      // Burning Ship's y axis is flipped relative to Mandelbrot to read
      // boats-pointing-up; sample from the bottom half.
      const y0 = -((py / cellsY) * 1.4 - 0.1);
      let x = 0, y = 0, i = 0;
      const MAX = 36;
      while (x * x + y * y <= 4 && i < MAX) {
        const xt = x * x - y * y + x0;
        // The defining trick — absolute both components before each square.
        y = Math.abs(2 * x * y) + y0;
        x = Math.abs(xt);
        i++;
      }
      const key = `${px}-${py}`;
      const left = 40 + px * cellW;
      const top = 10 + py * cellH;
      const cw = cellW + 0.5;
      const ch = cellH + 0.5;
      if (i < MAX) {
        const v = i / MAX;
        cells.push(
          <rect key={key} x={left} y={top} width={cw} height={ch}
            fill={`rgba(181,106,29,${0.2 + v * 0.8})`} />,
        );
      } else {
        cells.push(
          <rect key={key} x={left} y={top} width={cw} height={ch}
            fill={C.ink} />,
        );
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      {cells}
      <text x={20} y={130} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
        z ← (|x| + i|y|)² + c
      </text>
    </svg>
  );
};

const IfsTriangle = () => {
  const points: React.ReactNode[] = [];
  // 3 attractor points
  const A: [number, number] = [80, 110];
  const B: [number, number] = [240, 110];
  const C2: [number, number] = [160, 20];
  let x = 160, y = 60;
  const verts: Array<[number, number]> = [A, B, C2];
  for (let i = 0; i < 380; i++) {
    const target = verts[Math.floor(Math.random() * 3)] ?? A;
    x = (x + target[0]) / 2;
    y = (y + target[1]) / 2;
    if (i > 8) {
      points.push(<circle key={i} cx={x} cy={y} r={1.4} fill={C.effect} />);
    }
  }
  return (
    <svg viewBox="0 0 460 140" width="100%" role="img">
      {points}
      <text x={300} y={50} fontSize={11} fontFamily="Geist Mono" fill={C.text}>
        chaos game:
      </text>
      <text x={300} y={66} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
        pick a random corner,
      </text>
      <text x={300} y={80} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
        jump halfway,
      </text>
      <text x={300} y={94} fontSize={11} fontFamily="Geist Mono" fill={C.textDim}>
        plot, repeat.
      </text>
    </svg>
  );
};

const VoronoiF1F2 = () => {
  const seeds: Array<[number, number]> = [
    [60, 40], [110, 90], [180, 35], [220, 100],
    [280, 60], [340, 95], [400, 40], [420, 110],
  ];
  const cells: React.ReactNode[] = [];
  const STEP = 6;
  for (let y = 10; y < 130; y += STEP) {
    for (let x = 10; x < 450; x += STEP) {
      let best = Infinity;
      let bestIdx = 0;
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i]!;
        const dx = x - s[0];
        const dy = y - s[1];
        const d = dx * dx + dy * dy;
        if (d < best) { best = d; bestIdx = i; }
      }
      const col = ['#1F7FB8', '#B5365E', '#6F7F1A', '#5C3FA8', '#FCB427', '#B56A1D', '#7a6e58', '#c5bba6'][bestIdx];
      cells.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={STEP} height={STEP}
          fill={col} opacity={0.7} />,
      );
    }
  }
  return (
    <svg viewBox="0 0 460 140" width="100%" role="img">
      {cells}
      {seeds.map((s, i) => (
        <circle key={i} cx={s[0]} cy={s[1]} r={3.5} fill={C.cream}
          stroke={C.ink} strokeWidth={STROKE} />
      ))}
    </svg>
  );
};

const DomainWarp = () => {
  // Two rows of wavy lines.
  const w = 460, h = 140;
  const rows: React.ReactNode[] = [];
  for (let r = 0; r < 8; r++) {
    const yMid = 20 + r * 14;
    const pts: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const wx = Math.sin(t * 10 + r * 0.7) * 4;
      const wy = Math.cos(t * 7 + r * 0.5) * 6;
      const x = 20 + t * (w - 40) + wx;
      const y = yMid + wy;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    rows.push(<polyline key={r} points={pts.join(' ')} fill="none"
      stroke={r % 2 === 0 ? C.distort : C.color}
      strokeWidth={2} opacity={0.85} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      {rows}
    </svg>
  );
};

const ReactionDiffusion = () => {
  // Just decorative dots in irregular blobs.
  const blobs: React.ReactNode[] = [];
  const seed = (n: number) => {
    let x = n + 1;
    return () => {
      x = (x * 1664525 + 1013904223) % 4294967296;
      return x / 4294967296;
    };
  };
  const r1 = seed(7);
  for (let i = 0; i < 60; i++) {
    const cx = 20 + r1() * 420;
    const cy = 14 + r1() * 110;
    const rad = 6 + r1() * 10;
    blobs.push(
      <ellipse key={i} cx={cx} cy={cy} rx={rad} ry={rad * 0.7}
        fill={C.shape} stroke={C.ink} strokeWidth={STROKE * 0.8} opacity={0.85} />,
    );
  }
  return (
    <svg viewBox="0 0 460 140" width="100%" role="img">
      {blobs}
    </svg>
  );
};

const Plasma = () => {
  // 3 sinusoidal bands of color.
  const w = 460, h = 140;
  const bands: React.ReactNode[] = [];
  for (let i = 0; i < 80; i++) {
    const t = i / 80;
    const r = 128 + 127 * Math.sin(t * Math.PI * 6);
    const g = 128 + 127 * Math.sin(t * Math.PI * 4 + 1.7);
    const b = 128 + 127 * Math.sin(t * Math.PI * 2 + 0.4);
    bands.push(
      <rect key={i} x={20 + i * ((w - 40) / 80)} y={20}
        width={(w - 40) / 80 + 0.5} height={100}
        fill={`rgb(${r | 0},${g | 0},${b | 0})`} />,
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img">
      {bands}
      <rect x={20} y={20} width={w - 40} height={100}
        fill="none" stroke={C.ink} strokeWidth={STROKE} />
    </svg>
  );
};

// ── router ─────────────────────────────────────────────────────────────

export const Diagram = ({ kind, caption }: DiagramProps) => {
  let body: React.ReactNode = null;
  switch (kind) {
    case 'pipeline':           body = <Pipeline />; break;
    case 'gpuGrid':            body = <GpuGrid />; break;
    case 'uvGrid':             body = <UvGrid centred={false} />; break;
    case 'uvCentred':          body = <UvGrid centred />; break;
    case 'trigWave':           body = <TrigWave />; break;
    case 'dotProduct':         body = <DotProduct />; break;
    case 'smoothstepCurve':    body = <SmoothstepCurve />; break;
    case 'noiseStack':         body = <NoiseStack />; break;
    case 'fbmOctaves':         body = <FbmOctaves />; break;
    case 'sdfRings':           body = <SdfRings />; break;
    case 'sdfPrimitives2D':    body = <SdfPrimitives2D />; break;
    case 'sdfPrimitives3D':    body = <SdfPrimitives3D />; break;
    case 'sdfBoolean':         body = <SdfBoolean />; break;
    case 'sdfSmoothUnion':     body = <SdfSmoothUnion />; break;
    case 'domainRepeat':       body = <DomainRepeat />; break;
    case 'raymarch':           body = <Raymarch />; break;
    case 'lambert':            body = <Lambert />; break;
    case 'fresnelCurve':       body = <FresnelCurve />; break;
    case 'aoSamples':          body = <AoSamples />; break;
    case 'gammaCurve':         body = <GammaCurve />; break;
    case 'tonemapCurves':      body = <TonemapCurves />; break;
    case 'cosinePalette':      body = <CosinePalette />; break;
    case 'hsvWheel':           body = <HsvWheel />; break;
    case 'mandelbrot':         body = <Mandelbrot />; break;
    case 'julia':              body = <Julia />; break;
    case 'burningShip':        body = <BurningShip />; break;
    case 'ifsTriangle':        body = <IfsTriangle />; break;
    case 'voronoiF1F2':        body = <VoronoiF1F2 />; break;
    case 'domainWarp':         body = <DomainWarp />; break;
    case 'reactionDiffusion':  body = <ReactionDiffusion />; break;
    case 'plasma':             body = <Plasma />; break;
    default:                   body = null;
  }
  return (
    <figure style={{ margin: '18px 0' }}>
      <div style={wrap}>{body}</div>
      {caption && <figcaption style={cap}>{caption}</figcaption>}
    </figure>
  );
};

export default Diagram;
