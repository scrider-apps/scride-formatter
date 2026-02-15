import type { Format, FormatMatchResult } from '../../Format';
import type { DOMElement } from '../../../conversion/adapters/types';
import type { AttributeMap } from '@scrider/delta';
import { escapeHtml } from '../../../conversion/html/config';

/**
 * Draw.io diagram embed format
 *
 * Delta: { insert: { drawio: "./assets/diagram.drawio" } }
 *
 * Value is a URL or path to a .drawio file (XML diagram from diagrams.net).
 * Draw.io diagrams are visual editor artifacts — stored as file references
 * (like images), not inline content (like Mermaid/PlantUML source code).
 *
 * Markdown: ![alt](path/to/diagram.drawio)
 * HTML: <span class="drawio" data-drawio-src="path/to/diagram.drawio"></span>
 *
 * Detection: .drawio file extension distinguishes from regular images.
 */
export const drawioFormat: Format<string> = {
  name: 'drawio',
  scope: 'embed',

  normalize(value: string): string {
    return value.trim();
  },

  validate(value: string): boolean {
    if (typeof value !== 'string' || value.length === 0) {
      return false;
    }

    const trimmed = value.trim();

    // Relative paths
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return true;
    }

    // Protocol-relative
    if (trimmed.startsWith('//')) {
      return true;
    }

    // Absolute URLs
    try {
      const url = new URL(trimmed);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  },

  render(value: string, attributes?: AttributeMap): string {
    const src = typeof value === 'string' ? value : '';
    const altVal = attributes?.alt;
    const alt =
      altVal != null && (typeof altVal === 'string' || typeof altVal === 'number')
        ? ` data-alt="${escapeHtml(String(altVal))}"`
        : '';
    return `<span class="drawio" data-drawio-src="${escapeHtml(src)}"${alt}></span>`;
  },

  match(element: DOMElement): FormatMatchResult<string> | null {
    if (element.tagName.toLowerCase() !== 'span') return null;
    const className = element.getAttribute('class') || '';
    if (!className.includes('drawio')) return null;
    const src = element.getAttribute('data-drawio-src');
    if (!src) return null;

    const attrs: AttributeMap = {};
    const alt = element.getAttribute('data-alt');
    if (alt) attrs.alt = alt;

    if (Object.keys(attrs).length > 0) {
      return { value: src, attributes: attrs };
    }
    return { value: src };
  },
};
