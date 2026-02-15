import type { Format } from '../../Format';

/**
 * Italic format
 *
 * Delta: { insert: "text", attributes: { italic: true } }
 */
export const italicFormat: Format<boolean> = {
  name: 'italic',
  scope: 'inline',

  validate(value: boolean): boolean {
    return value === true;
  },
};
