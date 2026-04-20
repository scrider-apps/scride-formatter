import type { Format } from '../../Format';

/**
 * Font family format
 *
 * Delta: { insert: "text", attributes: { font: "Times New Roman" } }
 */
export const fontFormat: Format<string> = {
  name: 'font',
  scope: 'inline',

  validate(value: string): boolean {
    return typeof value === 'string' && value.length > 0;
  },
};
