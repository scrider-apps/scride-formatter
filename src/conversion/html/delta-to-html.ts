/**
 * Delta → HTML Conversion
 *
 * Converts a Delta document to an HTML string.
 */

import { Delta, isInsert, isEmbedInsert } from '@scrider/delta';
import type { Op, AttributeMap } from '@scrider/delta';
import type { BlockHandlerRegistry } from '../../schema/BlockHandlerRegistry';
import type { BlockContext } from '../../schema/BlockHandler';
import type { Registry } from '../../schema/Registry';
import {
  INLINE_FORMAT_ORDER,
  INLINE_FORMAT_TAGS,
  INLINE_STYLE_FORMATS,
  BLOCK_FORMAT_TAGS,
  LIST_WRAPPER_TAGS,
  EMBED_RENDERERS,
  escapeHtml,
} from './config';
import { slugifyWithDedup } from '../utils/slugify';

/**
 * Options for Delta → HTML conversion
 */
export interface DeltaToHtmlOptions {
  /**
   * Pretty print output with indentation
   * @default false
   */
  pretty?: boolean;

  /**
   * Custom embed renderers (merged with defaults)
   */
  embedRenderers?: Record<string, (value: unknown, attrs?: Record<string, unknown>) => string>;

  /**
   * Wrap output in a container element
   * @default undefined (no wrapper)
   */
  wrapper?: string;

  /**
   * Use semantic HTML5 elements
   * @default true
   */
  semantic?: boolean;

  /**
   * Use hierarchical numbering for ordered lists (e.g., 1, 1.1, 1.1.1)
   * When enabled, list items get data-number attribute with calculated number
   * @default false
   */
  hierarchicalNumbers?: boolean;

  /**
   * Block handler registry for complex block embeds (Extended Table, etc.)
   * When provided, `{ insert: { block: { type, ... } } }` ops are dispatched
   * to the matching BlockHandler.toHtml() for rendering.
   */
  blockHandlers?: BlockHandlerRegistry;

  /**
   * Generate anchor link `id` attributes on heading elements (`<h1>`-`<h6>`).
   *
   * When enabled, headings get an `id` computed via slugify(text).
   * If a heading has an explicit `header-id` attribute in Delta, that id is used instead.
   * Duplicate slugs are deduplicated with `-1`, `-2` suffixes.
   *
   * @default false
   */
  anchorLinks?: boolean;

  /**
   * Format registry for custom embed rendering.
   *
   * When provided, embed formats with a `render()` method are used
   * before falling back to built-in EMBED_RENDERERS.
   * This enables extensibility without modifying converter internals.
   */
  registry?: Registry;
}

/**
 * Line content with its formatting
 */
interface LineContent {
  ops: Op[];
  attributes: AttributeMap | undefined;
}

/**
 * Convert a Delta to an HTML string
 *
 * @param delta - The Delta to convert
 * @param options - Conversion options
 * @returns HTML string
 *
 * @example
 * ```typescript
 * const delta = new Delta()
 *   .insert('Hello ', { bold: true })
 *   .insert('World')
 *   .insert('\n', { header: 1 });
 *
 * const html = deltaToHtml(delta);
 * // '<h1><strong>Hello </strong>World</h1>'
 * ```
 */
