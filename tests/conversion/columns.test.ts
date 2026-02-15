/**
 * Columns Layout Conversion Tests
 *
 * Tests for columns block embed (multi-column layout):
 * - Schema validation (widths, columns array)
 * - Delta → HTML (<div class="columns columns-N">)
 * - HTML → Delta (parsing div.columns + div.column)
 * - Delta → Markdown (fallback to HTML)
 * - Roundtrip tests
 * - Edge cases (1 column, nested columns, rich content)
 */

import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { deltaToMarkdown } from '../../src/conversion/markdown/delta-to-markdown';
import { createDefaultBlockHandlers } from '../../src/schema/defaults';
import { columnsBlockHandler } from '../../src/schema/blocks/columns';
import type { ColumnsBlockData } from '../../src/schema/blocks/columns';

const blockHandlers = createDefaultBlockHandlers();

// ============================================================================
// Helper: create Delta with a columns block
// ============================================================================

function columnsDelta(
  columns: Array<Array<{ insert: unknown; attributes?: Record<string, unknown> }>>,
  widths?: number[],
): Delta {
  const data: ColumnsBlockData = {
    type: 'columns',
    columns: columns.map((ops) => ({ ops })),
  };
  if (widths) {
    data.widths = widths;
  }
  return new Delta([{ insert: { block: data } }, { insert: '\n' }]);
}

// ============================================================================
// Schema Validation
// ============================================================================

describe('ColumnsBlockHandler: validate', () => {
  it('validates 2 columns without widths', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [{ ops: [{ insert: 'A\n' }] }, { ops: [{ insert: 'B\n' }] }],
    };
    expect(columnsBlockHandler.validate(data)).toBe(true);
  });

  it('validates 3 columns without widths', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [
        { ops: [{ insert: 'A\n' }] },
        { ops: [{ insert: 'B\n' }] },
        { ops: [{ insert: 'C\n' }] },
      ],
    };
    expect(columnsBlockHandler.validate(data)).toBe(true);
  });

  it('validates 2 columns with widths summing to 100', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [{ ops: [{ insert: 'A\n' }] }, { ops: [{ insert: 'B\n' }] }],
      widths: [30, 70],
    };
    expect(columnsBlockHandler.validate(data)).toBe(true);
  });

  it('validates 3 columns with widths summing to ~100 (rounding tolerance)', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [
        { ops: [{ insert: 'A\n' }] },
        { ops: [{ insert: 'B\n' }] },
        { ops: [{ insert: 'C\n' }] },
      ],
      widths: [33.33, 33.33, 33.34],
    };
    expect(columnsBlockHandler.validate(data)).toBe(true);
  });

  it('rejects 1 column (minimum is 2, use Inline-Box for single container)', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [{ ops: [{ insert: 'Solo\n' }] }],
    };
    expect(columnsBlockHandler.validate(data)).toBe(false);
  });

  it('rejects empty columns array', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [],
    };
    expect(columnsBlockHandler.validate(data)).toBe(false);
  });

  it('rejects column with empty ops', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [{ ops: [{ insert: 'A\n' }] }, { ops: [] }],
    };
    expect(columnsBlockHandler.validate(data)).toBe(false);
  });

  it('rejects wrong block type', () => {
    const data = {
      type: 'not-columns',
      columns: [{ ops: [{ insert: '\n' }] }],
    } as unknown as ColumnsBlockData;
    expect(columnsBlockHandler.validate(data)).toBe(false);
  });

  it('rejects widths length mismatch', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [{ ops: [{ insert: 'A\n' }] }, { ops: [{ insert: 'B\n' }] }],
      widths: [100], // 1 width for 2 columns
    };
    expect(columnsBlockHandler.validate(data)).toBe(false);
  });

  it('rejects widths not summing to ~100', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [{ ops: [{ insert: 'A\n' }] }, { ops: [{ insert: 'B\n' }] }],
      widths: [30, 30], // sum = 60
    };
    expect(columnsBlockHandler.validate(data)).toBe(false);
  });

  it('rejects negative widths', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [{ ops: [{ insert: 'A\n' }] }, { ops: [{ insert: 'B\n' }] }],
      widths: [-30, 130],
    };
    expect(columnsBlockHandler.validate(data)).toBe(false);
  });

  it('rejects zero width', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [{ ops: [{ insert: 'A\n' }] }, { ops: [{ insert: 'B\n' }] }],
      widths: [0, 100],
    };
    expect(columnsBlockHandler.validate(data)).toBe(false);
  });
});

// ============================================================================
// Nested Deltas
// ============================================================================

