import type { Format } from '../../Format';

/**
 * Valid table column alignment values
 */
export type TableColAlignType = 'left' | 'center' | 'right';

const VALID_ALIGNS: TableColAlignType[] = ['left', 'center', 'right'];

/**
 * Table column alignment format
 *
 * Delta: { insert: "\n", attributes: { "table-col-align": "center" } }
 *
 * Controls text-align of the column (rendered via style on <th>/<td>).
 * Compatible with GFM alignment syntax (:---|:---:|---:).
 */
export const tableColAlignFormat: Format<TableColAlignType> = {
  name: 'table-col-align',
  scope: 'block',

  normalize(value: TableColAlignType): TableColAlignType {
    return value.toLowerCase() as TableColAlignType;
  },

  validate(value: TableColAlignType): boolean {
    return VALID_ALIGNS.includes(value);
  },
};
