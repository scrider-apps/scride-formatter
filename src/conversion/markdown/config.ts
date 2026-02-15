/**
 * Markdown ↔ Delta Mapping Configuration
 *
 * Defines the mapping between Markdown syntax and Delta attributes.
 */

/**
 * Characters that need escaping in Markdown text
 *
 * Note: `.` is only special at line start after a number (ordered lists)
 * We escape only the most impactful chars: \ ` * _ [ ] < > #
 * Chars like `.` `!` `|` are context-dependent and rarely need escaping inline.
 */
export const MARKDOWN_ESCAPE_CHARS = /[\\`*_[\]<>#]/g;

/**
 * Escape special Markdown characters
 */
export function escapeMarkdown(text: string): string {
  return text.replace(MARKDOWN_ESCAPE_CHARS, '\\$&');
}

/**
 * Inline format to Markdown syntax mapping
 *
 * Note: underline, subscript, superscript, mark use HTML tags
 * since Markdown has no native syntax for them
 */
export const INLINE_FORMAT_SYNTAX: Record<string, { prefix: string; suffix: string }> = {
  bold: { prefix: '**', suffix: '**' },
  italic: { prefix: '_', suffix: '_' },
  underline: { prefix: '<u>', suffix: '</u>' },
  strike: { prefix: '~~', suffix: '~~' },
  subscript: { prefix: '<sub>', suffix: '</sub>' },
  superscript: { prefix: '<sup>', suffix: '</sup>' },
  code: { prefix: '`', suffix: '`' },
  mark: { prefix: '<mark>', suffix: '</mark>' },
  kbd: { prefix: '<kbd>', suffix: '</kbd>' },
};

/**
 * Order of inline formats for nesting (outer to inner)
 *
 * Bold + Italic → ***text***
 * Bold + Strike → **~~text~~**
 * Underline, subscript, superscript, mark → HTML tags in Markdown
 */
export const MD_INLINE_FORMAT_ORDER: string[] = [
  'bold',
  'italic',
  'underline',
  'strike',
  'subscript',
  'superscript',
  'code',
  'mark',
  'kbd',
];

/**
 * Block format to Markdown prefix mapping
 */
export const BLOCK_FORMAT_PREFIX: Record<string, string | ((value: unknown) => string)> = {
  header: (value: unknown) => {
    const level = typeof value === 'number' ? value : 1;
    return '#'.repeat(Math.min(Math.max(level, 1), 6)) + ' ';
  },
  blockquote: '> ',
  'code-block': '', // Handled separately with fences
};

/**
 * List type to Markdown prefix
 */
export const LIST_TYPE_PREFIX: Record<string, string | ((index: number) => string)> = {
  bullet: '- ',
  ordered: (index: number) => `${index + 1}. `,
  checked: '- [x] ',
  unchecked: '- [ ] ',
};

/**
 * Generate indent prefix for nested lists
 */
export function getIndentPrefix(level: number): string {
  // Use 4 spaces for indentation (works for both bullet and ordered lists)
  return '    '.repeat(level);
}

/**
 * Render an image embed to Markdown
 */
export function renderImage(src: string, alt?: string, _title?: string): string {
  const altText = alt ?? '';
  return `![${escapeMarkdown(altText)}](${src})`;
}

/**
 * Render a link to Markdown
 */
export function renderLink(text: string, href: string, _title?: string): string {
  return `[${text}](${href})`;
}

/**
 * Render a code block with optional language
 */
export function renderCodeBlock(code: string, language?: string): string {
  const lang = language ?? '';
  return `\`\`\`${lang}\n${code}\n\`\`\``;
}
