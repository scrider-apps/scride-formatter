import type { DOMElement } from '../conversion/adapters/types';
import type { AttributeMap } from '@scrider/delta';

/**
 * Scope of a format
 *
 * - inline: applies to text runs (bold, italic, link, color...)
 * - block: applies to lines (header, list, blockquote...)
 * - embed: non-text content (image, video, formula...)
 */
export type FormatScope = 'inline' | 'block' | 'embed';

/**
 * Result returned by Format.match() when an HTML element is recognized.
 */
export interface FormatMatchResult<T = unknown> {
  /** The embed value for Delta (e.g. URL string, boolean, etc.) */
  value: T;
  /** Optional attributes to attach to the op (e.g. alt, width, height) */
  attributes?: AttributeMap;
}

/**
 * Format interface with optional conversion methods.
 *
 * Three-level extensibility:
 * - Level 1 (validate/normalize): format works in Delta, no conversion
 * - Level 2 (render/match): HTML roundtrip — Delta ↔ HTML
 * - Level 3 (toMarkdown/fromMarkdown): Markdown roundtrip — Delta ↔ Markdown
 *
 * @template T - The type of the attribute value
 */
export interface Format<T = unknown> {
  /**
   * Name of the attribute in Delta
   * Must be unique within a Registry
   */
  readonly name: string;

  /**
   * Scope of the format
   */
  readonly scope: FormatScope;

  /**
   * Normalize value to canonical form
   *
   * Examples:
   * - 'red' → '#ff0000'
   * - 'RGB(255,0,0)' → '#ff0000'
   * - 7 (header) → 6 (clamped)
   *
   * @param value - The value to normalize
   * @returns Normalized value
   */
  normalize?(value: T): T;

  /**
   * Validate that a value is acceptable
   *
   * @param value - The value to validate
   * @returns true if value is valid
   */
  validate?(value: T): boolean;

  // ── Level 2: HTML roundtrip ──────────────────────────────

  /**
   * Render Delta value to HTML string.
   *
   * Used by deltaToHtml for embed formats. If not provided,
   * the converter falls back to built-in EMBED_RENDERERS config.
   *
   * @param value - The embed value (e.g. URL string)
   * @param attributes - Op-level attributes (alt, width, height, etc.)
   * @returns HTML string
   */
  render?(value: T, attributes?: AttributeMap): string;

  /**
   * Match an HTML element and extract Delta embed value.
   *
   * Used by htmlToDelta to recognize custom elements.
   * Return null if this element is not a match for this format.
   *
   * @param element - The DOM element to inspect
   * @returns Match result with value and optional attributes, or null
   */
  match?(element: DOMElement): FormatMatchResult<T> | null;

  // ── Level 3: Markdown roundtrip (optional) ───────────────

  /**
   * Render Delta value to Markdown string.
   *
   * Return null to fall back to HTML-in-Markdown (current behavior
   * for embeds without native Markdown representation).
   *
   * @param value - The embed value
   * @param attributes - Op-level attributes
   * @returns Markdown string, or null for HTML fallback
   */
  toMarkdown?(value: T, attributes?: AttributeMap): string | null;

  /**
   * Parse a Markdown AST node into a Delta embed value.
   *
   * Used by markdownToDelta to recognize custom Markdown patterns
   * (e.g. image-like URLs, fenced code blocks with custom language).
   *
   * @param node - Markdown AST node (MDAST)
   * @returns Match result with value and optional attributes, or null
   */
  fromMarkdown?(node: unknown): FormatMatchResult<T> | null;
}

/**
 * Helper type for creating format objects
 */
export type FormatDefinition<T = unknown> = Format<T>;
