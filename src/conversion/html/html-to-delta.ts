/**
 * HTML → Delta Conversion
 *
 * Converts HTML string to a Delta document.
 */

import { Delta } from '@scrider/delta';
import type { AttributeMap, Op } from '@scrider/delta';
import type { DOMAdapter, DOMNode, DOMElement } from '../adapters/types';
import { NODE_TYPE, isElement } from '../adapters/types';
import { getAdapter } from '../adapters';
import type { BlockHandlerRegistry } from '../../schema/BlockHandlerRegistry';
import type { BlockContext } from '../../schema/BlockHandler';
import type { Registry } from '../../schema/Registry';
import {
  TAG_TO_INLINE_FORMAT,
  TAG_TO_BLOCK_FORMAT,
  CSS_ALIGN_TO_FORMAT,
  fromVideoEmbedUrl,
} from './config';
import { slugify } from '../utils/slugify';

/**
 * Options for HTML → Delta conversion
 */
export interface HtmlToDeltaOptions {
  /**
   * DOM adapter to use (defaults to auto-detected)
   */
  adapter?: DOMAdapter;

  /**
   * Normalize whitespace (collapse multiple spaces, trim)
   * @default true
   */
  normalizeWhitespace?: boolean;

  /**
   * Custom tag handlers for special elements
   */
  tagHandlers?: Record<string, TagHandler>;

  /**
   * Block handler registry for Extended Table and other block embeds.
   * When provided and a handler for 'table' is registered,
   * `<table>` elements will be parsed as block embeds instead of Simple Table.
   */
  blockHandlers?: BlockHandlerRegistry;

  /**
   * Format registry for custom embed matching.
   *
   * When provided, embed formats with a `match()` method are tried
   * before falling back to built-in tag handlers (img, video, iframe, etc.).
   * This enables extensibility without modifying converter internals.
   */
  registry?: Registry;
}

/**
 * Custom tag handler function
 */
export type TagHandler = (element: DOMElement, context: ParserContext) => void;

/**
 * Parser context passed to tag handlers
 */
export interface ParserContext {
  delta: Delta;
  attributes: AttributeMap;
  blockAttributes: AttributeMap;
  pushText(text: string): void;
  pushEmbed(embed: Record<string, unknown>, attrs?: AttributeMap): void;
  pushNewline(): void;
}

/**
 * Convert HTML string to Delta
 *
 * @param html - The HTML string to convert
 * @param options - Conversion options
 * @returns Delta document
 *
 * @example
 * ```typescript
 * const html = '<p><strong>Hello</strong> World</p>';
 * const delta = htmlToDelta(html);
 * // { ops: [
 * //   { insert: 'Hello', attributes: { bold: true } },
 * //   { insert: ' World\n' }
 * // ]}
 * ```
 */
