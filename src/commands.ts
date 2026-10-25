import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { exportSite, ExportError } from './lib/export-site.js';
import {
  commandOnPath,
  installSkills,
  isPlatform,
  PLATFORMS,
  removeSkills,
  skillSlots,
  type PlatformId,
} from './lib/platforms.js';
import {
  findByPath,
  initOmm,
  loadDocument,
  OmmMissingError,
  OmmPathError,
  readField,
  writeField,
} from './lib/store.js';
import { formatReport, validateDocument } from './lib/validate.js';
import { isField, type OmmNode } from './types.js';
import { startViewer } from './server/serve.js';

export interface CommonOptions {
  dir?: string;
}

function projectDir(options: CommonOptions): string {
  return path.resolve(options.dir || process.cwd());
}

export function runInit(options: CommonOptions = {}): number {
  const dir = initOmm(projectDir(options));
  process.stdout.write(`Initialized ${dir}\n`);
  return 0;
}

export function runTree(slashPath?: string, options: CommonOptions = {}): number {
  try {
    const doc = loadDocument(projectDir(options));
    const nodes = slashPath ? [mustFind(doc, slashPath)] : doc.perspectives;
    process.stdout.write(`${formatTree(nodes).join('\n')}\n`);
    return 0;
  } catch (error) {
    return fail(error);
  }
}

