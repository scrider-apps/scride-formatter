import type { Format } from '../../Format';

/**
 * Header ID format — optional custom anchor id for headings
 *
 * Delta: { insert: "\n", attributes: { header: 2, "header-id": "getting-started" } }
 *
 * When present, the heading gets this exact id in HTML output.
 * When absent, id is computed via slugify(text) at render time (if anchorLinks is enabled).
 *
 * Markdown: ## Title {#custom-id}
 */
export const headerIdFormat: Format<string> = {
  name: 'header-id',
  scope: 'block',

  normalize(value: string): string {
    return String(value).trim().toLowerCase();
  },

  validate(value: string): boolean {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    // Must be non-empty, valid HTML id: no whitespace, at least one char
    return trimmed.length > 0 && !/\s/.test(trimmed);
  },
};