export function htmlToDelta(html: string, options: HtmlToDeltaOptions = {}): Delta {
  const adapter = options.adapter ?? getAdapter();
  const normalizeWhitespace = options.normalizeWhitespace ?? true;
  const tagHandlers = { ...DEFAULT_TAG_HANDLERS, ...options.tagHandlers };

  // Parse HTML
  const fragment = adapter.parseHTML(html);

  // Initialize delta and state
  const delta = new Delta();
  let currentAttributes: AttributeMap = {};
  let currentBlockAttributes: AttributeMap = {};
  let pendingText = '';
  let atLineStart = true; // Track if we're at the start of a line

  // Context for tag handlers
  const context: ParserContext = {
    delta,
    get attributes() {
      return { ...currentAttributes };
    },
    get blockAttributes() {
      return { ...currentBlockAttributes };
    },
    pushText(text: string) {
      if (normalizeWhitespace) {
        text = normalizeText(text, pendingText, atLineStart);
      }
      if (text) {
        pendingText += text;
        atLineStart = false;
      }
    },
    pushEmbed(embed: Record<string, unknown>, attrs?: AttributeMap) {
      // Flush pending text first
      flushText();
      const finalAttrs = { ...currentAttributes, ...attrs };
      if (Object.keys(finalAttrs).length > 0) {
        delta.insert(embed, finalAttrs);
      } else {
        delta.insert(embed);
      }
      atLineStart = false;
    },
    pushNewline() {
      flushText();
      const attrs = { ...currentBlockAttributes };
      if (Object.keys(attrs).length > 0) {
        delta.insert('\n', attrs);
      } else {
        delta.insert('\n');
      }
      currentBlockAttributes = {};
      atLineStart = true;
    },
  };

  /**
   * Flush pending text to delta
   */
  function flushText(): void {
    if (pendingText) {
      const attrs = { ...currentAttributes };
      if (Object.keys(attrs).length > 0) {
        delta.insert(pendingText, attrs);
      } else {
        delta.insert(pendingText);
      }
      pendingText = '';
      // Note: atLineStart is NOT reset here - we're still on the same line
    }
  }

  /**
   * Process a node recursively
   */
  function processNode(node: DOMNode): void {
    // Text node
    if (node.nodeType === NODE_TYPE.TEXT_NODE) {
      const text = node.textContent ?? '';
      context.pushText(text);
      return;
    }

    // Element node
    if (!isElement(node)) return;

    const tagName = node.tagName.toLowerCase();

    // Check for custom handler (supports "tag" and "tag.class" keys)
    const handler = findTagHandler(tagHandlers, node, tagName);
    if (handler) {
      handler(node, context);
      return;
    }

    // Check for block element
    const blockFormat = TAG_TO_BLOCK_FORMAT[tagName];
    if (blockFormat) {
      processBlockElement(node, blockFormat);
      return;
    }

    // Check for list element
    if (tagName === 'ul' || tagName === 'ol') {
      processListElement(node, tagName);
      return;
    }

    // Check for inline element
    const inlineFormat = TAG_TO_INLINE_FORMAT[tagName];
    if (inlineFormat) {
      processInlineElement(node, inlineFormat);
      return;
    }

    // Check for link
    if (tagName === 'a') {
      processLinkElement(node);
      return;
    }

    // Check for span with styles
    if (tagName === 'span') {
      processSpanElement(node);
      return;
    }

    // Check for table
    if (tagName === 'table') {
      processTableElement(node);
      return;
    }

    // Check registry embed formats (custom match before hardcoded handlers)
    if (options.registry) {
      const embedFormats = options.registry.getByScope('embed');
      for (const format of embedFormats) {
        if (format.match) {
          const result = format.match(node);
          if (result != null) {
            context.pushEmbed({ [format.name]: result.value }, result.attributes);
            return;
          }
        }
      }
    }

    // Check for embeds
    if (tagName === 'img') {
      processImageElement(node);
      return;
    }

    if (tagName === 'video' || tagName === 'iframe') {
      processVideoElement(node);
      return;
    }

    if (tagName === 'hr') {
      context.pushEmbed({ divider: true });
      context.pushNewline();
      return;
    }

    // Check for footnotes section: <section class="footnotes">
    if (tagName === 'section' || tagName === 'div') {
      const className = node.getAttribute('class') || '';
      if (className.includes('footnotes')) {
        processFootnotesSection(node);
        return;
      }
      if (className.includes('markdown-alert')) {
        processAlertElement(node);
        return;
      }
      if (/\bcolumns\b/.test(className)) {
        processColumnsElement(node);
        return;
      }
      if (className.includes('inline-box')) {
        processBoxElement(node);
        return;
      }
    }

    // Check for paragraph/div (default block)
    if (tagName === 'p' || tagName === 'div') {
      processDefaultBlock(node);
      return;
    }

    // Check for br
    if (tagName === 'br') {
      context.pushNewline();
      return;
    }

    // Unknown element - process children
    processChildren(node);
  }

  /**
   * Process children of a node
   */
  function processChildren(node: DOMNode): void {
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child) processNode(child);
    }
  }

  /**
   * Process a block element (h1, blockquote, pre, etc.)
   */
  function processBlockElement(
    element: DOMElement,
    format: { format: string; value: unknown },
  ): void {
    // Special handling for <pre> — code blocks
    if (format.format === 'code-block') {
      processCodeBlockElement(element);
      return;
    }

    const prevBlockAttrs = { ...currentBlockAttributes };
    currentBlockAttributes[format.format] = format.value;

    // Add alignment if present
    const align = getAlignment(element);
    if (align) {
      currentBlockAttributes.align = align;
    }

    // Extract custom header id (only if different from computed slug)
    if (format.format === 'header') {
      const id = element.getAttribute('id');
      if (id) {
        const text = element.textContent || '';
        const computedSlug = slugify(text);
        if (id !== computedSlug) {
          currentBlockAttributes['header-id'] = id;
        }
      }
    }

    processChildren(element);
    context.pushNewline();

    currentBlockAttributes = prevBlockAttrs;
  }

  /**
   * Process a code block element (<pre>, possibly with <code> child)
   */
  function processCodeBlockElement(element: DOMElement): void {
    const prevBlockAttrs = { ...currentBlockAttributes };

    // Extract language from <code class="language-xxx"> or <pre data-language="xxx">
    let language: string | undefined;

    // Check <pre data-language="xxx">
    const dataLang = element.getAttribute('data-language');
    if (dataLang) {
      language = dataLang;
    }

    // Check for <code class="language-xxx"> child
    const children = element.childNodes;
    let codeElement: DOMElement | null = null;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child && isElement(child) && child.tagName.toLowerCase() === 'code') {
        codeElement = child;
        break;
      }
    }

    if (codeElement && !language) {
      const className = codeElement.getAttribute('class') || '';
      const match = className.match(/language-(\S+)/);
      if (match?.[1]) {
        language = match[1];
      }
    }

    // Set code-block attribute with language or true
    const codeBlockValue: unknown = language || true;
    currentBlockAttributes['code-block'] = codeBlockValue;

    // Get text content from the code element or pre directly
    const sourceElement = codeElement || element;
    const rawText = sourceElement.textContent ?? '';

    // Remove trailing newline (code blocks always end with \n in the HTML)
    const text = rawText.endsWith('\n') ? rawText.slice(0, -1) : rawText;

    // Split by lines — each line gets its own code-block attribute
    const codeLines = text.split('\n');
    for (let i = 0; i < codeLines.length; i++) {
      const line = codeLines[i];
      if (line !== undefined && line.length > 0) {
        flushText();
        pendingText = line;
      }
      flushText();
      const attrs = { ...currentBlockAttributes };
      if (Object.keys(attrs).length > 0) {
        delta.insert('\n', attrs);
      } else {
        delta.insert('\n');
      }
      atLineStart = true;
    }

    currentBlockAttributes = prevBlockAttrs;
  }

  /**
   * Process a list element (ul/ol)
   */
  function processListElement(element: DOMElement, listTag: string, indent: number = 0): void {
    const children = element.childNodes;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child || !isElement(child)) continue;

      const childTag = child.tagName.toLowerCase();
      if (childTag === 'li') {
        processListItem(child, listTag, indent);
      } else if (childTag === 'ul' || childTag === 'ol') {
        // Nested list without li wrapper - increment indent
        processListElement(child, childTag, indent + 1);
      }
    }
  }

  /**
   * Process a list item
   */
  function processListItem(element: DOMElement, listTag: string, indent: number): void {
    const prevBlockAttrs = { ...currentBlockAttributes };

    // Determine list type
    let listType = listTag === 'ol' ? 'ordered' : 'bullet';

    // Check for checkbox (task list)
    const dataChecked = element.getAttribute('data-checked');
    if (dataChecked === 'true') {
      listType = 'checked';
    } else if (dataChecked === 'false') {
      listType = 'unchecked';
    }

    currentBlockAttributes.list = listType;
    if (indent > 0) {
      currentBlockAttributes.indent = indent;
    }

    // Process content, but handle nested lists specially
    const children = element.childNodes;
    let hasNestedList = false;

    // Check if this is an empty list item with only <br> for visibility
    // (generated by deltaToHtml for empty lines, or by browser on Enter)
    const firstChild = children[0];
    const isBrOnlyListItem =
      children.length === 1 &&
      firstChild !== undefined &&
      isElement(firstChild) &&
      firstChild.tagName.toLowerCase() === 'br';

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child) continue;

      if (isElement(child)) {
        const childTag = child.tagName.toLowerCase();
        if (childTag === 'ul' || childTag === 'ol') {
          // Flush current content before nested list
          if (!hasNestedList) {
            context.pushNewline();
            hasNestedList = true;
          }
          // Process nested list with increased indent
          processNestedList(child, childTag, indent + 1);
          continue;
        }
      }

      // Skip processing <br> in empty list items
      if (!hasNestedList && !isBrOnlyListItem) {
        processNode(child);
      }
    }

    if (!hasNestedList) {
      context.pushNewline();
    }

    currentBlockAttributes = prevBlockAttrs;
  }

  /**
   * Process a nested list
   */
  function processNestedList(element: DOMElement, listTag: string, indent: number): void {
    const children = element.childNodes;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child || !isElement(child)) continue;

      const childTag = child.tagName.toLowerCase();
      if (childTag === 'li') {
        processListItem(child, listTag, indent);
      }
    }
  }

  /**
   * Process an inline element (strong, em, etc.)
   */
  function processInlineElement(
    element: DOMElement,
    format: { format: string; value: unknown },
  ): void {
    // Flush before changing attributes
    flushText();

    const prevAttrs = { ...currentAttributes };
    currentAttributes[format.format] = format.value;

    processChildren(element);

    // Flush before restoring attributes
    flushText();
    currentAttributes = prevAttrs;
  }

  /**
   * Process a link element
   */
  function processLinkElement(element: DOMElement): void {
    const href = element.getAttribute('href');
    if (!href) {
      processChildren(element);
      return;
    }

    // Flush before changing attributes
    flushText();

    const prevAttrs = { ...currentAttributes };
    currentAttributes.link = href;

    processChildren(element);

    // Flush before restoring attributes
    flushText();
    currentAttributes = prevAttrs;
  }

  /**
   * Process a span element (for styles)
   */
  function processSpanElement(element: DOMElement): void {
    // Flush before changing attributes
    flushText();

    const prevAttrs = { ...currentAttributes };

    // Extract color
    const color = element.style?.color || element.style?.getPropertyValue?.('color');
    if (color) {
      currentAttributes.color = color;
    }

    // Extract background
    const bg =
      element.style?.backgroundColor || element.style?.getPropertyValue?.('background-color');
    if (bg) {
      currentAttributes.background = bg;
    }

    processChildren(element);

    // Flush before restoring attributes
    flushText();
    currentAttributes = prevAttrs;
  }

  /**
   * Process an image element
   */
  function processImageElement(element: DOMElement): void {
    const src = element.getAttribute('src');
    if (!src) return;

    const attrs: AttributeMap = {};
    const alt = element.getAttribute('alt');
    const width = element.getAttribute('width');
    const height = element.getAttribute('height');
    const float = element.getAttribute('data-float');

    if (alt) attrs.alt = alt;
    if (width) attrs.width = parseInt(width, 10);
    if (height) attrs.height = parseInt(height, 10);
    if (float) attrs.float = float;

    context.pushEmbed({ image: src }, attrs);
  }

  /**
   * Process a video/iframe element.
   * Converts embed URLs back to canonical form (e.g. youtube.com/embed/X → youtube.com/watch?v=X).
   */
  function processVideoElement(element: DOMElement): void {
    const src = element.getAttribute('src');
    if (!src) return;

    const attrs: AttributeMap = {};
    const float = element.getAttribute('data-float');
    const style = element.getAttribute('style') || '';

    if (float) attrs.float = float;

    // Extract width/height from inline style (used for floated videos)
    // Strip 'px' suffix to store clean numeric strings for roundtrip consistency
    const widthMatch = style.match(/(?:^|;\s*)width:\s*([^;]+)/);
    if (widthMatch?.[1]) attrs.width = widthMatch[1].trim().replace(/px$/, '');
    const heightMatch = style.match(/(?:^|;\s*)height:\s*([^;]+)/);
    if (heightMatch?.[1]) attrs.height = heightMatch[1].trim().replace(/px$/, '');

    const embedAttrs = Object.keys(attrs).length > 0 ? attrs : undefined;
    context.pushEmbed({ video: fromVideoEmbedUrl(src) }, embedAttrs);
  }

  /**
   * Process a <section class="footnotes"> element.
   * If blockHandlers has a 'footnotes' handler registered, parse as block embed.
   * Otherwise, process children normally (graceful fallback).
   */
  function processFootnotesSection(section: DOMElement): void {
    const footnotesHandler = options.blockHandlers?.get('footnotes');
    if (footnotesHandler) {
      const blockContext: BlockContext = {
        registry: undefined as never, // Registry not needed for fromHtml parsing
        parseElement: (el: DOMElement): Op[] => {
          // Recursive: parse element's inner HTML → Delta ops
          const innerHtml = el.innerHTML ?? '';
          if (!innerHtml) return [{ insert: '\n' }];
          return htmlToDelta(innerHtml, options).ops;
        },
      };
      const data = footnotesHandler.fromHtml(section, blockContext);
      if (data) {
        flushText();
        delta.insert({ block: data });
        delta.insert('\n');
        atLineStart = true;
        return;
      }
    }

    // Fallback: process children normally
    processChildren(section);
  }

  /**
   * Process a <div class="markdown-alert markdown-alert-{type}"> element.
   * If blockHandlers has an 'alert' handler registered, parse as block embed.
   * Otherwise, process children normally (graceful fallback).
   */
  function processAlertElement(element: DOMElement): void {
    const alertHandler = options.blockHandlers?.get('alert');
    if (alertHandler) {
      const blockContext: BlockContext = {
        registry: undefined as never,
        parseElement: (el: DOMElement): Op[] => {
          const innerHtml = el.innerHTML ?? '';
          if (!innerHtml) return [{ insert: '\n' }];
          return htmlToDelta(innerHtml, options).ops;
        },
      };
      const data = alertHandler.fromHtml(element, blockContext);
      if (data) {
        flushText();
        delta.insert({ block: data });
        delta.insert('\n');
        atLineStart = true;
        return;
      }
    }

    // Fallback: process children normally
    processChildren(element);
  }

  /**
   * Process a <div class="columns"> element.
   * If blockHandlers has a 'columns' handler registered, parse as block embed.
   * Otherwise, process children normally (graceful fallback).
   */
  function processColumnsElement(element: DOMElement): void {
    const columnsHandler = options.blockHandlers?.get('columns');
    if (columnsHandler) {
      const blockContext: BlockContext = {
        registry: undefined as never,
        parseElement: (el: DOMElement): Op[] => {
          const innerHtml = el.innerHTML ?? '';
          if (!innerHtml) return [{ insert: '\n' }];
          return htmlToDelta(innerHtml, options).ops;
        },
      };
      const data = columnsHandler.fromHtml(element, blockContext);
      if (data) {
        flushText();
        delta.insert({ block: data });
        delta.insert('\n');
        atLineStart = true;
        return;
      }
    }

    // Fallback: process children normally
    processChildren(element);
  }

  /**
   * Process a <div class="inline-box"> element.
   * If blockHandlers has a 'box' handler registered, parse as block embed.
   * Extracts op attributes (float, width, height, overflow) from HTML data-attrs and style.
   * Otherwise, process children normally (graceful fallback).
   */
  function processBoxElement(element: DOMElement): void {
    const boxHandler = options.blockHandlers?.get('box');
    if (boxHandler) {
      const blockContext: BlockContext = {
        registry: undefined as never,
        parseElement: (el: DOMElement): Op[] => {
          const innerHtml = el.innerHTML ?? '';
          if (!innerHtml) return [{ insert: '\n' }];
          return htmlToDelta(innerHtml, options).ops;
        },
      };
      const data = boxHandler.fromHtml(element, blockContext);
      if (data) {
        flushText();

        // Extract op attributes from HTML element
        const opAttrs: Record<string, string> = {};

        const dataFloat = element.getAttribute('data-float');
        if (dataFloat) opAttrs.float = dataFloat;

        const dataOverflow = element.getAttribute('data-overflow');
        if (dataOverflow) opAttrs.overflow = dataOverflow;

        // Extract width/height from inline style
        const style = element.getAttribute('style') || '';
        const widthMatch = style.match(/(?:^|;\s*)width:\s*([^;]+)/);
        if (widthMatch?.[1]) opAttrs.width = widthMatch[1].trim();

        const heightMatch = style.match(/(?:^|;\s*)height:\s*([^;]+)/);
        if (heightMatch?.[1]) opAttrs.height = heightMatch[1].trim();

        const hasAttrs = Object.keys(opAttrs).length > 0;
        delta.insert({ block: data }, hasAttrs ? opAttrs : undefined);
        delta.insert('\n');
        atLineStart = true;
        return;
      }
    }

    // Fallback: process children normally
    processChildren(element);
  }

  /**
   * Process a <table> element.
   * If blockHandlers has a 'table' handler registered, parse as Extended Table (block embed).
   * Otherwise, fall back to Simple Table (linear block attributes).
   */
  function processTableElement(table: DOMElement): void {
    // Opt-in: Extended Table via BlockHandler
    const tableHandler = options.blockHandlers?.get('table');
    if (tableHandler) {
      const blockContext: BlockContext = {
        registry: undefined as never, // Registry not needed for fromHtml parsing
        parseElement: (el: DOMElement): Op[] => {
          // Recursive: parse element's inner HTML → Delta ops
          const innerHtml = el.innerHTML ?? '';
          if (!innerHtml) return [{ insert: '\n' }];
          return htmlToDelta(innerHtml, options).ops;
        },
      };
      const data = tableHandler.fromHtml(table, blockContext);
      if (data) {
        flushText();
        delta.insert({ block: data });
        delta.insert('\n');
        atLineStart = true;
        return;
      }
      // If fromHtml returns null, fall through to Simple Table
    }

    // Simple Table: linear block attributes
    let rowIdx = 0;

    // Iterate over direct children: <thead>, <tbody>, or direct <tr>
    const tableChildren = table.childNodes;
    for (let i = 0; i < tableChildren.length; i++) {
      const section = tableChildren[i];
      if (!section || !isElement(section)) continue;

      const sectionTag = section.tagName.toLowerCase();

      if (sectionTag === 'thead' || sectionTag === 'tbody' || sectionTag === 'tfoot') {
        const isHeader = sectionTag === 'thead';
        const sectionChildren = section.childNodes;
        for (let j = 0; j < sectionChildren.length; j++) {
          const row = sectionChildren[j];
          if (!row || !isElement(row) || row.tagName.toLowerCase() !== 'tr') continue;
          processTableRow(row, rowIdx, isHeader);
          rowIdx++;
        }
      } else if (sectionTag === 'tr') {
        // Direct <tr> without <thead>/<tbody> wrapper
        processTableRow(section, rowIdx, false);
        rowIdx++;
      }
    }
  }

  /**
   * Process a single <tr> element
   */
  function processTableRow(tr: DOMElement, rowIdx: number, isHeader: boolean): void {
    let colIdx = 0;

    const cells = tr.childNodes;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell || !isElement(cell)) continue;

      const cellTag = cell.tagName.toLowerCase();
      if (cellTag !== 'td' && cellTag !== 'th') continue;

      const cellIsHeader = isHeader || cellTag === 'th';

      // Extract column alignment from style
      const textAlign = cell.style?.textAlign || cell.style?.getPropertyValue?.('text-align');
      const colAlign =
        textAlign && (textAlign === 'left' || textAlign === 'center' || textAlign === 'right')
          ? textAlign
          : undefined;

      // Save and set block attributes for this cell
      const prevBlockAttrs = { ...currentBlockAttributes };
      currentBlockAttributes['table-row'] = rowIdx;
      currentBlockAttributes['table-col'] = colIdx;
      if (cellIsHeader) {
        currentBlockAttributes['table-header'] = true;
      }
      if (colAlign) {
        currentBlockAttributes['table-col-align'] = colAlign;
      }

      // Process cell content (inline elements)
      processChildren(cell);
      context.pushNewline();

      currentBlockAttributes = prevBlockAttrs;
      colIdx++;
    }
  }

  /**
   * Process a default block element (p, div)
   */
  function processDefaultBlock(element: DOMElement): void {
    const prevBlockAttrs = { ...currentBlockAttributes };

    // Check for alignment
    const align = getAlignment(element);
    if (align) {
      currentBlockAttributes.align = align;
    }

    // Check if this is an empty paragraph with only <br> for visibility
    // (generated by deltaToHtml for empty lines)
    const children = element.childNodes;
    const firstChild = children[0];
    const isBrOnlyParagraph =
      children.length === 1 &&
      firstChild !== undefined &&
      isElement(firstChild) &&
      firstChild.tagName.toLowerCase() === 'br';

    if (!isBrOnlyParagraph) {
      processChildren(element);
    }
    context.pushNewline();

    currentBlockAttributes = prevBlockAttrs;
  }

  /**
   * Get alignment from element style
   */
  function getAlignment(element: DOMElement): string | null {
    const textAlign = element.style?.textAlign || element.style?.getPropertyValue?.('text-align');

    if (textAlign && CSS_ALIGN_TO_FORMAT[textAlign]) {
      return CSS_ALIGN_TO_FORMAT[textAlign];
    }

    return null;
  }

  // Process all nodes in fragment
  const children = fragment.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child) processNode(child);
  }

  // Flush any remaining text
  flushText();

  // Ensure document ends with newline if not empty
  if (delta.ops.length > 0) {
    const lastOp = delta.ops[delta.ops.length - 1];
    if (lastOp && 'insert' in lastOp) {
      const lastInsert = lastOp.insert as string | Record<string, unknown>;
      if (typeof lastInsert === 'string' && !lastInsert.endsWith('\n')) {
        delta.insert('\n');
      }
    }
  }

  return delta;
}

