import { PeleError } from 'pele';
import { describe, expect, it } from 'vitest';
import { reservedIdHint, PELE_RESERVED_ID_WORDS } from '../lib/pele-ids.js';

function syntaxError(line: number, column: number): PeleError {
  return new PeleError('Parse error', 'syntax', { line, column });
}

describe('reservedIdHint', () => {
  it('suggests a rename for ids that start with a pele keyword', () => {
    const diagram = 'graph TD\n  a --> class-field["class-field"]';
    const hint = reservedIdHint(diagram, syntaxError(2, 9));
    expect(hint).toContain('"class-field"');
    expect(hint).toContain('"class" keyword');
    expect(hint).toContain('class_field');
  });

  it('handles every reserved word and dotted ids', () => {
    expect(reservedIdHint('graph TD\n  a --> style-box', syntaxError(2, 9))).toContain('style_box');
    expect(reservedIdHint('graph TD\n  a --> click-once', syntaxError(2, 9))).toContain('click_once');
    expect(reservedIdHint('graph TD\n  a --> subgraph-x', syntaxError(2, 9))).toContain('subgraph_x');
    expect(reservedIdHint('graph TD\n  a --> end-node', syntaxError(2, 9))).toContain('end_node');
    expect(reservedIdHint('graph TD\n  a --> class.f', syntaxError(2, 9))).toContain('class_f');
  });

  it('stays silent when the token is not a reserved-word id', () => {
    const diagram = 'graph TD\n  a --> classy\n  classy --> b';
    expect(reservedIdHint(diagram, syntaxError(2, 9))).toBeNull();
    // A bare keyword (legit class statement usage) is not an id either.
    const withClass = 'graph TD\n  a --> b\n  class a entry';
    expect(reservedIdHint(withClass, syntaxError(3, 3))).toBeNull();
  });

  it('stays silent for non-syntax errors and unknown lines', () => {
    const semantic = new PeleError('nope', 'semantic', { line: 1, column: 1 });
    expect(reservedIdHint('graph TD\n  a', semantic)).toBeNull();
    expect(reservedIdHint('graph TD\n  a', syntaxError(9, 1))).toBeNull();
    expect(PELE_RESERVED_ID_WORDS).toContain('end');
  });
});
