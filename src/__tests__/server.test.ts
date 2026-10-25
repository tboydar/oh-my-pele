import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startViewer, type ViewerHandle } from '../server/serve.js';

const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures/from-omm');

describe('viewer server', () => {
  let handle: ViewerHandle;
  const note = path.join(fixture, '.omm/overall-architecture/note.md');

  beforeAll(async () => {
    handle = await startViewer({ dir: fixture, port: 0, host: '127.0.0.1' });
  });

  afterAll(async () => {
    fs.rmSync(note, { force: true });
    if (handle) await handle.close();
  });

  it('serves the page, the document, and pele from disk', async () => {
    const page = await get(handle.url, '/');
    expect(page.status).toBe(200);
    expect(page.body).toContain('oh-my-pele');
    expect(page.body).toContain('/vendor/pele.global.js');

    const doc = await get(handle.url, '/api/doc');
    expect(doc.status).toBe(200);
    const json = JSON.parse(doc.body) as { project: string; perspectives: { id: string }[] };
    expect(json.perspectives[0]?.id).toBe('overall-architecture');
    expect(json.project).toBe('from-omm');

    const pele = await get(handle.url, '/vendor/pele.global.js');
    expect(pele.status).toBe(200);
    expect(pele.body).toContain('Pele');
    expect(pele.body).not.toContain('cdn.jsdelivr');

    const missing = await get(handle.url, '/etc/passwd');
    expect(missing.status).toBe(404);
  });

  it('tells open viewers when a field file changes', async () => {
    const body = await new Promise<string>((resolve, reject) => {
      const req = http.get(`${handle.url}/events`, (res) => {
        let buffer = '';
        let wrote = false;
        const timer = setTimeout(() => {
          req.destroy();
          reject(new Error(`timed out waiting for a reload event\n${buffer}`));
        }, 4000);
        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          if (!wrote && buffer.includes('event: ready')) {
            wrote = true;
            fs.writeFileSync(note, 'watch probe\n');
          }
          if (buffer.includes('event: change')) {
            clearTimeout(timer);
            req.destroy();
            resolve(buffer);
          }
        });
      });
      req.on('error', (error) => {
        if ((error as NodeJS.ErrnoException).code !== 'ECONNRESET') reject(error);
      });
    });
    expect(body).toContain('event: change');
  });
});

function get(origin: string, pathname: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(`${origin}${pathname}`, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') });
      });
    }).on('error', reject);
  });
}
