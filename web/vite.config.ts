import { fileURLToPath, URL } from 'node:url';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev-only proxy that lets the in-browser "Ask Claude" popover shell out to
// the user's local `claude` CLI (Claude Code subscription). Hackathon-grade:
// no API keys, no auth, dev server only. The endpoint is namespaced with a
// double-underscore prefix so it can't collide with anything we'd ever ship.
const claudeAskPlugin = (): Plugin => ({
  name: 'shaddy-claude-ask',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(
      '/__claude_ask',
      (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== 'POST') {
          next();
          return;
        }
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
          // Cap at 2 MB — image-to-recipe sends a base64 256×256 PNG which
          // can easily run a few hundred KB. The legacy translate mode is
          // still bounded by its own `prompt.length` check below.
          if (body.length > 2 * 1024 * 1024) {
            res.statusCode = 413;
            res.end(JSON.stringify({ error: 'payload too large' }));
            req.destroy();
          }
        });
        req.on('end', () => {
          let prompt: unknown;
          let mode: unknown;
          let imageBase64: unknown;
          try {
            // The plugin accepts three shapes:
            //   { prompt }                                  — legacy "rewrite GLSL"
            //   { prompt, mode: 'translate' }               — translate GLSL → Recipe
            //   { prompt, mode: 'image-to-recipe', imageBase64 } — vision Recipe
            const parsed = JSON.parse(body) as {
              prompt?: unknown;
              mode?: unknown;
              imageBase64?: unknown;
            };
            prompt = parsed.prompt;
            mode = parsed.mode;
            imageBase64 = parsed.imageBase64;
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'invalid json' }));
            return;
          }
          if (typeof prompt !== 'string' || prompt.length === 0 || prompt.length > 32000) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'bad prompt' }));
            return;
          }
          // Surface the mode in dev console so we can tell which flow is
          // running when watching the terminal during a long translate.
          if (typeof mode === 'string') {
            console.log('[shaddy-claude-ask] mode=' + mode + ' prompt=' + String(prompt.length) + 'B');
          }

          // Image-to-recipe mode writes the base64 to a temp PNG file and
          // appends a CLI-readable file reference to the prompt: claude -p
          // resolves `@/path/to/file.png` as an attached image (Claude
          // Code's standard syntax). Plain `image-to-recipe` without a
          // valid imageBase64 falls back to text-only.
          let tempDir: string | null = null;
          let tempPath: string | null = null;
          let finalPrompt = prompt;
          if (mode === 'image-to-recipe' && typeof imageBase64 === 'string') {
            try {
              const stripped = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
              const buf = Buffer.from(stripped, 'base64');
              tempDir = mkdtempSync(join(tmpdir(), 'shaddy-img-'));
              tempPath = join(tempDir, 'photo.png');
              writeFileSync(tempPath, buf);
              finalPrompt = prompt + '\n\nReference image: @' + tempPath;
            } catch (e) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'failed to decode image: ' + String(e) }));
              return;
            }
          }

          const cleanup = (): void => {
            if (tempDir) {
              try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* no-op */ }
              tempDir = null;
              tempPath = null;
            }
          };

          // `claude -p "<prompt>"` runs Claude Code non-interactively and
          // prints the response to stdout. We pass the prompt via stdin
          // instead of argv to dodge shell-escaping landmines on Windows.
          let proc;
          try {
            proc = spawn('claude', ['-p'], {
              shell: process.platform === 'win32',
              stdio: ['pipe', 'pipe', 'pipe'],
            });
          } catch (e) {
            cleanup();
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'failed to spawn claude: ' + String(e) }));
            return;
          }

          let out = '';
          let err = '';
          proc.stdout.on('data', (d: Buffer) => {
            out += d.toString();
          });
          proc.stderr.on('data', (d: Buffer) => {
            err += d.toString();
          });
          proc.on('error', (e: Error) => {
            cleanup();
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error:
                  'failed to invoke `claude` CLI — is it installed and on PATH? (' +
                  e.message +
                  ')',
              }),
            );
          });
          proc.on('close', (code: number | null) => {
            cleanup();
            res.setHeader('Content-Type', 'application/json');
            if (code !== 0) {
              res.statusCode = 502;
              res.end(
                JSON.stringify({
                  error: 'claude exited with code ' + String(code),
                  stderr: err.slice(0, 4000),
                }),
              );
              return;
            }
            res.end(JSON.stringify({ result: out }));
          });

          proc.stdin.write(finalPrompt);
          proc.stdin.end();
        });
      },
    );
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), claudeAskPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    allowedHosts: true,
  },
});
