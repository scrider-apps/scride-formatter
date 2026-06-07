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
  type EmbedIsolationOptions,
  type TableCellAlign,
  type TablePresentation,
  type DocumentPresentation,
  resolveTablePresentation,
  isZebraBodyRow,
  type ResolvedTablePresentation,
  resolveDocumentPresentation,
  documentPresentationStyleParts,
  blockPresentationStyleParts,
  SCRIDER_LINE_HEIGHT_KEY,
  SCRIDER_MARGIN_AFTER_KEY,
  SCRIDER_MARGIN_BEFORE_KEY,
  LINE_HEIGHT_BLOCK_TAGS,
  PARAGRAPH_SPACING_BLOCK_TAGS,
  parseScriderLineHeightMultiplier,
  parseScriderMarginEm,
  parseScriderMarginAfterEm,
  parseScriderMarginBeforeEm,
  blockLineHeightStyleParts,
  blockParagraphMarginStyleParts,
  blockMarginAfterStyleParts,
  blockMarginBeforeStyleParts,
  type ResolvedDocumentPresentation,
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
  toCodeWidgetEmbedUrl,
  renderEmbedIframeIsolationAttrs,
  CODE_WIDGET_IFRAME_ALLOW,
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
  preloadRemark,
  type MarkdownToDeltaOptions,
  extractTableRegion,
  isTableNewlineOp,
  type TableRegion,
} from './markdown';
