import type { BlockVariant } from '../Block';
import { Block } from '../Block';
import { ShadeLogo } from '../icons';
import { ShadeCanvas } from '../ShadeCanvas';
import { Starfield } from '../Starfield';
import { SHADE, TYPE, blockById } from '../tokens';
import { useIsMobile } from '../useIsMobile';

// ─── Composer showcase (inline mock of the editor) ───────────────────────
export const ComposerShowcase = () => {
  const chain = [blockById('circle'), blockById('ripple'), blockById('palette')].filter(
    (b): b is NonNullable<typeof b> => b != null,
  );
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        maxWidth: 1180,
        margin: '4rem auto 0',
        marginInline: isMobile ? '1rem' : 'auto',
        background: SHADE.bg,
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 44,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: SHADE.topbar,
          color: SHADE.topbarText,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Starfield opts={{ density: 0.18, leftBias: 1.6 }} />
        <ShadeLogo size={18} />
        <span
          style={{
            font: `700 12px ${TYPE.display}`,
            letterSpacing: '0.16em',
            position: 'relative',
            zIndex: 1,
          }}
        >
          SHADDY
        </span>
        <span
          style={{
            font: `500 11px ${TYPE.bodyMono}`,
            color: SHADE.topbarText,
            letterSpacing: '0.08em',
            position: 'relative',
            zIndex: 1,
          }}
        >
          120 BPM
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '200px 1fr 240px',
          minHeight: isMobile ? 'auto' : 380,
        }}
      >
        {!isMobile && (
          <div
            style={{ background: SHADE.bg, borderRight: `1px solid ${SHADE.border}`, padding: 14 }}
          >
            <CategoryHeader color={SHADE.catShape} label="Shapes" />
            <CategoryHeader color={SHADE.catDistort} label="Distort" />
            <CategoryHeader color={SHADE.catColor} label="Colors" />
            <CategoryHeader color={SHADE.catEffect} label="Effects" />
          </div>
        )}
        <div
          style={{
            background: SHADE.bg,
            position: 'relative',
            padding: isMobile ? '20px 14px' : '30px 24px',
            backgroundImage: `
              linear-gradient(${SHADE.border} 1px, transparent 1px),
              linear-gradient(90deg, ${SHADE.border} 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            overflowX: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            {chain.map((b, i) => {
              const variant: BlockVariant = {
                left: i === 0 ? 'flat' : 'notch',
                right: i === chain.length - 1 ? 'flat' : 'tab',
              };
              return (
                <Block
                  key={i}
                  id={`comp-${i}`}
                  block={b}
                  variant={variant}
                  animated={b.id === 'ripple'}
                  selected={i === 1}
                />
              );
            })}
          </div>
        </div>
        <div style={{ background: SHADE.surface2, borderLeft: `1px solid ${SHADE.border}` }}>
          <div
            style={{
              margin: 14,
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${SHADE.inkLine}`,
              aspectRatio: '1 / 1',
              background: '#000',
            }}
          >
            <ShadeCanvas variant="ripple" />
          </div>
          <div style={{ padding: '0 14px 14px' }}>
            <div
              style={{
                font: `700 10px ${TYPE.body}`,
                color: SHADE.textDim,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Properties
            </div>
            <div style={{ font: `400 12px ${TYPE.body}`, color: SHADE.textDim, lineHeight: 1.5 }}>
              Ripple · 4 params · 1 animating
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CategoryHeader = ({ color, label }: { color: string; label: string }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      margin: '0 0 8px',
      padding: '6px 10px',
      background: `${color}12`,
      border: `1px solid ${color}38`,
      borderRadius: 3,
      font: `700 10.5px ${TYPE.body}`,
      color,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    }}
  >
    <span style={{ width: 16, height: 16, borderRadius: 2, background: color }} />
    {label}
  </div>
);
