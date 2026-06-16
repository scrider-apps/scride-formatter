/**
 * Post-process flat table ops after remark GFM import.
 * Parity with editor-react `markdownTable.ts` header normalize passes.
 */

import { isInsert, type InsertOp, type Op } from '@scrider/delta';

import { isHeaderDashPlaceholder, normalizeHeaderCellForParse } from './table-header-markdown';

function isTableCellTerminator(op: Op): op is InsertOp {
  return (
    isInsert(op) &&
    typeof op.insert === 'string' &&
    op.insert === '\n' &&
    op.attributes !== undefined &&
    typeof op.attributes['table-row'] === 'number'
  );
}

/**
 * After remark parses a table whose first row is an empty header row, drop
 * synthetic row 0 from flat-Delta and reindex body rows (headerless table).
 */
export function normalizeSyntheticEmptyHeaderRow(ops: readonly Op[]): Op[] {
  type CellEnd = { row: number; col: number; newlineIdx: number; text: string };
  const ends: CellEnd[] = [];
  let buf = '';
  const textOpIndicesByCell: number[][] = [];
  let currentTextOps: number[] = [];

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;
    if (!isInsert(op)) continue;

    if (typeof op.insert === 'string' && op.insert !== '\n') {
      buf += op.insert;
      currentTextOps.push(i);
      continue;
    }

    if (isTableCellTerminator(op)) {
      const row = op.attributes!['table-row'] as number;
      const col = op.attributes!['table-col'] as number;
      ends.push({ row, col, newlineIdx: i, text: buf });
      textOpIndicesByCell.push([...currentTextOps]);
      buf = '';
      currentTextOps = [];
    }
  }

  const row0 = ends.filter((e) => e.row === 0);
  if (row0.length === 0) return [...ops];
  if (!row0.every((e) => e.text.trim() === '')) return [...ops];
  if (row0.some((e) => isHeaderDashPlaceholder(e.text))) return [...ops];

  const remove = new Set<number>();
  for (let j = 0; j < ends.length; j++) {
    const end = ends[j]!;
    if (end.row !== 0) continue;
    remove.add(end.newlineIdx);
    for (const ti of textOpIndicesByCell[j] ?? []) remove.add(ti);
  }

  const out: Op[] = [];
  for (let i = 0; i < ops.length; i++) {
    if (remove.has(i)) continue;
    const op = ops[i]!;
    if (!isTableCellTerminator(op)) {
      out.push(op);
      continue;
    }
    const row = op.attributes!['table-row'] as number;
    if (row === 0) continue;
    const attrs = { ...op.attributes };
    delete attrs['table-header'];
    out.push({
      insert: '\n',
      attributes: { ...attrs, 'table-row': row - 1 },
    });
  }
  return out;
}

/** Convert header-row `-` placeholders to empty cell content. */
export function normalizeHeaderDashPlaceholders(ops: readonly Op[]): Op[] {
  type CellEnd = { textOpIndices: number[]; text: string; isHeader: boolean };
  const ends: CellEnd[] = [];
  let buf = '';
  let currentTextOps: number[] = [];

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;
    if (!isInsert(op)) continue;

    if (typeof op.insert === 'string' && op.insert !== '\n') {
      buf += op.insert;
      currentTextOps.push(i);
      continue;
    }

    if (isTableCellTerminator(op)) {
      const row = op.attributes!['table-row'] as number;
      const isHeader = row === 0 && op.attributes!['table-header'] === true;
      ends.push({ isHeader, textOpIndices: [...currentTextOps], text: buf });
      buf = '';
      currentTextOps = [];
    }
  }

  const dashHeaderCells = ends.filter(
    (e) => e.isHeader && e.textOpIndices.length > 0 && isHeaderDashPlaceholder(e.text),
  );
  if (dashHeaderCells.length === 0) return [...ops];

  const replaceIndices = new Set<number>();
  for (const end of dashHeaderCells) {
    for (const ti of end.textOpIndices) replaceIndices.add(ti);
  }

  const out: Op[] = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;
    if (!replaceIndices.has(i)) {
      out.push(op);
      continue;
    }
    if (!isInsert(op)) {
      out.push(op);
      continue;
    }
    if (typeof op.insert === 'string' && op.insert !== '\n') {
      const normalized = normalizeHeaderCellForParse(op.insert, true);
      if (normalized.length === 0) continue;
      out.push(
        op.attributes
          ? { insert: normalized, attributes: op.attributes }
          : { insert: normalized },
      );
    } else {
      out.push(op);
    }
  }
  return out;
}

/** Apply headerless + dash placeholder normalization to one table op slice. */
export function normalizeImportedTableOps(ops: readonly Op[]): Op[] {
  if (ops.length === 0) return [...ops];

  type CellEnd = { row: number; text: string };
  const ends: CellEnd[] = [];
  let buf = '';
  for (const op of ops) {
    if (!isInsert(op)) continue;
    if (typeof op.insert === 'string' && op.insert !== '\n') {
      buf += op.insert;
      continue;
    }
    if (isTableCellTerminator(op)) {
      ends.push({ row: op.attributes!['table-row'] as number, text: buf });
      buf = '';
    }
  }

  const row0 = ends.filter((e) => e.row === 0);
  const headerless =
    row0.length > 0 &&
    row0.every((e) => e.text.trim() === '') &&
    !row0.some((e) => isHeaderDashPlaceholder(e.text));

  if (headerless) return normalizeSyntheticEmptyHeaderRow(ops);
  return normalizeHeaderDashPlaceholders(ops);
}
