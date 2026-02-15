import type { Format } from '../../Format';

/**
 * Superscript format
 *
 * Delta: { insert: "text", attributes: { superscript: true } }
 * HTML: <sup>text</sup>
 */
export const superscriptFormat: Format<boolean> = {
  name: 'superscript',
  scope: 'inline',

  validate(value: boolean): boolean {
    return value === true;
  },
};
