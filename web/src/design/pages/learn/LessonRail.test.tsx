import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LessonRail } from './LessonRail';
import { LESSONS } from './lessons';

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

const noop = () => {};

beforeEach(() => {
  setViewport(1200); // desktop by default
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LessonRail (desktop)', () => {
  it('renders one pill per lesson', () => {
    render(
      <LessonRail lessons={LESSONS} activeIdx={0} done={new Set()} onSelect={noop} onResetProgress={noop} />,
    );
    LESSONS.forEach((l) => {
      expect(screen.getByTitle(l.title)).not.toBeNull();
    });
  });

  it('marks the active pill via aria-current', () => {
    render(
      <LessonRail lessons={LESSONS} activeIdx={2} done={new Set()} onSelect={noop} onResetProgress={noop} />,
    );
    const active = screen.getByTitle(LESSONS[2]!.title);
    expect(active.getAttribute('aria-current')).toBe('step');
  });

  it('shows a ✓ on done pills', () => {
    const done = new Set([LESSONS[0]!.id]);
    render(
      <LessonRail lessons={LESSONS} activeIdx={1} done={done} onSelect={noop} onResetProgress={noop} />,
    );
    expect(screen.getByTitle(LESSONS[0]!.title).textContent).toContain('✓');
  });

  it('clicking a pill calls onSelect with its index', () => {
    const onSelect = vi.fn();
    render(
      <LessonRail lessons={LESSONS} activeIdx={0} done={new Set()} onSelect={onSelect} onResetProgress={noop} />,
    );
    fireEvent.click(screen.getByTitle(LESSONS[3]!.title));
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('reset calls onResetProgress', () => {
    const onResetProgress = vi.fn();
    render(
      <LessonRail lessons={LESSONS} activeIdx={0} done={new Set()} onSelect={noop} onResetProgress={onResetProgress} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(onResetProgress).toHaveBeenCalled();
  });
});

describe('LessonRail (mobile stepper)', () => {
  beforeEach(() => {
    setViewport(400);
  });

  it('renders the ‹ Lesson N / 8 › stepper', () => {
    render(
      <LessonRail lessons={LESSONS} activeIdx={2} done={new Set()} onSelect={noop} onResetProgress={noop} />,
    );
    expect(screen.getByText(/Lesson/)).not.toBeNull();
    // active is idx 2 → "Lesson 3 / 8"
    const label = screen.getByText(/Lesson/).textContent ?? '';
    expect(label.replace(/\s+/g, ' ')).toContain('Lesson 3 / 8');
  });

  it('arrows call onSelect with the neighbour index', () => {
    const onSelect = vi.fn();
    render(
      <LessonRail lessons={LESSONS} activeIdx={2} done={new Set()} onSelect={onSelect} onResetProgress={noop} />,
    );
    fireEvent.click(screen.getByLabelText('Next lesson'));
    expect(onSelect).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByLabelText('Previous lesson'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('disables previous at the first lesson and next at the last', () => {
    const { rerender } = render(
      <LessonRail lessons={LESSONS} activeIdx={0} done={new Set()} onSelect={noop} onResetProgress={noop} />,
    );
    expect((screen.getByLabelText('Previous lesson') as HTMLButtonElement).disabled).toBe(true);

    rerender(
      <LessonRail lessons={LESSONS} activeIdx={LESSONS.length - 1} done={new Set()} onSelect={noop} onResetProgress={noop} />,
    );
    expect((screen.getByLabelText('Next lesson') as HTMLButtonElement).disabled).toBe(true);
  });
});
