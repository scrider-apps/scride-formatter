import type { Format } from '../../Format';

/**
 * Font size format
 *
 * Delta: { insert: "text", attributes: { size: "14pt" } }
 *
 * Value is a string with CSS unit (e.g. "14pt", "16px", "1.2em").
 */
export const sizeFormat: Format<string> = {
  name: 'size',
  scope: 'inline',

  validate(value: string): boolean {
    return typeof value === 'string' && value.length > 0;
  },
};
