import { readFileSync } from 'node:fs';
import { defineConfig, type Options } from 'tsup';

const viewerClient = JSON.stringify(readFileSync(new URL('./src/viewer/client.js', import.meta.url), 'utf8'));

const shared: Options = {
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  splitting: false,
  external: ['pele'],
  esbuildOptions(options) {
    options.define = {
      ...options.define,
      __VIEWER_CLIENT__: viewerClient,
    };
  },
};

export default defineConfig([
  {
    ...shared,
    entry: { cli: 'src/cli.ts' },
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    ...shared,
    clean: false,
    entry: { index: 'src/index.ts' },
  },
]);
