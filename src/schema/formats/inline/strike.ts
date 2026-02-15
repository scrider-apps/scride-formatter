import type { Format } from '../../Format';

/**
 * Strikethrough format
 *
 * Delta: { insert: "text", attributes: { strike: true } }
 */
export const strikeFormat: Format<boolean> = {
  name: 'strike',
  scope: 'inline',

  validate(value: boolean): boolean {
    return value === true;
  },
};
