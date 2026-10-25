// Rewrites the repository's .omm demo. Run after `npm run build`.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOmm, writeField } from '../dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
initOmm(root);

const write = (element, field, content) => {
  const text = content.replace(/^\n/, '').replace(/\s+$/, '\n');
  writeField(root, element, field, text, { log: false });
};

write('overall-architecture', 'description', `
How the oh-my-pele package is split. A coding agent writes \`.omm/\` through the CLI or by hand. The same files are parsed by the validator, mounted in the local viewer, and rendered again for the static export. pele stays a library call. Nothing in this picture is uploaded.
`);

write('overall-architecture', 'diagram', `
graph LR
  cli["CLI\\nsrc/cli.ts"]
  store["Store\\nsrc/lib/store.ts"]
  validator["Validator\\nsrc/lib/validate.ts"]
  viewer["Viewer\\nsrc/server/serve.ts"]
  exporter["Exporter\\nsrc/lib/export-site.ts"]
  skill-setup["Skill setup\\nsrc/lib/platforms.ts"]
  pele-scan["pele-scan\\nskills/pele-scan/SKILL.md"]
  pele["pele\\nnpm package"]

  cli -->|"dispatches commands"| store
  cli -->|"dispatches commands"| validator
  cli -->|"starts"| viewer
  cli -->|"writes a site"| exporter
  cli -->|"installs the skill"| skill-setup
  skill-setup -->|"copies SKILL.md"| pele-scan
  pele-scan -->|"tells the agent to write"| store
  validator -->|"parse()"| pele
  viewer -->|"mount()"| pele
  exporter -->|"render()"| pele
  viewer -->|"reads the tree"| store
  exporter -->|"reads the tree"| store
  validator -->|"reads diagrams"| store

  classDef external fill:#585b70,stroke:#585b70,color:#cdd6f4
  classDef entry fill:#89b4fa,stroke:#89b4fa,color:#1e1e2e
  classDef store fill:#a6e3a1,stroke:#a6e3a1,color:#1e1e2e

  class cli,pele-scan entry
  class store store
  class pele external
`);

write('overall-architecture', 'context', `
TypeScript library and CLI, built with tsup, tested with vitest, and aimed at Node 22 or newer. The published package name is \`oh-my-pele\`. \`omp\` is an alias for the same binary. Runtime dependencies are citty (the command parser), yaml (config and meta files), and pele (diagrams).
`);

write('overall-architecture', 'constraint', `
- Node.js 22 or newer.
- \`.omm/\` field names stay compatible with oh-my-mermaid: description.md, diagram.mmd, context.md, constraint.md, concern.md, todo.md, note.md, plus nested folders, meta.yaml, and config.yaml.
- Rendering is synchronous and local. The viewer serves pele from node_modules. The export inlines that same browser build.
- Paths written through the CLI reject \`..\`, absolute paths, and hidden segments.
`);

write('overall-architecture', 'concern', `
- Pele's flowchart lexer is stricter than Mermaid's about node ids that begin with keywords such as \`class\`. \`oh-my-pele validate\` reports the line, but an agent can still emit a diagram that only fails here.
- Click-to-drill only marks flowchart nodes (\`.pele-node\`). Other diagram types still open from the tree and the chips.
- The single-file export inlines the pele browser build, so index.html is about 700KB before the document.
`);

write('overall-architecture', 'todo', `
- Show a diff against meta.yaml \`prev_diagram\`.
- Teach the viewer to drill sequence and class diagrams, not only flowcharts.
- Add a GitHub Action that runs \`validate\` on pull requests.
`);

write('overall-architecture', 'note', `
This \`.omm/\` tree is the scan of oh-my-pele itself. It was written with the same field files \`/pele-scan\` asks an agent to produce.
`);

write('overall-architecture/cli', 'description', `
Citty commands in \`src/cli.ts\` and \`src/commands.ts\`. \`setup\`, \`view\`, \`validate\`, and \`export\` are the MVP. \`init\`, \`read\`, \`write\`, \`tree\`, and \`config\` keep the directory easy to edit without opening files by hand.
`);

