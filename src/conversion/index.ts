/**
 * Conversion Module
 *
 * HTML ↔ Delta ↔ Markdown conversion utilities.
 */

// DOM Adapters
export {
  // Types
  type DOMAdapter,
  type DOMDocument,
  type DOMDocumentFragment,
  type DOMNode,
  type DOMElement,
  type DOMNodeList,
  type DOMCSSStyleDeclaration,
  type DOMTokenList,
  NODE_TYPE,
  isElement,
  isTextNode,
  // Adapters
  BrowserDOMAdapter,
  browserAdapter,
  NodeDOMAdapter,
  nodeAdapter,
  getAdapter,
  isAdapterAvailable,
} from './adapters';

// Sanitization
export {
  sanitizeDelta,
  normalizeDelta,
  validateDelta,
  cloneDelta,
  type SanitizeOptions,
} from './sanitize';

// HTML Conversion
export {
  deltaToHtml,
  type DeltaToHtmlOptions,
  htmlToDelta,
  type HtmlToDeltaOptions,
  type TagHandler,
  type ParserContext,
  // Config exports
  INLINE_FORMAT_TAGS,
  INLINE_FORMAT_ORDER,
  INLINE_STYLE_FORMATS,
  BLOCK_FORMAT_TAGS,
  LIST_WRAPPER_TAGS,
  EMBED_RENDERERS,
  TAG_TO_INLINE_FORMAT,
  TAG_TO_BLOCK_FORMAT,
  CSS_ALIGN_TO_FORMAT,
  escapeHtml,
  unescapeHtml,
  type EmbedRenderer,
} from './html';

// Slugify utility
export { slugify, slugifyWithDedup } from './utils/slugify';

// Markdown Conversion
export {
  deltaToMarkdown,
  type DeltaToMarkdownOptions,
  markdownToDelta,
  markdownToDeltaSync,
  isRemarkAvailable,
  type MarkdownToDeltaOptions,
} from './markdown';
