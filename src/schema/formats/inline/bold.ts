import type { Format } from '../../Format';

/**
 * Bold format
 *
 * Delta: { insert: "text", attributes: { bold: true } }
 */
export const boldFormat: Format<boolean> = {
  name: 'bold',
  scope: 'inline',

  validate(value: boolean): boolean {
    return value === true;
  },
};
