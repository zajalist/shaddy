import { SHADE, TYPE } from '../tokens';

// ─── FAQ ────────────────────────────────────────────────────────────────
export const FAQ = () => {
  const items = [
    { q: 'Is the output real GLSL?', a: "Yes. Real GLSL ES fragment source, no Shaddy wrapper around it. Paste it into Shadertoy, Bonzomatic, or your own WebGL pipeline and it runs." },
    { q: 'Do I need to know shader math?', a: "Not at all. Most people start by snapping blocks until something pretty happens, then read the code drawer to figure out which line did what. The blocks teach the maths by sitting next to it." },
    { q: 'Does it run on mobile?', a: "Yep. Palette and properties slide up as bottom sheets so the canvas stays the hero. I tested on a four-year-old phone — still 60 fps for most recipes." },
    { q: 'Will I get a fast GPU on my laptop?', a: "Almost certainly. Any laptop made since 2018 has a usable GPU and Shaddy renders through WebGL 2. The mobile path downscales the drawing buffer when the framerate drops; the desktop path renders at full devicePixelRatio." },
    { q: 'Can I import existing shaders?', a: "Paste GLSL into the Ask Claude panel and the AI pulls out the blocks it recognises. It won't always be a clean round-trip — but you get a starting chain to edit, which is the hard part." },
    { q: 'How do I get the GLSL out?', a: "Copy from the code drawer. The output is real GLSL ES 3.0 fragment source — paste it into Shadertoy or your own WebGL pipeline and it runs. The drawer is read-write: edit the code, the Ask Claude panel translates the edits back into cards." },
    { q: 'Is the code open source?', a: "MIT-licensed on GitHub. Renderer, card library, AI import — same repo, no proprietary bits hiding anywhere." },
  ];
  return (
    <div style={{ maxWidth: 720, margin: '3rem auto 0', display: 'flex', flexDirection: 'column' }}>
      {items.map((item, i) => (
        <details
          key={i}
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '20px 0',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              font: `600 17px ${TYPE.display}`,
              color: SHADE.cream,
              letterSpacing: TYPE.trackTight,
              listStyle: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              outline: 'none',
            }}
          >
            {item.q}
            <span style={{ font: `500 14px ${TYPE.bodyMono}`, color: SHADE.gold }}>+</span>
          </summary>
          <p
            style={{
              margin: '14px 0 0',
              font: `400 14.5px ${TYPE.body}`,
              color: 'rgba(232,226,212,0.65)', lineHeight: 1.65,
            }}
          >
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
};