/**
 * Normalize whitespace in text
 */
function normalizeText(text: string, pendingText: string, atLineStart: boolean): string {
  // Replace multiple whitespace with single space
  text = text.replace(/[\t\n\r]+/g, ' ');

  // Collapse multiple spaces
  text = text.replace(/ +/g, ' ');

  // Trim leading space only if at start of line AND no pending text
  if (atLineStart && pendingText === '' && text.startsWith(' ')) {
    text = text.slice(1);
  }

  return text;
}

/**
 * Find a matching tag handler for an element.
 * Supports keys in formats:
 * - "tag" — matches by tag name only
 * - "tag.class" — matches by tag name AND CSS class
 * Class-specific handlers take priority over tag-only handlers.
 */
function findTagHandler(
  handlers: Record<string, TagHandler>,
  element: DOMElement,
  tagName: string,
): TagHandler | null {
  // First try class-specific handlers (tag.class)
  const className = element.getAttribute('class');
  if (className) {
    const classes = className.split(/\s+/);
    for (const cls of classes) {
      const key = `${tagName}.${cls}`;
      if (handlers[key]) {
        return handlers[key];
      }
    }
  }

  // Then try tag-only handler
  if (handlers[tagName]) {
    return handlers[tagName];
  }

  return null;
}

/**
 * Default tag handlers
 */
