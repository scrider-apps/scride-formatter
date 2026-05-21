/**
 * Simple Table HTML presentation options for deltaToHtml (clipboard, export).
 * Structural data stays in Delta (table-row, table-col-align); this only affects inline styles.
 */

/** Column/cell horizontal alignment (GFM subset). */
export type TableCellAlign = 'left' | 'center' | 'right';

/** Optional styling when serializing Simple Tables to HTML. */
export interface TablePresentation {
  /** Full 1px border on all cell sides. When true, `line` is ignored. */
  grid?: boolean;
  /** Bottom border only (DeepSeek / ChatGPT). Used when `grid` is not true. */
  line?: boolean;
  /** Border color as explicit hex (e.g. `#e7e7e7`). */
  borderColor?: string;
  /** Background on header cells (`th`). */
  headerShade?: boolean;
  /** Background on even table rows in the body (see `isZebraBodyRow`). */
  zebraRows?: boolean;
  /** `font-weight: bold` on `th`. */
  headerBold?: boolean;
  /** `text-align: center` on `th` (GitHub-style header). */
  headerCenter?: boolean;
  /**
   * Alignment for cells without `table-col-align` in Delta. Never overrides GFM column align.
   * @default 'left'
   */
  defaultCellAlign?: TableCellAlign;
}

const DEFAULT_BORDER_COLOR = '#e7e7e7';
const DEFAULT_HEADER_BG = '#f5f5f5';
const DEFAULT_ZEBRA_BG = '#fafafa';
const CELL_PADDING = '6px 13px';

export interface ResolvedTablePresentation {
  grid: boolean;
  line: boolean;
  borderColor: string;
  headerShade: boolean;
  zebraRows: boolean;
  headerBold: boolean;
  headerCenter: boolean;
  defaultCellAlign: TableCellAlign;
}

export function resolveTablePresentation(
  presentation?: TablePresentation,
): ResolvedTablePresentation {
  return {
    grid: presentation?.grid === true,
    line: presentation?.line === true && presentation?.grid !== true,
    borderColor: presentation?.borderColor ?? DEFAULT_BORDER_COLOR,
    headerShade: presentation?.headerShade === true,
    zebraRows: presentation?.zebraRows === true,
    headerBold: presentation?.headerBold === true,
    headerCenter: presentation?.headerCenter === true,
    defaultCellAlign: presentation?.defaultCellAlign ?? 'left',
  };
}

/** Match CSS `tr:nth-child(even) td` when header rows precede body in `<table>`. */
export function isZebraBodyRow(headerRowCount: number, bodyRowIndex: number): boolean {
  return (headerRowCount + bodyRowIndex + 1) % 2 === 0;
}

function isTableCellAlign(value: string | undefined): value is TableCellAlign {
  return value === 'left' || value === 'center' || value === 'right';
}

export function tableOpenTag(presentation: ResolvedTablePresentation): string {
  if (!presentation.grid && !presentation.line) {
    return '<table>';
  }
  return `<table style="border-collapse: collapse">`;
}

export interface TableCellStyleParams {
  presentation: ResolvedTablePresentation;
  cellTag: 'th' | 'td';
  colAlign?: string | undefined;
  headerRowCount: number;
  /** Index among body rows only (0 = first `<tr>` in `<tbody>`). */
  bodyRowIndex?: number | undefined;
}

export function buildTableCellStyleAttr(params: TableCellStyleParams): string {
  const { presentation, cellTag, colAlign, headerRowCount, bodyRowIndex } = params;
  const parts: string[] = [];

  parts.push(`padding: ${CELL_PADDING}`);

  const color = presentation.borderColor;
  if (presentation.grid) {
    parts.push(`border: 1px solid ${color}`);
  } else if (presentation.line) {
    const width = cellTag === 'th' ? '1px' : '0.5px';
    parts.push(`border-bottom: ${width} solid ${color}`);
  }

  let textAlign: TableCellAlign | undefined;
  if (cellTag === 'th' && presentation.headerCenter) {
    textAlign = 'center';
  } else if (isTableCellAlign(colAlign)) {
    textAlign = colAlign;
  } else if (colAlign == null || colAlign === 'left') {
    textAlign = presentation.defaultCellAlign;
  }

  if (textAlign && textAlign !== 'left') {
    parts.push(`text-align: ${textAlign}`);
  }

  if (cellTag === 'th' && presentation.headerBold) {
    parts.push('font-weight: bold');
  }

  if (cellTag === 'th' && presentation.headerShade) {
    parts.push(`background-color: ${DEFAULT_HEADER_BG}`);
  } else if (
    cellTag === 'td' &&
    presentation.zebraRows &&
    bodyRowIndex !== undefined &&
    isZebraBodyRow(headerRowCount, bodyRowIndex)
  ) {
    parts.push(`background-color: ${DEFAULT_ZEBRA_BG}`);
  }

  return ` style="${parts.join('; ')}"`;
}
