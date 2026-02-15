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

/** The 5 standard GitHub alert types */
export const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;

/** Union of valid alert types */
export type AlertType = (typeof ALERT_TYPES)[number];

/**
 * Alert / Admonition block data.
 *
 * Stored in Delta as: `{ insert: { block: <AlertBlockData> } }`
 *
 * GitHub-style alerts:
 * ```markdown
 * > [!NOTE]
 * > Useful information.
 * ```
 *
 * HTML:
 * ```html
 * <div class="markdown-alert markdown-alert-note">
 *   <p class="markdown-alert-title">Note</p>
 *   <p>Useful information.</p>
 * </div>
 * ```
 */
export interface AlertBlockData {
  /** Block type discriminator */
  type: 'alert';
  /** Alert variant (note, tip, important, warning, caution) */
  alertType: AlertType;
  /** Nested Delta content (rich text) */
  content: { ops: Op[] };
}

// ============================================================================
// Helpers
// ============================================================================

/** Check if a string is a valid alert type */
function isAlertType(value: string): value is AlertType {
  return ALERT_TYPES.includes(value as AlertType);
}

/** Capitalize first letter: "note" → "Note" */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================================
// AlertBlockHandler
// ============================================================================

/**
 * BlockHandler implementation for Alerts / Admonitions.
 *
 * Handles GitHub-style alerts (5 types: note, tip, important, warning, caution).
 * Each alert contains nested Delta content (rich text).
 *
 * HTML: `<div class="markdown-alert markdown-alert-{type}"><p class="markdown-alert-title">{Type}</p>...</div>`
 * Markdown: `> [!TYPE]\n> content`
 */
export const alertBlockHandler: BlockHandler<AlertBlockData> = {
  type: 'alert',

  validate(data: AlertBlockData): boolean {
    if (!data || typeof data !== 'object' || data.type !== 'alert') {
      return false;
    }

    if (typeof data.alertType !== 'string' || !isAlertType(data.alertType)) {
      return false;
    }

    if (
      !data.content ||
      typeof data.content !== 'object' ||
      !Array.isArray(data.content.ops) ||
      data.content.ops.length === 0
    ) {
      return false;
    }

    return true;
  },

  // ── Conversion ──────────────────────────────────────────────

  toHtml(data: AlertBlockData, context: BlockContext): string {
    const pretty = context.options?.pretty ?? false;
    const nl = pretty ? '\n' : '';
    const ind = (level: number): string => (pretty ? '  '.repeat(level) : '');

    const alertClass = `markdown-alert markdown-alert-${data.alertType}`;
    const title = capitalize(data.alertType);

    let html = `<div class="${alertClass}">${nl}`;
    html += `${ind(1)}<p class="markdown-alert-title">${title}</p>${nl}`;

    // Render nested Delta content
    if (context.renderDelta) {
      html += `${ind(1)}${context.renderDelta(data.content.ops)}${nl}`;
    }

    html += `</div>`;
    return html;
  },

  fromHtml(element: DOMElement, context: BlockContext): AlertBlockData | null {
    const tag = element.tagName.toLowerCase();
    if (tag !== 'div' && tag !== 'section') return null;

    const className = element.getAttribute('class') || '';
    if (!className.includes('markdown-alert')) return null;

    // Extract alert type from class: "markdown-alert-note" → "note"
    let alertType: AlertType = 'note';
    for (const t of ALERT_TYPES) {
      if (className.includes(`markdown-alert-${t}`)) {
        alertType = t;
        break;
      }
    }

    // Parse children, skipping the title <p class="markdown-alert-title">
    let ops: Op[] = [];

    const children = element.childNodes;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child || !isElement(child)) continue;

      // Skip the title paragraph
      const childClass = child.getAttribute('class') || '';
      if (childClass.includes('markdown-alert-title')) continue;

      // Parse content elements
      if (context.parseElement) {
        const parsed = context.parseElement(child);
        ops = ops.concat(parsed);
      }
    }

    if (ops.length === 0) {
      ops = [{ insert: '\n' }];
    }

    return {
      type: 'alert',
      alertType,
      content: { ops },
    };
  },

  toMarkdown(data: AlertBlockData, context: BlockContext): string | null {
    // > [!NOTE]
    // > content line 1
    // > content line 2
    const tag = `[!${data.alertType.toUpperCase()}]`;

    let contentMd = '';
    if (context.renderDelta) {
      // renderDelta produces Markdown when called from deltaToMarkdown
      contentMd = context.renderDelta(data.content.ops);
    }

    // Prefix each line with "> "
    const lines = contentMd.split('\n');
    // Remove trailing empty line if present
    while (lines.length > 0 && (lines[lines.length - 1] ?? '').trim() === '') {
      lines.pop();
    }

    const prefixed = lines.map((line) => `> ${line}`).join('\n');
    return `> ${tag}\n${prefixed}`;
  },

  // ── Normalization ──────────────────────────────────────────

  normalize(data: AlertBlockData, registry: Registry): AlertBlockData {
    const normalized = normalizeDelta(new Delta(data.content.ops), registry);
    return {
      ...data,
      content: { ops: normalized.ops },
    };
  },

  // ── Nested Deltas ──────────────────────────────────────────

  getNestedDeltas(data: AlertBlockData): Op[][] {
    return [data.content.ops];
  },

  setNestedDeltas(data: AlertBlockData, deltas: Op[][]): AlertBlockData {
    const first = deltas[0];
    if (!first) return data;
    return {
      ...data,
      content: { ops: first },
    };
  },
};
