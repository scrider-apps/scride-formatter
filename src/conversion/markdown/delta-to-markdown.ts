/**
 * Delta → Markdown Conversion
 *
 * Converts a Delta document to Markdown string.
 */

import { Delta, isInsert, isTextInsert, isEmbedInsert } from '@scrider/delta';
import type { Op, AttributeMap, InsertOp } from '@scrider/delta';
import type { BlockHandlerRegistry } from '../../schema/BlockHandlerRegistry';
import type { BlockContext } from '../../schema/BlockHandler';
import type { Registry } from '../../schema/Registry';
import {
  escapeMarkdown,
  INLINE_FORMAT_SYNTAX,
  MD_INLINE_FORMAT_ORDER,
  BLOCK_FORMAT_PREFIX,
  LIST_TYPE_PREFIX,
  getIndentPrefix,
  renderImage,
  renderLink,
  renderCodeBlock,
} from './config';
import { escapeHtml, toVideoEmbedUrl } from '../html/config';
import { deltaToHtml } from '../html/delta-to-html';

/**
 * Options for Delta → Markdown conversion
 */
export interface DeltaToMarkdownOptions {
  /**
   * Use strict Markdown (no GFM extensions)
   * @default false
   */
  strict?: boolean;

  /**
   * Preserve empty lines using <br> tags
   * When false, multiple empty lines collapse to one paragraph break
   * @default false
   */
  preserveEmptyLines?: boolean;

  /**
   * Math syntax for formula output
   * - 'dollar': $...$ for inline, $$...$$ for block (default, GFM-compatible)
   * - 'latex': \(...\) for inline, \[...\] for block (used by LLMs: DeepSeek, ChatGPT, Claude)
   * @default 'dollar'
   */
  mathSyntax?: 'dollar' | 'latex';

  /**
   * Display math rendering mode
   * - true (default): code-block "math" → ```math ``` (GFM code block)
   * - false: code-block "math" → $...$ on its own line (inline syntax)
   *
   * Does NOT affect inline formulas ({ formula }) — they always render as $...$
   * @default true
   */
  mathBlock?: boolean;

  /**
   * Mermaid diagram rendering mode
   * - true (default): code-block "mermaid" → ```mermaid ``` (fenced block)
   * - false: code-block "mermaid" → ```mermaid ``` (same output, but { diagram } embeds also → ```mermaid)
   *
   * Does NOT affect the Markdown output for code-block "mermaid" (always fenced).
   * Controls how { diagram } embeds are rendered.
   * @default true
   */
  mermaidBlock?: boolean;

  /**
   * PlantUML diagram rendering mode
   * - true (default): code-block "plantuml" → ```plantuml ``` (fenced block)
   * - false: code-block "plantuml" → ```plantuml ``` (same output, but { diagram } embeds with @startuml → ```plantuml)
   *
   * Does NOT affect the Markdown output for code-block "plantuml" (always fenced).
   * Controls how { diagram } embeds containing PlantUML are rendered.
   * @default true
   */
  plantumlBlock?: boolean;

  /**
   * Custom embed renderers
   */
  embedRenderers?: Record<string, (value: unknown, attrs?: AttributeMap) => string>;

  /**
   * Block handler registry for Extended Table and other block embeds.
   * When provided, block embeds will be rendered via handler.toMarkdown() → fallback to handler.toHtml().
   */
  blockHandlers?: BlockHandlerRegistry;

  /**
   * Pretty-print HTML output for block embeds (Extended Table, Columns, etc.)
   * When true, HTML fallback in Markdown is indented and line-broken for readability.
   * When false (default), HTML is compact single-line — safer for CommonMark.
   * @default false
   */
  prettyHtml?: boolean;

  /**
   * Format registry for custom embed Markdown rendering.
   *
   * When provided, embed formats with a `toMarkdown()` method are used
   * before falling back to built-in handlers. If `toMarkdown()` returns null,
   * `render()` is used as HTML fallback in Markdown.
   */
  registry?: Registry;
}

/**
 * Line data for processing
 */
interface Line {
  ops: InsertOp[];
  attributes: AttributeMap;
}

