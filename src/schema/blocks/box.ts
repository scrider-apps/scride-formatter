import type { Op } from '@scrider/delta';
import { Delta } from '@scrider/delta';
import type { BlockContext, BlockHandler } from '../BlockHandler';
import type { Registry } from '../Registry';
import { normalizeDelta } from '../../conversion/sanitize';
import type { DOMElement } from '../../conversion/adapters/types';
import { isElement } from '../../conversion/adapters/types';

// ============================================================================
// Types
// ============================================================================

/** Valid float positions for Inline-Box */
export const BOX_FLOAT_VALUES = ['left', 'right', 'center'] as const;

/** Valid overflow modes for Inline-Box */
export const BOX_OVERFLOW_VALUES = ['auto', 'hidden', 'visible'] as const;

/** Union of valid float positions */
export type BoxFloat = (typeof BOX_FLOAT_VALUES)[number];

/** Union of valid overflow modes */
export type BoxOverflow = (typeof BOX_OVERFLOW_VALUES)[number];

/**
 * Inline-Box block data.
 *
 * Stored in Delta as: `{ insert: { block: <BoxBlockData> }, attributes: { float, width, height, overflow } }`
 *
 * A float container with nested Delta content and text wrapping.
 * Visual properties (float, width, height, overflow) are stored in op attributes,
 * not in block data — clean separation of semantics vs presentation.
 *
 * HTML (float left/right):
 * ```html
 * <div class="inline-box" data-float="left" data-overflow="auto"
 *      style="width: 200px; height: 300px;">
 *   <p>Rich content</p>
 * </div>
 * ```
 *
 * HTML (center — no wrapping):
 * ```html
 * <div class="inline-box" data-float="center" data-overflow="auto"
 *      style="width: 200px; height: 300px;">
 *   <p>Content</p>
 * </div>
 * ```
 *
 * Markdown: no native equivalent → toMarkdown returns null → HTML fallback.
 */
export interface BoxBlockData {
  /** Block type discriminator */
  type: 'box';
  /** Nested Delta content (rich text) */
  content: { ops: Op[] };
}

/**
 * Op-level attributes for box block embed.
 * Stored in `op.attributes`, not in block data.
 */
export interface BoxOpAttributes {
  /** Float position: left/right = text wrapping, center = no wrapping */
  float?: BoxFloat;
  /** Container width (e.g. "200px", "30%") */
  width?: string;
  /** Container height (e.g. "300px", "auto") */
  height?: string;
  /** Overflow behavior when content exceeds dimensions */
  overflow?: BoxOverflow;
}

// ============================================================================
// Helpers
// ============================================================================

/** Check if a string is a valid box float value */
function isBoxFloat(value: string): value is BoxFloat {
  return BOX_FLOAT_VALUES.includes(value as BoxFloat);
}

/** Check if a string is a valid box overflow value */
function isBoxOverflow(value: string): value is BoxOverflow {
  return BOX_OVERFLOW_VALUES.includes(value as BoxOverflow);
}

// ============================================================================
// BoxBlockHandler
// ============================================================================

/**
 * BlockHandler implementation for Inline-Box (Float Container).
 *
 * A container with nested Delta content that supports float positioning
 * and text wrapping. Like Alert (single nested Delta), but visual
 * properties are stored in op attributes, not in block data.
 *
 * HTML: `<div class="inline-box" data-float="F" data-overflow="O" style="width: W; height: H">...</div>`
 * Markdown: no equivalent → toMarkdown returns null → HTML fallback
 */
