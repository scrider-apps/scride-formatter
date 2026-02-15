import type { Format } from './Format';
import { Registry } from './Registry';

// Inline formats
import {
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
} from './formats/inline';

// Block formats
import {
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
} from './formats/block';

// Embed formats
import {
  blockFormat,
  dividerFormat,
  footnoteRefFormat,
  formulaFormat,
  imageFormat,
  videoFormat,
} from './formats/embed';

// Block handlers
import { BlockHandlerRegistry } from './BlockHandlerRegistry';
import { tableBlockHandler } from './blocks/table';
import { footnotesBlockHandler } from './blocks/footnotes';
import { alertBlockHandler } from './blocks/alert';
import { columnsBlockHandler } from './blocks/columns';
import { boxBlockHandler } from './blocks/box';

/**
 * All default inline formats
 */
export const defaultInlineFormats: Format[] = [
  boldFormat,
  italicFormat,
  underlineFormat,
  strikeFormat,
  subscriptFormat,
  superscriptFormat,
  codeFormat,
  linkFormat,
  colorFormat,
  backgroundFormat,
  markFormat,
  kbdFormat,
];

/**
 * All default block formats
 */
export const defaultBlockFormats: Format[] = [
  headerFormat,
  headerIdFormat,
  blockquoteFormat,
  codeBlockFormat,
  listFormat,
  alignFormat,
  indentFormat,
  tableRowFormat,
  tableColFormat,
  tableHeaderFormat,
  tableColAlignFormat,
];

/**
 * All default embed formats
 */
export const defaultEmbedFormats: Format[] = [
  imageFormat,
  videoFormat,
  formulaFormat,
  dividerFormat,
  blockFormat,
  footnoteRefFormat,
];

/**
 * All default formats combined
 */
export const defaultFormats: Format[] = [
  ...defaultInlineFormats,
  ...defaultBlockFormats,
  ...defaultEmbedFormats,
];

/**
 * Create a Registry with all default formats registered
 *
 * @returns Registry with standard formats
 *
 * @example
 * ```typescript
 * const registry = createDefaultRegistry();
 * registry.normalize({ color: 'red' }); // { color: '#ff0000' }
 * ```
 */
export function createDefaultRegistry(): Registry {
  return new Registry().register(defaultFormats);
}

/**
 * Create a BlockHandlerRegistry with default block handlers
 *
 * Includes:
 * - tableBlockHandler (Extended Table)
 * - footnotesBlockHandler (Footnotes)
 * - alertBlockHandler (Alerts/Admonitions)
 * - columnsBlockHandler (Columns Layout)
 * - boxBlockHandler (Inline-Box / Float Container)
 *
 * @returns BlockHandlerRegistry with default handlers
 *
 * @example
 * ```typescript
 * const blockHandlers = createDefaultBlockHandlers();
 * blockHandlers.has('table'); // true
 * blockHandlers.has('footnotes'); // true
 * blockHandlers.has('alert'); // true
 * blockHandlers.has('columns'); // true
 * blockHandlers.has('box'); // true
 * ```
 */
export function createDefaultBlockHandlers(): BlockHandlerRegistry {
  return new BlockHandlerRegistry()
    .register(tableBlockHandler)
    .register(footnotesBlockHandler)
    .register(alertBlockHandler)
    .register(columnsBlockHandler)
    .register(boxBlockHandler);
}