/**
 * Convert Delta to Markdown
 *
 * @param delta - The Delta document to convert
 * @param options - Conversion options
 * @returns Markdown string
 *
 * @example
 * ```typescript
 * const delta = new Delta()
 *   .insert('Hello', { bold: true })
 *   .insert(' World\n');
 *
 * const md = deltaToMarkdown(delta);
 * // '**Hello** World\n'
 * ```
 */
export function deltaToMarkdown(delta: Delta, options: DeltaToMarkdownOptions = {}): string {
  const {
    strict = false,
    preserveEmptyLines = false,
    mathSyntax = 'dollar',
    mathBlock = true,
    embedRenderers = {},
    blockHandlers,
    prettyHtml = false,
    registry,
  } = options;
  const useLatexDelimiters = mathSyntax === 'latex';

  // Split ops into lines
  const lines = splitIntoLines(delta.ops);

  // Track list state for proper numbering
  let orderedListIndex = 0;
  let lastListType: string | null = null;
  let lastIndent = 0;
  let lastWasBlockquote = false;

  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const attrs = line.attributes;
    const isBlockquote = !!attrs.blockquote;

    // Check for table - needs special handling (group adjacent table lines)
    if (typeof attrs['table-row'] === 'number' && typeof attrs['table-col'] === 'number') {
      const tableLines = collectTableLines(lines, i);
      result.push(renderMarkdownTable(tableLines, embedRenderers, useLatexDelimiters, registry));
      result.push(''); // Blank line after table — GFM requires it to end the table block
      i += tableLines.length - 1;
      lastListType = null;
      orderedListIndex = 0;
      lastWasBlockquote = false;
      continue;
    }

    // Check for code block - needs special handling
    if (attrs['code-block']) {
      if (lastWasBlockquote) {
        result.push('');
        lastWasBlockquote = false;
      }
      const codeLines = collectCodeBlock(lines, i);
      const language = getCodeBlockLanguage(attrs);
      const code = codeLines
        .map((l) =>
          renderLineContent(l.ops, embedRenderers, true, false, blockHandlers, false, registry),
        )
        .join('\n');

      if (language === 'math') {
        if (mathBlock === false) {
          // Render display math as inline $...$ on its own line
          // Blank lines around ensure it's not absorbed by adjacent lists/paragraphs
          result.push('');
          result.push(`$${code}$`);
          result.push('');
        } else if (useLatexDelimiters) {
          // Use \[...\] for display math in LaTeX mode
          result.push(`\\[\n${code}\n\\]`);
        } else {
          // Default: GFM code block ```math
          result.push(renderCodeBlock(code, language));
        }
      } else {
        result.push(renderCodeBlock(code, language));
      }

      i += codeLines.length - 1; // Skip processed lines
      lastListType = null;
      orderedListIndex = 0;
      continue;
    }

    // Insert blank line at blockquote boundary to prevent lazy continuation
    if (lastWasBlockquote && !isBlockquote) {
      result.push('');
    } else if (!lastWasBlockquote && isBlockquote && result.length > 0) {
      // Also add blank line before blockquote if preceded by content
      const lastLine = result[result.length - 1];
      if (lastLine !== undefined && lastLine !== '') {
        result.push('');
      }
    }

    // Handle list numbering reset
    const listType = typeof attrs.list === 'string' ? attrs.list : undefined;
    const indent = typeof attrs.indent === 'number' ? attrs.indent : 0;

    if (listType) {
      if (listType !== lastListType || indent !== lastIndent) {
        orderedListIndex = 0;
      }
      if (listType === 'ordered') {
        orderedListIndex++;
      }
    } else {
      lastListType = null;
      orderedListIndex = 0;
    }

    // Render line content
    const content = renderLineContent(
      line.ops,
      embedRenderers,
      false,
      useLatexDelimiters,
      blockHandlers,
      prettyHtml,
      registry,
    );

    // Handle empty lines
    if (!content && !hasBlockFormat(attrs)) {
      // Empty line with no block formatting
      result.push(preserveEmptyLines ? '<br>' : '');
      lastWasBlockquote = false;
      continue;
    }

    // Apply block formatting
    const markdown = renderBlockFormat(content, attrs, orderedListIndex, strict);
    result.push(markdown);

    // After a standalone <img> tag (floated/sized image), add a blank line so
    // CommonMark type-7 HTML block terminates before the next paragraph.
    if (/^<img\s/.test(content) && !hasBlockFormat(attrs)) {
      result.push('');
    }

    lastListType = listType ?? null;
    lastIndent = indent;
    lastWasBlockquote = isBlockquote;
  }

  return result.join('\n');
}

