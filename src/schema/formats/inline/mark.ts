import type { Format } from '../../Format';

/**
 * Mark (highlight) format
 *
 * Delta: { insert: "text", attributes: { mark: true } }
 * HTML: <mark>text</mark>
 */
export const markFormat: Format<boolean> = {
  name: 'mark',
  scope: 'inline',

  validate(value: boolean): boolean {
    return value === true;
  },
};
