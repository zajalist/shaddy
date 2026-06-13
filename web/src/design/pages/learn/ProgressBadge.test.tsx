import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressBadge } from './ProgressBadge';

describe('ProgressBadge', () => {
  it('renders "N of 8 lessons complete" for a partial count', () => {
    render(<ProgressBadge done={3} total={8} variant="bar" />);
    expect(screen.getByText('3 of 8 lessons complete')).not.toBeNull();
  });

  it('renders the all-done copy when done >= total', () => {
    render(<ProgressBadge done={8} total={8} variant="bar" />);
    expect(screen.getByText('All 8 done — replay any time')).not.toBeNull();
  });

  it('inline variant renders the label without a bar track', () => {
    const { container } = render(<ProgressBadge done={2} total={8} variant="inline" />);
    expect(screen.getByText('2 of 8 lessons complete')).not.toBeNull();
    // inline is a single <span>, no nested track div
    expect(container.querySelectorAll('div').length).toBe(0);
  });

  it('bar fill width is proportional to progress', () => {
    const { container } = render(<ProgressBadge done={2} total={8} variant="bar" />);
    // wrap > track > fill — the fill is the deepest div and carries the width.
    const fill = container.querySelector('div > div > div > div') as HTMLElement;
    expect(fill.getAttribute('style')).toContain('width: 25%');
  });

  it('has no box-shadow on any element (flat-design requirement)', () => {
    const { container } = render(<ProgressBadge done={4} total={8} variant="bar" />);
    container.querySelectorAll('*').forEach((el) => {
      const bs = (el as HTMLElement).style.boxShadow;
      expect(bs === '' || bs === 'none').toBe(true);
    });
  });
});
