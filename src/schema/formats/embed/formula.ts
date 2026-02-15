import type { Format, FormatMatchResult } from '../../Format';
import type { DOMElement } from '../../../conversion/adapters/types';
import { escapeHtml } from '../../../conversion/html/config';

/**
 * Basic LaTeX validation patterns
 *
 * Checks for:
 * - Balanced braces
 * - Valid command structure
 */
function isValidLatex(value: string): boolean {
  // Empty string is not valid
  if (!value || value.trim().length === 0) {
    return false;
  }

  // Check balanced braces
  let braceCount = 0;
  for (const char of value) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount < 0) return false; // More closing than opening
  }
  if (braceCount !== 0) return false; // Unbalanced

  // Check balanced brackets
  let bracketCount = 0;
  for (const char of value) {
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;
    if (bracketCount < 0) return false;
  }
  if (bracketCount !== 0) return false;

  // Check for invalid command patterns
  // Commands should be \word not just backslash
  const invalidCommand = /\\(?![a-zA-Z]|\\|{|}|\[|\]|\s|,|;|!|\^|_)/;
  if (invalidCommand.test(value)) {
    return false;
  }

  return true;
}

/**
 * Formula (LaTeX) embed format
 *
 * Delta: { insert: { formula: "E = mc^2" } }
 *
 * Value is LaTeX string
 */
export const formulaFormat: Format<string> = {
  name: 'formula',
  scope: 'embed',

  normalize(value: string): string {
    // Trim whitespace but preserve internal formatting
    return value.trim();
  },

  validate(value: string): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return isValidLatex(value);
  },

  render(value: string): string {
    const latex = typeof value === 'string' ? value : '';
    return `<span class="formula" data-formula="${escapeHtml(latex)}">${escapeHtml(latex)}</span>`;
  },

  match(element: DOMElement): FormatMatchResult<string> | null {
    if (element.tagName.toLowerCase() !== 'span') return null;
    const className = element.getAttribute('class') || '';
    if (!className.includes('formula')) return null;
    const formula = element.getAttribute('data-formula');
    if (!formula) return null;
    return { value: formula };
  },
};
