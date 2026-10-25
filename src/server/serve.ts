import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { loadDocument, OmmMissingError } from '../lib/store.js';
import { toClientDoc } from '../types.js';
import { peleGlobalPath } from '../lib/export-site.js';
import { viewerHtml } from '../viewer/page.js';

export interface ViewerHandle {
  url: string;
  port: number;
  host: string;
  close(): Promise<void>;
}

export interface ViewerOptions {
  dir: string;
  port?: number;
  host?: string;
}

export function startViewer(options: ViewerOptions): Promise<ViewerHandle> {
  const projectDir = path.resolve(options.dir);
  if (!fs.existsSync(path.join(projectDir, '.omm'))) {
    return Promise.reject(new OmmMissingError(projectDir));
  }

  const host = options.host ?? '127.0.0.1';
  const preferred = options.port ?? 4173;
  const clients = new Set<http.ServerResponse>();
  let watcher: fs.FSWatcher | null = null;
  let debounce: ReturnType<typeof setTimeout> | null = null;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${host}`);
    try {
      if (url.pathname === '/api/doc') {
        const doc = toClientDoc(loadDocument(projectDir));
        sendJson(res, doc);
        return;
      }
      if (url.pathname === '/events') {
        subscribe(res, clients);
        return;
      }
      if (url.pathname === '/vendor/pele.global.js') {
        sendFile(res, peleGlobalPath(), 'text/javascript; charset=utf-8');
        return;
      }
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const html = viewerHtml({
          mode: 'live',
          project: safeProject(projectDir),
        });
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(html);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(message);
    }
  });

  return new Promise((resolve, reject) => {
    const listen = (port: number, triesLeft: number) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.removeListener('listening', onListening);
        if (error.code === 'EADDRINUSE' && triesLeft > 0 && preferred !== 0) {
          listen(port + 1, triesLeft - 1);
          return;
        }
        reject(error);
      };
      const onListening = () => {
        server.removeListener('error', onError);
        const address = server.address();
        const actual = typeof address === 'object' && address ? address.port : port;
        watcher = watchOmm(projectDir, () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => broadcast(clients), 200);
        });
        resolve({
          url: `http://${host}:${actual}`,
          port: actual,
          host,
          close: () => closeServer(server, clients, watcher),
        });
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, host);
    };
    listen(preferred, 10);
  });
}

function safeProject(projectDir: string): string {
  try {
    return loadDocument(projectDir).project;
  } catch {
    return path.basename(projectDir);
  }
}

function sendJson(res: http.ServerResponse, data: unknown): void {
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function sendFile(res: http.ServerResponse, file: string, type: string): void {
  const body = fs.readFileSync(file);
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'public, max-age=3600',
    'Content-Length': body.length,
  });
  res.end(body);
}

function subscribe(res: http.ServerResponse, clients: Set<http.ServerResponse>): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('event: ready\ndata: {}\n\n');
  clients.add(res);
  const pulse = setInterval(() => {
    res.write(': ping\n\n');
  }, 20000);
  res.on('close', () => {
    clearInterval(pulse);
    clients.delete(res);
  });
}

function broadcast(clients: Set<http.ServerResponse>): void {
  const payload = `event: change\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`;
  for (const client of clients) client.write(payload);
}

function watchOmm(projectDir: string, onChange: () => void): fs.FSWatcher | null {
  const dir = path.join(projectDir, '.omm');
  if (!fs.existsSync(dir)) return null;
  try {
    return fs.watch(dir, { recursive: true }, () => onChange());
  } catch {
    return null;
  }
}

function closeServer(
  server: http.Server,
  clients: Set<http.ServerResponse>,
  watcher: fs.FSWatcher | null,
): Promise<void> {
  for (const client of clients) client.end();
  clients.clear();
  watcher?.close();
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
