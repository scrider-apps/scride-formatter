import type { Format } from '../../Format';

/**
 * Inline code format
 *
 * Delta: { insert: "text", attributes: { code: true } }
 */
export const codeFormat: Format<boolean> = {
  name: 'code',
  scope: 'inline',

  validate(value: boolean): boolean {
    return value === true;
  },
};
