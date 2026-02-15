import type { Format } from '../../Format';

/**
 * Code block format
 *
 * Delta: { insert: "\n", attributes: { "code-block": true } }
 * Delta: { insert: "\n", attributes: { "code-block": "javascript" } }
 *
 * Value can be:
 * - true: generic code block
 * - string: language identifier for syntax highlighting
 */
export const codeBlockFormat: Format<boolean | string> = {
  name: 'code-block',
  scope: 'block',

  normalize(value: boolean | string): boolean | string {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    return value;
  },

  validate(value: boolean | string): boolean {
    if (value === true) {
      return true;
    }
    if (typeof value === 'string' && value.length > 0) {
      return true;
    }
    return false;
  },
};
