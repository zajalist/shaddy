import { SHADE } from '../tokens';

// ─── Section separator — chunky filled diamond between sections ─────────
export const SectionSeparator = () => (
  <div
    aria-hidden
    style={{
      maxWidth: 880, margin: '0 auto',
      padding: '0 2rem',
      display: 'flex', alignItems: 'center', gap: 18,
      opacity: 0.85,
    }}
  >
    <span
      style={{
        flex: 1, height: 1,
        background:
          `linear-gradient(90deg, rgba(252,180,39,0) 0%, ${SHADE.gold} 22%, ${SHADE.goldDeep} 78%, rgba(150,107,23,0) 100%)`,
      }}
    />
    {/* chunky filled-diamond motif with a soft halo so it pops on either bg */}
    <span
      style={{
        position: 'relative',
        width: 18, height: 18,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <span
        style={{
          position: 'absolute', inset: -6,
          background: `radial-gradient(circle, ${SHADE.gold}30 0%, transparent 70%)`,
          borderRadius: '50%',
        }}
      />
      <span
        style={{
          position: 'relative',
          width: 10, height: 10,
          background: SHADE.gold,
          border: `1px solid ${SHADE.goldDeep}`,
          transform: 'rotate(45deg)',
          boxShadow: `0 1px 0 ${SHADE.cream}40 inset, 0 2px 4px rgba(0,0,0,0.45)`,
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute', left: 0, top: '50%', width: 200, height: 1,
          background: `linear-gradient(90deg, ${SHADE.gold}80 0%, transparent 100%)`,
          transformOrigin: 'left center',
          opacity: 0.15,
        }}
      />
    </span>
    <span
      style={{
        flex: 1, height: 1,
        background:
          `linear-gradient(90deg, rgba(150,107,23,0) 0%, ${SHADE.goldDeep} 22%, ${SHADE.gold} 78%, rgba(252,180,39,0) 100%)`,
      }}
    />
  </div>
);
