// /privacy — Privacy Policy.

import { LegalLayout, H, P, UL, LI, Mail, CONTACT_EMAIL } from './legal/LegalLayout';

export const Privacy = () => (
  <LegalLayout eyebrow="Legal" title="Privacy Policy" updated="16 June 2026">
    <P>
      This Privacy Policy explains what information Shaddy (&ldquo;Shaddy&rdquo;,
      &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects when you use the website and
      web application at shaddy.net, why we collect it, and the choices you have.
      We keep data collection to the minimum needed to run the product.
    </P>

    <H>Information we collect</H>
    <UL>
      <LI><b>Account information.</b> If you sign in, our authentication provider
        stores your email address and basic profile details from the provider you
        chose (Google or GitHub). We do not receive or store your password.</LI>
      <LI><b>Content you create.</b> Shader recipes you choose to save or publish,
        along with their titles and any metadata you add.</LI>
      <LI><b>Technical data.</b> Standard server and device information such as
        browser type, approximate region, and error diagnostics, used to keep the
        service reliable and secure.</LI>
    </UL>
    <P>
      Most of Shaddy works entirely in your browser. Recipes you build are kept
      locally and are only sent to our servers when you explicitly save or publish
      them.
    </P>

    <H>How we use information</H>
    <UL>
      <LI>To provide and maintain the editor, gallery, and your account.</LI>
      <LI>To operate sign-in and keep your saved work associated with you.</LI>
      <LI>To diagnose problems, prevent abuse, and improve performance.</LI>
    </UL>
    <P>We do not sell your personal information, and we do not use it for
      third-party advertising.</P>

    <H>Service providers</H>
    <P>
      We rely on a small number of trusted providers to operate Shaddy &mdash;
      including hosting, authentication, and database services. These providers
      process data only on our behalf and under their own security and privacy
      commitments.
    </P>

    <H>Data retention</H>
    <P>
      We retain account and content data for as long as your account is active.
      You may delete your saved content at any time, and you can request deletion
      of your account and associated personal data by contacting us.
    </P>

    <H>Your rights</H>
    <P>
      Depending on where you live, you may have the right to access, correct,
      export, or delete your personal data. To exercise any of these rights,
      email us at <Mail addr={CONTACT_EMAIL} />.
    </P>

    <H>Children</H>
    <P>
      Shaddy is designed to be approachable for young learners. We do not
      knowingly collect more personal information from children than is necessary
      to provide the service, and accounts for minors should be created with the
      involvement of a parent or guardian.
    </P>

    <H>Changes to this policy</H>
    <P>
      We may update this policy as the product evolves. Material changes will be
      reflected by the &ldquo;last updated&rdquo; date above.
    </P>

    <H>Contact</H>
    <P>Questions about privacy? Reach us at <Mail addr={CONTACT_EMAIL} />.</P>
  </LegalLayout>
);

export default Privacy;
