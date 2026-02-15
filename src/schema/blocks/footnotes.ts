import type { Op } from '@scrider/delta';
import { isTextInsert, Delta } from '@scrider/delta';
import type { BlockContext, BlockHandler } from '../BlockHandler';
import type { Registry } from '../Registry';
import { normalizeDelta } from '../../conversion/sanitize';
import type { DOMElement } from '../../conversion/adapters/types';
import { isElement } from '../../conversion/adapters/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Footnotes block data — a collection of footnote definitions.
 *
 * Stored in Delta as: `{ insert: { block: <FootnotesBlockData> } }`
 *
 * Each note is keyed by its string identifier (e.g. "1", "note", "my-ref").
 * Values contain nested Delta content (rich-text).
 *
 * Placed at the end of the document, after all content.
 */
export interface FootnotesBlockData {
  /** Block type discriminator */
  type: 'footnotes';
  /** Map of footnote id → content (nested Delta ops) */
  notes: Record<string, { ops: Op[] }>;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that a note entry has valid ops (non-empty array).
 */
function isValidNoteData(note: { ops: Op[] }): boolean {
  return (
    typeof note === 'object' && note !== null && Array.isArray(note.ops) && note.ops.length > 0
  );
}

// ============================================================================
// Rendering Helpers
// ============================================================================

// ============================================================================
// Parsing Helpers (HTML → FootnotesBlockData)
// ============================================================================

/**
 * Extract footnote id from an element's `id` attribute.
 * Expects format: "fn-{id}" → returns "{id}"
 */
function extractFootnoteId(element: DOMElement): string | null {
  const id = element.getAttribute('id') || '';
  if (id.startsWith('fn-')) {
    return id.slice(3);
  }
  return null;
}

// ============================================================================
// FootnotesBlockHandler
// ============================================================================

/**
 * BlockHandler implementation for Footnotes.
 *
 * Handles a single block embed containing all footnote definitions.
 * Each footnote has an id and nested Delta content.
 *
 * HTML: <section class="footnotes"><ol><li id="fn-{id}">...</li></ol></section>
 * Markdown: [^id]: content
 */
export const footnotesBlockHandler: BlockHandler<FootnotesBlockData> = {
  type: 'footnotes',

  validate(data: FootnotesBlockData): boolean {
    // 1. Type check
    if (!data || typeof data !== 'object' || data.type !== 'footnotes') {
      return false;
    }

    // 2. Notes must be a non-empty object
    if (!data.notes || typeof data.notes !== 'object' || Array.isArray(data.notes)) {
      return false;
    }

    const noteIds = Object.keys(data.notes);
    if (noteIds.length === 0) return false;

    // 3. All keys must be non-empty strings
    for (const id of noteIds) {
      if (typeof id !== 'string' || id.trim().length === 0) return false;
    }

    // 4. All values must have valid ops
    for (const note of Object.values(data.notes)) {
      if (!isValidNoteData(note)) return false;
    }

    return true;
  },

  // ── Conversion ──────────────────────────────────────────────

  toHtml(data: FootnotesBlockData, context: BlockContext): string {
    const pretty = context.options?.pretty ?? false;
    const nl = pretty ? '\n' : '';
    const ind = (level: number): string => (pretty ? '  '.repeat(level) : '');

    const noteEntries = Object.entries(data.notes);
    if (noteEntries.length === 0) return '';

    let html = `<section class="footnotes">${nl}`;
    html += `${ind(1)}<ol>${nl}`;

    for (const [id, note] of noteEntries) {
      html += `${ind(2)}<li id="fn-${id}">${nl}`;

      // Render nested Delta content
      let content = '';
      if (context.renderDelta) {
        content = context.renderDelta(note.ops);
      }

      // Insert backref link inline at the end of the last <p> (before </p>)
      const backref = ` <a href="#fnref-${id}" class="footnote-backref">\u21a9</a>`;
      const lastPClose = content.lastIndexOf('</p>');
      if (lastPClose !== -1) {
        content = content.slice(0, lastPClose) + backref + content.slice(lastPClose);
      } else {
        content += backref;
      }

      html += `${ind(3)}${content}${nl}`;

      html += `${ind(2)}</li>${nl}`;
    }

    html += `${ind(1)}</ol>${nl}`;
    html += `</section>`;
    return html;
  },

  fromHtml(element: DOMElement, context: BlockContext): FootnotesBlockData | null {
    // Expect <section class="footnotes"> or <div class="footnotes">
    const tag = element.tagName.toLowerCase();
    if (tag !== 'section' && tag !== 'div') return null;

    const className = element.getAttribute('class') || '';
    if (!className.includes('footnotes')) return null;

    // Find <ol> inside
    let ol: DOMElement | null = null;
    const children = element.childNodes;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child && isElement(child) && child.tagName.toLowerCase() === 'ol') {
        ol = child;
        break;
      }
    }

