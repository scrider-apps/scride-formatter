import type { Format, FormatMatchResult } from '../../Format';
import type { DOMElement } from '../../../conversion/adapters/types';
import { isElement } from '../../../conversion/adapters/types';
import { escapeHtml } from '../../../conversion/html/config';

/**
 * Footnote reference embed format
 *
 * Delta: { insert: { "footnote-ref": "1" } }
 *
 * Value is the footnote identifier string (e.g. "1", "note", "my-ref").
 * Rendered as superscript link in HTML: <sup class="footnote-ref"><a href="#fn-1">1</a></sup>
 * Markdown: [^1]
 */
export const footnoteRefFormat: Format<string> = {
  name: 'footnote-ref',
  scope: 'embed',

  validate(value: string): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    // Must be non-empty, no whitespace-only
    return value.trim().length > 0;
  },

  render(value: string): string {
    const id = typeof value === 'string' ? value : String(value);
    return `<sup class="footnote-ref"><a href="#fn-${escapeHtml(id)}" id="fnref-${escapeHtml(id)}">[${escapeHtml(id)}]</a></sup>`;
  },

  match(element: DOMElement): FormatMatchResult<string> | null {
    if (element.tagName.toLowerCase() !== 'sup') return null;
    const className = element.getAttribute('class') || '';
    if (!className.includes('footnote-ref')) return null;

    // Extract id from nested <a href="#fn-{id}">
    const children = element.childNodes;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child && isElement(child)) {
        const href = child.getAttribute('href') || '';
        const hrefMatch = href.match(/#fn-(.+)/);
        if (hrefMatch?.[1]) {
          return { value: hrefMatch[1] };
        }
      }
    }

    // Fallback: try id attribute
    const id = element.getAttribute('id') || '';
    const refMatch = id.match(/^fnref-(.+)/);
    if (refMatch?.[1]) {
      return { value: refMatch[1] };
    }

    return null;
  },
};
