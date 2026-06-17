// /cookies — Cookie Policy.

import { LegalLayout, H, P, UL, LI, Mail, CONTACT_EMAIL } from './legal/LegalLayout';

export const Cookies = () => (
  <LegalLayout eyebrow="Legal" title="Cookie Policy" updated="16 June 2026">
    <P>
      This Cookie Policy explains how Shaddy uses cookies and similar
      browser-storage technologies. We use as few as possible &mdash; Shaddy
      runs without advertising or cross-site tracking cookies.
    </P>

    <H>What we store</H>
    <UL>
      <LI><b>Essential storage.</b> Local storage and cookies that keep you
        signed in and remember in-app preferences such as your last workspace
        and learning progress. The product cannot function without these.</LI>
      <LI><b>Authentication.</b> Our sign-in provider sets secure cookies and
        tokens needed to establish and maintain your session.</LI>
    </UL>
    <P>
      We do not use advertising cookies, and we do not sell data gathered through
      browser storage.
    </P>

    <H>Managing cookies</H>
    <P>
      You can clear or block cookies and local storage through your browser
      settings at any time. Note that disabling essential storage will sign you
      out and prevent saved work from loading.
    </P>

    <H>Changes</H>
    <P>
      We will update this page if our use of cookies changes. The
      &ldquo;last updated&rdquo; date above reflects the current version.
    </P>

    <H>Contact</H>
    <P>Questions about cookies? Email <Mail addr={CONTACT_EMAIL} />.</P>
  </LegalLayout>
);

export default Cookies;
