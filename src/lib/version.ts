import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function packageVersion(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '../package.json'),
    path.resolve(here, '../../package.json'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const json = JSON.parse(fs.readFileSync(file, 'utf8')) as { name?: string; version?: string };
      if (json.name === 'oh-my-pele' && typeof json.version === 'string') return json.version;
    } catch {
      // keep looking
    }
  }
  return '0.0.0';
}
