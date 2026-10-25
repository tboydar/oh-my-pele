import { DARK_PELE, DARK_UI, LIGHT_PELE, LIGHT_UI, themeBlock } from './theme.js';

export const VIEWER_CSS = `
${themeBlock(':root[data-theme="light"]', { ...LIGHT_UI, ...LIGHT_PELE })}
${themeBlock(':root[data-theme="dark"]', { ...DARK_UI, ...DARK_PELE })}

:root { color-scheme: light; }
:root[data-theme="dark"] { color-scheme: dark; }

* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 15px/1.5 "Segoe UI", system-ui, sans-serif;
}
button, summary { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

.shell {
  min-height: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto;
}
.top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  position: sticky;
  top: 0;
  z-index: 3;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
}
.mark {
  width: 28px;
  height: 28px;
  color: var(--accent);
  flex: none;
}
.brand h1 {
  margin: 0;
  font: 600 18px/1.1 Georgia, "Iowan Old Style", Palatino, serif;
  letter-spacing: -0.02em;
}
.brand p { margin: 0; color: var(--muted); font-size: 12px; }
.crumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.crumbs button, .chip, .tree button, .ghost {
  border: 1px solid transparent;
  background: transparent;
  border-radius: 999px;
  padding: 4px 10px;
}
.crumbs button { background: var(--sheet); border-color: var(--line); }
.crumbs button[aria-current="page"] { background: var(--accent); color: var(--accent-ink); border-color: transparent; }
.sep { color: var(--muted); }
.tools { display: flex; gap: 8px; }
.ghost {
  border-color: var(--line);
  background: var(--sheet);
}
.layout {
  display: grid;
  grid-template-columns: 272px minmax(0, 1fr) 340px;
  min-height: 0;
}
.sidebar, .inspector {
  background: var(--panel);
  overflow: auto;
  min-height: 0;
}
.sidebar { border-right: 1px solid var(--line); padding: 14px 10px 24px; }
.inspector { border-left: 1px solid var(--line); padding: 16px 16px 32px; }
.stage {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 16px 18px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tree { list-style: none; margin: 0; padding: 0; }
.tree ul { list-style: none; margin: 0; padding: 0 0 0 12px; }
.tree button {
  width: 100%;
  text-align: left;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}
.tree button small { color: var(--muted); font-size: 11px; }
.tree button[aria-current="page"] {
  background: var(--sheet);
  box-shadow: inset 3px 0 0 var(--accent);
}
.tree button:hover { background: color-mix(in srgb, var(--sheet) 70%, transparent); }
.mount {
  position: relative;
  min-height: 460px;
  background-color: var(--pele-bg);
  background-image: radial-gradient(var(--grid) 1px, transparent 1px);
  background-size: 22px 22px;
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow);
  overflow: hidden;
  padding: 12px;
}
.mount .pele { max-width: 100%; }
.pele-node.omp-drill { cursor: pointer; }
.pele-node.omp-drill :is(rect, polygon, path, circle, ellipse) {
  stroke: var(--accent);
  stroke-width: 2.25px;
}
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { background: var(--sheet); border-color: var(--line); }
.chip:hover, .ghost:hover { border-color: var(--accent); }
.hint, .empty, .error {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}
.error {
  color: var(--ink);
  background: var(--concern-bg);
  border-radius: 12px;
  padding: 10px 12px;
  white-space: pre-wrap;
}
.inspector h2 {
  margin: 0 0 4px;
  font: 600 26px/1.15 Georgia, "Iowan Old Style", Palatino, serif;
  letter-spacing: -0.03em;
}
.meta-line { margin: 0 0 14px; color: var(--muted); font-size: 12px; }
.card {
  background: var(--sheet);
  border: 1px solid var(--line);
  border-left-width: 4px;
  border-radius: 14px;
  padding: 10px 12px 12px;
  margin: 0 0 10px;
}
.card h3 {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.card.description { border-left-color: var(--accent); }
.card.context { border-left-color: #b08968; background: var(--context-bg); }
.card.constraint { border-left-color: #3b6ea5; background: var(--constraint-bg); }
.card.concern { border-left-color: #c2410c; background: var(--concern-bg); }
.card.todo { border-left-color: #b58105; background: var(--todo-bg); }
.card.note { border-left-color: #3f7d54; background: var(--note-bg); }
.card p { margin: 0 0 8px; }
.card p:last-child { margin-bottom: 0; }
.card ul, .card ol { margin: 0; padding-left: 18px; }
.card code { font-size: 0.92em; }
.card pre {
  margin: 0;
  overflow: auto;
  padding: 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg) 65%, transparent);
}
details.source { margin-top: 8px; }
details.source pre {
  white-space: pre-wrap;
  background: var(--sheet);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px;
  font-size: 12px;
}
.foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: space-between;
  padding: 8px 18px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 12px;
  background: var(--panel);
}
.foot a { color: inherit; }
.empty-state {
  margin: auto;
  max-width: 460px;
  text-align: center;
  padding: 48px 16px;
}
.empty-state h2 { font-family: Georgia, Palatino, serif; }
@media (max-width: 1040px) {
  .layout { grid-template-columns: 220px minmax(0, 1fr); }
  .inspector { grid-column: 1 / -1; border-left: 0; border-top: 1px solid var(--line); max-height: 42vh; }
}
@media (max-width: 720px) {
  .top { flex-wrap: wrap; }
  .layout { grid-template-columns: 1fr; }
  .sidebar { max-height: 28vh; border-right: 0; border-bottom: 1px solid var(--line); }
  .brand { min-width: 0; }
}
`.trim();
