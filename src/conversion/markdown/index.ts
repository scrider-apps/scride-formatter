/**
 * Markdown Conversion Module
 *
 * Provides conversion between Delta and Markdown formats.
 */

export { deltaToMarkdown, inlineStyleOf, spanInlineStyleWrapper } from './delta-to-markdown';
export type {
  DeltaToMarkdownOptions,
  InlineStyle,
  InlineStyleWrapper,
} from './delta-to-markdown';

export {
  markdownToDelta,
  markdownToDeltaSync,
  isRemarkAvailable,
  preloadRemark,
} from './markdown-to-delta';
export type { MarkdownToDeltaOptions, NodeHandler, ParserContext } from './markdown-to-delta';

export {
  collectAdjacentTableLines,
  extractTableRegion,
  isAdjacentSimpleTableGridBoundary,
  isTableNewlineOp,
  tableCellCoordsFromAttributes,
  tableCellCoordsFromOp,
} from './table-region';
export type { TableCellCoords, TableRegion } from './table-region';
