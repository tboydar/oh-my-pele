import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { render, PeleError } from 'pele';
import type { OmmDocument, OmmNode, ValidationIssue } from '../types.js';
import { toClientDoc } from '../types.js';
import { validateDocument, formatReport } from './validate.js';
import { viewerHtml } from '../viewer/page.js';
import { declarations, LIGHT_PELE } from '../viewer/theme.js';

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

export function exportSite(doc: OmmDocument, outDir: string): ExportResult {
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
      fs.writeFileSync(filePath, svgDocument(drawn.svg), 'utf8');
      svgFiles.push(filePath);
      manifest.push({ path: node.path, file: `svg/${fileName}` });
    } catch (error) {
      renderIssues.push(renderIssue(node.path, error));
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

function svgDocument(svg: string): string {
  const themed = injectTheme(svg, declarations(LIGHT_PELE));
  return `<?xml version="1.0" encoding="UTF-8"?>\n${themed}\n`;
}

function injectTheme(svg: string, decls: string): string {
  if (/<svg\b[^>]*\sstyle="/.test(svg)) {
    return svg.replace(/style="/, `style="${decls};`);
  }
  return svg.replace('<svg', `<svg style="${decls}"`);
}

function svgFileStem(elementPath: string): string {
  const stem = elementPath.replace(/[^A-Za-z0-9/_-]+/g, '-').replace(/\//g, '--');
  return stem || 'diagram';
}

function renderIssue(elementPath: string, error: unknown): ValidationIssue {
  if (error instanceof PeleError) {
    return {
      level: 'error',
      rule: `pele-${error.code}`,
      path: elementPath,
      line: error.line || undefined,
      column: error.column || undefined,
      message: error.message,
    };
  }
  return {
    level: 'error',
    rule: 'pele-error',
    path: elementPath,
    message: error instanceof Error ? error.message : String(error),
  };
}
