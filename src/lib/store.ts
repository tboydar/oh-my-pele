import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  FIELD_FILES,
  emptyFields,
  humanize,
  type Field,
  type OmmConfig,
  type OmmDocument,
  type OmmFields,
  type OmmNode,
} from '../types.js';

export const OMM_DIR = '.omm';
const CONFIG_FILE = 'config.yaml';
const META_FILE = 'meta.yaml';
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export class OmmMissingError extends Error {
  readonly projectDir: string;

  constructor(projectDir: string) {
    super(`No .omm directory in ${projectDir}. Run /pele-scan, or \`oh-my-pele init\`.`);
    this.name = 'OmmMissingError';
    this.projectDir = projectDir;
  }
}

export class OmmPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OmmPathError';
  }
}

export function ommDir(projectDir: string): string {
  return path.join(projectDir, OMM_DIR);
}

export function ommExists(projectDir: string): boolean {
  return fs.existsSync(ommDir(projectDir)) && fs.statSync(ommDir(projectDir)).isDirectory();
}

export function projectName(projectDir: string): string {
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const name = (JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim()) return name.trim();
    } catch {
      // fall through to the directory name
    }
  }
  return path.basename(path.resolve(projectDir));
}

export function initOmm(projectDir: string): string {
  const dir = ommDir(projectDir);
  fs.mkdirSync(dir, { recursive: true });
  const configPath = path.join(dir, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    const config: OmmConfig = { version: '0.1.0', language: 'en' };
    fs.writeFileSync(configPath, stringifyYaml(config), 'utf8');
  }
  return dir;
}

export function loadDocument(projectDir: string): OmmDocument {
  const root = path.resolve(projectDir);
  if (!ommExists(root)) throw new OmmMissingError(root);
  return {
    project: projectName(root),
    projectDir: root,
    config: readConfig(root),
    perspectives: listChildDirs(ommDir(root))
      .sort(comparePerspectives)
      .map((id) => readNode(root, [id])),
  };
}

export function readConfig(projectDir: string): OmmConfig {
  const file = path.join(ommDir(projectDir), CONFIG_FILE);
  const parsed = readYaml(file);
  if (!parsed) return {};
  return parsed as OmmConfig;
}

export function findByPath(doc: OmmDocument, slashPath: string): OmmNode | null {
  const parts = slashPath.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  let nodes = doc.perspectives;
  let current: OmmNode | null = null;
  for (const part of parts) {
    current = nodes.find((node) => node.id === part) ?? null;
    if (!current) return null;
    nodes = current.children;
  }
  return current;
}

export function readField(projectDir: string, slashPath: string, field: Field): string | null {
  const parts = parseSafePath(slashPath);
  const file = path.join(ommDir(projectDir), ...parts, FIELD_FILES[field]);
  return readText(file);
}

export interface WriteOptions {
  /** Log the written path to stderr. Default true. */
  log?: boolean;
}

export function writeField(
  projectDir: string,
  slashPath: string,
  field: Field,
  content: string,
  options: WriteOptions = {},
): void {
  const root = path.resolve(projectDir);
  const parts = parseSafePath(slashPath);
  const created = !ommExists(root);
  if (created) {
    initOmm(root);
    if (options.log !== false) {
      process.stderr.write('Created .omm/ directory.\n');
    }
  }

  const dir = path.join(ommDir(root), ...parts);
  fs.mkdirSync(dir, { recursive: true });

  let previousDiagram: string | null = null;
  if (field === 'diagram') {
    previousDiagram = readText(path.join(dir, FIELD_FILES.diagram));
  }

  fs.writeFileSync(path.join(dir, FIELD_FILES[field]), content, 'utf8');
  stampWrittenNode(root, dir, parts, field, previousDiagram);

  for (let depth = 1; depth < parts.length; depth += 1) {
    const ancestor = parts.slice(0, depth);
    ensureAncestorMeta(root, ancestor, field);
    syncChildren(path.join(ommDir(root), ...ancestor));
  }
  syncChildren(dir);

  if (options.log !== false) {
    const bytes = Buffer.byteLength(content, 'utf8');
    process.stderr.write(`wrote ${parts.join('/')}/${FIELD_FILES[field]} (${bytes} bytes)\n`);
  }
}

export function walk(nodes: OmmNode[], visit: (node: OmmNode) => void): void {
  for (const node of nodes) {
    visit(node);
    walk(node.children, visit);
  }
}

function readNode(projectDir: string, parts: string[]): OmmNode {
  const dir = path.join(ommDir(projectDir), ...parts);
  const id = parts[parts.length - 1] ?? '';
  const fields = readFields(dir);
  const meta = readYaml(path.join(dir, META_FILE));
  const childNames = orderChildren(listChildDirs(dir), fields.diagram);
  return {
    id,
    path: parts.join('/'),
    title: displayTitle(id, meta),
    kind: parts.length === 1 ? 'perspective' : 'nested-class',
    fields,
    children: childNames.map((child) => readNode(projectDir, [...parts, child])),
  };
}

