/**
 * @scrider/formatter
 * Schema, conversion and block handlers for @scrider/delta
 */

// Re-export Core (convenience — use one import for everything)
export * from '@scrider/delta';

// Schema (Registry & Formats)
export type { Format, FormatDefinition, FormatMatchResult, FormatScope } from './schema';
export type { BlockHandler, BlockContext, BlockRenderOptions } from './schema';
export type { TableBlockData, CellData, CellAlign } from './schema';
export type { FootnotesBlockData } from './schema';
export type { AlertBlockData, AlertType } from './schema';
export type { ColumnsBlockData } from './schema';
export type { BoxBlockData, BoxFloat, BoxOverflow, BoxOpAttributes } from './schema';
export {
  ALERT_TYPES,
  BOX_FLOAT_VALUES,
  BOX_OVERFLOW_VALUES,
  BlockHandlerRegistry,
  createDefaultBlockHandlers,
  createDefaultRegistry,
  defaultBlockFormats,
  defaultEmbedFormats,
  defaultFormats,
  defaultInlineFormats,
  Registry,
  tableBlockHandler,
  footnotesBlockHandler,
  alertBlockHandler,
  columnsBlockHandler,
  boxBlockHandler,
  extractBoxOpAttributes,
} from './schema';

// Individual formats (for custom registries)
export {
  // Inline
  backgroundFormat,
  boldFormat,
  codeFormat,
  colorFormat,
  italicFormat,
  kbdFormat,
  linkFormat,
  markFormat,
  strikeFormat,
  subscriptFormat,
  superscriptFormat,
  underlineFormat,
  // Block
  alignFormat,
  blockquoteFormat,
  codeBlockFormat,
  headerFormat,
  headerIdFormat,
  indentFormat,
  listFormat,
  tableRowFormat,
  tableColFormat,
  tableHeaderFormat,
  tableColAlignFormat,
  // Embed
  blockFormat,
  dividerFormat,
  footnoteRefFormat,
  formulaFormat,
  imageFormat,
  videoFormat,
} from './schema';
export type { AlignType, ListType, TableColAlignType } from './schema';

// Color utilities
export { getNamedColors, isValidColor, isValidHexColor, toHexColor } from './schema';

// Conversion (DOM adapters)
export type {
  DeltaToHtmlOptions,
  DOMAdapter,
  DOMDocument,
  DOMDocumentFragment,
  DOMElement,
  DOMNode,
  DOMNodeList,
  HtmlToDeltaOptions,
  SanitizeOptions,
  DeltaToMarkdownOptions,
  MarkdownToDeltaOptions,
} from './conversion';
export {
  BrowserDOMAdapter,
  browserAdapter,
  cloneDelta,
  deltaToHtml,
  escapeHtml,
  getAdapter,
  htmlToDelta,
  isAdapterAvailable,
  isElement,
  isTextNode,
  NODE_TYPE,
  NodeDOMAdapter,
  nodeAdapter,
  normalizeDelta,
  sanitizeDelta,
  unescapeHtml,
  validateDelta,
  // Markdown conversion
  deltaToMarkdown,
  markdownToDelta,
  markdownToDeltaSync,
  isRemarkAvailable,
  // Slugify utility
  slugify,
  slugifyWithDedup,
} from './conversion';
