import type { Format } from '../../Format';

/**
 * Valid alignment values
 */
export type AlignType = 'left' | 'center' | 'right' | 'justify';

const VALID_ALIGN_TYPES: AlignType[] = ['left', 'center', 'right', 'justify'];

/**
 * Text alignment format
 *
 * Delta: { insert: "\n", attributes: { align: "center" } }
 */
export const alignFormat: Format<AlignType> = {
  name: 'align',
  scope: 'block',

  normalize(value: AlignType): AlignType {
    return value.toLowerCase() as AlignType;
  },

  validate(value: AlignType): boolean {
    return VALID_ALIGN_TYPES.includes(value);
  },
};
