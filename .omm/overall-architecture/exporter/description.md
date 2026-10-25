`src/lib/export-site.ts` validates first, renders each diagram to SVG with pele, themes the SVG with the light `--pele-*` variables, and writes a single `index.html` that does not request a CDN.
