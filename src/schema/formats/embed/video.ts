import type { Format, FormatMatchResult } from '../../Format';
import type { DOMElement } from '../../../conversion/adapters/types';
import type { AttributeMap } from '@scrider/delta';
import { escapeHtml, toVideoEmbedUrl, fromVideoEmbedUrl } from '../../../conversion/html/config';

/**
 * Video embed format
 *
 * Delta: { insert: { video: "https://youtube.com/watch?v=..." } }
 *
 * Value is the video URL
 */
export const videoFormat: Format<string> = {
  name: 'video',
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
    const floatVal = attributes?.float;
    const widthVal = attributes?.width;
    const heightVal = attributes?.height;
    const float =
      floatVal != null && typeof floatVal === 'string' && floatVal !== 'none'
        ? ` data-float="${escapeHtml(floatVal)}"`
        : '';
    const styles: string[] = [];
    if (widthVal != null && (typeof widthVal === 'string' || typeof widthVal === 'number')) {
      const w = String(widthVal);
      if (w && w !== 'auto') styles.push(`width: ${/^\d+$/.test(w) ? w + 'px' : w}`);
    }
    if (heightVal != null && (typeof heightVal === 'string' || typeof heightVal === 'number')) {
      const h = String(heightVal);
      if (h && h !== 'auto') styles.push(`height: ${/^\d+$/.test(h) ? h + 'px' : h}`);
    }
    const style = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    const embedSrc = toVideoEmbedUrl(src);
    if (embedSrc) {
      return `<iframe src="${escapeHtml(embedSrc)}" frameborder="0" allowfullscreen${float}${style}></iframe>`;
    }
    return `<video src="${escapeHtml(src)}" controls${float}${style}></video>`;
  },

  match(element: DOMElement): FormatMatchResult<string> | null {
    const tagName = element.tagName.toLowerCase();
    if (tagName !== 'video' && tagName !== 'iframe') return null;

    const src = element.getAttribute('src');
    if (!src) return null;

    const attrs: AttributeMap = {};
    const float = element.getAttribute('data-float');
    const styleAttr = element.getAttribute('style') || '';

    if (float) attrs.float = float;

    // Extract width/height from inline style
    const widthMatch = styleAttr.match(/(?:^|;\s*)width:\s*([^;]+)/);
    if (widthMatch?.[1]) attrs.width = widthMatch[1].trim().replace(/px$/, '');
    const heightMatch = styleAttr.match(/(?:^|;\s*)height:\s*([^;]+)/);
    if (heightMatch?.[1]) attrs.height = heightMatch[1].trim().replace(/px$/, '');

    if (Object.keys(attrs).length > 0) {
      return { value: fromVideoEmbedUrl(src), attributes: attrs };
    }
    return { value: fromVideoEmbedUrl(src) };
  },
};
