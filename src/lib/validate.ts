import { parse, PeleError } from 'pele';
import {
  type OmmDocument,
  type OmmNode,
  type ValidationIssue,
  type ValidationReport,
} from '../types.js';
import { findByPath, walk } from './store.js';

export function validateDocument(doc: OmmDocument, slashPath?: string): ValidationReport {
  const roots = selectRoots(doc, slashPath);
  const issues: ValidationIssue[] = [];
  let diagrams = 0;

  walk(roots, (node) => {
    const diagram = node.fields.diagram;
    if (diagram === null) {
      if (node.children.length > 0) {
        issues.push({
          level: 'warning',
          rule: 'group-without-diagram',
          path: node.path,
          message: 'This element has child folders but no diagram.mmd, so the viewer cannot draw it.',
        });
      }
      return;
    }

    if (diagram.trim() === '') {
      diagrams += 1;
      issues.push({
        level: 'warning',
        rule: 'empty-diagram',
        path: node.path,
        line: 1,
        column: 1,
        message: 'diagram.mmd is empty.',
      });
      return;
    }

    diagrams += 1;
    try {
      const model = parse(diagram);
      issues.push(...structuralIssues(node, diagram, model));
    } catch (error) {
      issues.push(peleIssue(node.path, error));
    }
  });

  const errors = issues.filter((issue) => issue.level === 'error').length;
  const warnings = issues.filter((issue) => issue.level === 'warning').length;
  return { ok: errors === 0, diagrams, errors, warnings, issues };
}

export function formatReport(report: ValidationReport): string {
  if (report.issues.length === 0) {
    const noun = report.diagrams === 1 ? 'diagram' : 'diagrams';
    return `${report.diagrams} ${noun} checked, no issues.\n`;
  }

  const grouped = new Map<string, ValidationIssue[]>();
  for (const issue of report.issues) {
    const list = grouped.get(issue.path) ?? [];
    list.push(issue);
    grouped.set(issue.path, list);
  }

  const lines: string[] = [];
  for (const [elementPath, issues] of grouped) {
    lines.push(elementPath);
    for (const issue of issues) {
      const loc = issue.line
        ? ` line ${issue.line}${issue.column ? `, column ${issue.column}` : ''}`
        : '';
      lines.push(`  ${issue.level} [${issue.rule}]${loc}`);
      for (const row of issue.message.split('\n')) {
        lines.push(`    ${row}`);
      }
    }
    lines.push('');
  }

  const diagramNoun = report.diagrams === 1 ? 'diagram' : 'diagrams';
  const errorNoun = report.errors === 1 ? 'error' : 'errors';
  const warningNoun = report.warnings === 1 ? 'warning' : 'warnings';
  lines.push(
    `${report.diagrams} ${diagramNoun}, ${report.errors} ${errorNoun}, ${report.warnings} ${warningNoun}.`,
  );
  return `${lines.join('\n')}\n`;
}

function selectRoots(doc: OmmDocument, slashPath?: string): OmmNode[] {
  if (!slashPath) return doc.perspectives;
  const node = findByPath(doc, slashPath);
  if (!node) {
    throw new Error(`Element not found: ${slashPath}`);
  }
  return [node];
}

function peleIssue(elementPath: string, error: unknown): ValidationIssue {
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
  const message = error instanceof Error ? error.message : String(error);
  return {
    level: 'error',
    rule: 'pele-error',
    path: elementPath,
    message,
  };
}

function structuralIssues(node: OmmNode, diagram: string, model: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = collectIds(model);
  if (ids) {
    for (const child of node.children) {
      if (!ids.has(child.id)) {
        issues.push({
          level: 'warning',
          rule: 'child-not-in-diagram',
          path: node.path,
          message: `Child folder "${child.id}" is not a node id in diagram.mmd. Drill-down from the drawing will not find it. Add a node whose id is ${child.id}.`,
        });
      }
    }
  }

  const edges = edgesOf(model);
  if (edges) {
    for (const edge of edges) {
      if (labelText(edge.text)) continue;
      const line = edgeLine(diagram, edge.start, edge.end);
      issues.push({
        level: 'warning',
        rule: 'unlabeled-edge',
        path: node.path,
        line,
        message: `Edge ${edge.start} -> ${edge.end} has no label. Say what the connection does.`,
      });
    }
  }

  return issues;
}

function collectIds(model: unknown): Set<string> | null {
  if (!model || typeof model !== 'object') return null;
  const record = model as { nodes?: unknown; subgraphs?: unknown };
  const ids = new Set<string>();
  let found = false;

  if (record.nodes instanceof Map) {
    found = true;
    for (const key of record.nodes.keys()) ids.add(String(key));
  } else if (Array.isArray(record.nodes)) {
    found = true;
    for (const node of record.nodes) {
      if (typeof node === 'string') ids.add(node);
      else if (node && typeof node === 'object' && 'id' in node) ids.add(String((node as { id: unknown }).id));
    }
  }

  if (Array.isArray(record.subgraphs)) {
    found = true;
    for (const subgraph of record.subgraphs) {
      if (subgraph && typeof subgraph === 'object' && 'id' in subgraph) {
        ids.add(String((subgraph as { id: unknown }).id));
      }
    }
  }

  return found ? ids : null;
}

interface EdgeRef {
  start: string;
  end: string;
  text: string;
}

function edgesOf(model: unknown): EdgeRef[] | null {
  if (!model || typeof model !== 'object' || !('edges' in model)) return null;
  const edges = (model as { edges?: unknown }).edges;
  if (!Array.isArray(edges)) return null;
  return edges
    .filter((edge): edge is { start?: unknown; end?: unknown; text?: unknown } => Boolean(edge) && typeof edge === 'object')
    .map((edge) => ({
      start: String(edge.start ?? ''),
      end: String(edge.end ?? ''),
      text: typeof edge.text === 'string' ? edge.text : '',
    }));
}

function labelText(text: string): string {
  const trimmed = text.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function edgeLine(diagram: string, start: string, end: string): number | undefined {
  const lines = diagram.split('\n');
  const pattern = new RegExp(`${escapeRegExp(start)}\\b[\\s\\S]{0,80}?\\b${escapeRegExp(end)}\\b`);
  for (let index = 0; index < lines.length; index += 1) {
    if (pattern.test(lines[index] ?? '')) return index + 1;
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
