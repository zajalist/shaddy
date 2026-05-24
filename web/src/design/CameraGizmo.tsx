// 3D axis gizmo — a 64×64 SVG overlay drawn over the bottom-right of the
// 3D preview viewport. Projects world X (red), Y (green), Z (blue) axes
// through the current camera so the user can read viewpoint at a glance.
//
// Projection is a hand-rolled lookAt + a tiny orthographic shrink: we don't
// need perspective for a 64px indicator, just direction. The basis vectors
// we draw are the world axes expressed in CAMERA SPACE — same basis the
// shader builds in MAIN_3D_HEAD (`uu` right, `vv` up, `-ww` toward eye).
//
// Each axis renders as: a coloured line from the origin to its tip, a
// solid coloured disc at the tip with a label letter. Far-side ends draw
// hollow + dimmer so the user can read depth ordering.

import type { CSSProperties, MouseEvent } from 'react';

import type { CameraVec3, CameraView } from '@/cards';

const SIZE = 64;
const RADIUS = 22; // tip distance from centre in px
const TIP = 8.5;   // tip disc radius in px

export type CameraGizmoProps = {
  camera: CameraView;
  /** Optional click-to-snap. If provided, clicking an axis tip emits the
   *  axis name and the controller can re-orient. Omitted → passive gizmo. */
  onAxisClick?: (axis: 'x' | 'y' | 'z' | '-x' | '-y' | '-z') => void;
  style?: CSSProperties;
};

type Projected = {
  axis: 'x' | 'y' | 'z' | '-x' | '-y' | '-z';
  label: string;
  color: string;
  // 2D position on the 64×64 SVG (origin = centre).
  x: number;
  y: number;
  // Depth — larger = closer to viewer. Used for paint order.
  z: number;
  positive: boolean;
};

const COLORS = {
  x: '#e3563c',
  y: '#7fae2a',
  z: '#4a9bd6',
} as const;

export const CameraGizmo = ({ camera, onAxisClick, style }: CameraGizmoProps) => {
  // Build the camera basis exactly as the shader does so the gizmo agrees
  // with what the user is looking at.
  const ww = normalize(sub(camera.target, camera.eye));
  const uu = normalize(cross(ww, camera.up));
  const vv = cross(uu, ww);

  // Project a world-space direction onto the screen plane of the gizmo.
  // Screen X = dot(world, uu) (right is +x), Screen Y = -dot(world, vv)
  // (SVG y grows downward), depth Z = dot(world, ww) (forward = into screen,
  // so larger means further away from the viewer → smaller is "closer").
  const project = (dir: CameraVec3): { x: number; y: number; z: number } => {
    const sx = dot(dir, uu);
    const sy = -dot(dir, vv);
    const sz = -dot(dir, ww); // flip so +z means "toward camera"
    return { x: sx * RADIUS, y: sy * RADIUS, z: sz };
  };

  const axes: Projected[] = [
    { axis:  'x', label: 'X', color: COLORS.x, positive: true,  ...project([ 1, 0, 0]) },
    { axis: '-x', label: '',  color: COLORS.x, positive: false, ...project([-1, 0, 0]) },
    { axis:  'y', label: 'Y', color: COLORS.y, positive: true,  ...project([ 0, 1, 0]) },
    { axis: '-y', label: '',  color: COLORS.y, positive: false, ...project([ 0,-1, 0]) },
    { axis:  'z', label: 'Z', color: COLORS.z, positive: true,  ...project([ 0, 0, 1]) },
    { axis: '-z', label: '',  color: COLORS.z, positive: false, ...project([ 0, 0,-1]) },
  ];

  // Sort back-to-front so closer tips paint over farther ones.
  const sorted = [...axes].sort((a, b) => a.z - b.z);

  const cx = SIZE / 2;
  const cy = SIZE / 2;

  const handleClick = (axis: Projected['axis']) => (e: MouseEvent) => {
    if (!onAxisClick) return;
    e.preventDefault();
    e.stopPropagation();
    onAxisClick(axis);
  };

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-label="3D axis gizmo"
      style={{
        // The host typically positions this absolutely; we just provide
        // sensible defaults. `pointer-events: auto` only on the discs so the
        // camera controller below can still receive mouse events through
        // the empty corners of the SVG.
        background: 'rgba(0, 0, 0, 0.32)',
        borderRadius: 6,
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {/* Axis lines — drawn first so the tips paint on top. Only positive
          halves get a visible spine; the negative half is implied by the
          hollow disc on the opposite side. */}
      {sorted.filter((a) => a.positive).map((a) => (
        <line
          key={`line-${a.axis}`}
          x1={cx}
          y1={cy}
          x2={cx + a.x}
          y2={cy + a.y}
          stroke={a.color}
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}

      {/* Tip discs — positive axes are solid w/ a label letter, negative
          axes are hollow + dimmer so the user can still read direction
          but immediately knows which one is the "named" end. */}
      {sorted.map((a) => {
        const fill = a.positive ? a.color : 'transparent';
        const stroke = a.color;
        const x = cx + a.x;
        const y = cy + a.y;
        const interactive = !!onAxisClick;
        return (
          <g
            key={`tip-${a.axis}`}
            onClick={interactive ? handleClick(a.axis) : undefined}
            style={{
              cursor: interactive ? 'pointer' : 'default',
              pointerEvents: interactive ? 'auto' : 'none',
            }}
          >
            <circle
              cx={x}
              cy={y}
              r={TIP}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.6}
              opacity={a.positive ? 1 : 0.85}
            />
            {a.positive && (
              <text
                x={x}
                y={y + 3.2}
                textAnchor="middle"
                fontSize={9}
                fontWeight={700}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill="#fff"
              >
                {a.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── tiny vector helpers (local — gizmo is a leaf, no math dep) ───────

function sub(a: CameraVec3, b: CameraVec3): CameraVec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a: CameraVec3, b: CameraVec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: CameraVec3, b: CameraVec3): CameraVec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function normalize(v: CameraVec3): CameraVec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}
