import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadDocument } from '../lib/store.js';
import { formatReport, validateDocument } from '../lib/validate.js';

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('validate', () => {
  it('parses oh-my-mermaid diagrams and reports the one pele rejects', () => {
    const report = validateDocument(loadDocument(path.join(fixtures, 'from-omm')));
    expect(report.diagrams).toBeGreaterThanOrEqual(4);
    // command-surface uses the node id `class-field`. Pele's flowchart lexer
    // treats a leading `class` as the class keyword, which Mermaid's own
    // parser accepts. The line number is what an agent needs in order to rename it.
    expect(report.issues.filter((issue) => issue.level === 'error')).toEqual([
      expect.objectContaining({
        rule: 'pele-syntax',
        path: 'command-surface',
        line: 22,
      }),
    ]);
    const overall = validateDocument(loadDocument(path.join(fixtures, 'from-omm')), 'overall-architecture');
    expect(overall.errors).toBe(0);
    const flow = validateDocument(loadDocument(path.join(fixtures, 'from-omm')), 'data-flow');
    expect(flow.errors).toBe(0);
  });

  it('parses the mini fixture and warns when a child folder is missing from the diagram', () => {
    const report = validateDocument(loadDocument(path.join(fixtures, 'mini')));
    expect(report.errors).toBe(0);
    expect(report.issues.some((issue) => issue.rule === 'child-not-in-diagram' && issue.message.includes('orphan'))).toBe(true);
  });

  it('reports pele syntax errors with the line and column', () => {
    const report = validateDocument(loadDocument(path.join(fixtures, 'broken')));
    expect(report.ok).toBe(false);
    const syntax = report.issues.find((issue) => issue.rule === 'pele-syntax');
    expect(syntax).toMatchObject({
      level: 'error',
      path: 'overall-architecture',
      line: 3,
    });
    expect(syntax?.column).toBeGreaterThan(1);
    expect(syntax?.message).toContain('line 3');
    const text = formatReport(report);
    expect(text).toContain('line 3');
    expect(text).toContain('column');
  });
});