export function deltaToHtml(delta: Delta, options: DeltaToHtmlOptions = {}): string {
  const lines = splitIntoLines(delta);
  const embedRenderers = { ...EMBED_RENDERERS, ...options.embedRenderers };
  const pretty = options.pretty ?? false;
  const hierarchicalNumbers = options.hierarchicalNumbers ?? false;
  const blockHandlers = options.blockHandlers;
  const anchorLinks = options.anchorLinks ?? false;

  let html = '';
  let listStack: { type: string; indent: number }[] = [];

  // Hierarchical numbering counters: counters[0] = top level, counters[1] = first nested, etc.
  let counters: number[] = [];

  // Slug deduplication map for anchor links on headings
  const slugUsageMap = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Handle table grouping (adjacent lines with table-row attribute)
    if (isTableLine(line)) {
      html += closeAllLists(listStack, pretty);
      listStack = [];
      counters = [];

      const tableLines = collectTableLines(lines, i);
      html += renderTable(tableLines, embedRenderers, pretty, blockHandlers, options);
      i += tableLines.length - 1;
      continue;
    }

    const { tag, isList, listType, indent, isCodeBlock } = getBlockInfo(line.attributes);

    // Handle code block grouping (similar to lists)
    if (isCodeBlock) {
      // Close any open lists first
      html += closeAllLists(listStack, pretty);
      listStack = [];
      counters = [];

      // Collect all adjacent code-block lines
      const codeLines = collectCodeBlockLines(lines, i);
      const language = getCodeBlockLanguage(line.attributes);
      html += renderCodeBlock(codeLines, language, embedRenderers, pretty, blockHandlers, options);
      i += codeLines.length - 1; // Skip processed lines
      continue;
    }

    // Handle block-level embeds (e.g. <hr>) — render directly without <p> wrapper
    if (!isList && isBlockLevelEmbedLine(line)) {
      html += closeAllLists(listStack, pretty);
      listStack = [];
      counters = [];
      html += renderLineContent(line.ops, embedRenderers, blockHandlers, options);
      if (pretty) html += '\n';
      continue;
    }

    // Handle list nesting
    if (isList) {
      html += handleListOpen(listStack, listType!, indent, pretty);

      // Update hierarchical counters for ordered lists
      if (hierarchicalNumbers && listType === 'ordered') {
        // Trim counters if we went back to a higher level
        if (counters.length > indent + 1) {
          counters = counters.slice(0, indent + 1);
        }
        // Extend counters if we went deeper
        // Use 1 for skipped parent levels (handles broken lists starting with nested items)
        while (counters.length < indent) {
          counters.push(1);
        }
        if (counters.length === indent) {
          counters.push(0); // Current level starts at 0, will be incremented below
        }
        // Increment counter at current level
        counters[indent] = (counters[indent] || 0) + 1;
      }
    } else {
      html += closeAllLists(listStack, pretty);
      listStack = [];
      // Reset counters when exiting list context
      counters = [];
    }

    // Render line content
    const content = renderLineContent(line.ops, embedRenderers, blockHandlers, options);

    // Wrap in block tag
    if (isList) {
      const listItemAttrs = getListItemAttributes(line.attributes);
      const indentLevel = listStack.length;

      // Calculate hierarchical number if enabled
      let hierarchicalNumber: string | undefined;
      if (hierarchicalNumbers && listType === 'ordered') {
        hierarchicalNumber = counters.slice(0, indent + 1).join('.');
      }

      html += renderListItem(content, listItemAttrs, pretty, indentLevel, hierarchicalNumber);
    } else {
      // Generate anchor id for headings
      let headingId: string | undefined;
      if (line.attributes?.header) {
        const customId = line.attributes['header-id'];
        if (typeof customId === 'string' && customId.length > 0) {
          headingId = customId;
        } else if (anchorLinks) {
          const plainText = extractPlainText(line.ops);
          headingId = slugifyWithDedup(plainText, slugUsageMap);
        }
      }
      html += renderBlock(content, tag, line.attributes, pretty, headingId);
    }
  }

  // Close any remaining lists
  html += closeAllLists(listStack, pretty);

  // Wrap in container if specified
  if (options.wrapper) {
    html = `<${options.wrapper}>${html}</${options.wrapper}>`;
  }

  return html;
}

/**
 * Get indentation string for pretty printing
 */
function getIndent(level: number): string {
  return '  '.repeat(level);
}

/**
 * Split Delta into lines based on \n characters
 */
function splitIntoLines(delta: Delta): LineContent[] {
  const lines: LineContent[] = [];
  let currentOps: Op[] = [];

  for (const op of delta.ops) {
    if (!isInsert(op)) continue;

    if (isEmbedInsert(op)) {
      // Embeds are inline, add to current line
      currentOps.push(op);
      continue;
    }

    // Text insert - split by newlines
    const text = op.insert as string;
    const parts = text.split('\n');

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === undefined) continue;

      // Add text content to current line
      if (part.length > 0) {
        currentOps.push({
          insert: part,
          ...(op.attributes && { attributes: op.attributes }),
        });
      }

      // If not the last part, this is a line break
      if (i < parts.length - 1) {
        lines.push({
          ops: currentOps,
          attributes: op.attributes, // Line attributes come from the \n op
        });
        currentOps = [];
      }
    }
  }

  // Handle remaining content (no trailing \n)
  if (currentOps.length > 0) {
    lines.push({
      ops: currentOps,
      attributes: undefined,
    });
  }

  return lines;
}

