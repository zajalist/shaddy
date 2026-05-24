// Learn-page mascot — thin wrapper around the real animated <Mascot/>
// component from @/ux/Mascot. The earlier version drew custom eye + mouth
// overlays on top of the static <ShadeMascot/> SVG and looked off-model;
// this just maps the lesson moods onto the real one's 4 base moods.

import type { CSSProperties } from 'react';
import { Mascot as UxMascot } from '@/ux/Mascot';
import type { MascotMood as UxMood } from '@/ux/Mascot';

// Lesson narrative uses 5 expressive labels; the real mascot has 4 base
// moods. Map: cheering → happy, pointing → neutral, sad → sleeping (sloped
// posture reads as "down"), idle / thinking pass through.
export type MascotMood = 'idle' | 'thinking' | 'pointing' | 'cheering' | 'sad';

const LESSON_TO_UX: Record<MascotMood, UxMood> = {
  idle: 'neutral',
  thinking: 'thinking',
  pointing: 'neutral',
  cheering: 'happy',
  sad: 'sleeping',
};

export type MascotProps = {
  mood: MascotMood;
  size?: number;
  paused?: boolean;
  style?: CSSProperties;
};

export const Mascot = ({ mood, size = 220, style }: MascotProps) => (
  <div style={{ display: 'inline-block', ...style }}>
    <UxMascot
      mood={LESSON_TO_UX[mood]}
      size={size}
      idle
      eyesFollow
      hoverReact
      clickReact
    />
  </div>
);
