import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLATFORMS = ['claude', 'codex', 'cursor'] as const;
export type PlatformId = (typeof PLATFORMS)[number];

export interface SkillSlot {
  platform: PlatformId;
  scope: 'project' | 'global';
  dir: string;
}

export interface SetupRequest {
  cwd: string;
  home?: string;
  platforms?: PlatformId[];
  project?: boolean;
  global?: boolean;
}

const PROJECT_REL: Record<PlatformId, string> = {
  claude: path.join('.claude', 'skills', 'pele-scan'),
  codex: path.join('.agents', 'skills', 'pele-scan'),
  cursor: path.join('.cursor', 'skills', 'pele-scan'),
};

const GLOBAL_REL: Record<PlatformId, string> = {
  claude: path.join('.claude', 'skills', 'pele-scan'),
  codex: path.join('.codex', 'skills', 'pele-scan'),
  cursor: path.join('.cursor', 'skills', 'pele-scan'),
};

export function isPlatform(value: string): value is PlatformId {
  return (PLATFORMS as readonly string[]).includes(value);
}

export function skillSourceFile(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '../skills/pele-scan/SKILL.md'),
    path.resolve(here, '../../skills/pele-scan/SKILL.md'),
    path.resolve(here, '../../../skills/pele-scan/SKILL.md'),
    path.resolve(process.cwd(), 'skills/pele-scan/SKILL.md'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }
  throw new Error('Could not find skills/pele-scan/SKILL.md in the oh-my-pele package.');
}

export function skillSlots(request: SetupRequest): SkillSlot[] {
  const platforms = request.platforms ?? [...PLATFORMS];
  const includeProject = request.project !== false;
  const includeGlobal = request.global !== false;
  const home = request.home ?? homedir();
  const slots: SkillSlot[] = [];
  for (const platform of platforms) {
    if (includeProject) {
      slots.push({ platform, scope: 'project', dir: path.join(request.cwd, PROJECT_REL[platform]) });
    }
    if (includeGlobal) {
      slots.push({ platform, scope: 'global', dir: path.join(home, GLOBAL_REL[platform]) });
    }
  }
  return slots;
}

export function installSkills(request: SetupRequest): string[] {
  const source = skillSourceFile();
  const written: string[] = [];
  for (const slot of skillSlots(request)) {
    fs.mkdirSync(slot.dir, { recursive: true });
    const dest = path.join(slot.dir, 'SKILL.md');
    fs.copyFileSync(source, dest);
    written.push(dest);
  }
  return written;
}

export function removeSkills(request: SetupRequest): string[] {
  const removed: string[] = [];
  for (const slot of skillSlots(request)) {
    if (path.basename(slot.dir) !== 'pele-scan') continue;
    if (!fs.existsSync(slot.dir)) continue;
    fs.rmSync(slot.dir, { recursive: true, force: true });
    removed.push(slot.dir);
  }
  return removed;
}

export function commandOnPath(name: string, envPath = process.env.PATH ?? ''): boolean {
  return envPath.split(path.delimiter).some((dir) => {
    if (!dir) return false;
    return fs.existsSync(path.join(dir, name)) || fs.existsSync(path.join(dir, `${name}.cmd`));
  });
}

function homedir(): string {
  return process.env.HOME || process.env.USERPROFILE || process.cwd();
}