export function runConfig(key?: string, options: CommonOptions = {}): number {
  try {
    const dir = projectDir(options);
    const doc = loadDocument(dir);
    if (!key) {
      process.stdout.write(stringifyYaml(doc.config));
      return 0;
    }
    if (key === 'language') {
      const language = typeof doc.config.language === 'string' && doc.config.language
        ? doc.config.language
        : 'en';
      process.stdout.write(`${language}\n`);
      return 0;
    }
    if (!(key in doc.config)) {
      process.stderr.write(`error: config has no ${key}\n`);
      return 1;
    }
    const value = doc.config[key];
    process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value)}\n`);
    return 0;
  } catch (error) {
    return fail(error);
  }
}

export function runRead(slashPath: string | undefined, field: string | undefined, options: CommonOptions = {}): number {
  if (!slashPath || !field) {
    process.stderr.write('error: oh-my-pele read <path> <field>\n');
    return 1;
  }
  if (!isField(field)) {
    process.stderr.write(`error: invalid field '${field}'. Valid: description, diagram, constraint, concern, context, todo, note\n`);
    return 1;
  }
  try {
    const dir = projectDir(options);
    loadDocument(dir);
    const content = readField(dir, slashPath, field);
    if (content === null) {
      process.stderr.write(`error: ${slashPath} has no ${field}\n`);
      return 1;
    }
    process.stdout.write(content);
    return 0;
  } catch (error) {
    return fail(error);
  }
}

export async function runWrite(
  slashPath: string | undefined,
  field: string | undefined,
  contentArgs: string[],
  file: string | undefined,
  options: CommonOptions = {},
): Promise<number> {
  if (!slashPath || !field) {
    process.stderr.write('error: oh-my-pele write <path> <field> [text|-] [--file path]\n');
    return 1;
  }
  if (!isField(field)) {
    process.stderr.write(`error: invalid field '${field}'. Valid: description, diagram, constraint, concern, context, todo, note\n`);
    return 1;
  }
  try {
    let content: string;
    if (file) {
      content = fs.readFileSync(file, 'utf8');
    } else if (contentArgs.length === 0 || contentArgs[0] === '-') {
      content = await readStdin();
    } else {
      content = contentArgs.join(' ');
    }
    writeField(projectDir(options), slashPath, field, content);
    return 0;
  } catch (error) {
    return fail(error);
  }
}

export function runValidate(slashPath?: string, json = false, options: CommonOptions = {}): number {
  try {
    const doc = loadDocument(projectDir(options));
    const report = validateDocument(doc, slashPath);
    process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : formatReport(report));
    return report.ok ? 0 : 1;
  } catch (error) {
    return fail(error);
  }
}

export function runExport(outDir?: string, options: CommonOptions = {}): number {
  try {
    const doc = loadDocument(projectDir(options));
    const result = exportSite(doc, outDir || path.join(projectDir(options), 'pele-site'));
    process.stdout.write(`Exported ${result.htmlFile}\n`);
    process.stdout.write(`${result.svgFiles.length} SVG file${result.svgFiles.length === 1 ? '' : 's'} in ${path.join(result.outDir, 'svg')}\n`);
    if (result.warnings.length > 0) {
      process.stderr.write(formatReport({
        ok: true,
        diagrams: result.svgFiles.length,
        errors: 0,
        warnings: result.warnings.length,
        issues: result.warnings,
      }));
    }
    return 0;
  } catch (error) {
    if (error instanceof ExportError) {
      process.stderr.write(error.reportText);
      return 1;
    }
    return fail(error);
  }
}

export async function runView(options: CommonOptions & { port?: number; host?: string; open?: boolean } = {}): Promise<number> {
  try {
    const handle = await startViewer({
      dir: projectDir(options),
      port: options.port,
      host: options.host,
    });
    process.stdout.write(`oh-my-pele viewer\n  ${handle.url}\n  docs ${path.join(projectDir(options), '.omm')}\n`);
    if (options.open) openBrowser(handle.url);
    const shutdown = () => {
      handle.close().finally(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    return 0;
  } catch (error) {
    return fail(error);
  }
}

export interface SetupCliOptions extends CommonOptions {
  home?: string;
  platform?: string;
  list?: boolean;
  remove?: boolean;
  projectOnly?: boolean;
  globalOnly?: boolean;
}

export function runSetup(options: SetupCliOptions = {}): number {
  let platforms: PlatformId[] | undefined;
  if (options.platform) {
    if (!isPlatform(options.platform)) {
      process.stderr.write(`error: unknown platform '${options.platform}'. Available: ${PLATFORMS.join(', ')}\n`);
      return 1;
    }
    platforms = [options.platform];
  }
  const request = {
    cwd: projectDir(options),
    home: options.home ?? os.homedir(),
    platforms,
    project: options.globalOnly ? false : true,
    global: options.projectOnly ? false : true,
  };

  if (options.list) {
    for (const slot of skillSlots(request)) {
      const installed = fs.existsSync(path.join(slot.dir, 'SKILL.md'));
      process.stdout.write(`${slot.platform}\t${slot.scope}\t${installed ? 'installed' : 'missing'}\t${slot.dir}\n`);
    }
    const bins = ['claude', 'codex', 'cursor'].map((name) => `${name} ${commandOnPath(name) ? 'found' : 'not-found'}`);
    process.stdout.write(`binaries: ${bins.join(', ')}\n`);
    return 0;
  }

  try {
    if (options.remove) {
      const removed = removeSkills(request);
      process.stdout.write(removed.length ? `Removed\n${removed.join('\n')}\n` : 'Nothing to remove.\n');
      return 0;
    }
    const written = installSkills(request);
    process.stdout.write(`Installed /pele-scan\n${written.join('\n')}\n`);
    return 0;
  } catch (error) {
    return fail(error);
  }
}

function mustFind(doc: ReturnType<typeof loadDocument>, slashPath: string): OmmNode {
  const node = findByPath(doc, slashPath);
  if (!node) throw new Error(`Element not found: ${slashPath}`);
  return node;
}

function formatTree(nodes: OmmNode[], indent = 0): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    const mark = node.fields.diagram && node.fields.diagram.trim() ? '  diagram' : '';
    lines.push(`${'  '.repeat(indent)}${node.id}${mark}`);
    lines.push(...formatTree(node.children, indent + 1));
  }
  return lines;
}

function fail(error: unknown): number {
  if (error instanceof OmmMissingError || error instanceof OmmPathError || error instanceof Error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  process.stderr.write(`${String(error)}\n`);
  return 1;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function openBrowser(url: string): void {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { stdio: 'ignore', detached: true });
  child.on('error', () => {
    process.stderr.write(`Open ${url} in a browser.\n`);
  });
  child.unref();
}
