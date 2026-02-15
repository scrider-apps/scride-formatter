/**
 * Markdown → Delta Conversion
 *
 * Converts Markdown string to a Delta document using remark (unified).
 */

import { Delta } from '@scrider/delta';
import type { AttributeMap } from '@scrider/delta';
import type { BlockHandlerRegistry } from '../../schema/BlockHandlerRegistry';
import { htmlToDelta } from '../html/html-to-delta';

/**
 * Options for Markdown → Delta conversion
 */
export interface MarkdownToDeltaOptions {
  /**
   * Enable GFM (GitHub Flavored Markdown) extensions
   * Includes: tables, strikethrough, task lists, autolinks
   * @default true
   */
  gfm?: boolean;

  /**
   * Display math rendering mode
   * - true (default): $$...$$ / ```math → code-block "math" in Delta
   * - false: $$...$$ / ```math → inline { formula } embed in Delta
   *
   * Does NOT affect inline math ($...$) — always becomes { formula } embed
   * @default true
   */
  mathBlock?: boolean;

  /**
   * Mermaid diagram rendering mode
   * - true (default): ```mermaid → code-block "mermaid" in Delta
   * - false: ```mermaid → inline { diagram } embed in Delta
   * @default true
   */
  mermaidBlock?: boolean;

  /**
   * PlantUML diagram rendering mode
   * - true (default): ```plantuml → code-block "plantuml" in Delta
   * - false: ```plantuml → inline { diagram } embed in Delta
   * @default true
   */
  plantumlBlock?: boolean;

  /**
   * Custom node handlers for special elements
   */
  nodeHandlers?: Record<string, NodeHandler>;

  /**
   * Block handler registry for Extended Table and other block embeds.
   * Reserved for future use — GFM tables don't support Extended Table features.
   * HTML tables in Markdown are parsed via htmlToDelta when blockHandlers is provided.
   */
  blockHandlers?: BlockHandlerRegistry;
}

/**
 * MDAST node type (simplified)
 */
interface MdastNode {
  type: string;
  children?: MdastNode[];
  value?: string;
  url?: string;
  alt?: string;
  title?: string;
  lang?: string;
  meta?: string;
  depth?: number;
  ordered?: boolean;
  checked?: boolean | null;
  spread?: boolean;
  /** Footnote identifier (for footnoteReference / footnoteDefinition) */
  identifier?: string;
  /** Footnote label (for footnoteReference / footnoteDefinition) */
  label?: string;
}

/**
 * Custom node handler function
 */
export type NodeHandler = (node: MdastNode, context: ParserContext) => void;

/**
 * Parser context for building Delta
 */
export interface ParserContext {
  delta: Delta;
  pushText(text: string, attrs?: AttributeMap): void;
  pushEmbed(embed: Record<string, unknown>, attrs?: AttributeMap): void;
  pushNewline(attrs?: AttributeMap): void;
}

// Lazy-loaded remark modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let remarkParse: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let remarkGfm: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let remarkMath: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let unified: any = null;

/**
 * Check if remark is available
 */
export function isRemarkAvailable(): boolean {
  try {
    require.resolve('unified');
    require.resolve('remark-parse');
    return true;
  } catch {
    return false;
  }
}

/**
 * Load remark modules lazily
 */
async function loadRemark(): Promise<void> {
  if (unified) return;

  try {
    const [unifiedMod, remarkParseMod, remarkGfmMod] = await Promise.all([
      import('unified'),
      import('remark-parse'),
      import('remark-gfm'),
    ]);

    unified = unifiedMod.unified;
    remarkParse = remarkParseMod.default;
    remarkGfm = remarkGfmMod.default;
  } catch {
    throw new Error(
      'remark is not installed. Install with: pnpm add unified remark-parse remark-gfm',
    );
  }

  // remark-math is optional — enables $...$ and $$...$$ syntax
  try {
    const remarkMathMod = await import('remark-math');
    remarkMath = remarkMathMod.default;
  } catch {
    // remark-math not installed — $...$ will be treated as plain text
  }
}

