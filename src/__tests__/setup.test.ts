import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { installSkills, removeSkills, skillSlots } from '../lib/platforms.js';

describe('setup', () => {
  it('installs pele-scan for Claude Code, Codex, and Cursor', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-proj-'));
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-home-'));
    const written = installSkills({ cwd, home });
    const slots = skillSlots({ cwd, home });

    expect(slots.map((slot) => `${slot.platform}:${slot.scope}`)).toEqual([
      'claude:project',
      'claude:global',
      'codex:project',
      'codex:global',
      'cursor:project',
      'cursor:global',
    ]);
    expect(written).toHaveLength(6);
    for (const file of written) {
      const text = fs.readFileSync(file, 'utf8');
      expect(text).toContain('name: pele-scan');
      expect(text).toContain('description.md');
      expect(text).toContain('diagram.mmd');
      expect(path.basename(path.dirname(file))).toBe('pele-scan');
    }
    expect(fs.existsSync(path.join(cwd, '.claude/skills/pele-scan/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(cwd, '.agents/skills/pele-scan/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(cwd, '.cursor/skills/pele-scan/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(home, '.codex/skills/pele-scan/SKILL.md'))).toBe(true);

    const removed = removeSkills({ cwd, home });
    expect(removed).toHaveLength(6);
    expect(fs.existsSync(path.join(cwd, '.cursor/skills/pele-scan/SKILL.md'))).toBe(false);
  });

  it('can limit setup to one project platform', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-proj-'));
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oh-my-pele-home-'));
    const written = installSkills({ cwd, home, platforms: ['cursor'], global: false });
    expect(written).toEqual([path.join(cwd, '.cursor/skills/pele-scan/SKILL.md')]);
  });
});
