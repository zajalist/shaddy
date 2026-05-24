import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { CATEGORIES, SHADE, TYPE } from './tokens';
import type { BlockDef } from './tokens';
import { Icon } from './icons';
import { SliderRail } from './components';
import {
  PARAM_GROUP_LABEL,
  initialActiveParams,
  paramPoolFor,
} from './params';
import type { ParamDef, ParamInstance } from './params';

export type BlockEditorProps = {
  block: BlockDef;
  active: ParamInstance[];
  onChange: (next: ParamInstance[]) => void;
  onClose: () => void;
};

export const BlockEditor = ({ block, active, onChange, onClose }: BlockEditorProps) => {
  const pool = paramPoolFor(block.id, block.cat);
  const cat = CATEGORIES[block.cat];

  const activeIds = useMemo(() => new Set(active.map((p) => p.id)), [active]);
  const available = useMemo(
    () =>
      Object.values(pool.defs).filter((d) => !activeIds.has(d.id)),
    [pool, activeIds],
  );

  // Group available params for the palette
  const availableByGroup = useMemo(() => {
    const m = new Map<NonNullable<ParamDef['group']>, ParamDef[]>();
    for (const d of available) {
      const g = d.group ?? 'core';
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(d);
    }
    return Array.from(m.entries());
  }, [available]);

  const setVal = (id: string, value: number) =>
    onChange(active.map((p) => (p.id === id ? { ...p, value } : p)));
  const toggleAnim = (id: string) =>
    onChange(active.map((p) => (p.id === id ? { ...p, animated: !p.animated } : p)));
  const removeParam = (id: string) =>
    onChange(active.filter((p) => p.id !== id));
  const addParam = (def: ParamDef) =>
    onChange([...active, { id: def.id, value: def.defaultValue, animated: false }]);
  const resetAll = () => onChange(initialActiveParams(block.id, block.cat));

  return (
    <div
      role="dialog"
      aria-label={`Edit ${block.name}`}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(15, 18, 26, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32, zIndex: 30,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(920px, 96%)', maxHeight: '92%',
          background: SHADE.bg,
          border: `1px solid ${SHADE.inkLine}`,
          borderRadius: 4,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${SHADE.border}`,
            background: SHADE.surface2,
            display: 'flex', alignItems: 'center', gap: 14,
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: cat.color }} />
          <div
            style={{
              width: 42, height: 42, borderRadius: 4,
              background: `${cat.color}1c`, border: `1px solid ${cat.color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name={block.icon} size={22} color={cat.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: `700 20px ${TYPE.display}`, color: SHADE.text, letterSpacing: TYPE.trackTight }}>
              {block.name.charAt(0)}{block.name.slice(1).toLowerCase()}
            </div>
            <div
              style={{
                font: `600 10px ${TYPE.bodyMono}`, color: SHADE.textDim,
                letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4,
              }}
            >
              {cat.label} · {active.length} active · {available.length} more available
            </div>
          </div>
          <button
            onClick={resetAll}
            style={{
              padding: '7px 12px', borderRadius: 3,
              background: 'transparent', border: `1px solid ${SHADE.border}`,
              color: SHADE.textDim, cursor: 'pointer',
              font: `500 11px ${TYPE.bodyMono}`,
              letterSpacing: '0.10em', textTransform: 'uppercase',
            }}
          >
            Reset
          </button>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 3,
              background: 'transparent', border: `1px solid ${SHADE.border}`,
              color: SHADE.textDim, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="close" size={14} color={SHADE.textDim} />
          </button>
        </div>

        {/* Body — two columns */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr',
            flex: 1, minHeight: 0,
          }}
        >
          {/* Active params */}
          <div
            style={{
              borderRight: `1px solid ${SHADE.border}`,
              padding: '16px 20px 20px',
              display: 'flex', flexDirection: 'column', gap: 16,
              overflow: 'auto', minHeight: 0,
            }}
          >
            <SectionEyebrow>Active params</SectionEyebrow>
            {active.length === 0 ? (
              <Empty>
                No params yet. Add some from the palette →
              </Empty>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {active.map((p) => {
                  const def = pool.defs[p.id];
                  if (!def) return null;
                  return (
                    <ActiveParamRow
                      key={p.id}
                      def={def}
                      value={p.value}
                      animated={p.animated}
                      onChange={(v) => setVal(p.id, v)}
                      onToggleAnim={def.animatable ? () => toggleAnim(p.id) : undefined}
                      onRemove={() => removeParam(p.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Available palette */}
          <div
            style={{
              padding: '16px 20px 20px', background: SHADE.surface2,
              display: 'flex', flexDirection: 'column', gap: 14,
              overflow: 'auto', minHeight: 0,
            }}
          >
            <SectionEyebrow>Add parameter</SectionEyebrow>
            {availableByGroup.length === 0 ? (
              <Empty>All parameters added.</Empty>
            ) : (
              availableByGroup.map(([group, defs]) => (
                <div key={group}>
                  <div
                    style={{
                      font: `600 9.5px ${TYPE.bodyMono}`, color: SHADE.textFaint,
                      letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8,
                    }}
                  >
                    {PARAM_GROUP_LABEL[group]}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {defs.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => addParam(d)}
                        style={{
                          padding: '6px 10px 6px 8px',
                          borderRadius: 3,
                          background: SHADE.surface1,
                          border: `1px solid ${SHADE.border}`,
                          color: SHADE.text,
                          font: `500 11.5px ${TYPE.body}`,
                          letterSpacing: '0.02em',
                          cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 14, height: 14, borderRadius: 2,
                            border: `1px solid ${SHADE.inkLine}`,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Icon name="plus" size={9} color={SHADE.inkLine} />
                        </span>
                        {d.label}
                        {d.animatable && (
                          <span style={{ font: `500 8.5px ${TYPE.bodyMono}`, color: SHADE.textDim, letterSpacing: '0.18em' }}>
                            ✦
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${SHADE.border}`,
            background: SHADE.surface2,
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <span style={{ font: `500 10.5px ${TYPE.bodyMono}`, color: SHADE.textFaint, letterSpacing: '0.18em' }}>
            DOUBLE-CLICK ANY BLOCK TO EDIT
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              padding: '8px 18px', borderRadius: 3,
              background: SHADE.inkLine, color: SHADE.surface1,
              border: 'none', cursor: 'pointer',
              font: `600 11.5px ${TYPE.body}`,
              letterSpacing: '0.10em', textTransform: 'uppercase',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionEyebrow = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      font: `700 10px ${TYPE.bodyMono}`,
      color: SHADE.textDim, letterSpacing: '0.22em', textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
);

const Empty = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      padding: '24px 16px',
      border: `1px dashed ${SHADE.border}`,
      borderRadius: 4,
      color: SHADE.textDim,
      font: `500 12px ${TYPE.body}`,
      letterSpacing: '0.01em',
      textAlign: 'center',
    }}
  >
    {children}
  </div>
);

const ActiveParamRow = ({
  def, value, animated, onChange, onToggleAnim, onRemove,
}: {
  def: ParamDef;
  value: number;
  animated: boolean;
  onChange: (v: number) => void;
  onToggleAnim?: () => void;
  onRemove: () => void;
}) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
      <span
        style={{
          font: `700 11px ${TYPE.body}`,
          color: SHADE.text, letterSpacing: '0.10em', textTransform: 'uppercase',
        }}
      >
        {def.label}
      </span>
      <span
        style={{
          marginLeft: 'auto',
          font: `500 13px ${TYPE.bodyMono}`,
          color: animated ? SHADE.ember : SHADE.text,
        }}
      >
        {value.toFixed(3)}{def.unit ?? ''}
      </span>
    </div>
    <SliderRail value={value} animated={animated} onChange={onChange} height={6} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      {onToggleAnim ? (
        <button
          onClick={onToggleAnim}
          style={{
            padding: '4px 10px', borderRadius: 3,
            background: animated ? SHADE.ember : 'transparent',
            color: animated ? '#fff' : SHADE.textDim,
            border: `1px solid ${animated ? SHADE.ember : SHADE.border}`,
            font: `600 10px ${TYPE.bodyMono}`,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {animated ? 'Animating' : 'Animate'}
        </button>
      ) : (
        <span
          style={{
            font: `500 9px ${TYPE.bodyMono}`, color: SHADE.textFaint,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}
        >
          static
        </span>
      )}
      <span style={{ flex: 1 }} />
      <button
        onClick={onRemove}
        title="Remove parameter"
        style={{
          padding: '4px 9px', borderRadius: 3,
          background: 'transparent', color: SHADE.textDim,
          border: `1px solid ${SHADE.border}`, cursor: 'pointer',
          font: `500 10px ${TYPE.bodyMono}`,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}
      >
        <Icon name="close" size={10} color={SHADE.textDim} />
        Remove
      </button>
    </div>
  </div>
);