/**
 * Preprocess markdown before parsing:
 * - Convert LaTeX math delimiters \(...\) → $...$ and \[...\] → $$...$$
 * - When mathBlock=true, promote standalone $...$ (entire line) to $$...$$ display math
 *
 * LaTeX delimiters are widely used by LLMs (DeepSeek, ChatGPT, Claude)
 * and are safe to convert since \( \) in plain Markdown is just escaped parens.
 *
 * Note: standalone <br> tags are replaced with <!--empty-line--> HTML comment sentinels
 * surrounded by blank lines. This makes remark parse them as block-level HTML nodes
 * (not inline HTML within a paragraph), avoiding newline duplication during roundtrip.
 * The sentinel is detected in processInlineHtml() which calls pushNewline().
 */
function preprocessMarkdown(markdown: string, mathBlock: boolean): string {
  // Convert \(...\) → $...$ (inline math, single line)
  markdown = markdown.replace(/\\\((.+?)\\\)/g, (_match, content: string) => `$${content}$`);

  // Convert \[...\] → $$...$$ (display math, may span multiple lines)
  markdown = markdown.replace(/\\\[([\s\S]+?)\\\]/g, (_match, content: string) => `$$${content}$$`);

  // When mathBlock=true, promote standalone $...$ to $$\n...\n$$ (display math)
  // A line containing ONLY a single $...$ formula → display math block
  // remark-math requires $$ on separate lines for display math recognition
  // This handles DeepSeek/LLM output where $...$ is used on its own line for display formulas
  if (mathBlock) {
    markdown = markdown.replace(
      /^\$([^$\n]+)\$\s*$/gm,
      (_match, content: string) => `$$\n${content}\n$$`,
    );
  }

  // Replace standalone <br> with <!--empty-line--> sentinel surrounded by blank lines.
  // <br> tags are emitted by deltaToMarkdown(preserveEmptyLines: true) to represent
  // empty lines in the Delta. We convert them to block-level HTML comments so remark
  // creates a separate 'html' AST node (not inline HTML merged with paragraph text).
  // The sentinel is detected in processInlineHtml() which calls pushNewline(),
  // producing exactly one \n per <br> — preserving empty lines through roundtrip.
  return markdown.replace(/^<br\s*\/?>$/gim, '\n<!--empty-line-->\n');
}

/**
 * Convert Markdown to Delta (async)
 */
export async function markdownToDelta(
  markdown: string,
  options: MarkdownToDeltaOptions = {},
): Promise<Delta> {
  const {
    gfm = true,
    mathBlock = true,
    mermaidBlock = true,
    plantumlBlock = true,
    nodeHandlers = {},
  } = options;

  markdown = preprocessMarkdown(markdown, mathBlock);

  await loadRemark();

  if (!unified || !remarkParse) {
    throw new Error('Failed to load remark');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  let processor = unified().use(remarkParse);

  if (gfm && remarkGfm) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    processor = processor.use(remarkGfm);
  }

  if (remarkMath) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    processor = processor.use(remarkMath);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const tree = processor.parse(markdown) as MdastNode;

  return astToDelta(
    tree,
    nodeHandlers,
    mathBlock,
    mermaidBlock,
    plantumlBlock,
    options.blockHandlers,
  );
}

/**
 * Synchronous version (requires remark to be pre-loaded or uses require)
 */
export function markdownToDeltaSync(markdown: string, options: MarkdownToDeltaOptions = {}): Delta {
  const {
    gfm = true,
    mathBlock = true,
    mermaidBlock = true,
    plantumlBlock = true,
    nodeHandlers = {},
  } = options;

  markdown = preprocessMarkdown(markdown, mathBlock);

  if (!unified || !remarkParse) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      const unifiedMod = require('unified');
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      const remarkParseMod = require('remark-parse');
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      const remarkGfmMod = require('remark-gfm');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      unified = unifiedMod.unified;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      remarkParse = remarkParseMod.default;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      remarkGfm = remarkGfmMod.default;
    } catch {
      throw new Error(
        'remark is not installed. Install with: pnpm add unified remark-parse remark-gfm',
      );
    }

    // remark-math is optional
    if (!remarkMath) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
        const remarkMathMod = require('remark-math');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        remarkMath = remarkMathMod.default;
      } catch {
        // remark-math not installed
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  let processor = unified().use(remarkParse);

  if (gfm && remarkGfm) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    processor = processor.use(remarkGfm);
  }

  if (remarkMath) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    processor = processor.use(remarkMath);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const tree = processor.parse(markdown) as MdastNode;

  return astToDelta(
    tree,
    nodeHandlers,
    mathBlock,
    mermaidBlock,
    plantumlBlock,
    options.blockHandlers,
  );
}

