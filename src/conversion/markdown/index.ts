/**
 * Markdown Conversion Module
 *
 * Provides conversion between Delta and Markdown formats.
 */

export { deltaToMarkdown } from './delta-to-markdown';
export type { DeltaToMarkdownOptions } from './delta-to-markdown';

export {
  markdownToDelta,
  markdownToDeltaSync,
  isRemarkAvailable,
  preloadRemark,
} from './markdown-to-delta';
export type { MarkdownToDeltaOptions, NodeHandler, ParserContext } from './markdown-to-delta';

export { extractTableRegion, isTableNewlineOp } from './table-region';
export type { TableRegion } from './table-region';