write('overall-architecture/cli', 'diagram', `
graph LR
  setup-command["setup"]
  view-command["view"]
  validate-command["validate"]
  export-command["export"]
  read-write["read / write"]

  setup-command -->|"copies SKILL.md"| skill-files["Skill directories"]
  view-command -->|"HTTP and SSE"| local-browser["Local browser"]
  validate-command -->|"pele.parse"| pele["pele"]
  export-command -->|"pele.render"| static-html["index.html and SVG"]
  read-write -->|"field files"| omm-dir[".omm directory"]

  classDef external fill:#585b70,stroke:#585b70,color:#cdd6f4
  classDef entry fill:#89b4fa,stroke:#89b4fa,color:#1e1e2e
  classDef store fill:#a6e3a1,stroke:#a6e3a1,color:#1e1e2e

  class setup-command,view-command entry
  class omm-dir store
  class pele external
`);

write('overall-architecture/cli', 'context', `
The binary is \`dist/cli.js\` with a node shebang. It only calls \`runMain\` when that file is the process entry, so tests can import the command functions.
`);

write('overall-architecture/cli', 'constraint', `
Commands that read the tree refuse to create \`.omm/\` as a side effect. \`write\` and \`init\` are the commands that create it.
`);

write('overall-architecture/cli', 'concern', `
A missing \`oh-my-pele\` binary is easy to hit inside an agent sandbox. The skill tells the agent to fall back to writing the field files directly, which skips meta.yaml updates.
`);

write('overall-architecture/cli', 'todo', `
- Accept a diagram on stdin for \`validate\` so an agent can check one snippet before saving it.
`);

write('overall-architecture/cli/setup-command', 'description', `
Copies \`skills/pele-scan/SKILL.md\` into the project skill folders for Claude Code (\`.claude/skills\`), Codex (\`.agents/skills\`), and Cursor (\`.cursor/skills\`). \`--global-only\` uses the home directory instead, including \`~/.codex/skills\` for Codex.
`);

write('overall-architecture/cli/view-command', 'description', `
Starts the HTTP viewer on 127.0.0.1:4173. It does not open a browser unless \`--open\` is passed.
`);

write('overall-architecture/cli/validate-command', 'description', `
Walks every diagram.mmd, parses it with pele, and prints rule, line, and column. \`--json\` prints the same report for an agent.
`);

write('overall-architecture/cli/export-command', 'description', `
Writes \`pele-site/index.html\` plus one SVG per diagram. Export stops before writing if pele reports an error.
`);

write('overall-architecture/cli/read-write', 'description', `
\`read\` prints one field. \`write\` replaces one field and updates meta.yaml: timestamps, update_count, last_field, kind, title, parentPath, children, git commit, and prev_diagram when a diagram changes.
`);

write('overall-architecture/store', 'description', `
\`src/lib/store.ts\` loads and writes the \`.omm/\` tree. Perspectives are the top-level directories. Child directories are nested elements. Unknown keys in config.yaml and meta.yaml are kept.
`);

write('overall-architecture/store', 'constraint', `
The filesystem is the tree. \`children\` in meta.yaml is refreshed from directory names on write, while the viewer orders those children by their first appearance in diagram.mmd.
`);

write('overall-architecture/store', 'concern', `
A hand-edited folder that does not match a node id still shows up in the tree. Validate warns with \`child-not-in-diagram\` instead of hiding it.
`);

write('overall-architecture/store', 'todo', `
- Preserve YAML comments in config.yaml. The current writer parses and stringifies, which drops comments.
`);

write('overall-architecture/validator', 'description', `
\`src/lib/validate.ts\` calls \`pele.parse\` on every non-empty diagram. Syntax, semantic, unsupported-diagram, and limit failures become errors with pele's line and column. Empty diagrams, groups without a diagram, child folders missing from the drawing, and edges with no label are warnings.
`);

write('overall-architecture/validator', 'concern', `
Edge-label warnings depend on pele exposing an \`edges\` array. A diagram type that parses but uses a different model shape will not get that warning.
`);

write('overall-architecture/viewer', 'description', `
Plain HTML, no frontend framework. The live server in \`src/server/serve.ts\` serves the page, \`GET /api/doc\`, server-sent events, and \`/vendor/pele.global.js\` from the installed pele package. The page script mounts the current diagram and drills into a child when its id matches a folder.
`);

