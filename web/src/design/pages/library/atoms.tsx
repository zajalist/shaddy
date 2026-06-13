// atoms — the tiny styled prose primitives used inside every Library
// article body: a paragraph, inline code, bold, and a data table.
//
// Extracted verbatim from Library.tsx (same DOM, same text) and re-skinned
// through the shared style layer so the card recipe stays consistent.

import type { ReactNode } from 'react';
import { SHADE, TYPE } from '../../tokens';
import { inkCard, LIB_TYPE, BLOCK_GAP } from './style';

export const P = ({ children }: { children: ReactNode }) => (
  <p style={{ margin: '0 0 14px', color: SHADE.text, lineHeight: 1.7 }}>{children}</p>
);

export const Inline = ({ children }: { children: ReactNode }) => (
  <code
    style={{
      fontFamily: TYPE.bodyMono,
      fontSize: '0.92em',
      background: SHADE.surface3,
      color: SHADE.text,
      padding: '1px 6px',
      borderRadius: 4,
      border: `1px solid ${SHADE.border}`,
    }}
  >
    {children}
  </code>
);

export const Strong = ({ children }: { children: ReactNode }) => (
  <strong style={{ color: SHADE.text, fontWeight: 700 }}>{children}</strong>
);

export const Table = ({ head, rows }: { head: string[]; rows: string[][] }) => (
  <div style={inkCard({ margin: `${BLOCK_GAP}px 0`, overflow: 'hidden' })}>
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: TYPE.body,
        fontSize: LIB_TYPE.bodySm.fontSize,
      }}
    >
      <thead>
        <tr style={{ background: SHADE.surface2 }}>
          {head.map((h) => (
            <th
              key={h}
              style={{
                padding: '10px 12px',
                textAlign: 'left',
                fontFamily: TYPE.bodyMono,
                fontSize: 10.5,
                fontWeight: 700,
                color: SHADE.textDim,
                letterSpacing: TYPE.trackEyebrow,
                textTransform: 'uppercase',
                borderBottom: `1.5px solid ${SHADE.inkLine}`,
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? SHADE.surface1 : SHADE.surface2 }}>
            {row.map((cell, j) => (
              <td
                key={j}
                style={{
                  padding: '8px 12px',
                  color: SHADE.text,
                  borderTop: i === 0 ? 'none' : `1px dashed ${SHADE.border}`,
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
