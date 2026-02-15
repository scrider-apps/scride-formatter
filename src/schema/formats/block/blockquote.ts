import type { Format } from '../../Format';

/**
 * Blockquote format
 *
 * Delta: { insert: "\n", attributes: { blockquote: true } }
 */
export const blockquoteFormat: Format<boolean> = {
  name: 'blockquote',
  scope: 'block',

  validate(value: boolean): boolean {
    return value === true;
  },
};
