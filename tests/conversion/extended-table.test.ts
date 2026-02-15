import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';
import type { Op } from '@scrider/delta';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { deltaToMarkdown } from '../../src/conversion/markdown/delta-to-markdown';
import { createDefaultBlockHandlers, createDefaultRegistry } from '../../src/schema/defaults';
import { tableBlockHandler } from '../../src/schema/blocks/table';
import type { TableBlockData } from '../../src/schema/blocks/table';

/** Helper: create a Delta with a single block embed */
function tableEmbed(data: TableBlockData): Delta {
  return new Delta([{ insert: { block: data } }]);
}

describe('Extended Table: Delta → HTML', () => {
  const blockHandlers = createDefaultBlockHandlers();

  describe('basic rendering', () => {
    it('should render a simple 2×2 table', () => {
      const delta = tableEmbed({
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: 'A\n' }] },
          '0:1': { ops: [{ insert: 'B\n' }] },
          '1:0': { ops: [{ insert: 'C\n' }] },
          '1:1': { ops: [{ insert: 'D\n' }] },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).toContain('<table>');
      expect(html).toContain('</table>');
      expect(html).toContain('<tbody>');
      expect(html).toContain('<td>');
      expect(html).toContain('</td>');
      // No thead — no headerRows
      expect(html).not.toContain('<thead>');
    });

    it('should render a 1×1 table', () => {
      const delta = tableEmbed({
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: 'Solo\n' }] },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).toContain('<table>');
      expect(html).toContain('<td>');
      expect(html).toContain('Solo');
    });
  });

  describe('header rows', () => {
    it('should render headerRows as <thead> with <th>', () => {
      const delta = tableEmbed({
        type: 'table',
        headerRows: 1,
        cells: {
          '0:0': { ops: [{ insert: 'Name\n' }] },
          '0:1': { ops: [{ insert: 'Age\n' }] },
          '1:0': { ops: [{ insert: 'Alice\n' }] },
          '1:1': { ops: [{ insert: '30\n' }] },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).toContain('<thead>');
      expect(html).toContain('<th>');
      expect(html).toContain('</thead>');
      expect(html).toContain('<tbody>');
      expect(html).toContain('<td>');
    });

    it('should render multiple header rows', () => {
      const delta = tableEmbed({
        type: 'table',
        headerRows: 2,
        cells: {
          '0:0': { ops: [{ insert: 'H1\n' }] },
          '1:0': { ops: [{ insert: 'H2\n' }] },
          '2:0': { ops: [{ insert: 'D1\n' }] },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      // Two <th> rows inside <thead>
      const thMatches = html.match(/<th>/g);
      expect(thMatches).toHaveLength(2);
    });
  });

  describe('colspan and rowspan', () => {
    it('should render colspan', () => {
      const delta = tableEmbed({
        type: 'table',
        headerRows: 1,
        cells: {
          '0:0': { ops: [{ insert: 'Merged\n' }], colspan: 2 },
          '0:1': null,
          '1:0': { ops: [{ insert: 'A\n' }] },
          '1:1': { ops: [{ insert: 'B\n' }] },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).toContain('colspan="2"');
      // The null cell should not produce a <td>
      const tdThCount = (html.match(/<(td|th)[> ]/g) ?? []).length;
      expect(tdThCount).toBe(3); // 1 merged header + 2 body cells
    });

    it('should render rowspan', () => {
      const delta = tableEmbed({
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: 'Span\n' }], rowspan: 2 },
          '0:1': { ops: [{ insert: 'B\n' }] },
          '1:0': null,
          '1:1': { ops: [{ insert: 'D\n' }] },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).toContain('rowspan="2"');
    });

    it('should render colspan + rowspan combined', () => {
      const delta = tableEmbed({
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: 'Big\n' }], colspan: 2, rowspan: 2 },
          '0:1': null,
          '1:0': null,
          '1:1': null,
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).toContain('colspan="2"');
      expect(html).toContain('rowspan="2"');
      // Only 1 cell rendered
      const tdCount = (html.match(/<td[> ]/g) ?? []).length;
      expect(tdCount).toBe(1);
    });
  });

  describe('colWidths', () => {
    it('should render colgroup with percent widths', () => {
      const delta = tableEmbed({
        type: 'table',
        colWidths: [40, 60],
        cells: {
          '0:0': { ops: [{ insert: 'A\n' }] },
          '0:1': { ops: [{ insert: 'B\n' }] },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).toContain('<colgroup>');
      expect(html).toContain('width: 40%');
      expect(html).toContain('width: 60%');
    });
  });

  describe('colAligns', () => {
    it('should render column alignment', () => {
      const delta = tableEmbed({
        type: 'table',
        colAligns: ['left', 'center', 'right'],
        cells: {
          '0:0': { ops: [{ insert: 'L\n' }] },
          '0:1': { ops: [{ insert: 'C\n' }] },
          '0:2': { ops: [{ insert: 'R\n' }] },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      // left is default, not rendered
      expect(html).not.toContain('text-align: left');
      expect(html).toContain('text-align: center');
      expect(html).toContain('text-align: right');
    });
  });

  describe('rich content in cells', () => {
    it('should render bold text in cells', () => {
      const delta = tableEmbed({
        type: 'table',
        cells: {
          '0:0': {
            ops: [{ insert: 'bold', attributes: { bold: true } }, { insert: '\n' }],
          },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).toContain('<strong>bold</strong>');
    });

    it('should render lists in cells', () => {
      const delta = tableEmbed({
        type: 'table',
        cells: {
          '0:0': {
            ops: [
              { insert: 'Item 1' },
              { insert: '\n', attributes: { list: 'bullet' } },
              { insert: 'Item 2' },
              { insert: '\n', attributes: { list: 'bullet' } },
            ],
          },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>Item 1</li>');
      expect(html).toContain('<li>Item 2</li>');
    });

    it('should render images in cells', () => {
      const delta = tableEmbed({
        type: 'table',
        cells: {
          '0:0': {
            ops: [{ insert: { image: 'photo.png' } }, { insert: '\n' }],
          },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).toContain('<img');
      expect(html).toContain('photo.png');
    });
  });

  describe('empty cells', () => {
    it('should render empty cells', () => {
      const delta = tableEmbed({
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: 'A\n' }] },
          '0:1': { ops: [{ insert: '\n' }] }, // empty cell
        },
      });

      const html = deltaToHtml(delta, { blockHandlers });
      // Two cells should be rendered
      const tdCount = (html.match(/<td>/g) ?? []).length;
      expect(tdCount).toBe(2);
    });
  });

  describe('pretty printing', () => {
    it('should produce indented output with pretty: true', () => {
      const delta = tableEmbed({
        type: 'table',
        headerRows: 1,
        cells: {
          '0:0': { ops: [{ insert: 'H\n' }] },
          '1:0': { ops: [{ insert: 'D\n' }] },
        },
      });

      const html = deltaToHtml(delta, { blockHandlers, pretty: true });
      expect(html).toContain('  <thead>\n');
      expect(html).toContain('      <th>');
      expect(html).toContain('  </thead>\n');
    });
  });

  describe('graceful fallback', () => {
    it('should produce empty string for block embed without blockHandlers', () => {
      const delta = tableEmbed({
        type: 'table',
        cells: { '0:0': { ops: [{ insert: 'A\n' }] } },
      });

      // No blockHandlers passed
      const html = deltaToHtml(delta);
      // Block embed should be ignored — no table rendered
      expect(html).not.toContain('<table>');
    });

    it('should produce empty string for unknown block type', () => {
      const delta = new Delta([
        {
          insert: {
            block: { type: 'unknown-type', data: 123 },
          },
        },
      ]);

      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).not.toContain('<table>');
      expect(html).toBe('');
    });
  });

  describe('block embed is not wrapped in <p>', () => {
    it('should render block embed directly, not inside <p>', () => {
      // Block embed needs its own \n to terminate the line (like divider)
      const delta = new Delta([
        { insert: 'Before\n' },
        { insert: { block: { type: 'table', cells: { '0:0': { ops: [{ insert: 'A\n' }] } } } } },
        { insert: '\nAfter\n' },
      ]);

      const html = deltaToHtml(delta, { blockHandlers });
      // Table should not be inside a <p>
      expect(html).not.toContain('<p><table>');
      expect(html).toContain('<table>');
      expect(html).toContain('<p>Before</p>');
      expect(html).toContain('<p>After</p>');
    });
  });
});

// ============================================================================
// HTML → Delta (fromHtml)
// ============================================================================

describe('Extended Table: HTML → Delta', () => {
  const blockHandlers = createDefaultBlockHandlers();

  /** Extract the block embed data from a Delta */
  function extractBlockData(delta: Delta): TableBlockData | null {
    for (const op of delta.ops) {
      if (typeof op.insert === 'object' && op.insert !== null && 'block' in op.insert) {
        return (op.insert as Record<string, unknown>).block as TableBlockData;
      }
    }
    return null;
  }

  describe('basic parsing', () => {
    it('should parse a simple 2×2 table', () => {
      const html =
        '<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.type).toBe('table');
      expect(Object.keys(data!.cells)).toHaveLength(4);

      // Check cell content — each cell should have ops with the text
      const cellA = data!.cells['0:0'];
      expect(cellA).not.toBeNull();
      expect(
        cellA!.ops.some(
          (op: Op) => typeof op.insert === 'string' && (op.insert as string).includes('A'),
        ),
      ).toBe(true);
    });

    it('should parse a 1×1 table', () => {
      const html = '<table><tr><td>Solo</td></tr></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.type).toBe('table');
      expect(Object.keys(data!.cells)).toHaveLength(1);
      expect(data!.cells['0:0']).not.toBeNull();
    });

    it('should parse table without explicit tbody', () => {
      const html = '<table><tr><td>A</td></tr><tr><td>B</td></tr></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(Object.keys(data!.cells)).toHaveLength(2);
    });
  });

  describe('header rows', () => {
    it('should parse <thead> as headerRows', () => {
      const html =
        '<table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>Alice</td><td>30</td></tr></tbody></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.headerRows).toBe(1);
    });

    it('should parse multiple header rows', () => {
      const html =
        '<table><thead><tr><th>H1</th></tr><tr><th>H2</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.headerRows).toBe(2);
    });

    it('should not set headerRows when no <thead>', () => {
      const html = '<table><tbody><tr><td>A</td></tr></tbody></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.headerRows).toBeUndefined();
    });
  });

  describe('colspan and rowspan', () => {
    it('should parse colspan', () => {
      const html =
        '<table><tr><td colspan="2">Merged</td></tr><tr><td>A</td><td>B</td></tr></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.cells['0:0']).not.toBeNull();
      expect(data!.cells['0:0']!.colspan).toBe(2);
      expect(data!.cells['0:1']).toBeNull(); // merged
      expect(data!.cells['1:0']).not.toBeNull();
      expect(data!.cells['1:1']).not.toBeNull();
    });

    it('should parse rowspan', () => {
      const html = '<table><tr><td rowspan="2">Span</td><td>B</td></tr><tr><td>D</td></tr></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.cells['0:0']).not.toBeNull();
      expect(data!.cells['0:0']!.rowspan).toBe(2);
      expect(data!.cells['1:0']).toBeNull(); // merged by rowspan
      expect(data!.cells['0:1']).not.toBeNull();
      expect(data!.cells['1:1']).not.toBeNull();
    });

    it('should parse colspan + rowspan combined', () => {
      const html =
        '<table><tr><td colspan="2" rowspan="2">Big</td><td>C</td></tr><tr><td>F</td></tr><tr><td>G</td><td>H</td><td>I</td></tr></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.cells['0:0']!.colspan).toBe(2);
      expect(data!.cells['0:0']!.rowspan).toBe(2);
      expect(data!.cells['0:1']).toBeNull();
      expect(data!.cells['1:0']).toBeNull();
      expect(data!.cells['1:1']).toBeNull();
    });
  });

  describe('colWidths', () => {
    it('should parse colWidths from <colgroup>', () => {
      const html =
        '<table><colgroup><col style="width: 30%"><col style="width: 70%"></colgroup><tbody><tr><td>A</td><td>B</td></tr></tbody></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.colWidths).toEqual([30, 70]);
    });

    it('should not set colWidths when no <colgroup>', () => {
      const html = '<table><tr><td>A</td></tr></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.colWidths).toBeUndefined();
    });
  });

  describe('colAligns', () => {
    it('should parse colAligns from cell styles', () => {
      const html =
        '<table><tr><td style="text-align: center">A</td><td style="text-align: right">B</td></tr></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.colAligns).toEqual(['center', 'right']);
    });

    it('should not set colAligns when all default', () => {
      const html = '<table><tr><td>A</td><td>B</td></tr></table>';
      const delta = htmlToDelta(html, { blockHandlers });
      const data = extractBlockData(delta);

      expect(data).not.toBeNull();
      expect(data!.colAligns).toBeUndefined();
    });
  });

  describe('Simple Table fallback', () => {
    it('should parse table as Simple Table when no blockHandlers', () => {
      const html = '<table><tr><td>A</td><td>B</td></tr></table>';
      const delta = htmlToDelta(html); // No blockHandlers

      // Should produce Simple Table format (linear block attributes)
      const blockData = extractBlockData(delta);
      expect(blockData).toBeNull(); // Not a block embed

      // Should have table-row, table-col attributes
      const ops = delta.ops;
      const hasTableRow = ops.some(
        (op: Op) =>
          typeof op.insert === 'string' &&
          op.insert === '\n' &&
          (op.attributes as Record<string, unknown> | undefined)?.['table-row'] !== undefined,
      );
      expect(hasTableRow).toBe(true);
    });
  });
});

// ============================================================================
// Roundtrip: Delta → HTML → Delta
// ============================================================================

describe('Extended Table: Roundtrip', () => {
  const blockHandlers = createDefaultBlockHandlers();

  /** Extract block data from Delta for comparison */
  function extractBlockData(delta: Delta): TableBlockData | null {
    for (const op of delta.ops) {
      if (typeof op.insert === 'object' && op.insert !== null && 'block' in op.insert) {
        return (op.insert as Record<string, unknown>).block as TableBlockData;
      }
    }
    return null;
  }

  it('should roundtrip a simple 2×2 table', () => {
    const original: TableBlockData = {
      type: 'table',
      cells: {
        '0:0': { ops: [{ insert: 'A\n' }] },
        '0:1': { ops: [{ insert: 'B\n' }] },
        '1:0': { ops: [{ insert: 'C\n' }] },
        '1:1': { ops: [{ insert: 'D\n' }] },
      },
    };

    const html = deltaToHtml(tableEmbed(original), { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });
    const restoredData = extractBlockData(restored);

    expect(restoredData).not.toBeNull();
    expect(restoredData!.type).toBe('table');
    expect(Object.keys(restoredData!.cells)).toHaveLength(4);
  });

  it('should roundtrip a table with headerRows', () => {
    const original: TableBlockData = {
      type: 'table',
      headerRows: 1,
      cells: {
        '0:0': { ops: [{ insert: 'Header\n' }] },
        '0:1': { ops: [{ insert: 'Header2\n' }] },
        '1:0': { ops: [{ insert: 'Data\n' }] },
        '1:1': { ops: [{ insert: 'Data2\n' }] },
      },
    };

    const html = deltaToHtml(tableEmbed(original), { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });
    const restoredData = extractBlockData(restored);

    expect(restoredData).not.toBeNull();
    expect(restoredData!.headerRows).toBe(1);
  });

  it('should roundtrip a table with colspan', () => {
    const original: TableBlockData = {
      type: 'table',
      cells: {
        '0:0': { ops: [{ insert: 'Merged\n' }], colspan: 2 },
        '0:1': null,
        '1:0': { ops: [{ insert: 'A\n' }] },
        '1:1': { ops: [{ insert: 'B\n' }] },
      },
    };

    const html = deltaToHtml(tableEmbed(original), { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });
    const restoredData = extractBlockData(restored);

    expect(restoredData).not.toBeNull();
    expect(restoredData!.cells['0:0']!.colspan).toBe(2);
    expect(restoredData!.cells['0:1']).toBeNull();
  });

  it('should roundtrip a table with colWidths', () => {
    const original: TableBlockData = {
      type: 'table',
      colWidths: [40, 60],
      cells: {
        '0:0': { ops: [{ insert: 'A\n' }] },
        '0:1': { ops: [{ insert: 'B\n' }] },
      },
    };

    const html = deltaToHtml(tableEmbed(original), { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });
    const restoredData = extractBlockData(restored);

    expect(restoredData).not.toBeNull();
    expect(restoredData!.colWidths).toEqual([40, 60]);
  });
});

// ============================================================================
// Delta → Markdown
// ============================================================================

describe('Extended Table: Delta → Markdown', () => {
  const blockHandlers = createDefaultBlockHandlers();

  it('should render simple Extended Table without headers as GFM with empty header row', () => {
    const delta = tableEmbed({
      type: 'table',
      cells: {
        '0:0': { ops: [{ insert: 'A\n' }] },
        '0:1': { ops: [{ insert: 'B\n' }] },
      },
    });

    const md = deltaToMarkdown(delta, { blockHandlers });
    // Should render as GFM with synthesized empty header row
    expect(md).not.toContain('<table>');
    expect(md).toContain('|   |   |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| A | B |');
  });

  it('should render Extended Table with colspan as HTML in Markdown', () => {
    const delta = tableEmbed({
      type: 'table',
      cells: {
        '0:0': { ops: [{ insert: 'Merged\n' }], colspan: 2 },
        '0:1': null,
        '1:0': { ops: [{ insert: 'A\n' }] },
        '1:1': { ops: [{ insert: 'B\n' }] },
      },
    });

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('colspan="2"');
  });

  it('should not render block embed without blockHandlers', () => {
    const delta = tableEmbed({
      type: 'table',
      cells: {
        '0:0': { ops: [{ insert: 'A\n' }] },
      },
    });

    const md = deltaToMarkdown(delta);
    // Without blockHandlers, block embed is unknown — skipped
    expect(md).not.toContain('<table>');
  });
});

// ============================================================================
// Delta → GFM Markdown (simple tables)
// ============================================================================

describe('Extended Table: Delta → GFM Markdown', () => {
  const blockHandlers = createDefaultBlockHandlers();

  it('should render simple table with header as GFM', () => {
    const delta = tableEmbed({
      type: 'table',
      headerRows: 1,
      cells: {
        '0:0': { ops: [{ insert: 'Name\n' }] },
        '0:1': { ops: [{ insert: 'Value\n' }] },
        '1:0': { ops: [{ insert: 'A\n' }] },
        '1:1': { ops: [{ insert: '1\n' }] },
      },
    });

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).not.toContain('<table>');
    expect(md).toContain('| Name | Value |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| A | 1 |');
  });

  it('should render GFM table with column alignments', () => {
    const delta = tableEmbed({
      type: 'table',
      headerRows: 1,
      colAligns: ['left', 'center', 'right'],
      cells: {
        '0:0': { ops: [{ insert: 'Left\n' }] },
        '0:1': { ops: [{ insert: 'Center\n' }] },
        '0:2': { ops: [{ insert: 'Right\n' }] },
        '1:0': { ops: [{ insert: 'A\n' }] },
        '1:1': { ops: [{ insert: 'B\n' }] },
        '1:2': { ops: [{ insert: 'C\n' }] },
      },
    });

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).not.toContain('<table>');
    expect(md).toContain('| :--- | :---: | ---: |');
  });

  it('should render GFM table with bold/italic in cells', () => {
    const delta = tableEmbed({
      type: 'table',
      headerRows: 1,
      cells: {
        '0:0': { ops: [{ insert: 'Header\n' }] },
        '1:0': { ops: [{ insert: 'bold', attributes: { bold: true } }, { insert: '\n' }] },
      },
    });

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).not.toContain('<table>');
    expect(md).toContain('**bold**');
  });

  it('should escape pipe characters in GFM cell content', () => {
    const delta = tableEmbed({
      type: 'table',
      headerRows: 1,
      cells: {
        '0:0': { ops: [{ insert: 'A|B\n' }] },
        '1:0': { ops: [{ insert: 'C\n' }] },
      },
    });

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('A\\|B');
  });

  it('should render table without headerRows as GFM with empty header', () => {
    const delta = tableEmbed({
      type: 'table',
      cells: {
        '0:0': { ops: [{ insert: 'A\n' }] },
        '0:1': { ops: [{ insert: 'B\n' }] },
        '1:0': { ops: [{ insert: 'C\n' }] },
        '1:1': { ops: [{ insert: 'D\n' }] },
      },
    });

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).not.toContain('<table>');
    const tableLines = md
      .trim()
      .split('\n')
      .filter((l) => l.startsWith('|'));
    expect(tableLines[0]).toBe('|   |   |'); // synthesized empty header
    expect(tableLines[1]).toBe('| --- | --- |'); // separator
    expect(tableLines[2]).toBe('| A | B |');
    expect(tableLines[3]).toBe('| C | D |');
  });

  it('should fall back to HTML for table with colspan', () => {
    const delta = tableEmbed({
      type: 'table',
      headerRows: 1,
      cells: {
        '0:0': { ops: [{ insert: 'Merged\n' }], colspan: 2 },
        '0:1': null,
        '1:0': { ops: [{ insert: 'A\n' }] },
        '1:1': { ops: [{ insert: 'B\n' }] },
      },
    });

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('<table>');
    expect(md).toContain('colspan="2"');
  });

  it('should fall back to HTML for table with rowspan', () => {
    const delta = tableEmbed({
      type: 'table',
      headerRows: 1,
      cells: {
        '0:0': { ops: [{ insert: 'Header\n' }] },
        '0:1': { ops: [{ insert: 'H2\n' }] },
        '1:0': { ops: [{ insert: 'Span\n' }], rowspan: 2 },
        '1:1': { ops: [{ insert: 'B\n' }] },
        '2:0': null,
        '2:1': { ops: [{ insert: 'C\n' }] },
      },
    });

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('<table>');
  });

  it('should fall back to HTML for table with colWidths', () => {
    const delta = tableEmbed({
      type: 'table',
      headerRows: 1,
      colWidths: [40, 60],
      cells: {
        '0:0': { ops: [{ insert: 'A\n' }] },
        '0:1': { ops: [{ insert: 'B\n' }] },
        '1:0': { ops: [{ insert: 'C\n' }] },
        '1:1': { ops: [{ insert: 'D\n' }] },
      },
    });

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('<table>');
  });

  it('should render 3×3 GFM table correctly', () => {
    const delta = tableEmbed({
      type: 'table',
      headerRows: 1,
      cells: {
        '0:0': { ops: [{ insert: 'Аспект\n' }] },
        '0:1': { ops: [{ insert: 'ООП\n' }] },
        '0:2': { ops: [{ insert: 'Функциональный\n' }] },
        '1:0': { ops: [{ insert: 'Память\n' }] },
        '1:1': { ops: [{ insert: 'Двойная\n' }] },
        '1:2': { ops: [{ insert: 'Только DOM\n' }] },
        '2:0': { ops: [{ insert: 'CPU\n' }] },
        '2:1': { ops: [{ insert: 'Высокая\n' }] },
        '2:2': { ops: [{ insert: 'Низкая\n' }] },
      },
    });

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).not.toContain('<table>');
    const lines = md.trim().split('\n');
    // Should contain header row, separator, and 2 data rows (+ potential blank lines)
    const tableLines = lines.filter((l) => l.startsWith('|'));
    expect(tableLines.length).toBe(4); // header + separator + 2 data rows
    expect(tableLines[0]).toBe('| Аспект | ООП | Функциональный |');
    expect(tableLines[1]).toBe('| --- | --- | --- |');
    expect(tableLines[2]).toBe('| Память | Двойная | Только DOM |');
    expect(tableLines[3]).toBe('| CPU | Высокая | Низкая |');
  });
});

// ============================================================================
// Normalize
// ============================================================================

describe('Extended Table: normalize', () => {
  const registry = createDefaultRegistry();

  it('should normalize nested Deltas in cells', () => {
    const data: TableBlockData = {
      type: 'table',
      cells: {
        '0:0': {
          ops: [{ insert: 'Hello' }, { insert: ' World' }, { insert: '\n' }],
        },
      },
    };

    const normalized = tableBlockHandler.normalize!(data, registry);
    // Normalized ops should merge adjacent text inserts
    expect(normalized.cells['0:0']).not.toBeNull();
    expect(normalized.cells['0:0']!.ops).toEqual([{ insert: 'Hello World\n' }]);
  });

  it('should preserve cells with already normalized ops', () => {
    const data: TableBlockData = {
      type: 'table',
      cells: {
        '0:0': { ops: [{ insert: 'Hello\n' }] },
      },
    };

    const normalized = tableBlockHandler.normalize!(data, registry);
    expect(normalized.cells['0:0']!.ops).toEqual([{ insert: 'Hello\n' }]);
  });

  it('should handle null cells in normalize', () => {
    const data: TableBlockData = {
      type: 'table',
      cells: {
        '0:0': { ops: [{ insert: 'A\n' }], colspan: 2 },
        '0:1': null,
      },
    };

    const normalized = tableBlockHandler.normalize!(data, registry);
    expect(normalized.cells['0:1']).toBeNull();
    expect(normalized.cells['0:0']!.ops).toEqual([{ insert: 'A\n' }]);
  });
});