write('overall-architecture/viewer', 'diagram', `
graph LR
  http-server["HTTP server\\nsrc/server/serve.ts"]
  viewer-page["Viewer page\\nsrc/viewer/page.ts"]
  file-watch["File watch\\nSSE /events"]
  vendor-pele["Vendored pele\\n/vendor/pele.global.js"]

  http-server -->|"GET /"| viewer-page
  http-server -->|"GET /vendor"| vendor-pele
  http-server -->|"pushes reload"| file-watch
  viewer-page -->|"pele.mount"| vendor-pele
  file-watch -->|"fs.watch .omm"| omm-dir[".omm directory"]

  classDef external fill:#585b70,stroke:#585b70,color:#cdd6f4
  classDef entry fill:#89b4fa,stroke:#89b4fa,color:#1e1e2e
  classDef store fill:#a6e3a1,stroke:#a6e3a1,color:#1e1e2e

  class http-server entry
  class omm-dir store
  class vendor-pele external
`);

write('overall-architecture/viewer', 'context', `
Light and dark themes set \`--pele-*\` on the document so a mounted diagram recolors without a network round trip. The same page component renders the static export, with the document and pele inlined.
`);

write('overall-architecture/viewer', 'constraint', `
The server binds to loopback by default and only serves the viewer, the JSON document, the event stream, and one pele file. It is not a general static file server.
`);

write('overall-architecture/viewer', 'concern', `
\`fs.watch\` is best-effort. Network filesystems and some editors' atomic saves can delay or drop a reload. Refreshing the browser still reads the current files.
`);

write('overall-architecture/viewer', 'todo', `
- Remember the open element across reloads when the file that changed is a different branch of the tree. Today the hash is kept, which already does most of this.
`);

write('overall-architecture/viewer/http-server', 'description', `
Node \`http\` server. Port 4173, or the next free port, or an ephemeral port when the caller passes 0. Shutdown closes SSE clients and the watcher.
`);

write('overall-architecture/viewer/viewer-page', 'description', `
\`viewerHtml\` assembles CSS, a tiny boot script, the pele bundle, and \`src/viewer/client.js\`. The client renders the tree, breadcrumb, diagram, child chips, and the seven fields. Hash routes (\`#/overall-architecture/viewer\`) work for the live server and for a file opened from disk.
`);

write('overall-architecture/viewer/file-watch', 'description', `
\`fs.watch\` on \`.omm\` with a short debounce, then an SSE \`change\` event. The page refetches \`/api/doc\` and remounts the open diagram.
`);

write('overall-architecture/exporter', 'description', `
\`src/lib/export-site.ts\` validates first, renders each diagram to SVG with pele, themes the SVG with the light \`--pele-*\` variables, and writes a single \`index.html\` that does not request a CDN.
`);

write('overall-architecture/exporter', 'todo', `
- Offer a dark SVG variant. The HTML page already switches theme after load. The standalone SVG files are light.
`);

write('overall-architecture/skill-setup', 'description', `
\`src/lib/platforms.ts\` knows the project and home directories for Claude Code, Codex, and Cursor. Setup copies one SKILL.md. It does not install editor plugins or phone a marketplace.
`);

write('overall-architecture/pele-scan', 'description', `
The skill agents actually run. It requires the three perspectives, recursive drill-down when a module has internal structure, and constraint, concern, and todo on every perspective and on every element that has its own diagram. It tells the agent to run \`validate\` and fix pele's line numbers.
`);

write('overall-architecture/pele-scan', 'note', `
The wording is original. The directory layout it describes is the oh-my-mermaid format, credited in NOTICE.
`);

write('data-flow', 'description', `
What moves when an agent scans a repo. Source code stays where it is. The agent writes Markdown and Mermaid into \`.omm/\`. pele turns diagram text into SVG on this machine for the viewer and for the export. There is no account and no upload step.
`);

