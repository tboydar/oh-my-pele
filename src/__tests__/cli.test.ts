import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const cli = path.join(root, 'dist/cli.js');
const env = { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '' };

describe.skipIf(!fs.existsSync(cli))('built CLI', () => {
  it('prints help and validates this repository', () => {
    const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8', env });
    expect(help.status).toBe(0);
    const helpText = `${help.stdout}\n${help.stderr}`;
    expect(helpText).toContain('validate');
    expect(helpText).toContain('setup');

    const report = spawnSync(process.execPath, [cli, 'validate', '--dir', root], { encoding: 'utf8', env });
    expect(report.status).toBe(0);
    expect(report.stdout).toContain('no issues');
  });

  it('exports a single HTML file and SVGs', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-cli-'));
    const result = spawnSync(process.execPath, [cli, 'export', '--dir', root, '--out', out], {
      encoding: 'utf8',
      env,
    });
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(out, 'index.html'))).toBe(true);
    expect(fs.readdirSync(path.join(out, 'svg')).filter((name) => name.endsWith('.svg')).length).toBe(6);
  });

  it('themes standalone SVGs via --theme and rejects unknown themes', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-cli-theme-'));
    const result = spawnSync(process.execPath, [cli, 'export', '--dir', root, '--out', out, '--theme', 'auto'], {
      encoding: 'utf8',
      env,
    });
    expect(result.status).toBe(0);
    const svg = fs.readFileSync(path.join(out, 'svg', 'overall-architecture.svg'), 'utf8');
    expect(svg).toContain('prefers-color-scheme: dark');

    const bad = spawnSync(process.execPath, [cli, 'export', '--dir', root, '--theme', 'neon'], {
      encoding: 'utf8',
      env,
    });
    expect(bad.status).toBe(1);
    expect(`${bad.stderr}${bad.stdout}`).toContain('invalid theme');
  });
});
