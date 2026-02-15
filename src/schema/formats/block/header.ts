import type { Format } from '../../Format';

/**
 * Header format (h1-h6)
 *
 * Delta: { insert: "\n", attributes: { header: 1 } }
 *
 * Values: 1-6 (corresponding to h1-h6)
 */
export const headerFormat: Format<number> = {
  name: 'header',
  scope: 'block',

  normalize(value: number): number {
    // Clamp to valid range and ensure integer
    return Math.max(1, Math.min(6, Math.floor(value)));
  },

  validate(value: number): boolean {
    return Number.isInteger(value) && value >= 1 && value <= 6;
  },
};
