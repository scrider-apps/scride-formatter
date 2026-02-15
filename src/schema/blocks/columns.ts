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
 * Columns Layout block data.
 *
 * Stored in Delta as: `{ insert: { block: <ColumnsBlockData> } }`
 *
 * Each column contains a full nested Delta (rich text, embeds, nested blocks).
 *
 * HTML:
 * ```html
 * <div class="columns columns-2">
 *   <div class="column"><p>Column 1</p></div>
 *   <div class="column"><p>Column 2</p></div>
 * </div>
 * ```
 *
 * With custom widths:
 * ```html
 * <div class="columns columns-2" style="grid-template-columns: 30% 70%">
 *   <div class="column"><p>Sidebar</p></div>
 *   <div class="column"><p>Main content</p></div>
 * </div>
 * ```
 *
 * Markdown: no native equivalent → toMarkdown returns null → HTML fallback.
 *
 * Resize-ready: `widths` for per-column resize (future scrider-editor),
 * `width`/`height` in op attributes for overall dimensions.
 */
export interface ColumnsBlockData {
  /** Block type discriminator */
  type: 'columns';
  /** Column contents — array of nested Deltas */
  columns: { ops: Op[] }[];
  /** Optional: column widths in percent (sum ≈ 100). Default: equal (CSS 1fr each) */
  widths?: number[];
}

// ============================================================================
// Constants
// ============================================================================

/** Tolerance for widths sum validation (allows rounding: e.g. 33.33 + 33.33 + 33.34 = 100) */
const WIDTHS_SUM_TOLERANCE = 1;

// ============================================================================
// ColumnsBlockHandler
// ============================================================================

/**
 * BlockHandler implementation for Columns Layout.
 *
 * Multi-column layout with nested Delta content in each column.
 * Analogous to Alert (nested Delta) but with an array of columns.
 *
 * HTML: `<div class="columns columns-N" [style="grid-template-columns: W1% W2%"]>
 *          <div class="column">...</div>...
 *        </div>`
 * Markdown: no equivalent → toMarkdown returns null → HTML fallback
 */
export const columnsBlockHandler: BlockHandler<ColumnsBlockData> = {
  type: 'columns',

  validate(data: ColumnsBlockData): boolean {
    if (!data || typeof data !== 'object' || data.type !== 'columns') {
      return false;
    }

    // columns must be an array with at least 2 elements
    // (1 column = Inline-Box pattern, use "box" block type instead)
    if (!Array.isArray(data.columns) || data.columns.length < 2) {
      return false;
    }

    // Each column must have non-empty ops
    for (const col of data.columns) {
      if (!col || typeof col !== 'object' || !Array.isArray(col.ops) || col.ops.length === 0) {
        return false;
      }
    }

    // widths validation (if provided)
    if (data.widths !== undefined) {
      if (!Array.isArray(data.widths)) {
        return false;
      }

      // Length must match columns
      if (data.widths.length !== data.columns.length) {
        return false;
      }

      // All values must be positive numbers
      for (const w of data.widths) {
        if (typeof w !== 'number' || w <= 0 || !isFinite(w)) {
          return false;
        }
      }

      // Sum must be approximately 100
      const sum = data.widths.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > WIDTHS_SUM_TOLERANCE) {
        return false;
      }
    }

    return true;
  },

  // ── Conversion ──────────────────────────────────────────────

  toHtml(data: ColumnsBlockData, context: BlockContext): string {
    const n = data.columns.length;
    const pretty = context.options?.pretty ?? false;
    const nl = pretty ? '\n' : '';
    const ind = (level: number): string => (pretty ? '  '.repeat(level) : '');

    // Class: "columns columns-N"
    const classAttr = `columns columns-${n}`;

    // Custom widths → inline style grid-template-columns
    let styleAttr = '';
    if (data.widths && data.widths.length === n) {
      const cols = data.widths.map((w) => `${w}%`).join(' ');
      styleAttr = ` style="grid-template-columns: ${cols}"`;
    }

    let html = `<div class="${classAttr}"${styleAttr}>${nl}`;

    for (const col of data.columns) {
      html += `${ind(1)}<div class="column">${nl}`;
      if (context.renderDelta) {
        html += `${ind(2)}${context.renderDelta(col.ops)}${nl}`;
      }
      html += `${ind(1)}</div>${nl}`;
    }

    html += `</div>`;
    return html;
  },

  fromHtml(element: DOMElement, context: BlockContext): ColumnsBlockData | null {
    const tag = element.tagName.toLowerCase();
    if (tag !== 'div') return null;

    const className = element.getAttribute('class') || '';
    if (!className.includes('columns')) return null;

    // Don't match "column" (singular) without "columns" (plural)
    // "columns" class is required on the container
    if (!/\bcolumns\b/.test(className)) return null;

    const columns: { ops: Op[] }[] = [];
    const children = element.childNodes;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child || !isElement(child)) continue;

      const childClass = child.getAttribute('class') || '';
      if (!/\bcolumn\b/.test(childClass)) continue;

      // Parse all children of the column div
      let ops: Op[] = [];
      if (context.parseElement) {
        const childChildren = child.childNodes;
        for (let j = 0; j < childChildren.length; j++) {
          const el = childChildren[j];
          if (el && isElement(el)) {
            const parsed = context.parseElement(el);
            ops = ops.concat(parsed);
          }
        }
      }

      if (ops.length === 0) {
        ops = [{ insert: '\n' }];
      }

      columns.push({ ops });
    }

    if (columns.length === 0) return null;

    // Extract widths from inline style: grid-template-columns
    let widths: number[] | undefined;
    const style = element.getAttribute('style') || '';
    const match = style.match(/grid-template-columns:\s*(.+?)(?:;|$)/);
    if (match && match[1]) {
      const parts = match[1].trim().split(/\s+/);
      const parsed = parts.map((p) => parseFloat(p)).filter((n) => !isNaN(n) && n > 0);
      if (parsed.length === columns.length) {
        widths = parsed;
      }
    }

    const result: ColumnsBlockData = {
      type: 'columns',
      columns,
    };

    if (widths) {
      result.widths = widths;
    }

    return result;
  },

  toMarkdown(_data: ColumnsBlockData, _context: BlockContext): string | null {
    // No lossless Markdown representation for columns layout.
    // Returning null triggers fallback to toHtml() — HTML directly in Markdown
    // (valid per CommonMark/GFM spec).
    return null;
  },

  // ── Normalization ──────────────────────────────────────────

  normalize(data: ColumnsBlockData, registry: Registry): ColumnsBlockData {
    return {
      ...data,
      columns: data.columns.map((col) => ({
        ops: normalizeDelta(new Delta(col.ops), registry).ops,
      })),
    };
  },

  // ── Nested Deltas ──────────────────────────────────────────

  getNestedDeltas(data: ColumnsBlockData): Op[][] {
    return data.columns.map((col) => col.ops);
  },

  setNestedDeltas(data: ColumnsBlockData, deltas: Op[][]): ColumnsBlockData {
    return {
      ...data,
      columns: data.columns.map((col, i) => ({
        ...col,
        ops: deltas[i] ?? col.ops,
      })),
    };
  },
};
