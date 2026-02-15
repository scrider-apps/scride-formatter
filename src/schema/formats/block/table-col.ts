import type { Format } from '../../Format';

/**
 * Table column index format
 *
 * Delta: { insert: "\n", attributes: { "table-col": 0 } }
 */
export const tableColFormat: Format<number> = {
  name: 'table-col',
  scope: 'block',

  validate(value: number): boolean {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
  },
};
