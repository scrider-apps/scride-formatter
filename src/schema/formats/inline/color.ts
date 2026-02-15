import type { Format } from '../../Format';
import { isValidColor, toHexColor } from '../../utils/color';

/**
 * Text color format
 *
 * Delta: { insert: "text", attributes: { color: "#ff0000" } }
 *
 * Normalizes all color formats (rgb, named, etc.) to lowercase hex (#rrggbb)
 */
export const colorFormat: Format<string> = {
  name: 'color',
  scope: 'inline',

  normalize(value: string): string {
    return toHexColor(value);
  },

  validate(value: string): boolean {
    return typeof value === 'string' && isValidColor(value);
  },
};
