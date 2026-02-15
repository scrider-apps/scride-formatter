import type { Format } from '../../Format';

/**
 * Subscript format
 *
 * Delta: { insert: "text", attributes: { subscript: true } }
 * HTML: <sub>text</sub>
 */
export const subscriptFormat: Format<boolean> = {
  name: 'subscript',
  scope: 'inline',

  validate(value: boolean): boolean {
    return value === true;
  },
};
