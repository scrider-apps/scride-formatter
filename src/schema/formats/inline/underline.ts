import type { Format } from '../../Format';

/**
 * Underline format
 *
 * Delta: { insert: "text", attributes: { underline: true } }
 */
export const underlineFormat: Format<boolean> = {
  name: 'underline',
  scope: 'inline',

  validate(value: boolean): boolean {
    return value === true;
  },
};
