import type { Op } from '@scrider/delta';
import { Delta } from '@scrider/delta';
import type { BlockContext, BlockHandler } from '../BlockHandler';
import type { Registry } from '../Registry';
import { normalizeDelta } from '../../conversion/sanitize';
import type { DOMElement } from '../../conversion/adapters/types';
import { isElement } from '../../conversion/adapters/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Cell alignment options
 */
export type CellAlign = 'left' | 'center' | 'right';

/**
 * Data for a single cell in an Extended Table.
 *
 * Every non-merged cell must have `ops` — a nested Delta (Op[]).
 * Empty cells use `{ ops: [{ insert: "\n" }] }`.
 */
export interface CellData {
  /** Nested Delta content (full rich-text) */
  ops: Op[];
  /** Number of columns this cell spans (default: 1) */
  colspan?: number;
  /** Number of rows this cell spans (default: 1) */
  rowspan?: number;
}

/**
 * Extended Table block data.
 *
 * Stored in Delta as: `{ insert: { block: <TableBlockData> } }`
 *
 * All coordinates "r:c" within the grid MUST be present in `cells`.
 * - `CellData` — cell with content
 * - `null` — cell absorbed by neighbor's colspan/rowspan
 * - Missing key — INVALID (validate() rejects)
 */
export interface TableBlockData {
  /** Block type discriminator */
  type: 'table';
  /** Number of header rows (default: 0) */
  headerRows?: number;
  /** Column widths (percentages by default) */
  colWidths?: number[];
  /** Column alignments */
  colAligns?: (CellAlign | null)[];
  /** Cells indexed by "row:col" */
  cells: Record<string, CellData | null>;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/** Pattern for cell key: "row:col" where row and col are non-negative integers */
const CELL_KEY_RE = /^(\d+):(\d+)$/;

/**
 * Parse cell key "r:c" into [row, col] or null if invalid.
 */
function parseCellKey(key: string): [number, number] | null {
  const match = CELL_KEY_RE.exec(key);
  if (!match) return null;
  return [parseInt(match[1]!, 10), parseInt(match[2]!, 10)];
}

/**
 * Determine grid dimensions from cell keys.
 * Returns [rows, cols] or null if no valid keys.
 */
function getGridDimensions(cells: Record<string, CellData | null>): [number, number] | null {
  let maxRow = -1;
  let maxCol = -1;

  for (const key of Object.keys(cells)) {
    const parsed = parseCellKey(key);
    if (!parsed) return null; // invalid key format
    const [r, c] = parsed;
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }

  if (maxRow < 0 || maxCol < 0) return null;
  return [maxRow + 1, maxCol + 1];
}

/**
 * Validate that a CellData has valid ops (non-empty array).
 */
function isValidCellData(cell: CellData): boolean {
  return (
    typeof cell === 'object' &&
    cell !== null &&
    Array.isArray(cell.ops) &&
    cell.ops.length > 0 &&
    (cell.colspan === undefined || (Number.isInteger(cell.colspan) && cell.colspan >= 1)) &&
    (cell.rowspan === undefined || (Number.isInteger(cell.rowspan) && cell.rowspan >= 1))
  );
}

/**
 * Validate that merged (null) cells correspond to cells with colspan/rowspan.
 *
 * For each cell with colspan > 1 or rowspan > 1, all covered cells must be null.
 * Conversely, every null cell must be covered by exactly one spanning cell.
 */
function validateMergedCells(
  cells: Record<string, CellData | null>,
  rows: number,
  cols: number,
): boolean {
  // Track which cells are covered by a span
  const covered = new Set<string>();

  // First pass: collect all cells that should be covered by spans
  for (const [key, cell] of Object.entries(cells)) {
    if (cell === null) continue;

    const parsed = parseCellKey(key);
    if (!parsed) return false;
    const [r, c] = parsed;

    const cs = cell.colspan ?? 1;
    const rs = cell.rowspan ?? 1;

    // Check that span doesn't exceed grid
    if (r + rs > rows || c + cs > cols) return false;

    // Mark covered cells (excluding the source cell itself)
    for (let dr = 0; dr < rs; dr++) {
      for (let dc = 0; dc < cs; dc++) {
        if (dr === 0 && dc === 0) continue; // skip source
        const coveredKey = `${r + dr}:${c + dc}`;
        if (covered.has(coveredKey)) return false; // double coverage
        covered.add(coveredKey);
      }
    }
  }

  // Second pass: verify every null cell is covered, and no non-null cell is covered
  for (const [key, cell] of Object.entries(cells)) {
    if (cell === null) {
      if (!covered.has(key)) return false; // null but not covered
    } else {
      if (covered.has(key)) return false; // non-null but covered
    }
  }

  return true;
}

// ============================================================================
// Rendering Helpers
// ============================================================================

/**
 * Render a single row of an Extended Table.
 */
function renderExtendedRow(
  data: TableBlockData,
  row: number,
  cols: number,
  defaultCellTag: 'th' | 'td',
  context: BlockContext,
  pretty: boolean,
): string {
  const nl = pretty ? '\n' : '';
  const ind = (level: number): string => (pretty ? '  '.repeat(level) : '');

  let html = `${ind(2)}<tr>${nl}`;

  for (let c = 0; c < cols; c++) {
    const key = `${row}:${c}`;
    const cell = data.cells[key];

    // Skip null cells (covered by colspan/rowspan)
    if (cell === null) continue;

    // Skip if cell is undefined (shouldn't happen in valid data)
    if (cell === undefined) continue;

    const cellTag = row < (data.headerRows ?? 0) ? 'th' : defaultCellTag;
    const attrs: string[] = [];

    // colspan/rowspan attributes
    if (cell.colspan && cell.colspan > 1) {
      attrs.push(`colspan="${cell.colspan}"`);
    }
    if (cell.rowspan && cell.rowspan > 1) {
      attrs.push(`rowspan="${cell.rowspan}"`);
    }

    // Column alignment
    if (data.colAligns) {
      const align = data.colAligns[c];
      if (align && align !== 'left') {
        attrs.push(`style="text-align: ${align}"`);
      }
    }

    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

    // Render cell content via context.renderDelta (recursive)
    let content = '';
    if (context.renderDelta) {
      content = context.renderDelta(cell.ops);
    }

    html += `${ind(3)}<${cellTag}${attrStr}>${content}</${cellTag}>${nl}`;
  }

  html += `${ind(2)}</tr>${nl}`;
  return html;
}

// ============================================================================
// GFM Markdown Helpers
// ============================================================================

/**
 * Check whether an Extended Table can be losslessly represented as
 * a GFM Markdown table (no colspan, rowspan, colWidths).
 */
function isGfmCompatible(data: TableBlockData): boolean {
  // colWidths → not representable in GFM
  if (data.colWidths && data.colWidths.some((w) => w > 0)) {
    return false;
  }

  // Check cells for colspan/rowspan
  for (const cell of Object.values(data.cells)) {
    if (cell === null) return false; // null means merged — not GFM
    if (cell.colspan && cell.colspan > 1) return false;
    if (cell.rowspan && cell.rowspan > 1) return false;
  }

  return true;
}

/**
 * Strip trailing newlines from rendered Markdown cell content.
 * Cell ops always end with `\n`, but we don't want that inside a table cell.
 */
function stripCellContent(rendered: string): string {
  return rendered.replace(/\n+$/, '').replace(/\n/g, ' ');
}

/**
 * Render a GFM-compatible Extended Table as a Markdown table string.
 */
function renderGfmTable(data: TableBlockData, context: BlockContext): string {
  const dims = getGridDimensions(data.cells);
  if (!dims) return '';
  const [rows, cols] = dims;

  const headerRows = data.headerRows ?? 0;
  const lines: string[] = [];

  // GFM requires a header row. If headerRows === 0, synthesize an empty one.
  if (headerRows === 0) {
    const emptyParts: string[] = [];
    for (let c = 0; c < cols; c++) {
      emptyParts.push(' ');
    }
    lines.push('| ' + emptyParts.join(' | ') + ' |');
    lines.push(renderGfmSeparator(cols, data.colAligns));
  }

  for (let r = 0; r < rows; r++) {
    const parts: string[] = [];
    for (let c = 0; c < cols; c++) {
      const cell = data.cells[`${r}:${c}`];
      let text = '';
      if (cell && context.renderDelta) {
        text = stripCellContent(context.renderDelta(cell.ops));
      }
      // Escape pipe characters inside cell content
      parts.push(text.replace(/\|/g, '\\|'));
    }
    lines.push('| ' + parts.join(' | ') + ' |');

    // After header row(s), insert GFM separator
    if (headerRows > 0 && r === headerRows - 1) {
      lines.push(renderGfmSeparator(cols, data.colAligns));
    }
  }

  return lines.join('\n');
}

/**
 * Render the GFM separator row: | --- | :---: | ---: |
 */
function renderGfmSeparator(cols: number, colAligns?: (CellAlign | null)[]): string {
  const sepParts: string[] = [];
  for (let c = 0; c < cols; c++) {
    const align = colAligns?.[c];
    if (align === 'center') {
      sepParts.push(':---:');
    } else if (align === 'right') {
      sepParts.push('---:');
    } else if (align === 'left') {
      sepParts.push(':---');
    } else {
      sepParts.push('---');
    }
  }
  return '| ' + sepParts.join(' | ') + ' |';
}

// ============================================================================
// Parsing Helpers (HTML → TableBlockData)
// ============================================================================

/**
 * Collect `<tr>` rows from a `<table>` element,
 * tracking which belong to `<thead>` (header rows).
 */
function collectTableRows(table: DOMElement): { rows: DOMElement[]; headerRowCount: number } {
  const rows: DOMElement[] = [];
  let headerRowCount = 0;

  const children = table.childNodes;
  for (let i = 0; i < children.length; i++) {
    const section = children[i];
    if (!section || !isElement(section)) continue;

    const sectionTag = section.tagName.toLowerCase();

    if (sectionTag === 'thead' || sectionTag === 'tbody' || sectionTag === 'tfoot') {
      const isHeader = sectionTag === 'thead';
      const sectionChildren = section.childNodes;
      for (let j = 0; j < sectionChildren.length; j++) {
        const row = sectionChildren[j];
        if (!row || !isElement(row) || row.tagName.toLowerCase() !== 'tr') continue;
        rows.push(row);
        if (isHeader) headerRowCount++;
      }
    } else if (sectionTag === 'tr') {
      rows.push(section);
    }
  }

  return { rows, headerRowCount };
}

/**
 * Extract colWidths from `<colgroup>` → `<col>` elements.
 * Returns an array of widths or undefined if no `<colgroup>`.
 */
function extractColWidths(table: DOMElement): number[] | undefined {
  const children = table.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child || !isElement(child) || child.tagName.toLowerCase() !== 'colgroup') continue;

