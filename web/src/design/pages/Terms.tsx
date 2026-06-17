// /terms — Terms of Service.

import { LegalLayout, H, P, UL, LI, Mail, CONTACT_EMAIL } from './legal/LegalLayout';

export const Terms = () => (
  <LegalLayout eyebrow="Legal" title="Terms of Service" updated="16 June 2026">
    <P>
      These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Shaddy, the
      website and web application at shaddy.net. By using Shaddy, you agree to
      these Terms. If you do not agree, please do not use the service.
    </P>

    <H>Using Shaddy</H>
    <UL>
      <LI>You may use Shaddy to create, edit, export, and share shaders for any
        lawful purpose.</LI>
      <LI>You are responsible for the content you create and publish, and for
        ensuring you have the rights to any material you import.</LI>
      <LI>You agree not to misuse the service &mdash; including attempting to
        disrupt it, access it through unauthorised means, or use it to distribute
        malicious or infringing content.</LI>
    </UL>

    <H>Your content</H>
    <P>
      You retain ownership of the shaders and other content you create. By
      publishing content to the public gallery, you grant other users permission
      to view it and grant us a limited licence to host and display it as part of
      operating the service. You can remove published content at any time.
    </P>

    <H>Open source</H>
    <P>
      The Shaddy editor, renderer, and card library are released under the MIT
      Licence. Your use of the source code is governed by that licence, available
      in the project repository.
    </P>

    <H>Availability and changes</H>
    <P>
      We work to keep Shaddy available and reliable, but the service is provided
      on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We may add,
      change, or discontinue features over time.
    </P>

    <H>Limitation of liability</H>
    <P>
      To the maximum extent permitted by law, Shaddy and its maintainers are not
      liable for any indirect, incidental, or consequential damages arising from
      your use of the service.
    </P>

    <H>Changes to these Terms</H>
    <P>
      We may update these Terms as the product evolves. Continued use after an
      update constitutes acceptance of the revised Terms. The
      &ldquo;last updated&rdquo; date above reflects the current version.
    </P>

    <H>Contact</H>
    <P>Questions about these Terms? Email <Mail addr={CONTACT_EMAIL} />.</P>
  </LegalLayout>
);

export default Terms;
