// Integrations — OAuth.

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong, Callout, KvTable } from '../PageContent';
import { InlineCode as Code } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const CONFIG = `// web/src/auth/config.ts
export interface AuthConfig {
  issuer: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export const AUTH_CONFIG: AuthConfig = {
  issuer:      import.meta.env.VITE_OAUTH_ISSUER      ?? 'http://srv-dev-01',
  clientId:    import.meta.env.VITE_OAUTH_CLIENT_ID   ?? 'shaddy',
  redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI
               ?? \`\${window.location.origin}/auth/callback\`,
  scopes: (import.meta.env.VITE_OAUTH_SCOPES ?? 'openid profile email').split(' '),
};

export const AUTH_STORAGE_KEY    = 'shaddy.auth.v1';
export const PKCE_STORAGE_PREFIX = 'shaddy.auth.pkce.';
export const RETURN_TO_KEY       = 'shaddy.auth.returnTo';`;

const page: DocPage = {
  id: 'oauth',
  title: 'OAuth',
  groupLabel: 'Integrations',
  lede: 'OIDC authorization-code-with-PKCE against any standard provider. Public client, no secret, dev-server-friendly.',
  body: (
    <>
      <P>
        Auth lives in <Code>web/src/auth/</Code> and uses the standard{' '}
        <Strong>authorization code flow with PKCE</Strong> — the modern
        recommendation for SPAs because it avoids needing a client secret
        and dodges every variant of the implicit-flow class of bugs. The
        client discovers every endpoint at startup via the provider's{' '}
        <Code>/.well-known/openid-configuration</Code>.
      </P>

      <H2>Config values</H2>
      <CodeBlock language="ts" source={CONFIG} />
      <KvTable
        headers={['field', 'role']}
        rows={[
          { key: 'issuer', value: 'Base URL of the OIDC provider. The client appends /.well-known/openid-configuration to discover endpoints.' },
          { key: 'clientId', value: 'Public client identifier registered with the provider. No secret — PKCE replaces it.' },
          { key: 'redirectUri', value: 'Must match the value registered with the provider exactly. Defaults to <origin>/auth/callback in the browser.' },
          { key: 'scopes', value: <>Space-separated list. <Code>openid profile email</Code> is the minimum; add <Code>offline_access</Code> for refresh tokens.</> },
        ]}
      />

      <H2>Storage keys</H2>
      <UL>
        <LI>
          <Code>shaddy.auth.v1</Code> — the persisted token bundle in{' '}
          <Code>localStorage</Code>. Bumping the <Code>v1</Code> suffix
          invalidates every existing session in one shot.
        </LI>
        <LI>
          <Code>shaddy.auth.pkce.*</Code> — per-flow PKCE verifier in{' '}
          <Code>sessionStorage</Code>; cleared after the callback resolves.
        </LI>
        <LI>
          <Code>shaddy.auth.returnTo</Code> — the route the user was on
          before sign-in; the callback bounces back to it.
        </LI>
      </UL>

      <H2>Supported providers</H2>
      <P>
        Anything that implements OIDC discovery — which is essentially the
        whole modern self-hosted stack. Tested issuer URLs:
      </P>
      <UL>
        <LI><Strong>Keycloak.</Strong> <Code>http://srv-dev-01/auth/realms/shaddy</Code></LI>
        <LI><Strong>Authentik.</Strong> Root <Code>http://srv-dev-01</Code> when published at root, or per-app <Code>http://srv-dev-01/application/o/shaddy/</Code></LI>
        <LI><Strong>Authelia.</Strong> <Code>http://srv-dev-01</Code></LI>
        <LI><Strong>Dex.</Strong> <Code>http://srv-dev-01/dex</Code></LI>
      </UL>

      <H2>Provider setup checklist</H2>
      <UL>
        <LI>Create a new client named <Code>shaddy</Code>.</LI>
        <LI>Type: <Strong>public</Strong> / SPA / authorization-code with PKCE.</LI>
        <LI>Add redirect URI <Code>http://localhost:5181/auth/callback</Code> for dev — plus the production URL when you ship.</LI>
        <LI>Allow <Code>openid profile email</Code> scopes (and{' '}
          <Code>offline_access</Code> if you want refresh tokens).</LI>
      </UL>

      <H2>CORS</H2>
      <P>
        The OIDC discovery doc and the token endpoint must be reachable
        from the browser. Most providers serve permissive CORS headers on
        the discovery URL by default; the token endpoint typically requires
        you to add your dev origin (e.g. <Code>http://localhost:5181</Code>)
        to an allow-list in the provider's admin UI. The userinfo endpoint
        is the third URL you'll need allowed.
      </P>

      <Callout>
        The defaults assume the user's home server <Code>srv-dev-01</Code>{' '}
        on a Tailscale tailnet (via MagicDNS). For production deployments,
        set <Code>VITE_OAUTH_ISSUER</Code> and friends as build-time env
        vars (Vercel project env vars, for example).
      </Callout>
    </>
  ),
};

export default page;
