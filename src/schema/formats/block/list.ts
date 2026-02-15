import type { Format } from '../../Format';

/**
 * Valid list types
 */
export type ListType = 'ordered' | 'bullet' | 'checked' | 'unchecked';

const VALID_LIST_TYPES: ListType[] = ['ordered', 'bullet', 'checked', 'unchecked'];

/**
 * List format
 *
 * Delta: { insert: "\n", attributes: { list: "ordered" } }
 * Delta: { insert: "\n", attributes: { list: "bullet" } }
 * Delta: { insert: "\n", attributes: { list: "checked" } }
 * Delta: { insert: "\n", attributes: { list: "unchecked" } }
 */
export const listFormat: Format<ListType> = {
  name: 'list',
  scope: 'block',

  normalize(value: ListType): ListType {
    return value.toLowerCase() as ListType;
  },

  validate(value: ListType): boolean {
    return VALID_LIST_TYPES.includes(value);
  },
};
