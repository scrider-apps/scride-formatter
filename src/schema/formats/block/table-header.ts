import type { Format } from '../../Format';

/**
 * Table header cell format
 *
 * Delta: { insert: "\n", attributes: { "table-header": true } }
 *
 * When true, the cell is rendered as <th> inside <thead>.
 */
export const tableHeaderFormat: Format<boolean> = {
  name: 'table-header',
  scope: 'block',

  validate(value: boolean): boolean {
    return value === true;
  },
};
