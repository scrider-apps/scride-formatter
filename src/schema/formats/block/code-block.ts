import type { Format } from '../../Format';
import { isBlockBoxFloat, isBlockBoxLength } from './block-box';

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

/**
 * Code block plate: width and height in CSS px, position `left` / `center` / `right`.
 *
 * Delta: { insert: "\n", attributes: { "code-block": "mermaid", "code-block-width": "480",
 *   "code-block-height": "320", "code-block-float": "center" } }
 *
 * Every line of the block carries the same values. Absent = full width,
 * natural height, in the line.
 */
export const codeBlockWidthFormat: Format<string | number> = {
  name: 'code-block-width',
  scope: 'block',

  validate(value: string | number): boolean {
    return isBlockBoxLength(value);
  },
};

export const codeBlockHeightFormat: Format<string | number> = {
  name: 'code-block-height',
  scope: 'block',

  validate(value: string | number): boolean {
    return isBlockBoxLength(value);
  },
};

export const codeBlockFloatFormat: Format<string> = {
  name: 'code-block-float',
  scope: 'block',

  validate(value: string): boolean {
    return isBlockBoxFloat(value);
  },
};
