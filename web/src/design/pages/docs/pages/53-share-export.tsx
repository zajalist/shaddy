// Integrations — Share / export.

import type { DocPage } from './registry';
import { H2, P, UL, LI, Strong, Callout } from '../PageContent';
import { InlineCode as Code, Term } from '../InlineCode';
import { CodeBlock } from '../CodeBlockDark';

const SHARE = `https://shaddy.app/design#r=eJyrViotKMnMz1NIzc3Pq9TzS8z…
                                  ▲
                                  └─ base64( gzip( JSON(recipe) ) )`;

const SNAP = `// What the snapshot button does.
const dataUrl = await renderer.snapshot();   // forces a sync draw
const a = document.createElement('a');
a.href = dataUrl;
a.download = \`shaddy-\${Date.now()}.png\`;
a.click();`;

const REC = `// What the rec button does — MediaRecorder against the canvas
// stream. Codec preferred order: vp9 → vp8 → mp4 fallback.
const stream = canvas.captureStream(60);
const codec = pickFirstSupported(['video/webm;codecs=vp9',
                                  'video/webm;codecs=vp8',
                                  'video/mp4']);
const rec = new MediaRecorder(stream, { mimeType: codec });
const chunks: BlobPart[] = [];
rec.ondataavailable = (e) => chunks.push(e.data);
rec.onstop = () => downloadBlob(new Blob(chunks, { type: codec }));
rec.start();
// ... user clicks stop ...
rec.stop();`;

const page: DocPage = {
  id: 'share-export',
  title: 'Share / export',
  groupLabel: 'Integrations',
  lede: 'Share URL carries the recipe. PNG snapshot is one renderer call. WebM recording is MediaRecorder against the canvas.',
  body: (
    <>
      <H2>Share URL</H2>
      <P>
        <Code>⌘&nbsp;S</Code> copies a URL where the fragment encodes the
        full recipe. Anyone you send it to loads the same pixels — no
        server, no database, no auth needed for sharing. The fragment
        rides in <Code>window.location.hash</Code> so the URL is portable
        across browsers and never reaches the server.
      </P>
      <CodeBlock language="text" source={SHARE} />
      <P>
        Round trip:
      </P>
      <UL>
        <LI><Code>recipe → JSON → gzip → base64 → URL fragment</Code></LI>
        <LI><Code>URL fragment → base64 → gunzip → JSON → recipe</Code></LI>
      </UL>
      <P>
        Gzip gets a typical recipe down to a few hundred bytes; base64
        bloats it back up by ~33%. Real recipes typically land under 1 KB
        of URL — well within every browser's bar limit.
      </P>

      <H2>PNG snapshot</H2>
      <P>
        The snapshot button writes the current frame to disk as a PNG. The
        renderer forces a synchronous draw before reading back, so the
        captured image matches the on-screen state exactly — no off-by-one
        relative to the most recent uniform set.
      </P>
      <CodeBlock language="ts" source={SNAP} />
      <P>
        Snapshots respect the current drawing-buffer size — if you want a
        4K render, resize the canvas first via <Code>renderer.resize</Code>,
        take the snapshot, then resize back.
      </P>

      <H2>WebM recording</H2>
      <P>
        The rec button uses the browser's <Code>MediaRecorder</Code> API
        against the canvas's capture stream. Output is a single{' '}
        <Code>.webm</Code> file (with an MP4 fallback on Safari). Recording
        runs at the current canvas refresh rate; the file lands in your
        downloads on stop.
      </P>
      <CodeBlock language="ts" source={REC} />

      <H2>Fullscreen mode</H2>
      <P>
        <Code>F</Code> from the composer pushes the canvas full-screen via{' '}
        <Code>Element.requestFullscreen()</Code>. The composer UI hides;
        only the canvas + a tiny floating toolbar remain. Useful for
        screenshots without chrome.
      </P>

      <Callout>
        <Strong>Recording uses the current resolution</Strong> — including
        any mobile-perf DPR downscale. For a clean recording, take the
        canvas full-screen first (<Term>fullscreen mode</Term> above) so
        the drawing buffer matches the screen, then start recording.
      </Callout>
    </>
  ),
};

export default page;
