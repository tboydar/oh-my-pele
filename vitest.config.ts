import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const viewerClient = JSON.stringify(readFileSync(new URL('./src/viewer/client.js', import.meta.url), 'utf8'));

export default defineConfig({
  define: {
    __VIEWER_CLIENT__: viewerClient,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