write('data-flow', 'diagram', `
graph LR
  codebase["Codebase\\nsource tree"]
  agent["Coding agent\\nClaude, Codex, Cursor"]
  skill["pele-scan\\nskills/pele-scan/SKILL.md"]
  omm-dir[".omm directory\\nperspectives and fields"]
  pele["pele\\nlocal renderer"]
  viewer["Local viewer\\noh-my-pele view"]
  export-bundle["Static export\\nindex.html and SVG"]

  codebase -->|"read by the agent"| agent
  agent -->|"follows"| skill
  skill -->|"writes field files"| omm-dir
  omm-dir -->|"diagram.mmd"| pele
  pele -->|"SVG"| viewer
  pele -->|"SVG"| export-bundle
  omm-dir -->|"file watch"| viewer

  classDef external fill:#585b70,stroke:#585b70,color:#cdd6f4
  classDef entry fill:#89b4fa,stroke:#89b4fa,color:#1e1e2e
  classDef store fill:#a6e3a1,stroke:#a6e3a1,color:#1e1e2e

  class agent,pele external
  class skill entry
  class omm-dir store
`);

write('data-flow', 'context', `
The scan is a prompt, not a custom language model call inside this package. oh-my-pele does not embed an agent. It stores what the agent writes and renders it.
`);

write('data-flow', 'constraint', `
- Diagram text is the source of truth. SVG is an output.
- Field prose follows \`config.yaml\` \`language\`. Node ids stay English kebab-case.
- \`validate\` must pass before \`export\` will write files.
`);

write('data-flow', 'concern', `
An agent can overwrite a careful hand edit. \`prev_diagram\` keeps the previous Mermaid text in meta.yaml, but this MVP does not show that diff in the viewer yet.
`);

write('data-flow', 'todo', `
- Surface \`prev_diagram\` in the side panel.
- Let \`export\` include a plain-text copy of each field next to its SVG for diffs that ignore HTML.
`);

write('data-flow', 'note', `
Watch events carry a timestamp, not a patch. The client refetches the whole document, which is small for these trees.
`);

write('data-flow/codebase', 'description', `
The repository the user pointed the agent at. oh-my-pele does not index it. The agent reads it with its own tools.
`);

write('data-flow/agent', 'description', `
Claude Code, Codex, or Cursor, after \`oh-my-pele setup\` has copied \`/pele-scan\` into that tool's skill directory.
`);

write('data-flow/skill', 'description', `
\`skills/pele-scan/SKILL.md\`. It is the procedure: three perspectives, drill-down, the seven field names, and a validate loop.
`);

write('data-flow/omm-dir', 'description', `
The \`.omm/\` directory. One folder per perspective, field files in that folder, and a subfolder for each child diagram. This is the only durable store.
`);

write('data-flow/omm-dir', 'diagram', `
graph TD
  perspective["Perspective folder"]
  description["description.md"]
  diagram["diagram.mmd"]
  context["context.md"]
  constraint["constraint.md"]
  concern["concern.md"]
  todo["todo.md"]
  note["note.md"]
  child["Child folder"]

  perspective -->|"what it is"| description
  perspective -->|"Mermaid source"| diagram
  perspective -->|"why it exists"| context
  perspective -->|"rules"| constraint
  perspective -->|"risks"| concern
  perspective -->|"follow-ups"| todo
  perspective -->|"asides"| note
  perspective -->|"nested diagram"| child
`);

write('data-flow/omm-dir', 'constraint', `
Readers ignore unknown files in a node folder. Extra keys in meta.yaml and config.yaml are kept when this CLI rewrites those files.
`);

write('data-flow/omm-dir', 'concern', `
Two tools writing the same diagram at once can clobber meta.yaml. There is no lock file.
`);

write('data-flow/omm-dir', 'todo', `
- Document a merge story for \`prev_diagram\` when oh-my-mermaid and oh-my-pele both write one tree.
`);

write('data-flow/pele', 'description', `
The pele npm package. \`parse\` checks syntax, \`render\` builds SVG for export, and \`mount\` draws the live page. The browser build is \`dist/pele.global.js\` inside that package.
`);

write('data-flow/viewer', 'description', `
The loopback site. It reads \`.omm\` on each request and again when the watcher fires.
`);

write('data-flow/export-bundle', 'description', `
\`index.html\` with the document and pele inlined, \`svg/*.svg\` for each diagram, and \`manifest.json\` listing those files. Opening the HTML from disk does not need a server.
`);