/**
 * Check if attributes contain any block formatting
 */
function hasBlockFormat(attrs: AttributeMap): boolean {
  return !!(
    attrs.header ||
    attrs.list ||
    attrs.blockquote ||
    attrs['code-block'] ||
    attrs.align ||
    attrs.indent
  );
}

/**
 * Split ops into lines based on newline characters
 */
function splitIntoLines(ops: Op[]): Line[] {
  const lines: Line[] = [];
  let currentOps: InsertOp[] = [];

  for (const op of ops) {
    if (!isInsert(op)) continue;

    const opAttrs: AttributeMap = op.attributes ?? {};

    if (isTextInsert(op)) {
      const text: string = op.insert;
      const parts: string[] = text.split('\n');

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === undefined) continue;

        // Add text content to current line (with inline attributes only)
        if (part.length > 0) {
          const newOp: InsertOp = { insert: part };
          // Only copy inline attributes, not block attributes
          const inlineAttrs: AttributeMap = {};
          for (const [key, value] of Object.entries(opAttrs)) {
            // Skip block attributes
            if (
              ![
                'header',
                'blockquote',
                'code-block',
                'list',
                'indent',
                'align',
                'direction',
                'table-row',
                'table-col',
                'table-header',
                'table-col-align',
              ].includes(key)
            ) {
              inlineAttrs[key] = value;
            }
          }
          if (Object.keys(inlineAttrs).length > 0) {
            newOp.attributes = inlineAttrs;
          }
          currentOps.push(newOp);
        }

        // If not the last part, this is a line break
        if (i < parts.length - 1) {
          lines.push({
            ops: currentOps,
            attributes: opAttrs, // Line attributes come from the \n op
          });
          currentOps = [];
        }
      }
    } else {
      // Embed
      currentOps.push(op);
    }
  }

  // Don't forget the last line if there's content
  if (currentOps.length > 0) {
    lines.push({ ops: currentOps, attributes: {} });
  }

  return lines;
}

/**
 * Collect consecutive code block lines
 */
function collectCodeBlock(lines: Line[], startIndex: number): Line[] {
  const codeLines: Line[] = [];
  const startLine = lines[startIndex];
  if (!startLine) return codeLines;

  const startLang = getCodeBlockLanguage(startLine.attributes);

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.attributes['code-block']) break;

    const lang = getCodeBlockLanguage(line.attributes);
    if (i > startIndex && lang !== startLang) break;

    codeLines.push(line);
  }

  return codeLines;
}

/**
 * Collect consecutive table lines
 */
function collectTableLines(lines: Line[], startIndex: number): Line[] {
  const result: Line[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (
      !line ||
      typeof line.attributes['table-row'] !== 'number' ||
      typeof line.attributes['table-col'] !== 'number'
    ) {
      break;
    }
    result.push(line);
  }
  return result;
}

/**
 * Table cell data for Markdown rendering
 */
interface MdTableCell {
  ops: InsertOp[];
  colAlign?: string | undefined;
}

/**
 * Render a group of table lines as a GFM Markdown table
 */
