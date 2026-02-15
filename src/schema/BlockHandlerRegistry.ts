import type { BlockHandler } from './BlockHandler';

/**
 * Registry for BlockHandler implementations.
 *
 * Separate from Registry (FormatRegistry) — different responsibilities:
 * - Registry: attribute validation/normalization (key-value pairs, primitives)
 * - BlockHandlerRegistry: block rendering/parsing (complex structures with nested Delta)
 *
 * Connected to converters via options:
 * ```typescript
 * deltaToHtml(delta, { registry, blockHandlers });
 * htmlToDelta(html, { registry, blockHandlers });
 * ```
 *
 * @example
 * ```typescript
 * const blockHandlers = new BlockHandlerRegistry()
 *   .register(tableBlockHandler);
 *
 * deltaToHtml(delta, { registry, blockHandlers });
 * ```
 */
export class BlockHandlerRegistry {
  private handlers = new Map<string, BlockHandler>();

  /**
   * Register a block handler
   *
   * @param handler - BlockHandler to register
   * @returns this for chaining
   * @throws Error if handler with same type is already registered
   */
  register(handler: BlockHandler): this {
    if (this.handlers.has(handler.type)) {
      throw new Error(`BlockHandler "${handler.type}" is already registered`);
    }
    this.handlers.set(handler.type, handler);
    return this;
  }

  /**
   * Get a handler by block type
   *
   * @param type - Block type (e.g. "table")
   * @returns BlockHandler or undefined if not found
   */
  get(type: string): BlockHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * Check if a handler is registered for a block type
   *
   * @param type - Block type
   * @returns true if handler exists
   */
  has(type: string): boolean {
    return this.handlers.has(type);
  }

  /**
   * Get the number of registered handlers
   */
  get size(): number {
    return this.handlers.size;
  }

  /**
   * Get all registered block type names
   */
  getTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
