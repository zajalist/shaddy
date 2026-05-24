import { useState, type ReactNode } from 'react';
import { Mascot, type MascotMood } from './Mascot';

const MOODS: MascotMood[] = ['neutral', 'happy', 'thinking', 'sleeping'];

export function MascotDemo() {
  const [mood, setMood] = useState<MascotMood>('neutral');
  const [size, setSize] = useState(260);
  const [idle, setIdle] = useState(true);
  const [eyesFollow, setEyesFollow] = useState(true);
  const [hoverReact, setHoverReact] = useState(true);
  const [clickReact, setClickReact] = useState(true);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1a1a1a',
        color: '#f4f4f4',
        fontFamily: 'system-ui, sans-serif',
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '32px',
        padding: '32px',
      }}
    >
      <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <header>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Mascot demo</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.6, fontSize: '13px' }}>
            Drop-in animated SVG with mood states.
          </p>
        </header>

        <section>
          <Label>Mood</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: `1px solid ${mood === m ? '#FCB427' : '#3a3a3a'}`,
                  background: mood === m ? '#FCB427' : 'transparent',
                  color: mood === m ? '#1a1a1a' : '#f4f4f4',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <section>
          <Label>Size: {size}px</Label>
          <input
            type="range"
            min={120}
            max={520}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </section>

        <section>
          <Label>Interactions</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Toggle checked={idle} onChange={setIdle} label="Idle bob + blink" />
            <Toggle checked={eyesFollow} onChange={setEyesFollow} label="Eyes follow cursor" />
            <Toggle checked={hoverReact} onChange={setHoverReact} label="Hover reaction" />
            <Toggle checked={clickReact} onChange={setClickReact} label="Click bounce" />
          </div>
        </section>

        <section style={{ fontSize: '12px', opacity: 0.5, lineHeight: 1.5 }}>
          <p style={{ margin: 0 }}>
            Move your mouse around. Hover the mascot. Click it. Try every mood.
          </p>
        </section>
      </aside>

      <main
        style={{
          display: 'grid',
          placeItems: 'center',
          background: 'radial-gradient(circle at 50% 40%, #2a2a2a 0%, #141414 70%)',
          borderRadius: '24px',
          minHeight: '500px',
        }}
      >
        <Mascot
          mood={mood}
          size={size}
          idle={idle}
          eyesFollow={eyesFollow}
          hoverReact={hoverReact}
          clickReact={clickReact}
        />
      </main>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        opacity: 0.55,
        marginBottom: '10px',
      }}
    >
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: '#FCB427' }}
      />
      {label}
    </label>
  );
}
