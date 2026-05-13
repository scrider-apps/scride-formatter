/**
 * Simple-table region extraction tests.
 */

import { describe, expect, it } from 'vitest';
import type { Op } from '@scrider/delta';
import {
  extractTableRegion,
  isTableNewlineOp,
} from '../../../src/conversion/markdown/table-region';

const headerOp = (col: number, align?: string): Op => ({
  insert: '\n',
  attributes: {
    'table-row': 0,
    'table-col': col,
    'table-header': true,
    ...(align ? { 'table-col-align': align } : {}),
  },
});
const bodyOp = (row: number, col: number, align?: string): Op => ({
  insert: '\n',
  attributes: {
    'table-row': row,
    'table-col': col,
    ...(align ? { 'table-col-align': align } : {}),
  },
});

/** Two-row, two-column table flanked by plain paragraphs. */
const sampleOps: Op[] = [
  { insert: 'before' },
  { insert: '\n' },
  { insert: 'Name' },
  headerOp(0),
  { insert: 'Role' },
  headerOp(1),
  { insert: 'Alice' },
  bodyOp(1, 0),
  { insert: 'Engineer' },
  bodyOp(1, 1),
  { insert: 'after' },
  { insert: '\n' },
];

describe('isTableNewlineOp', () => {
  it('matches \\n-ops carrying a table-row attribute', () => {
    expect(isTableNewlineOp(headerOp(0))).toBe(true);
    expect(isTableNewlineOp(bodyOp(1, 0))).toBe(true);
  });

  it('does not match plain \\n-ops or non-newline ops', () => {
    expect(isTableNewlineOp({ insert: '\n' })).toBe(false);
    expect(isTableNewlineOp({ insert: '\n', attributes: { header: 1 } })).toBe(false);
    expect(isTableNewlineOp({ insert: 'plain text' })).toBe(false);
    expect(isTableNewlineOp({ insert: { formula: 'x' } })).toBe(false);
    expect(isTableNewlineOp(undefined)).toBe(false);
  });
});

describe('extractTableRegion', () => {
  it('returns null when the hint is outside the array', () => {
    expect(extractTableRegion(sampleOps, -1)).toBeNull();
    expect(extractTableRegion(sampleOps, sampleOps.length)).toBeNull();
    expect(extractTableRegion([], 0)).toBeNull();
  });

  it('returns null when the hint resolves to a non-table newline first', () => {
    // index 0 is "before", first newline forward is index 1 (non-table)
    expect(extractTableRegion(sampleOps, 0)).toBeNull();
    expect(extractTableRegion(sampleOps, 10)).toBeNull();
  });

  it('detects boundaries when the hint is on an inline op inside a cell', () => {
    // index 2 = "Name" (inline op of header cell 0)
    const region = extractTableRegion(sampleOps, 2);
    expect(region).not.toBeNull();
    expect(region!.startOpIdx).toBe(2);
    expect(region!.endOpIdx).toBe(9);
    expect(region!.ops).toHaveLength(8);
  });

  it('detects boundaries when the hint is on a cell-terminating \\n-op', () => {
    // index 3 = header cell 0's \n-op
    const region = extractTableRegion(sampleOps, 3);
    expect(region).not.toBeNull();
    expect(region!.startOpIdx).toBe(2);
    expect(region!.endOpIdx).toBe(9);
  });

  it('detects boundaries from a hint in the middle of the body', () => {
    // index 8 = "Engineer" (inline of row 1, col 1)
    const region = extractTableRegion(sampleOps, 8);
    expect(region).not.toBeNull();
    expect(region!.startOpIdx).toBe(2);
    expect(region!.endOpIdx).toBe(9);
  });

  it('starts at index 0 when the table is at the very beginning of the ops array', () => {
    const ops: Op[] = [
      { insert: 'H' },
      headerOp(0),
      { insert: 'B' },
      bodyOp(1, 0),
    ];
    const region = extractTableRegion(ops, 0);
    expect(region).not.toBeNull();
    expect(region!.startOpIdx).toBe(0);
    expect(region!.endOpIdx).toBe(3);
    expect(region!.ops).toHaveLength(4);
  });

  it('ends at the last table \\n when the table is at the end of the ops array', () => {
    const ops: Op[] = [
      { insert: 'paragraph' },
      { insert: '\n' },
      { insert: 'H' },
      headerOp(0),
      { insert: 'B' },
      bodyOp(1, 0),
    ];
    const region = extractTableRegion(ops, 2);
    expect(region).not.toBeNull();
    expect(region!.startOpIdx).toBe(2);
    expect(region!.endOpIdx).toBe(5);
  });

  it('excludes a trailing inline op that has no table-newline terminator', () => {
    const ops: Op[] = [
      { insert: 'H' },
      headerOp(0),
      { insert: 'B' },
      bodyOp(1, 0),
      { insert: 'tail-no-newline' },
    ];
    const region = extractTableRegion(ops, 0);
    expect(region).not.toBeNull();
    expect(region!.endOpIdx).toBe(3);
  });
});
