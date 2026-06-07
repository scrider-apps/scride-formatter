/**
 * HTML Conversion
 *
 * Delta ↔ HTML conversion utilities.
 */

export {
  deltaToHtml,
  type DeltaToHtmlOptions,
  type EmbedIsolationOptions,
  type TableCellAlign,
  type TablePresentation,
  type DocumentPresentation,
} from './delta-to-html';
export {
  resolveTablePresentation,
  isZebraBodyRow,
  type ResolvedTablePresentation,
} from './table-presentation';
export {
  resolveDocumentPresentation,
  documentPresentationStyleParts,
  blockPresentationStyleParts,
  type ResolvedDocumentPresentation,
} from './document-presentation';
export {
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
} from './block-presentation';
export {
  htmlToDelta,
  type HtmlToDeltaOptions,
  type TagHandler,
  type ParserContext,
} from './html-to-delta';
export {
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
} from './config';
