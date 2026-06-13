// Recipe diagrams — VoronoiF1F2, DomainWarp, ReactionDiffusion, Plasma.
// Moved verbatim from the old Diagram.tsx monolith (pixel output identical).
// ReactionDiffusion uses a seeded LCG (deterministic).

import { DIA as C, DIA_STROKE as STROKE } from './shared';

export const VoronoiF1F2 = () => {
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

export const DomainWarp = () => {
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

export const ReactionDiffusion = () => {
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

export const Plasma = () => {
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