/**
 * Check if a line contains only a block-level embed (e.g. divider/hr).
 * These embeds should be rendered directly without a <p> wrapper,
 * since they are block-level void elements in HTML.
 *
 * Embeds with a `float` attribute are also treated as block-level,
 * because floated elements (images, videos) should not be wrapped in `<p>`.
 */
const BLOCK_LEVEL_EMBEDS = new Set(['divider', 'block']);

function isBlockLevelEmbedLine(line: LineContent): boolean {
  if (line.ops.length !== 1) return false;
  const op = line.ops[0];
  if (!op || !isEmbedInsert(op)) return false;
  const embed = op.insert as Record<string, unknown>;
  const embedType = Object.keys(embed)[0];
  if (!!embedType && BLOCK_LEVEL_EMBEDS.has(embedType)) return true;
  // Embeds with float attribute are block-level (no <p> wrapper needed)
  const attrs = op.attributes as Record<string, unknown> | undefined;
  if (attrs && typeof attrs.float === 'string' && attrs.float !== 'none') return true;
  return false;
}

/**
 * Check if a line is a table cell
 */
function isTableLine(line: LineContent): boolean {
  return (
    line.attributes != null &&
    typeof line.attributes['table-row'] === 'number' &&
    typeof line.attributes['table-col'] === 'number'
  );
}

/**
 * Collect all adjacent table lines starting from the given index
 */
function collectTableLines(lines: LineContent[], startIndex: number): LineContent[] {
  const result: LineContent[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !isTableLine(line)) break;
    result.push(line);
  }
  return result;
}

/**
 * Grouped cell data for rendering
 */
interface TableCell {
  ops: Op[];
  colAlign?: string | undefined;
}

/**
 * Render a group of table lines as an HTML <table>
 */
function renderTable(
  tableLines: LineContent[],
  embedRenderers: Record<string, (value: unknown, attrs?: Record<string, unknown>) => string>,
  pretty: boolean,
  blockHandlers?: BlockHandlerRegistry,
  options?: DeltaToHtmlOptions,
): string {
  // Group lines by row, preserving column order
  const rows = new Map<number, { isHeader: boolean; cells: Map<number, TableCell> }>();

  for (const line of tableLines) {
    const attrs = line.attributes!;
    const rowIdx = attrs['table-row'] as number;
    const colIdx = attrs['table-col'] as number;

    if (!rows.has(rowIdx)) {
      rows.set(rowIdx, { isHeader: !!attrs['table-header'], cells: new Map() });
    }

    const row = rows.get(rowIdx)!;
    if (attrs['table-header']) row.isHeader = true;
    row.cells.set(colIdx, {
      ops: line.ops,
      colAlign: typeof attrs['table-col-align'] === 'string' ? attrs['table-col-align'] : undefined,
    });
  }

  // Sort rows by index
  const sortedRows = [...rows.entries()].sort((a, b) => a[0] - b[0]);

  // Determine max columns
  let maxCol = 0;
  for (const [, row] of sortedRows) {
    for (const colIdx of row.cells.keys()) {
      if (colIdx > maxCol) maxCol = colIdx;
    }
  }

  // Separate header and body rows
  const headerRows = sortedRows.filter(([, r]) => r.isHeader);
  const bodyRows = sortedRows.filter(([, r]) => !r.isHeader);

  const indent = pretty ? '  ' : '';
  const nl = pretty ? '\n' : '';
  let html = `<table>${nl}`;

  // Render <thead>
  if (headerRows.length > 0) {
    html += `${indent}<thead>${nl}`;
    for (const [, row] of headerRows) {
      html += renderTableRow(
        row.cells,
        maxCol,
        'th',
        embedRenderers,
        pretty,
        2,
        blockHandlers,
        options,
      );
    }
    html += `${indent}</thead>${nl}`;
  }

  // Render <tbody>
  if (bodyRows.length > 0) {
    html += `${indent}<tbody>${nl}`;
    for (const [, row] of bodyRows) {
      html += renderTableRow(
        row.cells,
        maxCol,
        'td',
        embedRenderers,
        pretty,
        2,
        blockHandlers,
        options,
      );
    }
    html += `${indent}</tbody>${nl}`;
  }

  html += `</table>`;
  if (pretty) html += '\n';
  return html;
}

/**
 * Render a single table row (<tr>)
 */