    const widths: number[] = [];
    const cols = child.childNodes;
    for (let j = 0; j < cols.length; j++) {
      const col = cols[j];
      if (!col || !isElement(col) || col.tagName.toLowerCase() !== 'col') continue;

      let width = 0;
      const style = col.getAttribute('style') || '';
      const widthMatch = style.match(/width:\s*([\d.]+)(%|px)/);
      if (widthMatch?.[1]) {
        width = parseFloat(widthMatch[1]);
      } else {
        const widthAttr = col.getAttribute('width');
        if (widthAttr) {
          width = parseFloat(widthAttr) || 0;
        }
      }
      widths.push(width);
    }

    if (widths.length > 0) return widths;
  }

  return undefined;
}

/**
 * Extract text-align from a cell element's style attribute.
 */
function extractCellAlign(cell: DOMElement): CellAlign | null {
  const textAlign = cell.style?.textAlign || cell.style?.getPropertyValue?.('text-align');
  if (textAlign === 'left' || textAlign === 'center' || textAlign === 'right') {
    return textAlign;
  }

  // Fallback: parse style string directly
  const style = cell.getAttribute('style') || '';
  const match = style.match(/text-align:\s*(left|center|right)/);
  if (match?.[1]) {
    return match[1] as CellAlign;
  }

  return null;
}

