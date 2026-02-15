import type { Format } from '../../Format';

/**
 * Table row index format
 *
 * Delta: { insert: "\n", attributes: { "table-row": 0 } }
 */
export const tableRowFormat: Format<number> = {
  name: 'table-row',
  scope: 'block',

  validate(value: number): boolean {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
  },
};
