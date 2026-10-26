import { PeleError } from 'pele';

/**
 * Words pele's flowchart lexer always reads as keywords, never as node ids.
 * Mermaid is more lenient: `class-field` is a valid id there. When a diagram
 * uses such an id, pele fails with a generic `Expecting ..., got 'CLASS'`
 * syntax error that does not say what to change.
 */
export const PELE_RESERVED_ID_WORDS = ['class', 'style', 'click', 'subgraph', 'end'];

/**
 * When a pele syntax error sits on a node id that starts with a reserved
 * word, explain the conflict and suggest a concrete rename. Returns null when
 * the error has nothing to do with a reserved-word id, in which case pele's
 * own message is the best we have.
 */
export function reservedIdHint(diagram: string, error: PeleError): string | null {
  if (error.code !== 'syntax' || !error.line || !error.column) return null;
  const line = diagram.split('\n')[error.line - 1];
  if (line === undefined) return null;

  const token = tokenAt(line, error.column - 1);
  if (!token) return null;

  for (const word of PELE_RESERVED_ID_WORDS) {
    const separator = token[word.length];
    if (!token.startsWith(word) || token.length === word.length) continue;
    if (separator !== '-' && separator !== '.') continue;
    const rest = token.slice(word.length).replace(/^[-.]+/, '');
    if (!rest) continue;
    const safeId = `${word}_${rest}`;
    return (
      `The node id "${token}" starts with "${word}", which pele reads as the "${word}" keyword ` +
      `(Mermaid accepts this id, pele does not). Rename the id to "${safeId}" and keep the ` +
      `bracket label as the display text, e.g. ${safeId}["${token}"].`
    );
  }

  return null;
}

/** Extract the id-like token at or next to a 0-based column on a source line. */
function tokenAt(line: string, column: number): string | null {
  const isTokenChar = (ch: string | undefined) => ch !== undefined && /[\w.-]/.test(ch);
  if (!isTokenChar(line[column])) return null;
  let start = column;
  while (start > 0 && isTokenChar(line[start - 1])) start -= 1;
  let end = column;
  while (end < line.length && isTokenChar(line[end])) end += 1;
  return line.slice(start, end);
}
