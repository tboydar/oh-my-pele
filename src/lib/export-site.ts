import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { render, PeleError } from 'pele';
import type { OmmDocument, OmmNode, ValidationIssue } from '../types.js';
import { toClientDoc } from '../types.js';
import { reservedIdHint } from './pele-ids.js';
import { validateDocument, formatReport } from './validate.js';
import { viewerHtml } from '../viewer/page.js';
import { declarations, themeBlock, LIGHT_PELE, DARK_PELE } from '../viewer/theme.js';

/** Palette used for the standalone SVGs. `auto` follows the viewer's scheme. */
export type SvgTheme = 'light' | 'dark' | 'auto';

export interface ExportOptions {
  theme?: SvgTheme;
}

export interface ExportResult {
  outDir: string;
  htmlFile: string;
  svgFiles: string[];
  warnings: ValidationIssue[];
}

export class ExportError extends Error {
  readonly reportText: string;

  constructor(reportText: string) {
    super(reportText.trim());
    this.name = 'ExportError';
    this.reportText = reportText;
  }
}

export function exportSite(doc: OmmDocument, outDir: string, options: ExportOptions = {}): ExportResult {
  const theme: SvgTheme = options.theme ?? 'light';
  const report = validateDocument(doc);
  if (!report.ok) {
    throw new ExportError(formatReport(report));
  }

  const root = path.resolve(outDir);
  const svgDir = path.join(root, 'svg');
  fs.mkdirSync(svgDir, { recursive: true });

  const svgFiles: string[] = [];
  const manifest: { path: string; file: string }[] = [];
  const renderIssues: ValidationIssue[] = [];

  const visit = (node: OmmNode) => {
    const diagram = node.fields.diagram;
    if (!diagram || !diagram.trim()) return;
    try {
      const drawn = render(diagram);
      const fileName = `${svgFileStem(node.path)}.svg`;
      const filePath = path.join(svgDir, fileName);
      fs.writeFileSync(filePath, svgDocument(drawn.svg, theme), 'utf8');
      svgFiles.push(filePath);
      manifest.push({ path: node.path, file: `svg/${fileName}` });
    } catch (error) {
      renderIssues.push(renderIssue(node.path, diagram, error));
    }
    node.children.forEach(visit);
  };
  doc.perspectives.forEach(visit);

  if (renderIssues.length > 0) {
    const failed = {
      ok: false,
      diagrams: report.diagrams,
      errors: renderIssues.length,
      warnings: report.warnings,
      issues: renderIssues,
    };
    throw new ExportError(formatReport(failed));
  }

  const htmlFile = path.join(root, 'index.html');
  const html = viewerHtml({
    mode: 'static',
    project: doc.project,
    doc: toClientDoc(doc),
    peleSource: fs.readFileSync(peleGlobalPath(), 'utf8'),
  });
  fs.writeFileSync(htmlFile, html, 'utf8');
  fs.writeFileSync(
    path.join(root, 'manifest.json'),
    `${JSON.stringify({ generator: 'oh-my-pele', project: doc.project, html: 'index.html', diagrams: manifest }, null, 2)}\n`,
    'utf8',
  );

  return { outDir: root, htmlFile, svgFiles, warnings: report.issues };
}

export function peleGlobalPath(): string {
  const require = createRequire(import.meta.url);
  const pkgJson = require.resolve('pele/package.json');
  return path.join(path.dirname(pkgJson), 'dist', 'pele.global.js');
}

function svgDocument(svg: string, theme: SvgTheme): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${themedSvg(svg, theme)}\n`;
}

function themedSvg(svg: string, theme: SvgTheme): string {
  if (theme === 'auto') {
    // No inline palette: a <style> block sets the light palette and flips to
    // the dark one under prefers-color-scheme, so the file adapts wherever it
    // is opened. The inline --_bg:var(--pele-bg,…) mapping pele emits keeps
    // working because --pele-* resolve from the stylesheet.
    const style = [
      '<style>',
      themeBlock('.pele', LIGHT_PELE),
      '@media (prefers-color-scheme: dark) {',
      indentBlock(themeBlock('.pele', DARK_PELE), 2),
      '}',
      '</style>',
    ].join('\n');
    return svg.replace(/^(<svg\b[^>]*>)/, `$1\n${style}`);
  }
  const palette = theme === 'dark' ? DARK_PELE : LIGHT_PELE;
  return injectTheme(svg, declarations(palette));
}

function injectTheme(svg: string, decls: string): string {
  if (/<svg\b[^>]*\sstyle="/.test(svg)) {
    return svg.replace(/style="/, `style="${decls};`);
  }
  return svg.replace('<svg', `<svg style="${decls}"`);
}

function indentBlock(block: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return block
    .split('\n')
    .map((line) => (line ? `${pad}${line}` : line))
    .join('\n');
}

function svgFileStem(elementPath: string): string {
  const stem = elementPath.replace(/[^A-Za-z0-9/_-]+/g, '-').replace(/\//g, '--');
  return stem || 'diagram';
}

function renderIssue(elementPath: string, diagram: string, error: unknown): ValidationIssue {
  if (error instanceof PeleError) {
    const hint = reservedIdHint(diagram, error);
    return {
      level: 'error',
      rule: `pele-${error.code}`,
      path: elementPath,
      line: error.line || undefined,
      column: error.column || undefined,
      message: hint ? `${error.message}\n${hint}` : error.message,
    };
  }
  return {
    level: 'error',
    rule: 'pele-error',
    path: elementPath,
    message: error instanceof Error ? error.message : String(error),
  };
}
