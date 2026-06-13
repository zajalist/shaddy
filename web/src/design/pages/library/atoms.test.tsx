import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { P, Inline, Strong, Table } from './atoms';

describe('library/atoms', () => {
  it('P renders a paragraph with its text', () => {
    const { container } = render(<P>runs once per pixel</P>);
    const p = container.querySelector('p');
    expect(p).not.toBeNull();
    expect(p?.textContent).toBe('runs once per pixel');
  });

  it('Inline renders a <code> element', () => {
    const { container } = render(<Inline>smoothstep</Inline>);
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe('smoothstep');
  });

  it('Strong renders a <strong> element', () => {
    const { container } = render(<Strong>signed distance field</Strong>);
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('signed distance field');
  });

  it('Table renders the head + every row/cell', () => {
    const { container } = render(
      <Table
        head={['lang', 'platform']}
        rows={[
          ['GLSL', 'WebGL'],
          ['HLSL', 'DirectX'],
        ]}
      />,
    );
    const ths = Array.from(container.querySelectorAll('th')).map((t) => t.textContent);
    expect(ths).toEqual(['lang', 'platform']);
    const cells = Array.from(container.querySelectorAll('td')).map((t) => t.textContent);
    expect(cells).toEqual(['GLSL', 'WebGL', 'HLSL', 'DirectX']);
  });
});