write('external-integrations', 'description', `
Everything this repo deliberately talks to. pele is a local library. The three coding agents only receive a SKILL.md on disk. GitHub Pages is an output format, not a deploy step this CLI performs. There is no cloud diagram host.
`);

write('external-integrations', 'diagram', `
graph LR
  oh-my-pele["oh-my-pele\\nthis package"]
  pele["pele\\nnpm, MIT, offline"]
  claude-code["Claude Code\\n.claude/skills"]
  codex["Codex\\n.agents/skills"]
  cursor["Cursor\\n.cursor/skills"]
  github-pages["GitHub Pages\\nstatic HTML"]

  oh-my-pele -->|"render and mount, no upload"| pele
  oh-my-pele -->|"installs /pele-scan"| claude-code
  oh-my-pele -->|"installs /pele-scan"| codex
  oh-my-pele -->|"installs /pele-scan"| cursor
  oh-my-pele -->|"writes a file you can host"| github-pages

  classDef external fill:#585b70,stroke:#585b70,color:#cdd6f4
  classDef entry fill:#89b4fa,stroke:#89b4fa,color:#1e1e2e

  class pele,claude-code,codex,cursor,github-pages external
  class oh-my-pele entry
`);

write('external-integrations', 'context', `
oh-my-mermaid can push \`.omm/\` to a hosted viewer. oh-my-pele stops at the files. Hosting the export is the user's choice: GitHub Pages, a gist, or nothing.
`);

write('external-integrations', 'constraint', `
- No telemetry and no default network calls during validate, view, or export.
- Setup only copies a Markdown file into skill directories. It does not log in to an editor marketplace.
- Upstream licenses stay attached: pele MIT (kepano), oh-my-mermaid MIT for the directory format, Lucide ISC only as it already ships inside pele.
`);

write('external-integrations', 'concern', `
Skill directory conventions move. Codex has used both \`~/.agents/skills\` and \`~/.codex/skills\`. This MVP installs the project skill at \`.agents/skills/pele-scan\` and the home skill at \`~/.codex/skills/pele-scan\`. A newer Codex build may look somewhere else until the paths are updated.
`);

write('external-integrations', 'todo', `
- Re-check Codex and Claude skill paths when those tools publish a newer layout.
- Add OpenClaw or Antigravity only if their skill directories are as stable as these three.
`);

write('external-integrations', 'note', `
This project is not an official Obsidian project. pele is used as a dependency, not as a fork, and the UI does not reuse Obsidian's product marks.
`);

write('external-integrations/oh-my-pele', 'description', `
The CLI and library in this repository. It is the only component that both reads the codebase's \`.omm\` folder and writes rendered output.
`);

write('external-integrations/pele', 'description', `
[pele](https://github.com/obsidianmd/pele) by kepano, MIT. A small synchronous Mermaid-to-SVG renderer with \`render()\`, \`mount()\`, and \`--pele-*\` CSS variables. oh-my-pele depends on the npm package and does not vendor its source.
`);

write('external-integrations/pele', 'constraint', `
Pele has no runtime dependencies. The diagrams it cannot parse are reported by \`validate\` with a line and column. This tool does not fall back to mermaid.js or to a hosted renderer.
`);

write('external-integrations/claude-code', 'description', `
Project skill path \`.claude/skills/pele-scan/SKILL.md\`. Global path \`~/.claude/skills/pele-scan/SKILL.md\`. The slash command is \`/pele-scan\`.
`);

write('external-integrations/codex', 'description', `
Project skill path \`.agents/skills/pele-scan/SKILL.md\`. Global path \`~/.codex/skills/pele-scan/SKILL.md\`.
`);

write('external-integrations/cursor', 'description', `
Project skill path \`.cursor/skills/pele-scan/SKILL.md\`. Global path \`~/.cursor/skills/pele-scan/SKILL.md\`.
`);

write('external-integrations/github-pages', 'description', `
A possible place to put the \`export\` output. The HTML file is self-contained and uses hash routes, so a static host can serve it as a single page. The CLI does not call the GitHub API.
`);

console.log('seeded', root);
