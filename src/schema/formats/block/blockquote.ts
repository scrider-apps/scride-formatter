import type { Format } from '../../Format';

/**
 * Blockquote format
 *
 * Delta: { insert: "\n", attributes: { blockquote: true } }
 *
 * HTML render groups consecutive quote lines into one `<blockquote>` wrapping
 * inner `<p>`s. Delta stays per-line; grouping is render-only.
 */
export const blockquoteFormat: Format<boolean> = {
  name: 'blockquote',
  scope: 'block',

  validate(value: boolean): boolean {
    return value === true;
  },
};
