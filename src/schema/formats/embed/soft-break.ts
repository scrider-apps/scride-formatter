import type { Format, FormatMatchResult } from '../../Format';
import type { DOMElement } from '../../../conversion/adapters/types';

/**
 * Soft Line Break embed format
 *
 * Represents a "Shift+Enter" style line break that does NOT split the
 * containing block (paragraph, list item, table cell, etc.). This is the
 * Delta-level analogue of HTML `<br>` used as an inline line break and
 * of the GFM "hard break" Markdown construct (two trailing spaces + `\n`).
 *
 * Delta:    `{ insert: { softBreak: true } }`
 * HTML:     `<br data-scrider-embed>` (with the explicit marker so that
 *           round-trip parsing can distinguish a soft break from the
 *           placeholder `<br>` that appears inside an empty paragraph)
 * Markdown: `  \n` (default GFM hard break) or inline `<br>` (configurable
 *           via `softBreakStyle` option on `deltaToMarkdown`)
 *
 * Value is always `true` — the embed has no additional data.
 *
 * @see {@link https://github.github.com/gfm/#hard-line-breaks GFM hard line break}
 */
export const softBreakFormat: Format<boolean> = {
  name: 'softBreak',
  scope: 'embed',

  normalize(value: boolean): boolean {
    return !!value;
  },

  validate(value: boolean): boolean {
    return value === true;
  },

  render(): string {
    return '<br data-scrider-embed>';
  },

  match(element: DOMElement): FormatMatchResult<boolean> | null {
    if (element.tagName.toLowerCase() !== 'br') return null;
    if (!element.hasAttribute('data-scrider-embed')) return null;
    return { value: true };
  },

  // NB: Markdown rendering is intentionally NOT implemented on the format
  // itself. The choice between `"  \n"` (GFM spaces) and inline `<br>`
  // depends on the caller-provided `softBreakStyle` option on
  // `deltaToMarkdown`, so the converter handles it as a built-in special
  // case instead of going through `Format.toMarkdown`. The Markdown side
  // of the round-trip is symmetric: `markdownToDelta` recognises both
  // `break` AST nodes and inline `<br>` HTML and emits this embed.
};
