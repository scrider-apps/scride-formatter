import type { Format } from '../../Format';

/**
 * Keyboard input format
 *
 * Delta: { insert: "text", attributes: { kbd: true } }
 * HTML: <kbd>text</kbd>
 * Markdown: <kbd>text</kbd> (inline HTML)
 */
export const kbdFormat: Format<boolean> = {
  name: 'kbd',
  scope: 'inline',

  validate(value: boolean): boolean {
    return value === true;
  },
};
