/**
 * Simple-table region detection in flat Delta.
 *
 * Helpers for callers (e.g. editors that need to find the boundaries of a
 * markdown-style table within a Delta op stream — for example to enter
 * "edit as markdown source" mode on double-click of a rendered table cell).
 *
 * A simple-table region is a contiguous run of ops that ends, for each cell,
 * with a `\n`-op carrying the `table-row` attribute (the standard format
 * produced by {@link markdownToDelta} for GFM tables and consumed by
 * {@link deltaToMarkdown}).
 */

import type { AttributeMap, InsertOp, Op } from '@scrider/delta';
import { isInsert, isTextInsert } from '@scrider/delta';

/**
 * Detected boundaries of a simple-table region.
 */
export interface TableRegion {
  /** Inclusive start index in the original ops array. */
  startOpIdx: number;
  /**
   * Inclusive end index — always points at the last `\n`-op of the table
   * (the terminator of the last cell of the last row).
   */
  endOpIdx: number;
  /** Slice of the original ops array covering the region. */
  ops: InsertOp[];
}

/** Coordinates carried on a simple-table cell terminator `\n`. */
export interface TableCellCoords {
  row: number;
  col: number;
}

/**
 * Predicate: this op is a `\n`-op that terminates a simple-table cell
 * (i.e. it carries a `table-row` attribute).
 */
export function isTableNewlineOp(op: Op | undefined): boolean {
  if (!op || !isInsert(op) || !isTextInsert(op)) return false;
  if (!op.insert.includes('\n')) return false;
  return !!op.attributes && 'table-row' in op.attributes;
}

export function tableCellCoordsFromAttributes(
  attrs: AttributeMap | undefined,
): TableCellCoords | null {
  if (!attrs || typeof attrs['table-row'] !== 'number' || typeof attrs['table-col'] !== 'number') {
    return null;
  }
  return { row: attrs['table-row'], col: attrs['table-col'] };
}

export function tableCellCoordsFromOp(op: Op): TableCellCoords | null {
  if (!isTableNewlineOp(op) || !isTextInsert(op)) return null;
  return tableCellCoordsFromAttributes(op.attributes);
}

/**
 * True when `next` begins a new simple-table grid immediately after `prev`
 * with no plain paragraph `\n` between them.
 *
 * Patterns:
 *   • row decreases (e.g. 1 → 0) — new grid after a multi-row table
 *   • both on row 0 but col resets to 0 — two single-row tables stacked
 */
export function isAdjacentSimpleTableGridBoundary(
  prev: TableCellCoords,
  next: TableCellCoords,
): boolean {
  if (next.row < prev.row) return true;
  if (next.row === 0 && prev.row === 0 && next.col === 0 && prev.col > 0) return true;
  return false;
}

/**
 * Collect consecutive table lines for one simple-table grid.
 * Stops at the first non-table line or at an adjacent-grid boundary.
 */
export function collectAdjacentTableLines<T extends { attributes?: AttributeMap | undefined }>(
  lines: readonly T[],
  startIndex: number,
): T[] {
  const result: T[] = [];
  let prevCoords: TableCellCoords | null = null;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) break;
    const coords = tableCellCoordsFromAttributes(line.attributes);
    if (!coords) break;
    if (prevCoords && isAdjacentSimpleTableGridBoundary(prevCoords, coords)) break;
    result.push(line);
    prevCoords = coords;
  }
  return result;
}

/**
 * Find the boundaries of the simple-table region containing the given hint
 * op index. The hint may be:
 *   - an inline op inside a cell,
 *   - the cell-terminating `\n`-op itself,
 *   - any op between two table newlines.
 *
 * The function walks **forward** from the hint to find the nearest `\n`-op:
 * if it does not carry a `table-row` attribute, the hint is not inside a
 * table and `null` is returned. Otherwise the algorithm extends the region
 * forward through contiguous table newlines (stopping at adjacent-grid
 * boundaries) and backward to the op just after the previous non-table
 * `\n`-op or adjacent-grid boundary (or the start of the array).
 *
 * @param ops - The full ops array (e.g. `delta.ops`).
 * @param hintOpIdx - Any op index known or guessed to be within a table.
 * @returns The detected region, or `null` if `hintOpIdx` is out of range or
 *   not within any simple-table region.
 *
 * @example
 * // After hit-testing a `<td>` element to a Delta op index:
 * const region = extractTableRegion(state.delta.ops, hitOpIdx);
 * if (region) {
 *   const md = deltaToMarkdown(new Delta(region.ops), {
 *     trimTrailingNewlines: true,
 *   });
 *   // replace ops in [region.startOpIdx, region.endOpIdx] with a single
 *   // { insert: md + '\n' } op to enter source-edit mode
 * }
 */
export function extractTableRegion(
  ops: readonly Op[],
  hintOpIdx: number,
): TableRegion | null {
  if (hintOpIdx < 0 || hintOpIdx >= ops.length) return null;

  // Step 1: find the first \n-op at or after the hint. If it is not a
  // table-newline, the hint is not inside a table cell.
  let probeIdx = -1;
  for (let i = hintOpIdx; i < ops.length; i++) {
    const op = ops[i];
    if (!op || !isInsert(op)) continue;
    if (isTextInsert(op) && op.insert.includes('\n')) {
      probeIdx = i;
      break;
    }
  }
  if (probeIdx < 0) return null;
  if (!isTableNewlineOp(ops[probeIdx])) return null;

  const probeCoords = tableCellCoordsFromOp(ops[probeIdx]!);
  if (!probeCoords) return null;

  // Step 2: extend forward through table newlines until a plain \n or grid boundary.
  let endOpIdx = probeIdx;
  let prevCoords = probeCoords;
  for (let i = probeIdx + 1; i < ops.length; i++) {
    const op = ops[i];
    if (!op || !isInsert(op)) break;
    if (!isTextInsert(op) || !op.insert.includes('\n')) continue;
    if (isTableNewlineOp(op)) {
      const coords = tableCellCoordsFromOp(op)!;
      if (isAdjacentSimpleTableGridBoundary(prevCoords, coords)) break;
      prevCoords = coords;
      endOpIdx = i;
    } else {
      break;
    }
  }

  // Step 3: extend backward through table newlines until a plain \n or grid boundary.
  let startOpIdx = 0;
  let nextCoords = probeCoords;
  for (let i = probeIdx - 1; i >= 0; i--) {
    const op = ops[i];
    if (!op || !isInsert(op)) {
      startOpIdx = i + 1;
      break;
    }
    if (!isTextInsert(op) || !op.insert.includes('\n')) continue;
    if (isTableNewlineOp(op)) {
      const coords = tableCellCoordsFromOp(op)!;
      if (isAdjacentSimpleTableGridBoundary(coords, nextCoords)) {
        startOpIdx = i + 1;
        break;
      }
      nextCoords = coords;
    } else {
      startOpIdx = i + 1;
      break;
    }
  }

  const regionOps = ops.slice(startOpIdx, endOpIdx + 1) as InsertOp[];
  return { startOpIdx, endOpIdx, ops: regionOps };
}