/**
 * Parse a `<table>` element into TableBlockData.
 *
 * Steps:
 * 1. Iterate `<thead>` → count headerRows
 * 2. Iterate `<tbody>` / direct `<tr>` → data rows
 * 3. For each `<td>`/`<th>`:
 *    - Read colspan/rowspan from attributes
 *    - `context.parseElement!(td)` → ops
 *    - Fill null for merged cells
 * 4. Extract colWidths from `<col>` / style
 * 5. Extract colAligns from `style="text-align: ..."` on first row cells
 * 6. Return `{ type: 'table', headerRows, colWidths, colAligns, cells }`
 */
function parseTableElement(table: DOMElement, context: BlockContext): TableBlockData | null {
  const { rows, headerRowCount } = collectTableRows(table);
  if (rows.length === 0) return null;

  const cells: Record<string, CellData | null> = {};
  const colAligns: (CellAlign | null)[] = [];
  let maxCol = 0;
  let firstRowProcessed = false;

  // Track which grid positions are occupied by spanning cells
  const occupied = new Set<string>();

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]!;
    let colIdx = 0;
    const cellChildren = row.childNodes;

    for (let ci = 0; ci < cellChildren.length; ci++) {
      const cell = cellChildren[ci];
      if (!cell || !isElement(cell)) continue;
      const cellTag = cell.tagName.toLowerCase();
      if (cellTag !== 'td' && cellTag !== 'th') continue;

      // Skip occupied positions (from previous row/col spans)
      while (occupied.has(`${rowIdx}:${colIdx}`)) {
        colIdx++;
      }

      // Read colspan/rowspan
      const colspanAttr = cell.getAttribute('colspan');
      const rowspanAttr = cell.getAttribute('rowspan');
      const colspan = colspanAttr ? parseInt(colspanAttr, 10) || 1 : 1;
      const rowspan = rowspanAttr ? parseInt(rowspanAttr, 10) || 1 : 1;

      // Parse cell content via context.parseElement
      let ops: Op[];
      if (context.parseElement) {
        ops = context.parseElement(cell);
        if (ops.length === 0) {
          ops = [{ insert: '\n' }];
        }
      } else {
        ops = [{ insert: '\n' }];
      }

      // Build CellData
      const cellData: CellData = { ops };
      if (colspan > 1) cellData.colspan = colspan;
      if (rowspan > 1) cellData.rowspan = rowspan;

      cells[`${rowIdx}:${colIdx}`] = cellData;

      // Mark spanned positions as occupied + fill null
      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          if (dr === 0 && dc === 0) continue;
          const coveredKey = `${rowIdx + dr}:${colIdx + dc}`;
          occupied.add(coveredKey);
          cells[coveredKey] = null;
        }
      }

      // Also mark positions in current row for multi-column
      for (let dc = 1; dc < colspan; dc++) {
        occupied.add(`${rowIdx}:${colIdx + dc}`);
      }

      // Collect column alignments from first data row
      if (!firstRowProcessed) {
        const align = extractCellAlign(cell);
        // Fill for colspan
        for (let dc = 0; dc < colspan; dc++) {
          colAligns.push(align);
        }
      }

      const cellEndCol = colIdx + colspan - 1;
      if (cellEndCol > maxCol) maxCol = cellEndCol;

      colIdx += colspan;
    }

    // Update maxCol for any remaining occupied positions
    while (occupied.has(`${rowIdx}:${colIdx}`)) {
      colIdx++;
    }
    if (colIdx - 1 > maxCol) maxCol = colIdx - 1;

    if (!firstRowProcessed) firstRowProcessed = true;
  }

  const totalCols = maxCol + 1;
  const totalRows = rows.length;

  // Ensure all grid positions are present (fill missing as empty cells)
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      const key = `${r}:${c}`;
      if (!(key in cells)) {
        cells[key] = { ops: [{ insert: '\n' }] };
      }
    }
  }

  // Build result
  const result: TableBlockData = {
    type: 'table',
    cells,
  };

  if (headerRowCount > 0) {
    result.headerRows = headerRowCount;
  }

  // Extract colWidths from <colgroup>
  const colWidths = extractColWidths(table);
  if (colWidths) {
    // Ensure colWidths has correct length
    while (colWidths.length < totalCols) colWidths.push(0);
    if (colWidths.length > totalCols) colWidths.length = totalCols;
    result.colWidths = colWidths;
  }

  // Add colAligns if any non-null
  if (colAligns.length > 0 && colAligns.some((a) => a !== null)) {
    // Ensure correct length
    while (colAligns.length < totalCols) colAligns.push(null);
    if (colAligns.length > totalCols) colAligns.length = totalCols;
    result.colAligns = colAligns;
  }

  return result;
}

