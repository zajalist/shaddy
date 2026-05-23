import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest ships its own copy of Vite; the `react()` plugin's types come from
// the outer Vite install. They are runtime-compatible but TypeScript flags
// the duplicated declarations. Cast to keep typecheck clean.
const plugins = [react()] as unknown as [];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
