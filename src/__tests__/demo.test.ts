import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadDocument } from '../lib/store.js';
import { validateDocument } from '../lib/validate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('repository demo', () => {
  it('validates the scan of this repo', () => {
    const report = validateDocument(loadDocument(root));
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.diagrams).toBe(6);
    expect(report.issues).toEqual([]);
    const names = loadDocument(root).perspectives.map((node) => node.id);
    expect(names).toEqual(['overall-architecture', 'data-flow', 'external-integrations']);
  });
});
