/**
 * HTML Conversion
 *
 * Delta ↔ HTML conversion utilities.
 */

export {
  deltaToHtml,
  type DeltaToHtmlOptions,
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
  type ResolvedDocumentPresentation,
} from './document-presentation';
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
  type EmbedRenderer,
} from './config';
