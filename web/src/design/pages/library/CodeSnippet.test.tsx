import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CodeSnippet } from './CodeSnippet';

vi.mock('../../GlslHighlight', () => ({
  GlslHighlight: ({ source }: { source: string }) => <span data-testid="glsl">{source}</span>,
}));

describe('library/CodeSnippet', () => {
  it('renders the source text verbatim inside a <pre>', () => {
    const src = 'float sdCircle(vec2 p, float r) { return length(p) - r; }';
    const { container } = render(<CodeSnippet lang="ts" source={src} />);
    expect(container.querySelector('pre')?.textContent).toBe(src);
  });

  it('shows the lang tag and a caption when given', () => {
    const { container, getByText } = render(
      <CodeSnippet lang="glsl" source="x" caption="iq's smin" />,
    );
    expect(container.querySelector('figcaption')?.textContent).toBe("iq's smin");
    expect(getByText('glsl')).toBeTruthy();
  });

  it('delegates GLSL to the highlighter', () => {
    const { getByTestId } = render(<CodeSnippet lang="glsl" source="vec3 c;" />);
    expect(getByTestId('glsl').textContent).toBe('vec3 c;');
  });

  it('matches a stable snapshot', () => {
    const { container } = render(<CodeSnippet lang="ts" source="const a = 1;" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
