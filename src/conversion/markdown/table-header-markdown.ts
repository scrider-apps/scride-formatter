/**
 * GFM table header placeholder helpers (Decision #25).
 * Parity with editor-react `tableHeaderMarkdown.ts`.
 */

/** True when `text` is the header-only `-` placeholder (exactly one hyphen). */
export function isHeaderDashPlaceholder(text: string): boolean {
  const t = text.trim();
  return t === '-' && t.length === 1;
}

/** Parse: header-row `-` placeholder → empty content; body and other text unchanged. */
export function normalizeHeaderCellForParse(text: string, isHeaderRow: boolean): string {
  if (isHeaderRow && isHeaderDashPlaceholder(text)) return '';
  return text;
}

/** Serialize: empty header cell → `-`; non-empty text unchanged. */
export function serializeHeaderCell(text: string): string {
  if (text.trim() === '') return '-';
  return text;
}

/**
 * True when the first markdown row is headerless: all cells literal-empty
 * and none contain the `-` placeholder.
 */
export function isHeaderlessFirstLine(cells: readonly string[]): boolean {
  return (
    cells.length > 0 && cells.every((c) => c.trim() === '') && !cells.some(isHeaderDashPlaceholder)
  );
}