// ============================================================================
// TableBlockHandler
// ============================================================================

/**
 * BlockHandler implementation for Extended Table.
 *
 * Handles validation, HTML conversion, and nested Delta access.
 * toHtml/fromHtml are implemented in E.3/E.4 stages.
 */
export const tableBlockHandler: BlockHandler<TableBlockData> = {
  type: 'table',

  validate(data: TableBlockData): boolean {
    // 1. Type check
    if (!data || typeof data !== 'object' || data.type !== 'table') {
      return false;
    }

    // 2. Cells must be a non-empty object
    if (!data.cells || typeof data.cells !== 'object' || Array.isArray(data.cells)) {
      return false;
    }

    const cellKeys = Object.keys(data.cells);
    if (cellKeys.length === 0) return false;

    // 3. All keys must be valid "r:c" format
    for (const key of cellKeys) {
      if (!CELL_KEY_RE.test(key)) return false;
    }

    // 4. Determine grid dimensions
    const dims = getGridDimensions(data.cells);
    if (!dims) return false;
    const [rows, cols] = dims;

    // 5. All coordinates within grid must be present (no holes)
    if (cellKeys.length !== rows * cols) return false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!(`${r}:${c}` in data.cells)) return false;
      }
    }

    // 6. Each non-null cell must have valid CellData
    for (const [, cell] of Object.entries(data.cells)) {
      if (cell !== null && !isValidCellData(cell)) return false;
    }

    // 7. Validate merged cells consistency
    if (!validateMergedCells(data.cells, rows, cols)) return false;

    // 8. headerRows validation
    if (data.headerRows !== undefined) {
      if (!Number.isInteger(data.headerRows) || data.headerRows < 0 || data.headerRows > rows) {
        return false;
      }
    }

    // 9. colWidths validation
    if (data.colWidths !== undefined) {
      if (!Array.isArray(data.colWidths) || data.colWidths.length !== cols) {
        return false;
      }
      for (const w of data.colWidths) {
        if (typeof w !== 'number' || w < 0) return false;
      }
    }

    // 10. colAligns validation
    if (data.colAligns !== undefined) {
      if (!Array.isArray(data.colAligns) || data.colAligns.length !== cols) {
        return false;
      }
      const validAligns: (string | null)[] = ['left', 'center', 'right', null];
      for (const a of data.colAligns) {
        if (!validAligns.includes(a)) return false;
      }
    }

    return true;
  },

  // ── Conversion ──────────────────────────────────────────────

  toHtml(data: TableBlockData, context: BlockContext): string {
    const pretty = context.options?.pretty ?? false;
    const nl = pretty ? '\n' : '';
    const ind = (level: number): string => (pretty ? '  '.repeat(level) : '');

    // Determine grid dimensions from cells
    const dims = getGridDimensions(data.cells);
    if (!dims) return '';
    const [rows, cols] = dims;
    const headerRows = data.headerRows ?? 0;

    let html = `<table>${nl}`;

    // Render <colgroup> if colWidths specified
    if (data.colWidths && data.colWidths.length > 0) {
      const widthMode = context.options?.tableWidthMode ?? 'percent';
      html += `${ind(1)}<colgroup>${nl}`;
      for (let c = 0; c < cols; c++) {
        const w = data.colWidths[c];
        if (w !== undefined && w > 0) {
          const unit = widthMode === 'pixel' ? 'px' : '%';
          html += `${ind(2)}<col style="width: ${w}${unit}">${nl}`;
        } else {
          html += `${ind(2)}<col>${nl}`;
        }
      }
      html += `${ind(1)}</colgroup>${nl}`;
    }

    // Render <thead> if headerRows > 0
    if (headerRows > 0) {
      html += `${ind(1)}<thead>${nl}`;
      for (let r = 0; r < headerRows; r++) {
        html += renderExtendedRow(data, r, cols, 'th', context, pretty);
      }
      html += `${ind(1)}</thead>${nl}`;
    }

    // Render <tbody>
    const bodyStart = headerRows;
    if (bodyStart < rows) {
      html += `${ind(1)}<tbody>${nl}`;
      for (let r = bodyStart; r < rows; r++) {
        html += renderExtendedRow(data, r, cols, 'td', context, pretty);
      }
      html += `${ind(1)}</tbody>${nl}`;
    }

    html += `</table>`;
    return html;
  },

  fromHtml(element: DOMElement, context: BlockContext): TableBlockData | null {
    return parseTableElement(element, context);
  },

  toMarkdown(data: TableBlockData, context: BlockContext): string | null {
    // If the table is GFM-compatible (no colspan/rowspan/colWidths),
    // render as native GFM Markdown table instead of HTML
    if (isGfmCompatible(data)) {
      return renderGfmTable(data, context);
    }
    // Extended Table features → null → fallback to HTML in Markdown
    return null;
  },

  // ── Normalize ─────────────────────────────────────────────

  normalize(data: TableBlockData, registry: Registry): TableBlockData {
    const newCells: Record<string, CellData | null> = {};
    let changed = false;

    for (const [key, cell] of Object.entries(data.cells)) {
      if (cell !== null) {
        const normalized = normalizeDelta(new Delta(cell.ops), registry);
        if (normalized.ops !== cell.ops) {
          newCells[key] = { ...cell, ops: normalized.ops };
          changed = true;
        } else {
          newCells[key] = cell;
        }
      } else {
        newCells[key] = null;
      }
    }

    return changed ? { ...data, cells: newCells } : data;
  },

  // ── Nested Deltas ──────────────────────────────────────────

  getNestedDeltas(data: TableBlockData): Op[][] {
    const deltas: Op[][] = [];
    for (const cell of Object.values(data.cells)) {
      if (cell !== null) {
        deltas.push(cell.ops);
      }
    }
    return deltas;
  },

  setNestedDeltas(data: TableBlockData, deltas: Op[][]): TableBlockData {
    const newCells: Record<string, CellData | null> = {};
    let idx = 0;
    for (const [key, cell] of Object.entries(data.cells)) {
      if (cell !== null) {
        newCells[key] = { ...cell, ops: deltas[idx++]! };
      } else {
        newCells[key] = null;
      }
    }
    return { ...data, cells: newCells };
  },
};
