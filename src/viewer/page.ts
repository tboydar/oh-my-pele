import type { ClientDoc } from '../types.js';
import { clientScript } from './client-script.js';
import { VIEWER_CSS } from './styles.js';

export interface ViewerPageOptions {
  mode: 'live' | 'static';
  project: string;
  doc?: ClientDoc | null;
  /** Full pele browser build, inlined for the static export. */
  peleSource?: string;
}

export function viewerHtml(options: ViewerPageOptions): string {
  const title = escapeText(`oh-my-pele — ${options.project}`);
  const boot = {
    mode: options.mode,
    doc: options.mode === 'static' ? options.doc ?? null : null,
  };
  const peleTag = options.peleSource
    ? `<script>${escapeScript(options.peleSource)}</script>`
    : '<script src="/vendor/pele.global.js"></script>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="oh-my-pele">
<title>${title}</title>
<style>
${VIEWER_CSS}
</style>
<script>
try {
  var theme = localStorage.getItem('omp-theme');
  if (theme !== 'light' && theme !== 'dark') {
    theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
} catch (err) {
  document.documentElement.dataset.theme = 'light';
}
</script>
</head>
<body>
<div class="shell">
  <header class="top">
    <div class="brand">
      <svg class="mark" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M3 19h18L14.2 6.2 12 10.5 9.6 5.5 3 19zm7.2-2.2 1.8-3.6 1.7 3.6h-3.5z"/>
      </svg>
      <div>
        <h1>oh-my-pele</h1>
        <p id="project">${escapeText(options.project)}</p>
      </div>
    </div>
    <nav id="crumbs" class="crumbs" aria-label="Diagram path"></nav>
    <div class="tools">
      <button type="button" class="ghost" id="theme">Dark theme</button>
    </div>
  </header>
  <div class="layout">
    <aside class="sidebar" aria-label="Perspectives">
      <ul id="tree" class="tree"></ul>
    </aside>
    <main class="stage">
      <div id="canvas"></div>
      <div id="chips" class="chips"></div>
      <p id="hint" class="hint" hidden></p>
      <p id="diagram-error" class="error" hidden></p>
    </main>
    <aside id="inspector" class="inspector" aria-label="Element notes"></aside>
  </div>
  <footer class="foot">
    <span>Powered by <a href="https://github.com/obsidianmd/pele">pele</a> (MIT, kepano)</span>
    <span>Inspired by <a href="https://github.com/oh-my-mermaid/oh-my-mermaid">oh-my-mermaid</a> (MIT)</span>
    <span>Not an official Obsidian project.</span>
  </footer>
</div>
<script>window.__OMP__=${safeJson(boot)};</script>
${peleTag}
<script>
${clientScript()}
</script>
</body>
</html>
`;
}

function escapeText(value: string): string {
  return value.replace(/[&<>"]/g, (ch) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return map[ch] ?? ch;
  });
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function escapeScript(source: string): string {
  return source.replace(/<\/script/gi, '<\\/script');
}
