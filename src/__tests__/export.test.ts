import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { exportSite } from '../lib/export-site.js';
import { loadDocument } from '../lib/store.js';
import { viewerHtml } from '../viewer/page.js';

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('export', () => {
  it('writes one offline HTML file and an SVG per diagram', () => {
    const doc = loadDocument(path.join(fixtures, 'mini'));
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-export-'));
    const result = exportSite(doc, out);
    const html = fs.readFileSync(result.htmlFile, 'utf8');

    expect(html).toContain('Powered by');
    expect(html).toContain('pele');
    expect(html).toContain('(MIT, kepano)');
    expect(html).toContain('Inspired by');
    expect(html).toContain('oh-my-mermaid');
    expect(html).toContain('Not an official Obsidian project.');
    expect(html).toContain('overall-architecture');
    expect(html).toContain('window.pele.mount');
    expect(html).toContain('Pele ');
    expect(html).not.toMatch(/<script[^>]+src="https?:/);
    expect(html).not.toContain('cdn.jsdelivr.net');
    expect(html.length).toBeGreaterThan(100_000);
    expect(result.svgFiles.length).toBeGreaterThanOrEqual(3);
    const svg = fs.readFileSync(result.svgFiles[0]!, 'utf8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('--pele-accent:#c2410c');
    expect(fs.existsSync(path.join(out, 'manifest.json'))).toBe(true);
  });

  it('renders standalone SVGs in dark and auto themes', () => {
    const doc = loadDocument(path.join(fixtures, 'mini'));

    const darkOut = fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-export-dark-'));
    const dark = exportSite(doc, darkOut, { theme: 'dark' });
    const darkSvg = fs.readFileSync(dark.svgFiles[0]!, 'utf8');
    expect(darkSvg).toContain('--pele-accent:#ff7a45');
    expect(darkSvg).not.toContain('prefers-color-scheme');

    const autoOut = fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-export-auto-'));
    const auto = exportSite(doc, autoOut, { theme: 'auto' });
    const autoSvg = fs.readFileSync(auto.svgFiles[0]!, 'utf8');
    expect(autoSvg).toContain('prefers-color-scheme: dark');
    expect(autoSvg).toContain('--pele-accent: #c2410c');
    expect(autoSvg).toContain('--pele-accent: #ff7a45');
    expect(autoSvg).not.toContain('--pele-accent:#c2410c');
  });

  it('includes the reserved-id hint when a keyword-prefixed id blocks export', () => {
    const doc = loadDocument(path.join(fixtures, 'from-omm'));
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-export-hint-'));
    expect(() => exportSite(doc, out)).toThrow(/Rename the id to "class_field"/);
  });

  it('refuses to export a diagram pele cannot parse', () => {
    const doc = loadDocument(path.join(fixtures, 'broken'));
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-export-bad-'));
    expect(() => exportSite(doc, out)).toThrow(/line 3/);
    expect(fs.existsSync(path.join(out, 'index.html'))).toBe(false);
  });

  it('builds a live page that loads pele from this machine', () => {
    const html = viewerHtml({ mode: 'live', project: 'demo' });
    expect(html).toContain('src="/vendor/pele.global.js"');
    expect(html).not.toContain('cdn.jsdelivr.net');
    expect(html).toContain('__OMP__');
  });
});
