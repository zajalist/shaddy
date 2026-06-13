// Hero strip — warm cream band with the mascot + "Hi, I'm Shaddy" + Start CTA.
//
// Extracted from Learn.tsx (06-learn-ui.md task 5). The inline progress meter
// is replaced by <ProgressBadge variant="bar">; the CTA drops the hover
// box-shadow lift (it uses the flat .learn-cta class which now shifts
// background + presses 1px only).

import type { CSSProperties } from 'react';

import { SHADE, TYPE } from '../../tokens';
import { useIsMobile } from '../../useIsMobile';
import { Mascot } from './Mascot';
import { ProgressBadge } from './ProgressBadge';
import { SpeechBubble } from './SpeechBubble';

export type LearnHeroProps = {
  onStart: () => void;
  startedAlready: boolean;
  doneCount: number;
  totalCount: number;
  allDone: boolean;
};

export const LearnHero = ({
  onStart,
  startedAlready,
  doneCount,
  totalCount,
  allDone,
}: LearnHeroProps) => {
  const isMobile = useIsMobile();
  return (
    <section style={heroStyle}>
      <div style={{
        ...heroInnerStyle,
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto',
        gap: isMobile ? 28 : 48,
      }}>
        <div style={heroLeftStyle}>
          <span style={eyebrowStyle}>Learn GPU shaders</span>
          <h1 style={{ ...heroTitleStyle, font: isMobile ? `700 34px/1.04 ${TYPE.display}` : heroTitleStyle.font }}>
            Hi, I&rsquo;m <span style={{ color: SHADE.goldDeep }}>Shaddy</span>.<br />
            Let&rsquo;s write a shader together.
          </h1>
          <p style={{ ...heroLeadStyle, font: isMobile ? `400 15px/1.5 ${TYPE.body}` : heroLeadStyle.font }}>
            Eight tiny lessons. You change one line, I cheer when the picture
            changes. No install, no signup. The first lesson takes about a
            minute &mdash; quicker than reading this paragraph.
          </p>
          <div style={heroCtaRowStyle}>
            <button type="button" onClick={onStart} className="learn-cta" style={primaryCtaStyle}>
              {allDone ? 'Replay from lesson 1' : startedAlready ? 'Continue' : 'Start lesson 1'}
            </button>
            <ProgressBadge done={doneCount} total={totalCount} variant="bar" />
          </div>
        </div>
        {!isMobile && (
          <div style={heroMascotStyle}>
            <Mascot mood="cheering" size={300} />
            <div style={heroBubbleStyle}>
              <SpeechBubble tone="neutral" tail="left">
                Ready? Honestly easier than I made it sound.
              </SpeechBubble>
            </div>
          </div>
        )}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <Mascot mood="cheering" size={200} />
          </div>
        )}
      </div>
    </section>
  );
};

// ─── styles ────────────────────────────────────────────────────────────────

const heroStyle: CSSProperties = {
  background: `linear-gradient(180deg, ${SHADE.surface1} 0%, ${SHADE.bg} 100%)`,
  borderBottom: `1.5px solid ${SHADE.inkLine}`,
  padding: 'clamp(36px, 7vw, 64px) clamp(16px, 4vw, 24px) clamp(40px, 8vw, 72px)',
};

const heroInnerStyle: CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 48,
};

const heroLeftStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  animation: 'learnFadeUp 420ms cubic-bezier(0.2, 1.0, 0.3, 1) both',
};

const eyebrowStyle: CSSProperties = {
  font: `700 12px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackEyebrow,
  textTransform: 'uppercase',
  color: SHADE.textDim,
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  font: `700 52px/1.04 ${TYPE.display}`,
  letterSpacing: TYPE.trackTighter,
  color: SHADE.text,
};

const heroLeadStyle: CSSProperties = {
  margin: '4px 0 0',
  maxWidth: 560,
  font: `400 18px/1.5 ${TYPE.body}`,
  color: SHADE.textDim,
};

const heroCtaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 20,
  marginTop: 14,
  flexWrap: 'wrap',
};

const primaryCtaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 52,
  padding: '0 28px',
  borderRadius: 12,
  border: `1.5px solid ${SHADE.inkLine}`,
  background: SHADE.gold,
  color: SHADE.inkLine,
  font: `700 17px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackTight,
  cursor: 'pointer',
};

const heroMascotStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 12,
};

const heroBubbleStyle: CSSProperties = {
  maxWidth: 260,
};
