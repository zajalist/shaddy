// Fractal diagrams — Mandelbrot, Julia, BurningShip, IfsTriangle.
// Moved verbatim from the old Diagram.tsx monolith (pixel output identical).
// IfsTriangle uses Math.random() and is intentionally non-deterministic.

import { DIA as C, DIA_FONT_MONO } from './shared';

export const Mandelbrot = () => {
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
export const Julia = () => {
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
      <text x={20} y={130} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
        z ← z² + c    (c = -0.7 + 0.27015i)
      </text>
    </svg>
  );
};

// Real Burning Ship plotted at low res. Mandelbrot iteration with abs() on
// both components before squaring — produces the iconic boat-armada
// silhouette around (-1.75, 0).
export const BurningShip = () => {
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
      <text x={20} y={130} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
        z ← (|x| + i|y|)² + c
      </text>
    </svg>
  );
};

export const IfsTriangle = () => {
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
      <text x={300} y={50} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.text}>
        chaos game:
      </text>
      <text x={300} y={66} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
        pick a random corner,
      </text>
      <text x={300} y={80} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
        jump halfway,
      </text>
      <text x={300} y={94} fontSize={11} fontFamily={DIA_FONT_MONO} fill={C.textDim}>
        plot, repeat.
      </text>
    </svg>
  );
};