function readFields(dir: string): OmmFields {
  const fields = emptyFields();
  (Object.keys(FIELD_FILES) as Field[]).forEach((field) => {
    fields[field] = readText(path.join(dir, FIELD_FILES[field]));
  });
  return fields;
}

function displayTitle(id: string, meta: Record<string, unknown> | null): string {
  const raw = meta && typeof meta.title === 'string' ? meta.title : id;
  if (raw === id) return humanize(id);
  return raw;
}

function comparePerspectives(a: string, b: string): number {
  if (a === 'overall-architecture') return -1;
  if (b === 'overall-architecture') return 1;
  return a.localeCompare(b);
}

function orderChildren(names: string[], diagram: string | null): string[] {
  const sorted = [...names];
  if (!diagram) return sorted.sort((a, b) => a.localeCompare(b));
  const rank = (name: string) => {
    const match = diagram.search(new RegExp(`(^|[^A-Za-z0-9_-])${escapeRegExp(name)}(?![A-Za-z0-9_-])`));
    return match === -1 ? Number.POSITIVE_INFINITY : match;
  };
  return sorted.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function listChildDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name);
}

function parseSafePath(slashPath: string): string[] {
  const parts = slashPath.split('/').filter((part) => part.length > 0);
  if (parts.length === 0) {
    throw new OmmPathError('A path is required, for example overall-architecture/viewer.');
  }
  for (const part of parts) {
    if (!SAFE_NAME.test(part)) {
      throw new OmmPathError(
        `Invalid path segment "${part}". Use letters, numbers, dots, underscores, and hyphens.`,
      );
    }
  }
  return parts;
}

function readText(file: string): string | null {
  if (!fs.existsSync(file)) return null;
  let text = fs.readFileSync(file, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
}

function readYaml(file: string): Record<string, unknown> | null {
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = parseYaml(fs.readFileSync(file, 'utf8')) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function writeYaml(file: string, value: Record<string, unknown>): void {
  fs.writeFileSync(file, stringifyYaml(value), 'utf8');
}

function stampWrittenNode(
  projectDir: string,
  dir: string,
  parts: string[],
  field: Field,
  previousDiagram: string | null,
): void {
  const now = new Date().toISOString();
  const existing = readYaml(path.join(dir, META_FILE));
  const meta: Record<string, unknown> = existing ? { ...existing } : {};
  if (!meta.created) meta.created = now;
  meta.updated = now;
  meta.update_count = (typeof meta.update_count === 'number' ? meta.update_count : 0) + 1;
  meta.last_field = field;
  if (!meta.kind) meta.kind = parts.length === 1 ? 'perspective' : 'nested-class';
  if (!meta.title) meta.title = parts[parts.length - 1];
  if (parts.length > 1 && meta.parentPath === undefined) {
    meta.parentPath = parts.slice(1, -1);
  }
  if (field === 'diagram' && previousDiagram !== null && previousDiagram !== readText(path.join(dir, FIELD_FILES.diagram))) {
    meta.prev_diagram = previousDiagram;
  }
  const git = gitInfo(projectDir);
  if (git.commit) meta.git_commit = git.commit;
  if (git.branch) meta.git_branch = git.branch;
  meta.children = listChildDirs(dir).sort((a, b) => a.localeCompare(b));
  writeYaml(path.join(dir, META_FILE), meta);
}

function ensureAncestorMeta(projectDir: string, parts: string[], field: Field): void {
  const dir = path.join(ommDir(projectDir), ...parts);
  fs.mkdirSync(dir, { recursive: true });
  const metaPath = path.join(dir, META_FILE);
  if (fs.existsSync(metaPath)) return;
  const now = new Date().toISOString();
  const meta: Record<string, unknown> = {
    created: now,
    updated: now,
    update_count: 0,
    last_field: field,
    kind: parts.length === 1 ? 'perspective' : 'nested-class',
    title: parts[parts.length - 1],
    children: [],
  };
  if (parts.length > 1) meta.parentPath = parts.slice(1, -1);
  writeYaml(metaPath, meta);
}

function syncChildren(dir: string): void {
  const metaPath = path.join(dir, META_FILE);
  if (!fs.existsSync(metaPath)) return;
  const meta = readYaml(metaPath) ?? {};
  const kids = listChildDirs(dir).sort((a, b) => a.localeCompare(b));
  const prev = Array.isArray(meta.children) ? meta.children.map(String) : [];
  if (prev.length === kids.length && prev.every((value, index) => value === kids[index])) return;
  meta.children = kids;
  writeYaml(metaPath, meta);
}

function gitInfo(cwd: string): { commit?: string; branch?: string } {
  try {
    const commit = execSync('git rev-parse --short HEAD', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const branch = execSync('git branch --show-current', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return {
      commit: commit || undefined,
      branch: branch || undefined,
    };
  } catch {
    return {};
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