const DEFAULT_TAG_HANDLERS: Record<string, TagHandler> = {
  // Formula span
  'span.formula': (element, context) => {
    const formula = element.getAttribute('data-formula');
    if (formula) {
      context.pushEmbed({ formula });
    }
  },

  // Diagram (Mermaid) span — inline mode
  'span.diagram': (element, context) => {
    const diagram = element.getAttribute('data-diagram');
    if (diagram) {
      context.pushEmbed({ diagram });
    }
  },

  // Draw.io diagram span — file reference
  'span.drawio': (element, context) => {
    const src = element.getAttribute('data-drawio-src');
    if (src) {
      const attrs: Record<string, unknown> = {};
      const alt = element.getAttribute('data-alt');
      if (alt) attrs.alt = alt;
      context.pushEmbed({ drawio: src }, Object.keys(attrs).length > 0 ? attrs : undefined);
    }
  },

  // Footnote reference: <sup class="footnote-ref"><a href="#fn-{id}">{label}</a></sup>
  'sup.footnote-ref': (element, context) => {
    // Extract id from the nested <a> href="#fn-{id}"
    const children = element.childNodes;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child && isElement(child) && child.tagName.toLowerCase() === 'a') {
        const href = child.getAttribute('href') || '';
        const match = href.match(/#fn-(.+)/);
        if (match?.[1]) {
          context.pushEmbed({ 'footnote-ref': match[1] });
          return;
        }
      }
    }
    // Fallback: try id attribute on <sup> itself
    const id = element.getAttribute('id') || '';
    const refMatch = id.match(/^fnref-(.+)/);
    if (refMatch?.[1]) {
      context.pushEmbed({ 'footnote-ref': refMatch[1] });
    }
  },
};
