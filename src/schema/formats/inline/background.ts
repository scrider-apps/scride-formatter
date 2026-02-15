import type { Format } from '../../Format';
import { isValidColor, toHexColor } from '../../utils/color';

/**
 * Background color format
 *
 * Delta: { insert: "text", attributes: { background: "#ff0000" } }
 *
 * Normalizes all color formats (rgb, named, etc.) to lowercase hex (#rrggbb)
 */
export const backgroundFormat: Format<string> = {
  name: 'background',
  scope: 'inline',

  normalize(value: string): string {
    return toHexColor(value);
  },

  validate(value: string): boolean {
    return typeof value === 'string' && isValidColor(value);
  },
};
