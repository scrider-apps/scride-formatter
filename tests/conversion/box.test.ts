/**
 * Inline-Box (Float Container) Conversion Tests
 *
 * Tests for box block embed (float container with text wrapping):
 * - Schema validation (content)
 * - Delta → HTML (float modes, data-attrs, style)
 * - HTML → Delta (parsing inline-box divs, extract op attributes)
 * - Delta → Markdown (HTML fallback)
 * - Roundtrip tests (left, right, center, with dimensions)
 * - Edge cases (minimal content, nested blocks, multiple boxes)
 */

import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';
import type { InsertOp } from '@scrider/delta';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { deltaToMarkdown } from '../../src/conversion/markdown/delta-to-markdown';
import { isRemarkAvailable } from '../../src/conversion/markdown/markdown-to-delta';
import { createDefaultBlockHandlers } from '../../src/schema/defaults';
import { boxBlockHandler } from '../../src/schema/blocks/box';
import type { BoxBlockData } from '../../src/schema/blocks/box';

const blockHandlers = createDefaultBlockHandlers();
const runTests = isRemarkAvailable();

// ============================================================================
// Helpers
// ============================================================================

/** Safely extract op attributes as a string record */
function getOpAttrs(op: { attributes?: Record<string, unknown> }): Record<string, string> {
  return (op.attributes ?? {}) as Record<string, string>;
}

/** Find the block embed op in a Delta */
function findBlockOp(
  ops: Array<{ insert: unknown; attributes?: Record<string, unknown> }>,
): { insert: unknown; attributes?: Record<string, unknown> } | undefined {
  return ops.find(
    (op) => typeof op.insert === 'object' && op.insert !== null && 'block' in op.insert,
  );
}

// ============================================================================
// Helper: create Delta with a box block
// ============================================================================

function boxDelta(
  contentOps: Array<{ insert: unknown; attributes?: Record<string, unknown> }>,
  opAttrs?: Record<string, string>,
): Delta {
  return new Delta([
    {
      insert: {
        block: {
          type: 'box',
          content: { ops: contentOps },
        },
      },
      ...(opAttrs ? { attributes: opAttrs } : {}),
    },
    { insert: '\n' },
  ]);
}

// ============================================================================
// Schema Validation
// ============================================================================

describe('BoxBlockHandler: validate', () => {
  it('validates box with content', () => {
    const data: BoxBlockData = {
      type: 'box',
      content: { ops: [{ insert: 'Hello\n' }] },
    };
    expect(boxBlockHandler.validate(data)).toBe(true);
  });

  it('validates box with rich content', () => {
    const data: BoxBlockData = {
      type: 'box',
      content: {
        ops: [{ insert: 'Bold', attributes: { bold: true } }, { insert: ' text\n' }],
      },
    };
    expect(boxBlockHandler.validate(data)).toBe(true);
  });

  it('rejects missing type', () => {
    const data = {
      content: { ops: [{ insert: 'Hello\n' }] },
    } as unknown as BoxBlockData;
    expect(boxBlockHandler.validate(data)).toBe(false);
  });

  it('rejects wrong type', () => {
    const data = {
      type: 'alert',
      content: { ops: [{ insert: 'Hello\n' }] },
    } as unknown as BoxBlockData;
    expect(boxBlockHandler.validate(data)).toBe(false);
  });

  it('rejects missing content', () => {
    const data = {
      type: 'box',
    } as unknown as BoxBlockData;
    expect(boxBlockHandler.validate(data)).toBe(false);
  });

  it('rejects empty ops', () => {
    const data: BoxBlockData = {
      type: 'box',
      content: { ops: [] },
    };
    expect(boxBlockHandler.validate(data)).toBe(false);
  });

  it('rejects null data', () => {
    expect(boxBlockHandler.validate(null as unknown as BoxBlockData)).toBe(false);
  });
});

// ============================================================================
// getNestedDeltas / setNestedDeltas
// ============================================================================

describe('BoxBlockHandler: getNestedDeltas / setNestedDeltas', () => {
  it('extracts and replaces nested Delta', () => {
    const data: BoxBlockData = {
      type: 'box',
      content: { ops: [{ insert: 'Original\n' }] },
    };

    const deltas = boxBlockHandler.getNestedDeltas!(data);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toEqual([{ insert: 'Original\n' }]);

    const updated = boxBlockHandler.setNestedDeltas!(data, [[{ insert: 'Replaced\n' }]]);
    expect(updated.content.ops).toEqual([{ insert: 'Replaced\n' }]);
    expect(updated.type).toBe('box');
  });
});

// ============================================================================
// Delta → HTML
// ============================================================================

