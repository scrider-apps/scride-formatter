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

import type { InsertOp, Op } from '@scrider/delta';
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

/**
 * Predicate: this op is a `\n`-op that terminates a simple-table cell
 * (i.e. it carries a `table-row` attribute).
 */
export function isTableNewlineOp(op: Op | undefined): boolean {
  if (!op || !isInsert(op) || !isTextInsert(op)) return false;
  if (!op.insert.includes('\n')) return false;
  return !!op.attributes && 'table-row' in op.attributes;
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
 * forward through contiguous table newlines and backward to the op just
 * after the previous non-table `\n`-op (or the start of the array).
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

  // Step 2: extend forward. The last contiguous table-newline is the end.
  let endOpIdx = probeIdx;
  for (let i = probeIdx + 1; i < ops.length; i++) {
    const op = ops[i];
    if (!op || !isInsert(op)) break;
    if (isTextInsert(op) && op.insert.includes('\n')) {
      if (isTableNewlineOp(op)) {
        endOpIdx = i;
      } else {
        break;
      }
    }
  }

  // Step 3: extend backward. The table starts right after the previous
  // non-table \n-op (or at index 0 if none).
  let startOpIdx = 0;
  for (let i = probeIdx - 1; i >= 0; i--) {
    const op = ops[i];
    if (!op || !isInsert(op)) {
      startOpIdx = i + 1;
      break;
    }
    if (isTextInsert(op) && op.insert.includes('\n') && !isTableNewlineOp(op)) {
      startOpIdx = i + 1;
      break;
    }
  }

  const regionOps = ops.slice(startOpIdx, endOpIdx + 1) as InsertOp[];
  return { startOpIdx, endOpIdx, ops: regionOps };
}
