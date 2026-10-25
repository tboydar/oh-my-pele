import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { FIELD_FILES, VALID_FIELDS } from '../types.js';
import {
  findByPath,
  initOmm,
  loadDocument,
  OmmMissingError,
  OmmPathError,
  readField,
  writeField,
} from '../lib/store.js';

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures');

function tempProject(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-'));
}

describe('omm store', () => {
  it('uses the oh-my-mermaid field filenames', () => {
    expect(VALID_FIELDS).toEqual([
      'description',
      'diagram',
      'constraint',
      'concern',
      'context',
      'todo',
      'note',
    ]);
    expect(FIELD_FILES).toEqual({
      description: 'description.md',
      diagram: 'diagram.mmd',
      constraint: 'constraint.md',
      concern: 'concern.md',
      context: 'context.md',
      todo: 'todo.md',
      note: 'note.md',
    });
  });

  it('reads a tree written by oh-my-mermaid', () => {
    const doc = loadDocument(path.join(fixtures, 'from-omm'));
    expect(doc.perspectives.map((node) => node.id)).toEqual([
      'overall-architecture',
      'command-surface',
      'data-flow',
    ]);
    expect(doc.config.language).toBeUndefined();
    expect(doc.config.cloud).toMatchObject({ project_slug: 'oh-my-mermaid' });

    const overall = findByPath(doc, 'overall-architecture');
    expect(overall?.fields.description).toContain('oh-my-mermaid');
    expect(overall?.fields.constraint).toContain('yaml');
    const server = findByPath(doc, 'overall-architecture/server');
    expect(server?.kind).toBe('nested-class');
    expect(server?.children.map((child) => child.id)).toEqual([
      'http-server',
      'api-handler',
      'watcher',
      'viewer-html',
    ]);
    expect(server?.fields.diagram).toContain('http-server');
  });

  it('round-trips a nested write and keeps meta.yaml compatible', () => {
    const dir = tempProject();
    writeField(dir, 'overall-architecture', 'description', 'Top level.\n', { log: false });
    writeField(dir, 'overall-architecture/viewer/http-server', 'description', 'Serves HTML.\n', { log: false });
    const diagram = 'graph LR\n  http-server["HTTP"] -->|"serves"| page["Page"]\n';
    writeField(dir, 'overall-architecture/viewer', 'diagram', diagram, { log: false });
    writeField(dir, 'overall-architecture/viewer', 'diagram', `${diagram}%% updated\n`, { log: false });

    expect(fs.existsSync(path.join(dir, '.omm/config.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(dir, '.omm/overall-architecture/viewer/http-server/description.md'))).toBe(true);

    const meta = parseYaml(
      fs.readFileSync(path.join(dir, '.omm/overall-architecture/viewer/meta.yaml'), 'utf8'),
    ) as Record<string, unknown>;
    expect(meta.kind).toBe('nested-class');
    expect(meta.title).toBe('viewer');
    expect(meta.parentPath).toEqual([]);
    expect(meta.children).toEqual(['http-server']);
    expect(meta.last_field).toBe('diagram');
    expect(meta.prev_diagram).toBe(diagram);
    expect(meta.update_count).toBe(2);

    const parent = parseYaml(
      fs.readFileSync(path.join(dir, '.omm/overall-architecture/meta.yaml'), 'utf8'),
    ) as { kind: string; children: string[] };
    expect(parent.kind).toBe('perspective');
    expect(parent.children).toEqual(['viewer']);

    const doc = loadDocument(dir);
    expect(readField(dir, 'overall-architecture/viewer', 'diagram')).toContain('updated');
    expect(findByPath(doc, 'overall-architecture/viewer/http-server')?.fields.description).toBe('Serves HTML.\n');
  });

  it('rejects path traversal and hidden segments', () => {
    const dir = tempProject();
    initOmm(dir);
    expect(() => writeField(dir, '../secrets', 'note', 'nope', { log: false })).toThrow(OmmPathError);
    expect(() => writeField(dir, '.hidden/note', 'note', 'nope', { log: false })).toThrow(OmmPathError);
  });

  it('fails cleanly when .omm is missing', () => {
    expect(() => loadDocument(tempProject())).toThrow(OmmMissingError);
  });
});