describe('Box: Delta → HTML', () => {
  it('renders float left with dimensions', () => {
    const delta = boxDelta([{ insert: 'Sidebar\n' }], {
      float: 'left',
      width: '200px',
      height: '300px',
    });
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('class="inline-box"');
    expect(html).toContain('data-float="left"');
    expect(html).toContain('width: 200px');
    expect(html).toContain('height: 300px');
    expect(html).toContain('Sidebar');
  });

  it('renders float right', () => {
    const delta = boxDelta([{ insert: 'Note\n' }], {
      float: 'right',
      width: '30%',
    });
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('data-float="right"');
    expect(html).toContain('width: 30%');
    expect(html).toContain('Note');
  });

  it('renders center (no wrapping)', () => {
    const delta = boxDelta([{ insert: 'Centered\n' }], {
      float: 'center',
      width: '400px',
      height: '200px',
    });
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('data-float="center"');
    expect(html).toContain('width: 400px');
  });

  it('renders with overflow hidden', () => {
    const delta = boxDelta([{ insert: 'Clipped\n' }], {
      float: 'left',
      width: '200px',
      height: '100px',
      overflow: 'hidden',
    });
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('data-overflow="hidden"');
  });

  it('defaults to float left when no op attributes', () => {
    const delta = boxDelta([{ insert: 'Default\n' }]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('data-float="left"');
    expect(html).toContain('Default');
  });

  it('does not add data-overflow when auto (default)', () => {
    const delta = boxDelta([{ insert: 'Content\n' }], {
      float: 'left',
      overflow: 'auto',
    });
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).not.toContain('data-overflow');
  });

  it('does not add style when no width/height', () => {
    const delta = boxDelta([{ insert: 'Content\n' }], { float: 'right' });
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).not.toContain('style=');
  });

  it('renders rich content inside box', () => {
    const delta = boxDelta(
      [
        { insert: 'Title', attributes: { bold: true } },
        { insert: '\n', attributes: { header: 3 } },
        { insert: 'Paragraph text\n' },
      ],
      { float: 'left', width: '250px' },
    );
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('<h3><strong>Title</strong></h3>');
    expect(html).toContain('Paragraph text');
    expect(html).toContain('class="inline-box"');
  });

  it('skips box without blockHandlers', () => {
    const delta = boxDelta([{ insert: 'Content\n' }], { float: 'left' });
    const html = deltaToHtml(delta, {});
    expect(html).not.toContain('inline-box');
  });
});

// ============================================================================
// HTML → Delta
// ============================================================================

describe('Box: HTML → Delta', () => {
  it('parses inline-box with float left', () => {
    const html =
      '<div class="inline-box" data-float="left" style="width: 200px; height: 300px"><p>Content</p></div>';
    const delta = htmlToDelta(html, { blockHandlers });

    const blockOp = findBlockOp(delta.ops as InsertOp[]);
    expect(blockOp).toBeDefined();

    const block = (blockOp!.insert as { block: BoxBlockData }).block;
    expect(block.type).toBe('box');
    expect(block.content.ops.length).toBeGreaterThan(0);

    const attrs = getOpAttrs(blockOp!);
    expect(attrs.float).toBe('left');
    expect(attrs.width).toBe('200px');
    expect(attrs.height).toBe('300px');
  });

  it('parses inline-box with float right and overflow', () => {
    const html =
      '<div class="inline-box" data-float="right" data-overflow="hidden" style="width: 30%"><p>Note</p></div>';
    const delta = htmlToDelta(html, { blockHandlers });

    const blockOp = findBlockOp(delta.ops as InsertOp[]);
    expect(blockOp).toBeDefined();
    const attrs = getOpAttrs(blockOp!);
    expect(attrs.float).toBe('right');
    expect(attrs.overflow).toBe('hidden');
    expect(attrs.width).toBe('30%');
  });

  it('parses inline-box with center float', () => {
    const html =
      '<div class="inline-box" data-float="center" style="width: 400px; height: 200px"><p>Centered</p></div>';
    const delta = htmlToDelta(html, { blockHandlers });

    const blockOp = findBlockOp(delta.ops as InsertOp[]);
    expect(blockOp).toBeDefined();
    const attrs = getOpAttrs(blockOp!);
    expect(attrs.float).toBe('center');
  });

  it('parses box without blockHandlers as plain content', () => {
    const html = '<div class="inline-box" data-float="left"><p>Fallback</p></div>';
    const delta = htmlToDelta(html, {});
    // Without blockHandlers, content is parsed as normal text
    const text = (delta.ops as InsertOp[])
      .map((op): string => (typeof op.insert === 'string' ? (op.insert) : ''))
      .join('');
    expect(text).toContain('Fallback');
  });
});

// ============================================================================
// Delta → Markdown
// ============================================================================

