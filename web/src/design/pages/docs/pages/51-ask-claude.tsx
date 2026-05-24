// Integrations — Ask Claude.

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong, Callout } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const PROMPT = `// What the AI panel sends. The actual prompt is composed
// from a fixed system-style preamble + the user's request +
// the current shader source.

# Shader edit request
You are rewriting a GLSL fragment shader for Shaddy (WebGL2,
#version 300 es, fragment-only, single fullscreen triangle).

## User's intent
{userPrompt}

## Current shader
\`\`\`glsl
{currentSource}
\`\`\`

Return ONLY the new full shader source inside a triple-fenced
\`\`\`glsl block. No prose. No partials. The output is parsed
verbatim and slotted back into the editor.`;

const FETCH = `// In the browser — the popover's submit handler.
const res = await fetch('/__claude_ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt }),
});
const { result, error } = await res.json();
if (error) showError(error);
else applyToEditor(extractGlslBlock(result));`;

const VITE = `// vite.config.ts — the dev-only middleware.
// POSTs to /__claude_ask shell out to \`claude -p\` (the local CLI),
// pipe the prompt over stdin, and return stdout as JSON.
// Hackathon-grade: dev server only, no API keys, 64KB body limit.

const claudeAskPlugin = (): Plugin => ({
  name: 'shaddy-claude-ask',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__claude_ask', (req, res, next) => {
      // ... body parse, spawn('claude', ['-p']), pipe prompt over stdin ...
    });
  },
});`;

const page: DocPage = {
  id: 'ask-claude',
  title: 'Ask Claude (AI translate)',
  groupLabel: 'Integrations',
  lede: 'A dev-only Vite middleware that shells out to your local Claude Code CLI. No API keys, no auth, no ship.',
  body: (
    <>
      <P>
        The composer has an "Ask Claude" popover that lets you rewrite the
        current shader from a natural-language prompt. Under the hood the
        popover POSTs to a custom Vite middleware that spawns the local{' '}
        <Code>claude</Code> CLI, pipes the prompt over stdin, and returns
        stdout. Nothing leaves the user's machine; nothing is shipped to
        production — the endpoint is dev-only and namespaced{' '}
        <Code>/__claude_ask</Code> so it can't collide with anything real.
      </P>

      <H2>The popover flow</H2>
      <UL>
        <LI>User types a request — "make the radial gradient pulse with the
          time" or "switch the palette to a colder ramp".</LI>
        <LI>Client builds the prompt by stitching the user's text together
          with the current GLSL source and a fixed system preamble.</LI>
        <LI>Client POSTs to <Code>/__claude_ask</Code>.</LI>
        <LI>Server spawns <Code>claude -p</Code> with the prompt on stdin.</LI>
        <LI>Client extracts the new GLSL out of the response's fenced block
          and applies it to the editor.</LI>
        <LI>Reverse parser kicks in on the next debounce tick — typed cards
          get promoted / demoted to match the new source.</LI>
      </UL>

      <H2>The prompt</H2>
      <CodeBlock language="text" source={PROMPT} />

      <H2>What the client sends</H2>
      <CodeBlock language="ts" source={FETCH} />

      <H2>What the dev server does</H2>
      <CodeBlock language="ts" source={VITE} />
      <P>
        The middleware accepts two shapes — both keyed off <Code>prompt</Code>:{' '}
        <Code>{'{ prompt }'}</Code> for the "rewrite GLSL" flow, and{' '}
        <Code>{'{ prompt, mode: \'translate\' }'}</Code> for the recipe-translate
        flow that returns JSON instead of GLSL. The server is agnostic — it
        just runs Claude and ships stdout back. The <Term>client</Term>{' '}
        distinguishes by what it expects to parse out of the response.
      </P>

      <H2>Limits + safety</H2>
      <UL>
        <LI>
          <Strong>Dev server only.</Strong> The plugin sets{' '}
          <Code>{"apply: 'serve'"}</Code> so the middleware is not bundled
          into production builds.
        </LI>
        <LI>
          <Strong>64 KB body cap.</Strong> Bigger uploads are rejected with
          <Code> 413</Code>. The prompt + shader source easily fit.
        </LI>
        <LI>
          <Strong>Requires the <Code>claude</Code> CLI on PATH.</Strong> If
          it's not installed the middleware returns a 500 with a hint
          pointing at the CLI install docs.
        </LI>
        <LI>
          <Strong>No streaming.</Strong> The middleware buffers stdout
          fully before responding — round-trip is one request per
          generation.
        </LI>
      </UL>

      <Callout kind="warn">
        Because this calls a CLI on your machine using your Claude Code
        subscription, AI usage is gated on you having that subscription
        and being signed in. The UI surfaces a friendly error when the
        spawn fails.
      </Callout>
    </>
  ),
};

export default page;
