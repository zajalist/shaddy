import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

// Ported from hayba/lib/starfield.js — Canvas2D twinkling dots with
// occasional sparks. Used behind the topbar for the cinematic feel.

export type StarfieldOpts = {
  density?: number;
  maxR?: number;
  maxBase?: number;
  warmChance?: number;
  sparkMinMs?: number;
  sparkMaxMs?: number;
  leftBias?: number;
};

const DEFAULTS: Required<StarfieldOpts> = {
  density: 0.5,
  maxR: 0.45,
  maxBase: 0.22,
  warmChance: 0.18,
  sparkMinMs: 4000,
  sparkMaxMs: 9000,
  leftBias: 1.0,
};

type Star = {
  x: number;
  y: number;
  r: number;
  base: number;
  speed: number;
  phase: number;
  warm: boolean;
  spark: number;
};

export const Starfield = ({
  opts,
  style,
}: {
  opts?: StarfieldOpts;
  style?: CSSProperties;
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const o = { ...DEFAULTS, ...opts };

    let W = 0;
    let H = 0;
    let stars: Star[] = [];
    let nextSparkAt = 0;
    let raf = 0;
    let stopped = false;

    const resize = () => {
      const parent = canvas.parentElement ?? canvas;
      W = parent.clientWidth;
      H = parent.clientHeight;
      if (W < 2 || H < 2) return;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      stars = Array.from({ length: Math.round(W * o.density) }, () => ({
        x: Math.pow(Math.random(), o.leftBias) * W,
        y: Math.random() * H,
        r: 0.18 + Math.random() * o.maxR,
        base: 0.04 + Math.random() * o.maxBase,
        speed: 0.0001 + Math.random() * 0.0009,
        phase: Math.random() * Math.PI * 2,
        warm: Math.random() < o.warmChance,
        spark: 0,
      }));
    };

    const frame = (t: number) => {
      if (stopped) return;
      ctx.clearRect(0, 0, W, H);
      if (t > nextSparkAt && stars.length) {
        const target = stars[Math.floor(Math.random() * stars.length)];
        if (target) target.spark = 1;
        nextSparkAt = t + o.sparkMinMs + Math.random() * (o.sparkMaxMs - o.sparkMinMs);
      }
      for (const s of stars) {
        const twinkle = s.base * (0.35 + 0.65 * Math.sin(t * s.speed + s.phase));
        if (s.spark > 0) s.spark = Math.max(0, s.spark - 0.012);
        const op = Math.min(1, twinkle + s.spark);
        const showHalo = (s.base > 0.18 && twinkle > s.base * 0.7) || s.spark > 0.3;
        const haloOp = Math.min(0.35, op * 0.4 + s.spark * 0.4);
        const color = s.warm
          ? `255, ${Math.round(220 - s.spark * 20)}, ${Math.round(178 - s.spark * 20)}`
          : '255, 255, 255';
        if (showHalo) {
          ctx.fillStyle = `rgba(${color}, ${haloOp.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * (2.4 + s.spark * 1.6), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${color}, ${op.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (1 + s.spark * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    let resizeObs: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(resize);
      resizeObs.observe(canvas.parentElement ?? canvas);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      resizeObs?.disconnect();
    };
  }, [opts]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
};