function renderTableRow(
  cells: Map<number, TableCell>,
  maxCol: number,
  cellTag: 'th' | 'td',
  embedRenderers: Record<string, (value: unknown, attrs?: Record<string, unknown>) => string>,
  pretty: boolean,
  depth: number,
  blockHandlers?: BlockHandlerRegistry,
  options?: DeltaToHtmlOptions,
): string {
  const indent = pretty ? '  '.repeat(depth) : '';
  const cellIndent = pretty ? '  '.repeat(depth + 1) : '';
  const nl = pretty ? '\n' : '';

  let html = `${indent}<tr>${nl}`;

  for (let col = 0; col <= maxCol; col++) {
    const cell = cells.get(col);
    const content = cell ? renderLineContent(cell.ops, embedRenderers, blockHandlers, options) : '';
    const alignStyle =
      cell?.colAlign && cell.colAlign !== 'left' ? ` style="text-align: ${cell.colAlign}"` : '';
    html += `${cellIndent}<${cellTag}${alignStyle}>${content}</${cellTag}>${nl}`;
  }

  html += `${indent}</tr>${nl}`;
  return html;
}

/**
 * Get block element info from line attributes
 */
function getBlockInfo(attributes: AttributeMap | undefined): {
  tag: string;
  isList: boolean;
  isCodeBlock: boolean;
  listType: string | undefined;
  indent: number;
} {
  if (!attributes) {
    return { tag: 'p', isList: false, isCodeBlock: false, listType: undefined, indent: 0 };
  }

  const indent = typeof attributes.indent === 'number' ? attributes.indent : 0;

  // Check for code block (handled separately with grouping)
  if (attributes['code-block']) {
    return { tag: 'pre', isList: false, isCodeBlock: true, listType: undefined, indent };
  }

  // Check for list
  if (attributes.list) {
    const listVal = attributes.list;
    const listType = typeof listVal === 'string' ? listVal : 'bullet';
    return { tag: 'li', isList: true, isCodeBlock: false, listType, indent };
  }

  // Check for other block formats
  for (const [format, tagOrFn] of Object.entries(BLOCK_FORMAT_TAGS)) {
    if (format in attributes && format !== 'list' && format !== 'code-block') {
      const tag = typeof tagOrFn === 'function' ? tagOrFn(attributes[format]) : tagOrFn;
      return { tag, isList: false, isCodeBlock: false, listType: undefined, indent };
    }
  }

  return { tag: 'p', isList: false, isCodeBlock: false, listType: undefined, indent };
}

/**
 * Collect consecutive code block lines (same language)
 */
function collectCodeBlockLines(lines: LineContent[], startIndex: number): LineContent[] {
  const codeLines: LineContent[] = [];
  const startLine = lines[startIndex];
  if (!startLine) return codeLines;

  const startLang = getCodeBlockLanguage(startLine.attributes);

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.attributes?.['code-block']) break;

    const lang = getCodeBlockLanguage(line.attributes);
    if (i > startIndex && lang !== startLang) break;

    codeLines.push(line);
  }

  return codeLines;
}

/**
 * Get language from code-block attribute
 */
function getCodeBlockLanguage(attributes: AttributeMap | undefined): string | undefined {
  if (!attributes) return undefined;
  const codeBlock = attributes['code-block'];
  if (typeof codeBlock === 'string' && codeBlock !== 'true') {
    return codeBlock;
  }
  return undefined;
}

/**
 * Render a code block (grouped lines)
 */
function renderCodeBlock(
  codeLines: LineContent[],
  language: string | undefined,
  embedRenderers: Record<string, (value: unknown, attrs?: Record<string, unknown>) => string>,
  pretty: boolean,
  blockHandlers?: BlockHandlerRegistry,
  options?: DeltaToHtmlOptions,
): string {
  // Render each line's content (no HTML escaping of structure — just text)
  const lineContents = codeLines.map((line) =>
    renderLineContent(line.ops, embedRenderers, blockHandlers, options),
  );
  const code = lineContents.join('\n');

  const langClass = language ? ` class="language-${escapeHtml(language)}"` : '';
  const langAttr = language ? ` data-language="${escapeHtml(language)}"` : '';
  const html = `<pre${langAttr}><code${langClass}>${code}\n</code></pre>`;
  return pretty ? html + '\n' : html;
}

