import { fileURLToPath, URL } from 'node:url';
import { spawn } from 'node:child_process';
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
          // Cap at 64 KB — the prompt + shader source should easily fit.
          if (body.length > 64 * 1024) {
            res.statusCode = 413;
            res.end(JSON.stringify({ error: 'payload too large' }));
            req.destroy();
          }
        });
        req.on('end', () => {
          let prompt: unknown;
          try {
            const parsed = JSON.parse(body) as { prompt?: unknown };
            prompt = parsed.prompt;
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

          proc.stdin.write(prompt);
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
