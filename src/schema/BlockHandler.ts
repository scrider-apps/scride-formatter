import type { Op } from '@scrider/delta';
import type { DOMElement } from '../conversion/adapters/types';
import type { Registry } from './Registry';

/**
 * Options for block rendering
 */
export interface BlockRenderOptions {
  /** Pretty-print HTML output */
  pretty?: boolean;
  /** Indentation level for pretty-print */
  indent?: number;
  /** How to interpret colWidths: percent (default) or pixel */
  tableWidthMode?: 'percent' | 'pixel';
}

/**
 * Context injected by converters into BlockHandler methods.
 *
 * Solves cyclic dependencies: handlers live in schema layer,
 * converters live in conversion layer. Converters pass themselves
 * as callbacks via context — no direct imports between layers.
 */
export interface BlockContext {
  /** Format registry for attribute validation/normalization */
  registry: Registry;
  /** Render options */
  options?: BlockRenderOptions;
  /** Render nested Delta ops → HTML (injected by deltaToHtml) */
  renderDelta?: (ops: Op[]) => string;
  /** Parse HTML element → Delta ops (injected by htmlToDelta) */
  parseElement?: (element: DOMElement) => Op[];
  /**
   * Op-level attributes from the Delta operation containing this block embed.
   * Used by handlers that store visual properties (float, width, height, overflow)
   * in op attributes rather than in block data (e.g. Inline-Box).
   */
  opAttributes?: Record<string, unknown>;
}

/**
 * Generic handler for complex block embeds with nested Delta content.
 *
 * Block embeds use a single `block` key in Delta:
 * `{ insert: { block: { type: "table", ... } } }`
 *
 * The `type` field dispatches to the appropriate BlockHandler
 * via BlockHandlerRegistry.
 *
 * T includes `type` — data is stored as `{ block: T }` where T
 * is the full object including `type`. No destructuring needed.
 *
 * @template T - Block data type (e.g. TableBlockData)
 */
export interface BlockHandler<T = unknown> {
  /** Unique block type — value of `type` field in block embed */
  readonly type: string;

  /** Semantic validation of block data (cells, colWidths, etc.) */
  validate(data: T): boolean;

  // ── Conversion ──────────────────────────────────────────

  /** Delta → HTML (context.renderDelta for nested Delta) */
  toHtml(data: T, context: BlockContext): string;

  /** HTML element → block data (context.parseElement for cells) */
  fromHtml(element: DOMElement, context: BlockContext): T | null;

  /** Delta → Markdown (null = fallback to toHtml) */
  toMarkdown?(data: T, context: BlockContext): string | null;

  /** Markdown AST node → block data */
  fromMarkdown?(node: unknown, context: BlockContext): T | null;

  // ── Normalization ───────────────────────────────────────

  /** Normalize block data + recursive normalization of nested Deltas */
  normalize?(data: T, registry: Registry): T;

  // ── Nested Deltas (for traverse / transform) ───────────

  /** Extract all nested Deltas from block */
  getNestedDeltas?(data: T): Op[][];

  /** Replace nested Deltas (immutable, returns new T) */
  setNestedDeltas?(data: T, deltas: Op[][]): T;

  // ── OT (optional, for collaborative editing) ───────────

  compose?(base: T, change: T): T;
  transform?(a: T, b: T, priority: boolean): T;
}