/**
 * Handle opening list tags based on indent level
 */
function handleListOpen(
  stack: { type: string; indent: number }[],
  listType: string,
  indent: number,
  pretty: boolean,
): string {
  let html = '';
  const wrapperTag = LIST_WRAPPER_TAGS[listType] || 'ul';

  // Close lists that are at higher indent levels
  while (stack.length > 0) {
    const last = stack[stack.length - 1];
    if (!last || last.indent <= indent) break;
    const closed = stack.pop();
    if (closed) {
      const closeTag = LIST_WRAPPER_TAGS[closed.type] || 'ul';
      if (pretty) html += getIndent(stack.length);
      html += `</${closeTag}>`;
      if (pretty) html += '\n';
    }
  }

  // Close and reopen if list type changed at same level
  const top = stack[stack.length - 1];
  if (top && top.indent === indent && top.type !== listType) {
    const closed = stack.pop();
    if (closed) {
      const closeTag = LIST_WRAPPER_TAGS[closed.type] || 'ul';
      if (pretty) html += getIndent(stack.length);
      html += `</${closeTag}>`;
      if (pretty) html += '\n';
    }
  }

  // Open new lists as needed
  while (true) {
    const last = stack[stack.length - 1];
    const currentIndent = last ? last.indent + 1 : 0;

    if (currentIndent > indent) break;

    if (pretty) html += getIndent(stack.length);
    html += `<${wrapperTag}>`;
    if (pretty) html += '\n';
    stack.push({ type: listType, indent: currentIndent });

    if (currentIndent >= indent) break;
  }

  // Ensure list is open at current level
  const current = stack[stack.length - 1];
  if (!current || current.indent < indent) {
    if (pretty) html += getIndent(stack.length);
    html += `<${wrapperTag}>`;
    if (pretty) html += '\n';
    stack.push({ type: listType, indent });
  }

  return html;
}

/**
 * Close all open lists
 */
function closeAllLists(stack: { type: string; indent: number }[], pretty: boolean): string {
  let html = '';
  while (stack.length > 0) {
    const closed = stack.pop()!;
    const closeTag = LIST_WRAPPER_TAGS[closed.type] || 'ul';
    if (pretty) html += getIndent(stack.length);
    html += `</${closeTag}>`;
    if (pretty) html += '\n';
  }
  return html;
}

/**
 * Get list item specific attributes (checked/unchecked)
 */
function getListItemAttributes(attributes: AttributeMap | undefined): string {
  if (!attributes) return '';

  const listType = attributes.list;
  if (listType === 'checked') {
    return ' data-checked="true"';
  }
  if (listType === 'unchecked') {
    return ' data-checked="false"';
  }

  return '';
}

/**
 * Render a list item
 */
function renderListItem(
  content: string,
  attrs: string,
  pretty: boolean,
  indentLevel: number,
  hierarchicalNumber?: string,
): string {
  const indent = pretty ? getIndent(indentLevel) : '';
  // Use <br> for empty list items so they have height in browser
  const innerContent = content || '<br>';

  // Add data-number attribute for hierarchical numbering
  let fullAttrs = attrs;
  if (hierarchicalNumber) {
    fullAttrs += ` data-number="${hierarchicalNumber}"`;
  }

  const html = `${indent}<li${fullAttrs}>${innerContent}</li>`;
  return pretty ? html + '\n' : html;
}

/**
 * Render a block element
 */
function renderBlock(
  content: string,
  tag: string,
  attributes: AttributeMap | undefined,
  pretty?: boolean,
  id?: string,
): string {
  const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
  const styleAttr = getBlockStyleAttribute(attributes);
  // Use <br> for empty paragraphs so they have height in browser
  const innerContent = content || '<br>';
  const html = `<${tag}${idAttr}${styleAttr}>${innerContent}</${tag}>`;
  return pretty ? html + '\n' : html;
}

/**
 * Get style attribute for block element (alignment, etc.)
 */
function getBlockStyleAttribute(attributes: AttributeMap | undefined): string {
  if (!attributes) return '';

  const styles: string[] = [];

  const alignVal = attributes.align;
  if (alignVal && typeof alignVal === 'string' && alignVal !== 'left') {
    styles.push(`text-align: ${alignVal}`);
  }

  if (attributes.indent && typeof attributes.indent === 'number') {
    // Skip indent for lists (handled by nesting)
    if (!attributes.list) {
      styles.push(`margin-left: ${attributes.indent * 2}em`);
    }
  }

  return styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
}

