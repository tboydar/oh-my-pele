export const VALID_FIELDS = [
  'description',
  'diagram',
  'constraint',
  'concern',
  'context',
  'todo',
  'note',
] as const;

export type Field = (typeof VALID_FIELDS)[number];

export const FIELD_FILES: Record<Field, string> = {
  description: 'description.md',
  diagram: 'diagram.mmd',
  constraint: 'constraint.md',
  concern: 'concern.md',
  context: 'context.md',
  todo: 'todo.md',
  note: 'note.md',
};

export type NodeKind = 'perspective' | 'nested-class';

export interface OmmFields {
  description: string | null;
  diagram: string | null;
  constraint: string | null;
  concern: string | null;
  context: string | null;
  todo: string | null;
  note: string | null;
}

export interface OmmNode {
  id: string;
  /** Slash path from the perspective down, e.g. `overall-architecture/viewer`. */
  path: string;
  title: string;
  kind: NodeKind;
  fields: OmmFields;
  children: OmmNode[];
}

export interface OmmConfig {
  version?: string;
  theme?: string;
  language?: string;
  [key: string]: unknown;
}

export interface OmmDocument {
  project: string;
  /** Absolute project directory that contains `.omm`. */
  projectDir: string;
  config: OmmConfig;
  perspectives: OmmNode[];
}

/** Payload embedded in the viewer. Absolute paths stay on the server. */
export interface ClientDoc {
  project: string;
  config: {
    version?: string;
    theme?: string;
    language?: string;
  };
  perspectives: OmmNode[];
}

export interface ValidationIssue {
  level: 'error' | 'warning';
  rule: string;
  message: string;
  path: string;
  line?: number;
  column?: number;
}

export interface ValidationReport {
  ok: boolean;
  diagrams: number;
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
}

export function emptyFields(): OmmFields {
  return {
    description: null,
    diagram: null,
    constraint: null,
    concern: null,
    context: null,
    todo: null,
    note: null,
  };
}

export function isField(value: string): value is Field {
  return (VALID_FIELDS as readonly string[]).includes(value);
}

export function humanize(id: string): string {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function toClientDoc(doc: OmmDocument): ClientDoc {
  return {
    project: doc.project,
    config: {
      version: typeof doc.config.version === 'string' ? doc.config.version : undefined,
      theme: typeof doc.config.theme === 'string' ? doc.config.theme : undefined,
      language: typeof doc.config.language === 'string' ? doc.config.language : undefined,
    },
    perspectives: doc.perspectives,
  };
}
