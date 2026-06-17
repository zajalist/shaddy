// /contact — how to reach the Shaddy team.

import { LegalLayout, H, P, UL, LI, Mail, CONTACT_EMAIL } from './legal/LegalLayout';

export const Contact = () => (
  <LegalLayout eyebrow="Get in touch" title="Contact" updated="16 June 2026">
    <P>
      We&apos;d love to hear from you &mdash; whether you&apos;ve found a bug, have
      a feature idea, want to report a problem, or just want to share what you
      built with Shaddy.
    </P>

    <H>Email</H>
    <P>
      The fastest way to reach us is by email at <Mail addr={CONTACT_EMAIL} />.
      We read every message.
    </P>

    <H>What to include</H>
    <UL>
      <LI><b>Bug reports:</b> what you did, what you expected, and what happened
        &mdash; plus your browser and device if you can.</LI>
      <LI><b>Feature requests:</b> the problem you&apos;re trying to solve, not
        just the solution you have in mind.</LI>
      <LI><b>Privacy or legal questions:</b> reference the relevant policy so we
        can route it quickly.</LI>
    </UL>

    <H>Open source</H>
    <P>
      Shaddy is open source. If you prefer, you can open an issue or pull request
      in the project repository &mdash; contributions are welcome.
    </P>
  </LegalLayout>
);

export default Contact;
