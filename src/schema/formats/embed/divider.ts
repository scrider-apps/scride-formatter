import type { Format, FormatMatchResult } from '../../Format';
import type { DOMElement } from '../../../conversion/adapters/types';

/**
 * Divider (Horizontal Rule) embed format
 *
 * Delta: { insert: { divider: true } }
 * HTML:  <hr>
 * Markdown: ---
 *
 * Value is always `true` (no additional data needed)
 */
export const dividerFormat: Format<boolean> = {
  name: 'divider',
  scope: 'embed',

  normalize(value: boolean): boolean {
    return !!value;
  },

  validate(value: boolean): boolean {
    return value === true;
  },

  render(): string {
    return '<hr>';
  },

  match(element: DOMElement): FormatMatchResult<boolean> | null {
    if (element.tagName.toLowerCase() !== 'hr') return null;
    return { value: true };
  },
};
