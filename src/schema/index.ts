// Core types and classes
export type { Format, FormatDefinition, FormatMatchResult, FormatScope } from './Format';
export { Registry } from './Registry';

// Block handler infrastructure
export type { BlockHandler, BlockContext, BlockRenderOptions } from './BlockHandler';
export { BlockHandlerRegistry } from './BlockHandlerRegistry';

// Block implementations
export type { TableBlockData, CellData, CellAlign } from './blocks/table';
export { tableBlockHandler } from './blocks/table';
export type { FootnotesBlockData } from './blocks/footnotes';
export { footnotesBlockHandler } from './blocks/footnotes';
export type { AlertBlockData, AlertType } from './blocks/alert';
export { ALERT_TYPES, alertBlockHandler } from './blocks/alert';
export type { ColumnsBlockData } from './blocks/columns';
export { columnsBlockHandler } from './blocks/columns';
export type { BoxBlockData, BoxFloat, BoxOverflow, BoxOpAttributes } from './blocks/box';
export {
  BOX_FLOAT_VALUES,
  BOX_OVERFLOW_VALUES,
  boxBlockHandler,
  extractBoxOpAttributes,
} from './blocks/box';

// Default registry
export {
  createDefaultRegistry,
  createDefaultBlockHandlers,
  defaultBlockFormats,
  defaultEmbedFormats,
  defaultFormats,
  defaultInlineFormats,
} from './defaults';

// All formats
export * from './formats';

// Utilities
export * from './utils';
