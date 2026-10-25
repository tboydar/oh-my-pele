/** Pele theme variables shared by the viewer and exported SVGs. */
export const LIGHT_PELE: Record<string, string> = {
  '--pele-bg': '#fffdf8',
  '--pele-fg': '#231f1b',
  '--pele-muted': '#6f675e',
  '--pele-line': '#3f3832',
  '--pele-surface': '#f4efe6',
  '--pele-surface-alt': '#e7dfd2',
  '--pele-border': '#d4cbbd',
  '--pele-accent': '#c2410c',
  '--pele-font': 'Georgia, "Iowan Old Style", Palatino, "Palatino Linotype", serif',
  '--pele-radius': '8px',
};

export const DARK_PELE: Record<string, string> = {
  '--pele-bg': '#1c1815',
  '--pele-fg': '#f6f1e8',
  '--pele-muted': '#b3a89c',
  '--pele-line': '#e7dfd4',
  '--pele-surface': '#2a2420',
  '--pele-surface-alt': '#3a322c',
  '--pele-border': '#5c5148',
  '--pele-accent': '#ff7a45',
  '--pele-font': 'Georgia, "Iowan Old Style", Palatino, "Palatino Linotype", serif',
  '--pele-radius': '8px',
};

export const LIGHT_UI: Record<string, string> = {
  '--bg': '#efeae2',
  '--panel': '#e7e0d4',
  '--sheet': '#fffdf8',
  '--ink': '#231f1b',
  '--muted': '#6f675e',
  '--line': '#ddd4c6',
  '--accent': '#c2410c',
  '--accent-ink': '#fff7f2',
  '--concern-bg': '#fde8e1',
  '--constraint-bg': '#e5eef8',
  '--todo-bg': '#fbf3d5',
  '--note-bg': '#e7f3ea',
  '--context-bg': '#f7f1e6',
  '--shadow': '0 18px 50px rgba(70, 46, 24, 0.08)',
  '--grid': 'rgba(80, 56, 32, 0.14)',
};

export const DARK_UI: Record<string, string> = {
  '--bg': '#12100e',
  '--panel': '#1c1815',
  '--sheet': '#221e1b',
  '--ink': '#f6f1e8',
  '--muted': '#b3a89c',
  '--line': '#3a332c',
  '--accent': '#ff7a45',
  '--accent-ink': '#2a1208',
  '--concern-bg': '#3a2420',
  '--constraint-bg': '#1d2833',
  '--todo-bg': '#332b16',
  '--note-bg': '#1b2a20',
  '--context-bg': '#2a241c',
  '--shadow': '0 18px 50px rgba(0, 0, 0, 0.35)',
  '--grid': 'rgba(246, 241, 232, 0.08)',
};

export function declarations(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}

export function themeBlock(selector: string, vars: Record<string, string>): string {
  const body = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}