function renderMarkdownTable(
  tableLines: Line[],
  embedRenderers: Record<string, (value: unknown, attrs?: AttributeMap) => string>,
  useLatexDelimiters: boolean = false,
  registry?: Registry,
): string {
  // Group by row
  const rows = new Map<number, { isHeader: boolean; cells: Map<number, MdTableCell> }>();

  for (const line of tableLines) {
    const attrs = line.attributes;
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

  // Collect column alignments from header row (or first row)
  const colAligns: (string | undefined)[] = [];
  const alignSource = headerRows.length > 0 ? headerRows : bodyRows;
  if (alignSource.length > 0) {
    const firstRow = alignSource[0]!;
    for (let col = 0; col <= maxCol; col++) {
      const cell = firstRow[1].cells.get(col);
      colAligns.push(cell?.colAlign);
    }
  }

  const mdLines: string[] = [];

  // If there's a header, render it + separator
  if (headerRows.length > 0) {
    for (const [, row] of headerRows) {
      mdLines.push(renderMdRow(row.cells, maxCol, embedRenderers, useLatexDelimiters, registry));
    }
    mdLines.push(renderMdSeparator(maxCol, colAligns));
  } else {
    // No header: render a synthetic empty header + separator (GFM requires header)
    const emptyRow = new Map<number, MdTableCell>();
    for (let col = 0; col <= maxCol; col++) {
      emptyRow.set(col, { ops: [] });
    }
    mdLines.push(renderMdRow(emptyRow, maxCol, embedRenderers, useLatexDelimiters, registry));
    mdLines.push(renderMdSeparator(maxCol, colAligns));
  }

  // Render body rows
  for (const [, row] of bodyRows) {
    mdLines.push(renderMdRow(row.cells, maxCol, embedRenderers, useLatexDelimiters, registry));
  }

  return mdLines.join('\n');
}

/**
 * Render a single GFM table row
 */
function renderMdRow(
  cells: Map<number, MdTableCell>,
  maxCol: number,
  embedRenderers: Record<string, (value: unknown, attrs?: AttributeMap) => string>,
  useLatexDelimiters: boolean = false,
  registry?: Registry,
): string {
  const parts: string[] = [];
  for (let col = 0; col <= maxCol; col++) {
    const cell = cells.get(col);
    const content = cell
      ? renderLineContent(
          cell.ops,
          embedRenderers,
          false,
          useLatexDelimiters,
          undefined,
          false,
          registry,
        )
      : '';
    // Escape pipe characters in cell content
    parts.push(content.replace(/\|/g, '\\|'));
  }
  return '| ' + parts.join(' | ') + ' |';
}

/**
 * Render the GFM separator row (with alignment)
 */
function renderMdSeparator(maxCol: number, colAligns: (string | undefined)[]): string {
  const parts: string[] = [];
  for (let col = 0; col <= maxCol; col++) {
    const align = colAligns[col];
    if (align === 'center') {
      parts.push(':---:');
    } else if (align === 'right') {
      parts.push('---:');
    } else if (align === 'left') {
      parts.push(':---');
    } else {
      parts.push('---');
    }
  }
  return '| ' + parts.join(' | ') + ' |';
}

/**
 * Get code block language from attributes
 */
function getCodeBlockLanguage(attributes: AttributeMap): string | undefined {
  const codeBlock = attributes['code-block'];
  if (typeof codeBlock === 'string' && codeBlock !== 'true') {
    return codeBlock;
  }
  return undefined;
}

/**
 * Render inline content of a line
 */
function renderLineContent(
  ops: InsertOp[],
  embedRenderers: Record<string, (value: unknown, attrs?: AttributeMap) => string>,
  inCodeBlock: boolean,
  useLatexDelimiters: boolean = false,
  blockHandlers?: BlockHandlerRegistry,
  prettyHtml: boolean = false,
  registry?: Registry,
): string {
  let result = '';

  for (const op of ops) {
    const attrs: AttributeMap | undefined = op.attributes;

    if (isTextInsert(op)) {
      const text: string = op.insert;
      if (inCodeBlock) {
        // Don't escape or format in code blocks
        result += text;
      } else {
        result += renderInlineText(text, attrs);
      }
    } else if (isEmbedInsert(op)) {
      const embed: Record<string, unknown> = op.insert;
      result += renderEmbed(
        embed,
        attrs,
        embedRenderers,
        useLatexDelimiters,
        blockHandlers,
        prettyHtml,
        registry,
      );
    }
  }

  return result;
}

/**
 * Render inline text with formatting
 */
function renderInlineText(text: string, attributes?: AttributeMap): string {
  if (!attributes || Object.keys(attributes).length === 0) {
    return escapeMarkdown(text);
  }

  // Handle link specially (wraps everything)
  const link = typeof attributes.link === 'string' ? attributes.link : undefined;

  // Escape text first (skip for inline code — backtick content is literal)
  let result = attributes.code ? text : escapeMarkdown(text);

  // Apply inline formats in order (inner to outer for wrapping)
  // We iterate in reverse so outer formats wrap inner ones
  for (let i = MD_INLINE_FORMAT_ORDER.length - 1; i >= 0; i--) {
    const format = MD_INLINE_FORMAT_ORDER[i];
    if (!format || !attributes[format]) continue;

    const syntax = INLINE_FORMAT_SYNTAX[format];
    if (syntax) {
      result = `${syntax.prefix}${result}${syntax.suffix}`;
    }
  }

  // Apply link last (outermost, before style spans)
  if (link) {
    result = renderLink(result, link);
  }

  // Apply color/background as <span style="..."> (outermost wrapping)
  if (typeof attributes.color === 'string') {
    result = `<span style="color: ${attributes.color}">${result}</span>`;
  }
  if (typeof attributes.background === 'string') {
    result = `<span style="background-color: ${attributes.background}">${result}</span>`;
  }

  return result;
}

/**
 * Render an embed to Markdown
 */
function renderEmbed(
  embed: Record<string, unknown>,
  attributes: AttributeMap | undefined,
  customRenderers: Record<string, (value: unknown, attrs?: AttributeMap) => string>,
  useLatexDelimiters: boolean = false,
  blockHandlers?: BlockHandlerRegistry,
  prettyHtml: boolean = false,
  registry?: Registry,
): string {
  const entries = Object.entries(embed);
  if (entries.length === 0) return '';

  const firstEntry = entries[0];
  if (!firstEntry) return '';

  const embedType: string = firstEntry[0];
  const embedValue: unknown = firstEntry[1];

  // Handle block embeds via BlockHandler
  if (embedType === 'block' && blockHandlers) {
    const blockData = embedValue as Record<string, unknown>;
    if (blockData && typeof blockData.type === 'string') {
      const handler = blockHandlers.get(blockData.type);
      if (handler) {
        const opAttrs = attributes ? { opAttributes: attributes as Record<string, unknown> } : {};

        // Try toMarkdown first — renderDelta produces Markdown
        if (handler.toMarkdown) {
          const mdContext: BlockContext = {
            registry: undefined as never,
            renderDelta: (ops: Op[]): string => deltaToMarkdown(new Delta(ops), { blockHandlers }),
            ...opAttrs,
          };
          const md = handler.toMarkdown(blockData, mdContext);
          if (md !== null) return md;
        }

        // Fallback: render as HTML directly in Markdown (valid per CommonMark).
        // renderDelta must produce HTML so cell content is proper HTML, not
        // Markdown syntax that would be lost during htmlToDelta roundtrip.
        const htmlContext: BlockContext = {
          registry: undefined as never,
          ...(prettyHtml ? { options: { pretty: true } } : {}),
          renderDelta: (ops: Op[]): string =>
            deltaToHtml(new Delta(ops), { blockHandlers, pretty: prettyHtml }),
          ...opAttrs,
        };
        return '\n' + handler.toHtml(blockData, htmlContext) + '\n';
      }
    }
    return '';
  }

  // Check for custom renderer
  const customRenderer = customRenderers[embedType];
  if (customRenderer) {
    return customRenderer(embedValue, attributes);
  }

  // Check registry format toMarkdown() / render() fallback
  if (registry) {
    const format = registry.get(embedType);
    if (format) {
      // Try toMarkdown first
      if (format.toMarkdown) {
        const md = format.toMarkdown(embedValue, attributes);
        if (md !== null) return md;
      }
      // Fallback to render() as HTML-in-Markdown
      if (format.render) {
        return format.render(embedValue, attributes);
      }
    }
  }

  // Built-in embed handling
  if (embedType === 'image') {
    const src = typeof embedValue === 'string' ? embedValue : '';
    const alt = typeof attributes?.alt === 'string' ? attributes.alt : undefined;

    // When float/width/height are present, use HTML <img> to preserve attributes
    const hasFloat =
      attributes?.float != null &&
      typeof attributes.float === 'string' &&
      attributes.float !== 'none';
    const hasWidth = attributes?.width != null;
    const hasHeight = attributes?.height != null;

    if (hasFloat || hasWidth || hasHeight) {
      const altAttr = alt ? ` alt="${escapeHtml(alt)}"` : '';
      const floatAttr = hasFloat ? ` data-float="${escapeHtml(String(attributes.float))}"` : '';
      const widthAttr = hasWidth ? ` width="${escapeHtml(String(attributes.width))}"` : '';
      const heightAttr = hasHeight ? ` height="${escapeHtml(String(attributes.height))}"` : '';
      return `<img src="${escapeHtml(src)}"${altAttr}${floatAttr}${widthAttr}${heightAttr}>`;
    }

    return renderImage(src, alt);
  }

  if (embedType === 'video') {
    const src = typeof embedValue === 'string' ? embedValue : '';

    // When float/width/height are present, use HTML to preserve attributes
    const hasFloat =
      attributes?.float != null &&
      typeof attributes.float === 'string' &&
      attributes.float !== 'none';
    const hasWidth = attributes?.width != null;
    const hasHeight = attributes?.height != null;

    if (hasFloat || hasWidth || hasHeight) {
      const floatAttr = hasFloat ? ` data-float="${escapeHtml(String(attributes.float))}"` : '';
      const styles: string[] = [];
      if (hasWidth) {
        const w =
          typeof attributes.width === 'string' || typeof attributes.width === 'number'
            ? String(attributes.width)
            : '';
        if (w && w !== 'auto') styles.push(`width: ${/^\d+$/.test(w) ? w + 'px' : w}`);
      }
      if (hasHeight) {
        const h =
          typeof attributes.height === 'string' || typeof attributes.height === 'number'
            ? String(attributes.height)
            : '';
        if (h && h !== 'auto') styles.push(`height: ${/^\d+$/.test(h) ? h + 'px' : h}`);
      }
      const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
      const embedSrc = toVideoEmbedUrl(src);
      if (embedSrc) {
        return `<iframe src="${escapeHtml(embedSrc)}" frameborder="0" allowfullscreen${floatAttr}${styleAttr}></iframe>`;
      }
      return `<video src="${escapeHtml(src)}" controls${floatAttr}${styleAttr}></video>`;
    }

    // Simple video without attributes → readable Markdown (like images)
    return `![Video](${src})`;
  }

  if (embedType === 'formula') {
    const latex = typeof embedValue === 'string' ? embedValue : '';
    return useLatexDelimiters ? `\\(${latex}\\)` : `$${latex}$`;
  }

  if (embedType === 'diagram') {
    // Diagram embed → render as fenced code block with appropriate language
    const source = typeof embedValue === 'string' ? embedValue : '';
    const lang = source.trimStart().startsWith('@startuml') ? 'plantuml' : 'mermaid';
    return `\n\`\`\`${lang}\n${source}\n\`\`\`\n`;
  }

  if (embedType === 'drawio') {
    // Draw.io embeds use image-like syntax in Markdown (file reference)
    const src = typeof embedValue === 'string' ? embedValue : '';
    const alt = typeof attributes?.alt === 'string' ? attributes.alt : undefined;
    return renderImage(src, alt);
  }

  if (embedType === 'footnote-ref') {
    // Footnote reference: [^id]
    const id = typeof embedValue === 'string' ? embedValue : String(embedValue);
    return `[^${id}]`;
  }

  if (embedType === 'divider') {
    return '\n---\n';
  }

  // Unknown embed - skip
  return '';
}

/**
 * Render block formatting (headers, lists, etc.)
 */
function renderBlockFormat(
  content: string,
  attributes: AttributeMap,
  orderedIndex: number,
  _strict: boolean,
): string {
  const indent = typeof attributes.indent === 'number' ? attributes.indent : 0;
  const indentPrefix = getIndentPrefix(indent);

  // Header
  const header = typeof attributes.header === 'number' ? attributes.header : undefined;
  if (header) {
    const prefixFn = BLOCK_FORMAT_PREFIX.header;
    if (typeof prefixFn === 'function') {
      let line = prefixFn(header) + content;
      // Append custom header-id if present
      const headerId = attributes['header-id'];
      if (typeof headerId === 'string' && headerId.length > 0) {
        line += ` {#${headerId}}`;
      }
      return line;
    }
  }

  // Blockquote
  if (attributes.blockquote) {
    return '> ' + content;
  }

  // List
  const listType = typeof attributes.list === 'string' ? attributes.list : undefined;
  if (listType) {
    const prefixDef = LIST_TYPE_PREFIX[listType];
    let prefix: string;

    if (typeof prefixDef === 'function') {
      prefix = prefixDef(orderedIndex - 1);
    } else if (prefixDef) {
      prefix = prefixDef;
    } else {
      prefix = '- ';
    }

    return indentPrefix + prefix + content;
  }

  // Align - not supported in basic Markdown, skip
  // content remains unchanged

  // Regular paragraph
  return content;
}
