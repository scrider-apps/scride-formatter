import type { Format } from '../../Format';
import { isBlockBoxFloat, isBlockBoxLength } from './block-box';

/**
 * Width of a Dialog plate, CSS px. Absent = full column. Lives on the title line.
 *
 * Delta: { insert: "\n", attributes: { "dialog-role": "title", "dialog-width": "320" } }
 */
export const dialogWidthFormat: Format<string | number> = {
  name: 'dialog-width',
  scope: 'block',

  validate(value: string | number): boolean {
    return isBlockBoxLength(value);
  },
};

/**
 * Position of a Dialog plate: `left` / `center` / `right`. Absent = in the line.
 * Lives on the title line.
 *
 * Delta: { insert: "\n", attributes: { "dialog-role": "title", "dialog-float": "left" } }
 */
export const dialogFloatFormat: Format<string> = {
  name: 'dialog-float',
  scope: 'block',

  validate(value: string): boolean {
    return isBlockBoxFloat(value);
  },
};

/**
 * Width of a Voice plate, CSS px. Absent = full column. Lives on the title line.
 *
 * Delta: { insert: "\n", attributes: { "voice-role": "title", "voice-width": "320" } }
 */
export const voiceWidthFormat: Format<string | number> = {
  name: 'voice-width',
  scope: 'block',

  validate(value: string | number): boolean {
    return isBlockBoxLength(value);
  },
};

/**
 * Position of a Voice plate: `left` / `center` / `right`. Absent = in the line.
 * Lives on the title line.
 *
 * Delta: { insert: "\n", attributes: { "voice-role": "title", "voice-float": "right" } }
 */
export const voiceFloatFormat: Format<string> = {
  name: 'voice-float',
  scope: 'block',

  validate(value: string): boolean {
    return isBlockBoxFloat(value);
  },
};