/**
 * Extract plain text from line ops (for slugify).
 * Walks insert ops, collecting text strings and ignoring embeds/formatting.
 */
function extractPlainText(ops: Op[]): string {
  let text = '';
  for (const op of ops) {
    if (isInsert(op) && typeof op.insert === 'string') {
      text += op.insert;
    }
  }
  return text;
}

/**
 * Render line content (inline elements and embeds)
 */
function renderLineContent(
  ops: Op[],
  embedRenderers: Record<string, (value: unknown, attrs?: Record<string, unknown>) => string>,
  blockHandlers?: BlockHandlerRegistry,
  options?: DeltaToHtmlOptions,
): string {
  let html = '';

  for (const op of ops) {
    if (!isInsert(op)) continue;

    if (isEmbedInsert(op)) {
      html += renderEmbed(
        op.insert as Record<string, unknown>,
        op.attributes,
        embedRenderers,
        blockHandlers,
        options,
      );
    } else {
      html += renderInlineText(op.insert as string, op.attributes);
    }
  }

  return html;
}

/**
 * Render inline text with formatting
 */
function renderInlineText(text: string, attributes: AttributeMap | undefined): string {
  if (!text) return '';

  let html = escapeHtml(text);

  if (!attributes) return html;

  // Apply style-based formats first (wrap in span if needed)
  const styles: string[] = [];
  for (const [format, cssProperty] of Object.entries(INLINE_STYLE_FORMATS)) {
    if (format in attributes) {
      styles.push(`${cssProperty}: ${String(attributes[format])}`);
    }
  }

  if (styles.length > 0) {
    html = `<span style="${styles.join('; ')}">${html}</span>`;
  }

  // Apply tag-based formats (in reverse order for proper nesting)
  for (let i = INLINE_FORMAT_ORDER.length - 1; i >= 0; i--) {
    const format = INLINE_FORMAT_ORDER[i];
    if (!format) continue;
    if (!(format in attributes)) continue;

    const tag = INLINE_FORMAT_TAGS[format];
    if (!tag) continue;

    if (format === 'link') {
      const href = escapeHtml(String(attributes.link));
      html = `<a href="${href}">${html}</a>`;
    } else {
      html = `<${tag}>${html}</${tag}>`;
    }
  }

  return html;
}

/**
 * Render an embed
 */
function renderEmbed(
  value: Record<string, unknown>,
  attributes: AttributeMap | undefined,
  renderers: Record<string, (value: unknown, attrs?: Record<string, unknown>) => string>,
  blockHandlers?: BlockHandlerRegistry,
  options?: DeltaToHtmlOptions,
): string {
  const embedType: string | undefined = Object.keys(value)[0];
  if (!embedType) return '';

  // Block embed dispatch: { block: { type: "table", ... } }
  if (embedType === 'block' && blockHandlers) {
    const blockData = value.block as Record<string, unknown>;
    if (blockData && typeof blockData.type === 'string') {
      const handler = blockHandlers.get(blockData.type);
      if (handler) {
        // Validate block data before rendering — skip invalid blocks gracefully
        if (handler.validate && !handler.validate(blockData)) {
          return ''; // invalid block data — skip
        }
        const context: BlockContext = {
          registry: null as unknown as Registry,
          options: { pretty: options?.pretty ?? false },
          renderDelta: (ops: Op[]) => deltaToHtml(new Delta(ops), options ?? {}),
          ...(attributes ? { opAttributes: attributes as Record<string, unknown> } : {}),
        };
        return handler.toHtml(blockData, context);
      }
    }
    return ''; // unknown block type — graceful fallback
  }

  const embedValue: unknown = value[embedType];

  // Check registry format render() first
  const registry = options?.registry;
  if (registry) {
    const format = registry.get(embedType);
    if (format?.render) {
      return format.render(embedValue, attributes);
    }
  }

  const renderer: ((value: unknown, attrs?: Record<string, unknown>) => string) | undefined =
    renderers[embedType];
  if (renderer) {
    return renderer(embedValue, attributes as Record<string, unknown> | undefined);
  }

  // Fallback: render as data attribute
  return `<span data-embed="${escapeHtml(embedType)}" data-value="${escapeHtml(String(embedValue))}"></span>`;
}