export const boxBlockHandler: BlockHandler<BoxBlockData> = {
  type: 'box',

  validate(data: BoxBlockData): boolean {
    if (!data || typeof data !== 'object' || data.type !== 'box') {
      return false;
    }

    if (
      !data.content ||
      typeof data.content !== 'object' ||
      !Array.isArray(data.content.ops) ||
      data.content.ops.length === 0
    ) {
      return false;
    }

    return true;
  },

  // ── Conversion ──────────────────────────────────────────────

  toHtml(data: BoxBlockData, context: BlockContext): string {
    const pretty = context.options?.pretty ?? false;
    const nl = pretty ? '\n' : '';
    const ind = (level: number): string => (pretty ? '  '.repeat(level) : '');

    // Read visual properties from opAttributes (passed by converter)
    const opAttrs = context.opAttributes;
    const float = (opAttrs?.float as string) || 'left';
    const width = opAttrs?.width as string | undefined;
    const height = opAttrs?.height as string | undefined;
    const overflow = (opAttrs?.overflow as string) || 'auto';

    // Build data-* attributes for CSS-driven layout
    let attrs = `class="inline-box" data-float="${float}"`;
    if (overflow !== 'auto') {
      attrs += ` data-overflow="${overflow}"`;
    }

    // Build inline style for dynamic values (width, height)
    const styles: string[] = [];
    if (width && width !== 'auto') styles.push(`width: ${width}`);
    if (height && height !== 'auto') styles.push(`height: ${height}`);
    if (styles.length > 0) {
      attrs += ` style="${styles.join('; ')}"`;
    }

    let html = `<div ${attrs}>${nl}`;

    // Render nested Delta content
    if (context.renderDelta) {
      html += `${ind(1)}${context.renderDelta(data.content.ops)}${nl}`;
    }

    html += `</div>`;
    return html;
  },

  fromHtml(element: DOMElement, context: BlockContext): BoxBlockData | null {
    const tag = element.tagName.toLowerCase();
    if (tag !== 'div') return null;

    const className = element.getAttribute('class') || '';
    if (!className.includes('inline-box')) return null;

    // Parse children to get nested Delta content
    let ops: Op[] = [];

    const children = element.childNodes;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child || !isElement(child)) continue;

      if (context.parseElement) {
        const parsed = context.parseElement(child);
        ops = ops.concat(parsed);
      }
    }

    if (ops.length === 0) {
      ops = [{ insert: '\n' }];
    }

    return {
      type: 'box',
      content: { ops },
    };
  },

  toMarkdown(_data: BoxBlockData, _context: BlockContext): string | null {
    // No lossless Markdown representation for float container.
    // Returning null triggers fallback to toHtml() — HTML directly in Markdown
    // (valid per CommonMark/GFM spec).
    return null;
  },

  // ── Normalization ──────────────────────────────────────────

  normalize(data: BoxBlockData, registry: Registry): BoxBlockData {
    const normalized = normalizeDelta(new Delta(data.content.ops), registry);
    return {
      ...data,
      content: { ops: normalized.ops },
    };
  },

  // ── Nested Deltas ──────────────────────────────────────────

  getNestedDeltas(data: BoxBlockData): Op[][] {
    return [data.content.ops];
  },

  setNestedDeltas(data: BoxBlockData, deltas: Op[][]): BoxBlockData {
    const first = deltas[0];
    if (!first) return data;
    return {
      ...data,
      content: { ops: first },
    };
  },
};

/**
 * Extract op attributes for box from an HTML element.
 *
 * Used by html-to-delta intercept to reconstruct op attributes
 * (float, width, height, overflow) from the HTML representation.
 */
export function extractBoxOpAttributes(element: DOMElement): BoxOpAttributes {
  const attrs: BoxOpAttributes = {};

  // float from data-float attribute
  const dataFloat = element.getAttribute('data-float');
  if (dataFloat && isBoxFloat(dataFloat)) {
    attrs.float = dataFloat;
  }

  // overflow from data-overflow attribute (default: auto)
  const dataOverflow = element.getAttribute('data-overflow');
  if (dataOverflow && isBoxOverflow(dataOverflow)) {
    attrs.overflow = dataOverflow;
  }

  // width and height from inline style
  const style = element.getAttribute('style') || '';

  const widthMatch = style.match(/(?:^|;\s*)width:\s*([^;]+)/);
  if (widthMatch?.[1]) {
    attrs.width = widthMatch[1].trim();
  }

  const heightMatch = style.match(/(?:^|;\s*)height:\s*([^;]+)/);
  if (heightMatch?.[1]) {
    attrs.height = heightMatch[1].trim();
  }

  return attrs;
}