/**
 * Convert MDAST to Delta
 */
function astToDelta(
  tree: MdastNode,
  customHandlers: Record<string, NodeHandler>,
  mathBlock: boolean,
  mermaidBlock: boolean,
  plantumlBlock: boolean,
  blockHandlers?: BlockHandlerRegistry,
): Delta {
  const delta = new Delta();
  let currentInlineAttrs: AttributeMap = {};
  let pendingText = '';
  // Stack for tracking which attributes each <span style> added (for correct nested span handling)
  const spanAttrStack: string[][] = [];

  // Footnote definitions collected during AST traversal (for finalization)
  const footnoteDefinitions = new Map<string, MdastNode>();

  const context: ParserContext = {
    delta,
    pushText(text: string, attrs?: AttributeMap) {
      if (attrs && Object.keys(attrs).length > 0) {
        if (pendingText) {
          if (Object.keys(currentInlineAttrs).length > 0) {
            delta.insert(pendingText, currentInlineAttrs);
          } else {
            delta.insert(pendingText);
          }
          pendingText = '';
        }
        delta.insert(text, { ...currentInlineAttrs, ...attrs });
      } else {
        pendingText += text;
      }
    },
    pushEmbed(embed: Record<string, unknown>, attrs?: AttributeMap) {
      if (pendingText) {
        if (Object.keys(currentInlineAttrs).length > 0) {
          delta.insert(pendingText, currentInlineAttrs);
        } else {
          delta.insert(pendingText);
        }
        pendingText = '';
      }
      if (attrs && Object.keys(attrs).length > 0) {
        delta.insert(embed, attrs);
      } else {
        delta.insert(embed);
      }
    },
    pushNewline(attrs?: AttributeMap) {
      if (pendingText) {
        if (Object.keys(currentInlineAttrs).length > 0) {
          delta.insert(pendingText, currentInlineAttrs);
        } else {
          delta.insert(pendingText);
        }
        pendingText = '';
      }
      if (attrs && Object.keys(attrs).length > 0) {
        delta.insert('\n', attrs);
      } else {
        delta.insert('\n');
      }
    },
  };

  // Heading ID extraction: parse {#custom-id} from heading text
  const HEADING_ID_RE = /\s*\{#([\w-]+)\}\s*$/;

  /**
   * Extract custom heading id from `{#id}` suffix in heading text.
   * Mutates the last text child to strip the `{#id}` part.
   * Returns the extracted id, or null if none found.
   */
  function extractHeadingId(heading: MdastNode): string | null {
    const children = heading.children;
    if (!children || children.length === 0) return null;

    // Find the last text node
    const lastChild = children[children.length - 1];
    if (!lastChild || lastChild.type !== 'text' || !lastChild.value) return null;

    const match = lastChild.value.match(HEADING_ID_RE);
    if (!match) return null;

    // Strip {#id} from the text node
    lastChild.value = lastChild.value.replace(HEADING_ID_RE, '');

    return match[1]!;
  }

  // Alert type detection: check if blockquote starts with [!TYPE]
  const ALERT_TYPE_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i;

  function extractAlertType(blockquote: MdastNode): string | null {
    const bqChildren = blockquote.children;
    if (!bqChildren || bqChildren.length === 0) return null;

    const firstChild = bqChildren[0];
    if (!firstChild || firstChild.type !== 'paragraph') return null;

    const paraChildren = firstChild.children;
    if (!paraChildren || paraChildren.length === 0) return null;

    const firstInline = paraChildren[0];
    if (!firstInline || firstInline.type !== 'text' || !firstInline.value) return null;

    const firstLine = firstInline.value.split('\n')[0] ?? '';
    const match = ALERT_TYPE_RE.exec(firstLine.trim());
    if (!match || !match[1]) return null;

    return match[1].toLowerCase();
  }

  function processAlertBlockquote(blockquote: MdastNode, alertType: string): void {
    // Build a synthetic root with the blockquote's content, minus the [!TYPE] tag
    const children: MdastNode[] = [...(blockquote.children || [])];

    const first = children[0];
    if (first && first.type === 'paragraph' && first.children) {
      const firstPara: MdastNode = { ...first, children: [...first.children] };
      const firstInline = firstPara.children![0];

      if (firstInline && firstInline.type === 'text' && firstInline.value) {
        // Remove the [!TYPE] line from the text
        const lines = firstInline.value.split('\n');
        lines.shift(); // remove "[!TYPE]" line
        const remaining = lines.join('\n');

        if (remaining.trim().length > 0) {
          firstPara.children![0] = { ...firstInline, value: remaining };
        } else {
          firstPara.children!.shift();
        }

        if (firstPara.children!.length === 0) {
          children.shift();
        } else {
          children[0] = firstPara;
        }
      }
    }

    // Convert remaining content to nested Delta
    const syntheticRoot: MdastNode = {
      type: 'root',
      children,
    };
    const contentDelta = astToDelta(
      syntheticRoot,
      customHandlers,
      mathBlock,
      mermaidBlock,
      plantumlBlock,
      blockHandlers,
    );

    context.pushEmbed({
      block: {
        type: 'alert',
        alertType,
        content: { ops: contentDelta.ops },
      },
    });
    context.pushNewline();
  }

  function processNode(node: MdastNode, blockAttrs: AttributeMap = {}): void {
    const customHandler = customHandlers[node.type];
    if (customHandler) {
      customHandler(node, context);
      return;
    }

    switch (node.type) {
      case 'root':
        processChildren(node, blockAttrs);
        break;

      case 'paragraph':
        processChildren(node, blockAttrs);
        context.pushNewline(blockAttrs);
        break;

      case 'heading': {
        const headerId = extractHeadingId(node);
        processChildren(node, {});
        const headerAttrs: Record<string, unknown> = { header: node.depth ?? 1 };
        if (headerId) {
          headerAttrs['header-id'] = headerId;
        }
        context.pushNewline(headerAttrs);
        break;
      }

      case 'blockquote': {
        // Check for GitHub-style alert: > [!NOTE] / > [!TIP] / etc.
        const alertType = extractAlertType(node);
        if (alertType) {
          processAlertBlockquote(node, alertType);
        } else {
          processChildren(node, { blockquote: true });
        }
        break;
      }

      case 'list':
        processList(node);
        break;

      case 'listItem':
        break;

      case 'code':
        processCodeBlock(node);
        break;

      case 'table':
        processTable(node);
        break;

      case 'tableRow':
      case 'tableCell':
        // Handled inside processTable
        break;

      case 'thematicBreak':
        context.pushEmbed({ divider: true });
        context.pushNewline();
        break;

      case 'text':
        context.pushText(node.value ?? '');
        break;

      case 'strong':
        processInline(node, { bold: true });
        break;

      case 'emphasis':
        processInline(node, { italic: true });
        break;

      case 'delete':
        processInline(node, { strike: true });
        break;

      case 'inlineCode':
        context.pushText(node.value ?? '', { code: true });
        break;

      case 'link':
        processLink(node);
        break;

      case 'image':
        processImage(node);
        break;

      case 'inlineMath':
        // $...$ inline LaTeX formula → formula embed
        context.pushEmbed({ formula: node.value ?? '' });
        break;

      case 'math':
        // $$...$$ display math block → code-block with lang "math"
        processMathBlock(node);
        break;

      case 'footnoteReference':
        context.pushEmbed({ 'footnote-ref': node.identifier ?? '' });
        break;

      case 'footnoteDefinition':
        // Collect for post-processing — skip inline output
        footnoteDefinitions.set(node.identifier ?? '', node);
        break;

      case 'break':
        context.pushNewline();
        break;

      case 'html': {
        const htmlContent = node.value ?? '';
        if (isBlockLevelHtml(htmlContent)) {
          processBlockHtml(htmlContent);
        } else {
          processInlineHtml(node);
        }
        break;
      }

      default:
        if (node.children) {
          processChildren(node, blockAttrs);
        }
    }
  }

  function processChildren(node: MdastNode, blockAttrs: AttributeMap): void {
    if (!node.children) return;
    for (const child of node.children) {
      processNode(child, blockAttrs);
    }
  }

  function processInline(node: MdastNode, attrs: AttributeMap): void {
    const prevAttrs = { ...currentInlineAttrs };

    if (pendingText) {
      if (Object.keys(currentInlineAttrs).length > 0) {
        delta.insert(pendingText, currentInlineAttrs);
      } else {
        delta.insert(pendingText);
      }
      pendingText = '';
    }

    currentInlineAttrs = { ...currentInlineAttrs, ...attrs };

    if (node.children) {
      for (const child of node.children) {
        processNode(child);
      }
    }

    if (pendingText) {
      if (Object.keys(currentInlineAttrs).length > 0) {
        delta.insert(pendingText, currentInlineAttrs);
      } else {
        delta.insert(pendingText);
      }
      pendingText = '';
    }

    currentInlineAttrs = prevAttrs;
  }

  function processLink(node: MdastNode): void {
    processInline(node, { link: node.url ?? '' });
  }

  function processImage(node: MdastNode): void {
    const url = node.url ?? '';
    const alt = node.alt ?? '';

    // ![Video](url) → video embed (case-insensitive: ![video], ![VIDEO])
    if (alt.toLowerCase() === 'video') {
      context.pushEmbed({ video: url });
      return;
    }

    const attrs: AttributeMap = {};
    if (node.alt) attrs.alt = node.alt;

    // Detect .drawio files by extension — render as drawio embed instead of image
    if (url.toLowerCase().endsWith('.drawio')) {
      context.pushEmbed({ drawio: url }, Object.keys(attrs).length > 0 ? attrs : undefined);
    } else {
      context.pushEmbed({ image: url }, Object.keys(attrs).length > 0 ? attrs : undefined);
    }
  }

  function processList(node: MdastNode, indent = 0): void {
    if (!node.children) return;

    const ordered = node.ordered ?? false;

    for (const item of node.children) {
      if (item.type !== 'listItem') continue;

      let listType: string;
      if (item.checked === true) {
        listType = 'checked';
      } else if (item.checked === false) {
        listType = 'unchecked';
      } else {
        listType = ordered ? 'ordered' : 'bullet';
      }

      const blockAttrs: AttributeMap = { list: listType };
      if (indent > 0) {
        blockAttrs.indent = indent;
      }

      if (item.children) {
        for (const child of item.children) {
          if (child.type === 'list') {
            processList(child, indent + 1);
          } else if (child.type === 'paragraph') {
            processChildren(child, {});
            context.pushNewline(blockAttrs);
          } else {
            processNode(child, blockAttrs);
          }
        }
      }
    }
  }

  function processCodeBlock(node: MdastNode): void {
    const code = node.value ?? '';
    const lang = node.lang;

    // Mermaid: when mermaidBlock=false, flatten to inline { diagram } embed
    if (lang === 'mermaid' && mermaidBlock === false) {
      context.pushEmbed({ diagram: code });
      context.pushNewline();
      return;
    }

    // PlantUML: when plantumlBlock=false, flatten to inline { diagram } embed
    if (lang === 'plantuml' && plantumlBlock === false) {
      context.pushEmbed({ diagram: code });
      context.pushNewline();
      return;
    }

    const lines = code.split('\n');
    const codeBlockAttr: AttributeMap = {
      'code-block': lang ?? true,
    };

    for (const line of lines) {
      context.pushText(line);
      context.pushNewline(codeBlockAttr);
    }
  }

  /**
   * Process $$...$$ display math block.
   * mathBlock=true  → code-block with lang "math"
   * mathBlock=false → inline { formula } embed
   */
  function processMathBlock(node: MdastNode): void {
    const value = node.value ?? '';

    if (mathBlock === false) {
      // Flatten display math to inline formula embed
      context.pushEmbed({ formula: value });
      context.pushNewline();
    } else {
      // Default: render as code-block "math"
      const lines = value.split('\n');
      const mathBlockAttr: AttributeMap = { 'code-block': 'math' };

      for (const line of lines) {
        context.pushText(line);
        context.pushNewline(mathBlockAttr);
      }
    }
  }

  /**
   * Process GFM table node.
   * In MDAST, `table.align` is Array<'left'|'center'|'right'|null>.
   * First `tableRow` child is the header row.
   */
  function processTable(node: MdastNode): void {
    if (!node.children) return;

    // Table-level alignment array from remark-gfm
    const aligns: (string | null)[] = (node as unknown as { align: (string | null)[] }).align || [];

    for (let rowIdx = 0; rowIdx < node.children.length; rowIdx++) {
      const rowNode = node.children[rowIdx];
      if (!rowNode || rowNode.type !== 'tableRow') continue;

      const isHeader = rowIdx === 0; // GFM: first row is always header

      if (!rowNode.children) continue;

      for (let colIdx = 0; colIdx < rowNode.children.length; colIdx++) {
        const cellNode = rowNode.children[colIdx];
        if (!cellNode || cellNode.type !== 'tableCell') continue;

        // Build block attributes for this cell
        const cellBlockAttrs: AttributeMap = {
          'table-row': rowIdx,
          'table-col': colIdx,
        };
        if (isHeader) {
          cellBlockAttrs['table-header'] = true;
        }
        const colAlign = aligns[colIdx];
        if (colAlign) {
          cellBlockAttrs['table-col-align'] = colAlign;
        }

        // Process inline content of the cell
        if (cellNode.children) {
          for (const child of cellNode.children) {
            processNode(child);
          }
        }

        context.pushNewline(cellBlockAttrs);
      }
    }
  }

  /**
   * Check if HTML content starts with a block-level element tag.
   * Block-level HTML in Markdown is dispatched to htmlToDelta() for full parsing.
   */
  function isBlockLevelHtml(html: string): boolean {
    return /^\s*<(div|table|section|article|aside|nav|header|footer|figure|pre|hr|ol|ul|dl|details|iframe|video)\b/i.test(
      html,
    );
  }

  /**
   * Process block-level HTML by delegating to the existing htmlToDelta() converter.
   * This enables Markdown roundtrip for block embeds (Extended Table, Columns, Inline-Box, etc.)
   * that output HTML fallback in deltaToMarkdown.
   */
  function processBlockHtml(html: string): void {
    // Flush pending inline content
    flushInlineText();

    // Delegate to existing htmlToDelta with all registered block handlers
    const blockDelta = htmlToDelta(html, blockHandlers ? { blockHandlers } : {});

    // Merge ops from block conversion into current delta
    for (const op of blockDelta.ops) {
      delta.push(op);
    }
  }

  /**
   * Flush pending text into delta with current inline attributes.
   */
  function flushInlineText(): void {
    if (pendingText) {
      if (Object.keys(currentInlineAttrs).length > 0) {
        delta.insert(pendingText, currentInlineAttrs);
      } else {
        delta.insert(pendingText);
      }
      pendingText = '';
    }
  }

  /**
   * Map an HTML tag name to the corresponding Delta inline attribute.
   * Returns [attrName, attrValue] or null if not recognized.
   */
  function tagToInlineAttr(tag: string): [string, unknown] | null {
    switch (tag) {
      case 'u':
      case 'ins':
        return ['underline', true];
      case 'sub':
        return ['subscript', true];
      case 'sup':
        return ['superscript', true];
      case 'mark':
        return ['mark', true];
      case 'kbd':
        return ['kbd', true];
      case 'b':
      case 'strong':
        return ['bold', true];
      case 'i':
      case 'em':
        return ['italic', true];
      case 's':
      case 'del':
      case 'strike':
        return ['strike', true];
      default:
        return null;
    }
  }

  /**
   * Process inline HTML tags: <u>, <ins>, <sub>, <sup>, <mark>, <kbd>,
   * <b>, <strong>, <i>, <em>, <s>, <del>, <strike>, <span style="color/background">.
   */
  function processInlineHtml(node: MdastNode): void {
    // Trim whitespace: remark HTML-block nodes may carry trailing newlines
    // that would prevent our ^…$ regex anchors from matching.
    const html = (node.value ?? '').trim();

    // Match opening tags: simple inline format tags
    const openTagMatch = html.match(/^<(u|ins|sub|sup|mark|kbd|b|strong|i|em|s|del|strike)>$/i);
    if (openTagMatch) {
      const tag = openTagMatch[1]?.toLowerCase() ?? '';
      flushInlineText();
      const attr = tagToInlineAttr(tag);
      if (attr) {
        currentInlineAttrs = { ...currentInlineAttrs, [attr[0]]: attr[1] };
      }
      return;
    }

    // Match closing tags: simple inline format tags
    const closeTagMatch = html.match(/^<\/(u|ins|sub|sup|mark|kbd|b|strong|i|em|s|del|strike)>$/i);
    if (closeTagMatch) {
      const tag = closeTagMatch[1]?.toLowerCase() ?? '';
      flushInlineText();
      const attr = tagToInlineAttr(tag);
      if (attr) {
        const newAttrs = { ...currentInlineAttrs };
        delete newAttrs[attr[0]];
        currentInlineAttrs = newAttrs;
      }
      return;
    }

    // Opening <span style="..."> — extract color and/or background-color
    const spanMatch = html.match(/^<span\s+style="([^"]*)">/i);
    if (spanMatch) {
      flushInlineText();
      const style = spanMatch[1] ?? '';
      const addedKeys: string[] = [];

      const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
      if (colorMatch) {
        currentInlineAttrs = { ...currentInlineAttrs, color: colorMatch[1]!.trim() };
        addedKeys.push('color');
      }

      const bgMatch = style.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);
      if (bgMatch) {
        currentInlineAttrs = { ...currentInlineAttrs, background: bgMatch[1]!.trim() };
        addedKeys.push('background');
      }

      spanAttrStack.push(addedKeys);
      return;
    }

    // Closing </span> — pop attributes added by the matching opening <span>
    if (/^<\/span>$/i.test(html)) {
      flushInlineText();
      const keys = spanAttrStack.pop();
      if (keys) {
        const newAttrs = { ...currentInlineAttrs };
        for (const key of keys) delete newAttrs[key];
        currentInlineAttrs = newAttrs;
      }
      return;
    }

    // Handle <img> void element with attributes (float, width, height)
    // This enables roundtrip for floated images: Delta→MD outputs <img data-float="...">,
    // remark-parse sees it as inline HTML, and we reconstruct the image embed here.
    const imgMatch = html.match(/^<img\s+([^>]*)\/?>$/i);
    if (imgMatch) {
      const attrStr = imgMatch[1] ?? '';
      const srcMatch = attrStr.match(/src="([^"]*)"/);
      if (srcMatch) {
        flushInlineText();
        const attrs: AttributeMap = {};
        const altMatch = attrStr.match(/alt="([^"]*)"/);
        const floatMatch = attrStr.match(/data-float="([^"]*)"/);
        const widthMatch = attrStr.match(/width="([^"]*)"/);
        const heightMatch = attrStr.match(/height="([^"]*)"/);
        if (altMatch?.[1]) attrs.alt = altMatch[1];
        if (floatMatch?.[1]) attrs.float = floatMatch[1];
        if (widthMatch?.[1]) attrs.width = parseInt(widthMatch[1], 10) || widthMatch[1];
        if (heightMatch?.[1]) attrs.height = parseInt(heightMatch[1], 10) || heightMatch[1];
        context.pushEmbed(
          { image: srcMatch[1]! },
          Object.keys(attrs).length > 0 ? attrs : undefined,
        );
        // When <img> appears as a standalone HTML block (type-7), it needs a
        // trailing newline to close the Delta "line" — just like the original
        // Delta structure {insert:{image:…}} + {insert:"\n"}.
        context.pushNewline();
      }
      return;
    }

    // Handle <!--empty-line--> sentinel (from preprocessMarkdown <br> replacement)
    if (html.trim() === '<!--empty-line-->') {
      context.pushNewline();
      return;
    }

    // Handle <br> and <br/> — inline line break (e.g. text1<br>text2)
    if (/^<br\s*\/?>$/i.test(html)) {
      context.pushNewline();
      return;
    }

    // For other HTML, just output as text (or skip)
  }

  processNode(tree);

  // Finalization: create footnotes block embed from collected definitions
  if (footnoteDefinitions.size > 0) {
    const notes: Record<string, { ops: unknown[] }> = {};
    for (const [id, defNode] of footnoteDefinitions) {
      // Convert each definition's children to a separate Delta
      const syntheticRoot: MdastNode = {
        type: 'root',
        children: defNode.children || [],
      };
      const defDelta = astToDelta(
        syntheticRoot,
        customHandlers,
        mathBlock,
        mermaidBlock,
        plantumlBlock,
        blockHandlers,
      );
      notes[id] = { ops: defDelta.ops };
    }
    context.pushEmbed({ block: { type: 'footnotes', notes } });
    context.pushNewline();
  }

  if (delta.ops.length > 0) {
    const lastOp = delta.ops[delta.ops.length - 1];
    if (lastOp && 'insert' in lastOp) {
      const lastInsert = lastOp.insert;
      // Add trailing \n if the document doesn't end with one.
      // Covers both text not ending with \n and embed objects (which have no \n).
      if (typeof lastInsert !== 'string' || !lastInsert.endsWith('\n')) {
        delta.insert('\n');
      }
    }
  }

  return delta;
}
