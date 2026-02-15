import type { Format } from '../../Format';

/**
 * Link format
 *
 * Delta: { insert: "text", attributes: { link: "https://example.com" } }
 *
 * Supports:
 * - Absolute URLs (http://, https://)
 * - Relative URLs (/path, ./path, ../path)
 * - Protocol-relative URLs (//example.com)
 * - mailto: and tel: links
 */
export const linkFormat: Format<string> = {
  name: 'link',
  scope: 'inline',

  normalize(value: string): string {
    return value.trim();
  },

  validate(value: string): boolean {
    if (typeof value !== 'string' || value.length === 0) {
      return false;
    }

    const trimmed = value.trim();

    // Relative URLs
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return true;
    }

    // Protocol-relative URLs
    if (trimmed.startsWith('//')) {
      return true;
    }

    // mailto: and tel:
    if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
      return true;
    }

    // Absolute URLs (http/https)
    try {
      const url = new URL(trimmed);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  },
};
