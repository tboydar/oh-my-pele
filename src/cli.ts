import { realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { defineCommand, runMain } from 'citty';
import {
  runConfig,
  runExport,
  runInit,
  runRead,
  runSetup,
  runTree,
  runValidate,
  runView,
  runWrite,
} from './commands.js';
import { packageVersion } from './lib/version.js';

const dirArg = {
  type: 'string' as const,
  description: 'Project directory (defaults to the current directory)',
};

function exitWith(code: number): void {
  if (code !== 0) process.exit(code);
}

const setup = defineCommand({
  meta: {
    name: 'setup',
    description: 'Install the /pele-scan skill for Claude Code, Codex, and Cursor',
  },
  args: {
    platform: {
      type: 'positional',
      description: 'claude, codex, or cursor',
      required: false,
    },
    dir: dirArg,
    list: { type: 'boolean', description: 'Show install locations without writing' },
    remove: { type: 'boolean', description: 'Remove installed pele-scan skills' },
    'project-only': { type: 'boolean', description: 'Only install into this project' },
    'global-only': { type: 'boolean', description: 'Only install into the home directory' },
  },
  run({ args }) {
    exitWith(runSetup({
      dir: args.dir,
      platform: args.platform,
      list: Boolean(args.list),
      remove: Boolean(args.remove),
      projectOnly: Boolean(args['project-only']),
      globalOnly: Boolean(args['global-only']),
    }));
  },
});

const view = defineCommand({
  meta: {
    name: 'view',
    description: 'Open the local viewer (pele mount, file watch, no upload)',
  },
  args: {
    dir: dirArg,
    port: { type: 'string', description: 'Port (default 4173)' },
    host: { type: 'string', description: 'Host (default 127.0.0.1)' },
    open: { type: 'boolean', description: 'Open a browser' },
  },
  async run({ args }) {
    const port = args.port ? Number(args.port) : undefined;
    if (port !== undefined && !Number.isInteger(port)) {
      process.stderr.write('error: invalid port\n');
      process.exit(1);
    }
    exitWith(await runView({ dir: args.dir, port, host: args.host, open: Boolean(args.open) }));
  },
});

const validate = defineCommand({
  meta: {
    name: 'validate',
    description: 'Parse every diagram with pele and report errors with line numbers',
  },
  args: {
    path: {
      type: 'positional',
      description: 'Optional element path to validate',
      required: false,
    },
    dir: dirArg,
    json: { type: 'boolean', description: 'Print a JSON report' },
  },
  run({ args }) {
    exitWith(runValidate(args.path, Boolean(args.json), { dir: args.dir }));
  },
});

const exportCmd = defineCommand({
  meta: {
    name: 'export',
    description: 'Write a single-file HTML viewer and one SVG per diagram',
  },
  args: {
    dir: dirArg,
    out: { type: 'string', description: 'Output directory (default pele-site)' },
    theme: {
      type: 'string',
      description: 'Palette for the standalone SVGs: light, dark, or auto (default light)',
    },
  },
  run({ args }) {
    exitWith(runExport(args.out, { dir: args.dir, theme: args.theme }));
  },
});

const init = defineCommand({
  meta: { name: 'init', description: 'Create an empty .omm directory' },
  args: { dir: dirArg },
  run({ args }) {
    exitWith(runInit({ dir: args.dir }));
  },
});

const tree = defineCommand({
  meta: { name: 'tree', description: 'Print the perspective tree' },
  args: {
    path: { type: 'positional', description: 'Optional element path', required: false },
    dir: dirArg,
  },
  run({ args }) {
    exitWith(runTree(args.path, { dir: args.dir }));
  },
});

const config = defineCommand({
  meta: { name: 'config', description: 'Print .omm/config.yaml or one key' },
  args: {
    key: { type: 'positional', description: 'Config key, for example language', required: false },
    dir: dirArg,
  },
  run({ args }) {
    exitWith(runConfig(args.key, { dir: args.dir }));
  },
});

const read = defineCommand({
  meta: { name: 'read', description: 'Print one field' },
  args: {
    path: { type: 'positional', description: 'Element path', required: false },
    field: { type: 'positional', description: 'Field name', required: false },
    dir: dirArg,
  },
  run({ args }) {
    exitWith(runRead(args.path, args.field, { dir: args.dir }));
  },
});

const write = defineCommand({
  meta: { name: 'write', description: 'Write one field, keeping meta.yaml in the .omm shape' },
  args: {
    path: { type: 'positional', description: 'Element path', required: false },
    field: { type: 'positional', description: 'Field name', required: false },
    file: { type: 'string', description: 'Read content from a file' },
    dir: dirArg,
  },
  async run({ args }) {
    const extras = args._.slice(2);
    exitWith(await runWrite(args.path, args.field, extras, args.file, { dir: args.dir }));
  },
});

export const main = defineCommand({
  meta: {
    name: 'oh-my-pele',
    version: packageVersion(),
    description: 'Local architecture diagrams for coding agents, rendered offline with pele',
  },
  subCommands: {
    setup,
    view,
    validate,
    export: exportCmd,
    init,
    tree,
    config,
    read,
    write,
  },
});

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const invoked = pathToFileURL(realpathSync(path.resolve(entry))).href;
    const self = pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;
    return invoked === self;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  runMain(main);
}
