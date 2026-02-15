import type { Format, FormatMatchResult } from '../../Format';
import type { DOMElement } from '../../../conversion/adapters/types';
import type { AttributeMap } from '@scrider/delta';
import { escapeHtml } from '../../../conversion/html/config';

/**
 * Image embed format
 *
 * Delta: { insert: { image: "https://example.com/image.png" } }
 *
 * Value is the image URL (http, https, data URI, or relative path)
 */
export const imageFormat: Format<string> = {
  name: 'image',
  scope: 'embed',

  normalize(value: string): string {
    return value.trim();
  },

  validate(value: string): boolean {
    if (typeof value !== 'string' || value.length === 0) {
      return false;
    }

    const trimmed = value.trim();

    // Data URI
    if (trimmed.startsWith('data:image/')) {
      return true;
    }

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
    const widthVal = attributes?.width;
    const heightVal = attributes?.height;
    const floatVal = attributes?.float;
    const alt =
      altVal != null && (typeof altVal === 'string' || typeof altVal === 'number')
        ? ` alt="${escapeHtml(String(altVal))}"`
        : '';
    const width =
      widthVal != null && (typeof widthVal === 'string' || typeof widthVal === 'number')
        ? ` width="${String(widthVal)}"`
        : '';
    const height =
      heightVal != null && (typeof heightVal === 'string' || typeof heightVal === 'number')
        ? ` height="${String(heightVal)}"`
        : '';
    const float =
      floatVal != null && typeof floatVal === 'string' && floatVal !== 'none'
        ? ` data-float="${escapeHtml(floatVal)}"`
        : '';
    return `<img src="${escapeHtml(src)}"${alt}${width}${height}${float}>`;
  },

  match(element: DOMElement): FormatMatchResult<string> | null {
    if (element.tagName.toLowerCase() !== 'img') return null;
    const src = element.getAttribute('src');
    if (!src) return null;

    const attrs: AttributeMap = {};
    const alt = element.getAttribute('alt');
    const width = element.getAttribute('width');
    const height = element.getAttribute('height');
    const float = element.getAttribute('data-float');

    if (alt) attrs.alt = alt;
    if (width) attrs.width = parseInt(width, 10);
    if (height) attrs.height = parseInt(height, 10);
    if (float) attrs.float = float;

    if (Object.keys(attrs).length > 0) {
      return { value: src, attributes: attrs };
    }
    return { value: src };
  },
};