    if (!ol) return null;

    const notes: Record<string, { ops: Op[] }> = {};

    // Parse each <li>
    const liChildren = ol.childNodes;
    for (let i = 0; i < liChildren.length; i++) {
      const li = liChildren[i];
      if (!li || !isElement(li) || li.tagName.toLowerCase() !== 'li') continue;

      const id = extractFootnoteId(li);
      if (!id) continue;

      // Parse content via context.parseElement, then clean up backref artifacts
      let ops: Op[];
      if (context.parseElement) {
        ops = context.parseElement(li);

        // Clean up: remove backref arrow "↩" that the <a class="footnote-backref"> produces
        ops = ops
          .map((op) => {
            if (isTextInsert(op) && op.insert.includes('\u21a9')) {
              return { ...op, insert: op.insert.replace(/\u21a9/g, '') };
            }
            return op;
          })
          .filter((op) => !isTextInsert(op) || op.insert !== '');

        if (ops.length === 0) {
          ops = [{ insert: '\n' }];
        }
      } else {
        ops = [{ insert: '\n' }];
      }

      notes[id] = { ops };
    }

    if (Object.keys(notes).length === 0) return null;

    return { type: 'footnotes', notes };
  },

  toMarkdown(data: FootnotesBlockData, context: BlockContext): string | null {
    const noteEntries = Object.entries(data.notes);
    if (noteEntries.length === 0) return null;

    const lines: string[] = [];
    for (const [id, note] of noteEntries) {
      // context.renderDelta produces Markdown when called from deltaToMarkdown,
      // or HTML when called from deltaToHtml — either way, use the output directly.
      // For multi-paragraph footnotes, continuation lines need 4-space indent (GFM convention).
      let content: string;
      if (context.renderDelta) {
        content = context.renderDelta(note.ops).trim();
      } else {
        content = '';
      }

      // First line: [^id]: content
      // Continuation: indented by 4 spaces
      const contentLines = content.split('\n');
      const indented = contentLines
        .map((line, idx) => (idx === 0 ? `[^${id}]: ${line}` : `    ${line}`))
        .join('\n');
      lines.push(indented);
    }

    return '\n' + lines.join('\n\n');
  },

  // ── Normalize ─────────────────────────────────────────────

  normalize(data: FootnotesBlockData, registry: Registry): FootnotesBlockData {
    const newNotes: Record<string, { ops: Op[] }> = {};
    let changed = false;

    for (const [id, note] of Object.entries(data.notes)) {
      const normalized = normalizeDelta(new Delta(note.ops), registry);
      if (normalized.ops !== note.ops) {
        newNotes[id] = { ops: normalized.ops };
        changed = true;
      } else {
        newNotes[id] = note;
      }
    }

    return changed ? { ...data, notes: newNotes } : data;
  },

  // ── Nested Deltas ──────────────────────────────────────────

  getNestedDeltas(data: FootnotesBlockData): Op[][] {
    return Object.values(data.notes).map((note) => note.ops);
  },

  setNestedDeltas(data: FootnotesBlockData, deltas: Op[][]): FootnotesBlockData {
    const ids = Object.keys(data.notes);
    const newNotes: Record<string, { ops: Op[] }> = {};
    ids.forEach((id, i) => {
      newNotes[id] = { ops: deltas[i]! };
    });
    return { ...data, notes: newNotes };
  },
};
