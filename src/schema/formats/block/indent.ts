import type { Format } from '../../Format';

/**
 * Maximum indent level
 */
const MAX_INDENT = 8;

/**
 * Indent format
 *
 * Delta: { insert: "\n", attributes: { indent: 1 } }
 *
 * Values: 0-8 (0 = no indent)
 */
export const indentFormat: Format<number> = {
  name: 'indent',
  scope: 'block',

  normalize(value: number): number {
    // Clamp to valid range and ensure non-negative integer
    return Math.max(0, Math.min(MAX_INDENT, Math.floor(value)));
  },

  validate(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= MAX_INDENT;
  },
};