describe('Box: Delta → Markdown', () => {
  (runTests ? it : it.skip)('outputs HTML fallback in Markdown', () => {
    const delta = boxDelta([{ insert: 'Sidebar content\n' }], {
      float: 'left',
      width: '200px',
      height: '300px',
    });
    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('<div');
    expect(md).toContain('inline-box');
    expect(md).toContain('Sidebar content');
  });

  (runTests ? it : it.skip)('includes data-float and dimensions in Markdown HTML fallback', () => {
    const delta = boxDelta([{ insert: 'Box content\n' }], {
      float: 'right',
      width: '250px',
      height: '150px',
    });
    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('data-float="right"');
    expect(md).toContain('width: 250px');
    expect(md).toContain('height: 150px');
  });
});

// ============================================================================
// Roundtrip: Delta → HTML → Delta
// ============================================================================

describe('Box: Roundtrip', () => {
  it('roundtrip float left with dimensions', () => {
    const original = boxDelta([{ insert: 'Left box\n' }], {
      float: 'left',
      width: '200px',
      height: '300px',
    });
    const html = deltaToHtml(original, { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });

    const blockOp = findBlockOp(restored.ops as InsertOp[]);
    expect(blockOp).toBeDefined();

    const block = (blockOp!.insert as { block: BoxBlockData }).block;
    expect(block.type).toBe('box');

    const attrs = getOpAttrs(blockOp!);
    expect(attrs.float).toBe('left');
    expect(attrs.width).toBe('200px');
    expect(attrs.height).toBe('300px');
  });

  it('roundtrip float right', () => {
    const original = boxDelta([{ insert: 'Right box\n' }], {
      float: 'right',
      width: '30%',
    });
    const html = deltaToHtml(original, { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });

    const blockOp = findBlockOp(restored.ops as InsertOp[]);
    const attrs = getOpAttrs(blockOp!);
    expect(attrs.float).toBe('right');
    expect(attrs.width).toBe('30%');
  });

  it('roundtrip center', () => {
    const original = boxDelta([{ insert: 'Center box\n' }], {
      float: 'center',
      width: '400px',
      height: '200px',
    });
    const html = deltaToHtml(original, { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });

    const blockOp = findBlockOp(restored.ops as InsertOp[]);
    const attrs = getOpAttrs(blockOp!);
    expect(attrs.float).toBe('center');
  });

  it('roundtrip with overflow hidden', () => {
    const original = boxDelta([{ insert: 'Clipped\n' }], {
      float: 'left',
      width: '200px',
      height: '100px',
      overflow: 'hidden',
    });
    const html = deltaToHtml(original, { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });

    const blockOp = findBlockOp(restored.ops as InsertOp[]);
    const attrs = getOpAttrs(blockOp!);
    expect(attrs.overflow).toBe('hidden');
  });

  it('roundtrip with rich content', () => {
    const original = boxDelta(
      [
        { insert: 'Title', attributes: { bold: true } },
        { insert: '\n', attributes: { header: 2 } },
        { insert: 'Paragraph\n' },
      ],
      { float: 'left', width: '250px' },
    );
    const html = deltaToHtml(original, { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });

    const blockOp = findBlockOp(restored.ops as InsertOp[]);
    expect(blockOp).toBeDefined();

    const block = (blockOp!.insert as { block: BoxBlockData }).block;
    expect(block.type).toBe('box');
    // Content should contain bold text and header
    const textContent = block.content.ops
      .filter((op): op is InsertOp & { insert: string } => 'insert' in op && typeof op.insert === 'string')
      .map((op) => op.insert)
      .join('');
    expect(textContent).toContain('Title');
    expect(textContent).toContain('Paragraph');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Box: Edge Cases', () => {
  it('handles minimal content (only newline)', () => {
    const delta = boxDelta([{ insert: '\n' }], { float: 'left', width: '100px' });
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('class="inline-box"');
  });

  it('box with surrounding text', () => {
    const delta = new Delta([
      { insert: 'Before the box.\n' },
      {
        insert: {
          block: {
            type: 'box',
            content: { ops: [{ insert: 'Inside box\n' }] },
          },
        },
        attributes: { float: 'left', width: '200px' },
      },
      { insert: '\n' },
      { insert: 'Text wrapping around the box. This is a sample text.\n' },
    ]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('Before the box');
    expect(html).toContain('class="inline-box"');
    expect(html).toContain('Inside box');
    expect(html).toContain('Text wrapping around');
  });

  it('multiple boxes in sequence', () => {
    const delta = new Delta([
      {
        insert: { block: { type: 'box', content: { ops: [{ insert: 'Box 1\n' }] } } },
        attributes: { float: 'left', width: '150px' },
      },
      { insert: '\n' },
      {
        insert: { block: { type: 'box', content: { ops: [{ insert: 'Box 2\n' }] } } },
        attributes: { float: 'right', width: '150px' },
      },
      { insert: '\n' },
    ]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('Box 1');
    expect(html).toContain('Box 2');
    // Both boxes rendered
    const matches = html.match(/inline-box/g);
    expect(matches).toHaveLength(2);
  });
});
