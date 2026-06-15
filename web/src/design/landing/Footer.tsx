import type { ReactNode } from 'react';
import { SHADE, TYPE } from '../tokens';
import { ShadeLogo } from '../icons';
import { Starfield } from '../Starfield';
import { REPO_URL, ROUTES } from './constants';

// ─── Footer (hayba-style, starfield bg, 4 columns + brand row) ──────────
export const Footer = () => (
  <footer
    style={{
      position: 'relative', overflow: 'hidden',
      padding: '5rem 2rem 2.5rem',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      color: 'rgba(232,226,212,0.55)',
    }}
  >
    <Starfield opts={{ density: 0.18, maxR: 0.6, maxBase: 0.28, sparkMinMs: 6000, sparkMaxMs: 14000 }} />
    <div
      style={{
        maxWidth: 1180, margin: '0 auto', position: 'relative',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 32,
      }}
    >
      <FooterCol title="Product">
        <FooterLink href={ROUTES.composer}>Composer</FooterLink>
        <FooterLink href={ROUTES.gallery}>Gallery</FooterLink>
        <FooterLink href={ROUTES.library}>Library</FooterLink>
      </FooterCol>
      <FooterCol title="Learn">
        <FooterLink href={ROUTES.docs}>Docs</FooterLink>
        <FooterLink href={ROUTES.learn}>Tutorials</FooterLink>
        <FooterLink href={ROUTES.docs}>Shader basics</FooterLink>
      </FooterCol>
      <FooterCol title="Open source">
        <FooterLink href={REPO_URL} external>GitHub</FooterLink>
        <FooterLink href={`${REPO_URL}/issues`} external>Issues</FooterLink>
        <FooterLink href={`${REPO_URL}/blob/main/LICENSE`} external>License</FooterLink>
      </FooterCol>
      <FooterCol title="About">
        <FooterLink href={`${REPO_URL}/discussions`} external>Contact</FooterLink>
      </FooterCol>
    </div>
    <div
      style={{
        maxWidth: 1180, margin: '3rem auto 0', position: 'relative',
        paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}
    >
      <ShadeLogo size={20} />
      <span style={{ font: `700 12px ${TYPE.display}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: SHADE.topbarText }}>
        Shaddy
      </span>
      <span style={{ font: `400 12px ${TYPE.body}`, color: 'rgba(232,226,212,0.45)' }}>
        © 2026 · MIT licensed · Built so a 12-year-old can learn GPU programming.
      </span>
    </div>
  </footer>
);

export const FooterCol = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <h4 style={{ margin: 0, font: `700 10.5px ${TYPE.body}`, color: SHADE.topbarText, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
      {title}
    </h4>
    {children}
  </div>
);

export const FooterLink = ({ href, external, children }: { href: string; external?: boolean; children: ReactNode }) => (
  <a
    href={href}
    {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    style={{
      color: 'rgba(232,226,212,0.55)',
      textDecoration: 'none',
      font: `400 13px ${TYPE.body}`,
      letterSpacing: '0.01em',
    }}
  >
    {children}
  </a>
);