describe('ColumnsBlockHandler: getNestedDeltas / setNestedDeltas', () => {
  it('returns all column ops via getNestedDeltas', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [{ ops: [{ insert: 'A\n' }] }, { ops: [{ insert: 'B\n' }] }],
    };
    const deltas = columnsBlockHandler.getNestedDeltas!(data);
    expect(deltas).toHaveLength(2);
    expect(deltas[0]).toEqual([{ insert: 'A\n' }]);
    expect(deltas[1]).toEqual([{ insert: 'B\n' }]);
  });

  it('replaces column ops via setNestedDeltas', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [{ ops: [{ insert: 'old A\n' }] }, { ops: [{ insert: 'old B\n' }] }],
      widths: [40, 60],
    };
    const updated = columnsBlockHandler.setNestedDeltas!(data, [
      [{ insert: 'new A\n' }],
      [{ insert: 'new B\n' }],
    ]);
    expect(updated.columns[0]!.ops).toEqual([{ insert: 'new A\n' }]);
    expect(updated.columns[1]!.ops).toEqual([{ insert: 'new B\n' }]);
    // widths preserved
    expect(updated.widths).toEqual([40, 60]);
  });
});

// ============================================================================
// Delta → HTML
// ============================================================================

describe('Columns: Delta → HTML', () => {
  it('renders 2 equal columns', () => {
    const delta = columnsDelta([[{ insert: 'Column A\n' }], [{ insert: 'Column B\n' }]]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('class="columns columns-2"');
    expect(html).toContain('class="column"');
    expect(html).toContain('Column A');
    expect(html).toContain('Column B');
    // No inline style for equal widths
    expect(html).not.toContain('grid-template-columns');
  });

  it('renders 3 equal columns', () => {
    const delta = columnsDelta([[{ insert: 'A\n' }], [{ insert: 'B\n' }], [{ insert: 'C\n' }]]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('class="columns columns-3"');
  });

  it('renders custom widths as grid-template-columns', () => {
    const delta = columnsDelta([[{ insert: 'Sidebar\n' }], [{ insert: 'Main\n' }]], [30, 70]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('grid-template-columns: 30% 70%');
  });

  it('renders rich content inside columns (bold, italic)', () => {
    const delta = columnsDelta([
      [{ insert: 'Normal and ' }, { insert: 'bold', attributes: { bold: true } }, { insert: '\n' }],
      [{ insert: 'Also ' }, { insert: 'italic', attributes: { italic: true } }, { insert: '\n' }],
    ]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('does not render columns without blockHandlers (graceful)', () => {
    const delta = columnsDelta([[{ insert: 'A\n' }], [{ insert: 'B\n' }]]);
    const html = deltaToHtml(delta, {});
    // Without blockHandlers, block embed is ignored
    expect(html).not.toContain('columns');
  });
});

// ============================================================================
// HTML → Delta
// ============================================================================

describe('Columns: HTML → Delta', () => {
  it('parses <div class="columns"> with 2 columns', () => {
    const html = `
      <div class="columns columns-2">
        <div class="column"><p>Content A</p></div>
        <div class="column"><p>Content B</p></div>
      </div>
    `;
    const delta = htmlToDelta(html, { blockHandlers });
    const blockOp = delta.ops.find(
      (op) =>
        typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert as Record<string, unknown>),
    );
    expect(blockOp).toBeDefined();
    const block = (blockOp!.insert as Record<string, unknown>).block as ColumnsBlockData;
    expect(block.type).toBe('columns');
    expect(block.columns).toHaveLength(2);
  });

  it('parses custom widths from grid-template-columns style', () => {
    const html = `
      <div class="columns columns-2" style="grid-template-columns: 30% 70%">
        <div class="column"><p>Sidebar</p></div>
        <div class="column"><p>Main</p></div>
      </div>
    `;
    const delta = htmlToDelta(html, { blockHandlers });
    const blockOp = delta.ops.find(
      (op) =>
        typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert as Record<string, unknown>),
    );
    const block = (blockOp!.insert as Record<string, unknown>).block as ColumnsBlockData;
    expect(block.widths).toEqual([30, 70]);
  });

  it('parses 3 columns without widths', () => {
    const html = `
      <div class="columns columns-3">
        <div class="column"><p>A</p></div>
        <div class="column"><p>B</p></div>
        <div class="column"><p>C</p></div>
      </div>
    `;
    const delta = htmlToDelta(html, { blockHandlers });
    const blockOp = delta.ops.find(
      (op) =>
        typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert as Record<string, unknown>),
    );
    const block = (blockOp!.insert as Record<string, unknown>).block as ColumnsBlockData;
    expect(block.type).toBe('columns');
    expect(block.columns).toHaveLength(3);
    expect(block.widths).toBeUndefined();
  });

  it('without blockHandlers processes children normally (fallback)', () => {
    const html = `
      <div class="columns columns-2">
        <div class="column"><p>Content A</p></div>
        <div class="column"><p>Content B</p></div>
      </div>
    `;
    const delta = htmlToDelta(html, {});
    // Without blockHandlers, should NOT produce block embed
    const blockOp = delta.ops.find(
      (op) =>
        typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert as Record<string, unknown>),
    );
    expect(blockOp).toBeUndefined();
    // But text should still be extracted
    const text = delta.ops
      .filter((op) => typeof op.insert === 'string')
      .map((op) => op.insert as string)
      .join('');
    expect(text).toContain('Content A');
    expect(text).toContain('Content B');
  });
});

// ============================================================================
// Delta → Markdown
// ============================================================================

describe('Columns: Delta → Markdown', () => {
  it('renders columns as HTML fallback in Markdown', () => {
    const delta = columnsDelta([[{ insert: 'Left\n' }], [{ insert: 'Right\n' }]]);
    const md = deltaToMarkdown(delta, { blockHandlers });
    // toMarkdown returns null → fallback to toHtml
    expect(md).toContain('<div class="columns columns-2"');
    expect(md).toContain('<div class="column"');
    expect(md).toContain('Left');
    expect(md).toContain('Right');
  });

  it('includes grid-template-columns in Markdown HTML fallback', () => {
    const delta = columnsDelta([[{ insert: 'A\n' }], [{ insert: 'B\n' }]], [25, 75]);
    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('grid-template-columns: 25% 75%');
  });
});

// ============================================================================
// Roundtrip Tests
// ============================================================================

describe('Columns: Roundtrip', () => {
  it('Delta → HTML → Delta preserves columns structure (equal widths)', () => {
    const original = columnsDelta([[{ insert: 'Alpha\n' }], [{ insert: 'Beta\n' }]]);
    const html = deltaToHtml(original, { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });

    const blockOp = restored.ops.find(
      (op) =>
        typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert as Record<string, unknown>),
    );
    expect(blockOp).toBeDefined();
    const block = (blockOp!.insert as Record<string, unknown>).block as ColumnsBlockData;
    expect(block.type).toBe('columns');
    expect(block.columns).toHaveLength(2);
  });

  it('Delta → HTML → Delta preserves custom widths', () => {
    const original = columnsDelta([[{ insert: 'Sidebar\n' }], [{ insert: 'Main\n' }]], [30, 70]);
    const html = deltaToHtml(original, { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });

    const blockOp = restored.ops.find(
      (op) =>
        typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert as Record<string, unknown>),
    );
    const block = (blockOp!.insert as Record<string, unknown>).block as ColumnsBlockData;
    expect(block.widths).toEqual([30, 70]);
  });

  it('Delta → HTML → Delta preserves rich content', () => {
    const original = columnsDelta([
      [{ insert: 'Has ' }, { insert: 'bold', attributes: { bold: true } }, { insert: '\n' }],
      [{ insert: 'Plain text\n' }],
    ]);
    const html = deltaToHtml(original, { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });

    const blockOp = restored.ops.find(
      (op) =>
        typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert as Record<string, unknown>),
    );
    const block = (blockOp!.insert as Record<string, unknown>).block as ColumnsBlockData;
    // First column should have bold op
    const hasBold = block.columns[0]!.ops.some(
      (op) => op.attributes && (op.attributes as Record<string, unknown>).bold === true,
    );
    expect(hasBold).toBe(true);
  });

  it('Delta → HTML → Delta preserves 3 columns', () => {
    const original = columnsDelta([
      [{ insert: 'One\n' }],
      [{ insert: 'Two\n' }],
      [{ insert: 'Three\n' }],
    ]);
    const html = deltaToHtml(original, { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });

    const blockOp = restored.ops.find(
      (op) =>
        typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert as Record<string, unknown>),
    );
    const block = (blockOp!.insert as Record<string, unknown>).block as ColumnsBlockData;
    expect(block.columns).toHaveLength(3);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Columns: Edge Cases', () => {
  it('handles empty column (ops with only newline)', () => {
    const data: ColumnsBlockData = {
      type: 'columns',
      columns: [{ ops: [{ insert: 'Content\n' }] }, { ops: [{ insert: '\n' }] }],
    };
    expect(columnsBlockHandler.validate(data)).toBe(true);

    const delta = new Delta([{ insert: { block: data } }, { insert: '\n' }]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('class="columns columns-2"');
  });

  it('columns mixed with other content', () => {
    const delta = new Delta([
      { insert: 'Before columns\n' },
      {
        insert: {
          block: {
            type: 'columns',
            columns: [{ ops: [{ insert: 'Left\n' }] }, { ops: [{ insert: 'Right\n' }] }],
          },
        },
      },
      { insert: '\n' },
      { insert: 'After columns\n' },
    ]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('Before columns');
    expect(html).toContain('class="columns columns-2"');
    expect(html).toContain('After columns');
  });

  it('1 column is ignored (invalid — minimum is 2)', () => {
    const delta = columnsDelta([[{ insert: 'Solo column\n' }]]);
    const html = deltaToHtml(delta, { blockHandlers });
    // Single column fails validation, block embed should be skipped
    expect(html).not.toContain('class="columns');
  });

  it('columns with header and list inside', () => {
    const delta = columnsDelta([
      [
        { insert: 'Features' },
        { insert: '\n', attributes: { header: 2 } },
        { insert: 'Item 1' },
        { insert: '\n', attributes: { list: 'bullet' } },
        { insert: 'Item 2' },
        { insert: '\n', attributes: { list: 'bullet' } },
      ],
      [{ insert: 'Simple text in column 2\n' }],
    ]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('<h2>Features</h2>');
    expect(html).toContain('<li>Item 1</li>');
    expect(html).toContain('<li>Item 2</li>');
    expect(html).toContain('Simple text in column 2');
  });
});
