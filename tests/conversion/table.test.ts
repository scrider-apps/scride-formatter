import { describe, it, expect } from 'vitest';
import { Delta } from '@scrider/delta';
import type { AttributeMap } from '@scrider/delta';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { deltaToMarkdown } from '../../src/conversion/markdown/delta-to-markdown';
import { markdownToDelta } from '../../src/conversion/markdown/markdown-to-delta';

/**
 * Helper: extract table cell ops (\n with table-row attribute)
 */
function getTableOps(delta: Delta): { attrs: AttributeMap }[] {
  return delta.ops
    .filter((op) => {
      const attrs = op.attributes as AttributeMap | undefined;
      return (
        typeof op.insert === 'string' &&
        op.insert === '\n' &&
        attrs != null &&
        typeof attrs['table-row'] === 'number'
      );
    })
    .map((op) => ({ attrs: op.attributes as AttributeMap }));
}

/**
 * Helper: create a simple 2×2 table Delta with headers
 */
function makeHeaderTable(): Delta {
  return new Delta()
    .insert('Name')
    .insert('\n', { 'table-row': 0, 'table-col': 0, 'table-header': true })
    .insert('Age')
    .insert('\n', { 'table-row': 0, 'table-col': 1, 'table-header': true })
    .insert('Alice')
    .insert('\n', { 'table-row': 1, 'table-col': 0 })
    .insert('30')
    .insert('\n', { 'table-row': 1, 'table-col': 1 });
}

/**
 * Helper: create a 2×2 table without headers
 */
function makeNoHeaderTable(): Delta {
  return new Delta()
    .insert('A1')
    .insert('\n', { 'table-row': 0, 'table-col': 0 })
    .insert('B1')
    .insert('\n', { 'table-row': 0, 'table-col': 1 })
    .insert('A2')
    .insert('\n', { 'table-row': 1, 'table-col': 0 })
    .insert('B2')
    .insert('\n', { 'table-row': 1, 'table-col': 1 });
}

describe('Simple Table', () => {
  // ─── Delta → HTML ──────────────────────────────────────────────────────

  describe('Delta → HTML', () => {
    it('renders a basic table with headers', () => {
      const delta = makeHeaderTable();
      const html = deltaToHtml(delta);

      expect(html).toContain('<table>');
      expect(html).toContain('<thead>');
      expect(html).toContain('<th>Name</th>');
      expect(html).toContain('<th>Age</th>');
      expect(html).toContain('</thead>');
      expect(html).toContain('<tbody>');
      expect(html).toContain('<td>Alice</td>');
      expect(html).toContain('<td>30</td>');
      expect(html).toContain('</tbody>');
      expect(html).toContain('</table>');
    });

    it('renders a table without headers (no thead)', () => {
      const delta = makeNoHeaderTable();
      const html = deltaToHtml(delta);

      expect(html).toContain('<table>');
      expect(html).not.toContain('<thead>');
      expect(html).toContain('<tbody>');
      expect(html).toContain('<td>A1</td>');
      expect(html).toContain('<td>B1</td>');
      expect(html).toContain('</table>');
    });

    it('renders column alignment', () => {
      const delta = new Delta()
        .insert('Left')
        .insert('\n', {
          'table-row': 0,
          'table-col': 0,
          'table-header': true,
          'table-col-align': 'left',
        })
        .insert('Center')
        .insert('\n', {
          'table-row': 0,
          'table-col': 1,
          'table-header': true,
          'table-col-align': 'center',
        })
        .insert('Right')
        .insert('\n', {
          'table-row': 0,
          'table-col': 2,
          'table-header': true,
          'table-col-align': 'right',
        })
        .insert('a')
        .insert('\n', { 'table-row': 1, 'table-col': 0, 'table-col-align': 'left' })
        .insert('b')
        .insert('\n', { 'table-row': 1, 'table-col': 1, 'table-col-align': 'center' })
        .insert('c')
        .insert('\n', { 'table-row': 1, 'table-col': 2, 'table-col-align': 'right' });

      const html = deltaToHtml(delta);

      // left is default — no style needed
      expect(html).toContain('<th>Left</th>');
      expect(html).toContain('<th style="text-align: center">Center</th>');
      expect(html).toContain('<th style="text-align: right">Right</th>');
      expect(html).toContain('<td style="text-align: center">b</td>');
      expect(html).toContain('<td style="text-align: right">c</td>');
    });

    it('renders inline formatting in cells', () => {
      const delta = new Delta()
        .insert('bold', { bold: true })
        .insert('\n', { 'table-row': 0, 'table-col': 0, 'table-header': true })
        .insert('italic', { italic: true })
        .insert('\n', { 'table-row': 0, 'table-col': 1, 'table-header': true })
        .insert('data')
        .insert('\n', { 'table-row': 1, 'table-col': 0 })
        .insert('link', { link: 'https://example.com' })
        .insert('\n', { 'table-row': 1, 'table-col': 1 });

      const html = deltaToHtml(delta);

      expect(html).toContain('<th><strong>bold</strong></th>');
      expect(html).toContain('<th><em>italic</em></th>');
      expect(html).toContain('<td><a href="https://example.com">link</a></td>');
    });

    it('renders empty cells', () => {
      const delta = new Delta()
        .insert('A')
        .insert('\n', { 'table-row': 0, 'table-col': 0 })
        .insert('\n', { 'table-row': 0, 'table-col': 1 }) // empty cell
        .insert('\n', { 'table-row': 1, 'table-col': 0 }) // empty cell
        .insert('D')
        .insert('\n', { 'table-row': 1, 'table-col': 1 });

      const html = deltaToHtml(delta);

      expect(html).toContain('<td>A</td>');
      expect(html).toContain('<td></td>');
      expect(html).toContain('<td>D</td>');
    });

    it('renders a single-column table', () => {
      const delta = new Delta()
        .insert('Header')
        .insert('\n', { 'table-row': 0, 'table-col': 0, 'table-header': true })
        .insert('Row 1')
        .insert('\n', { 'table-row': 1, 'table-col': 0 })
        .insert('Row 2')
        .insert('\n', { 'table-row': 2, 'table-col': 0 });

      const html = deltaToHtml(delta);

      expect(html).toContain('<table>');
      expect(html).toContain('<th>Header</th>');
      expect(html).toContain('<td>Row 1</td>');
      expect(html).toContain('<td>Row 2</td>');
    });

    it('renders table with pretty printing', () => {
      const delta = makeHeaderTable();
      const html = deltaToHtml(delta, { pretty: true });

      expect(html).toContain('<table>\n');
      expect(html).toContain('  <thead>\n');
      expect(html).toContain('      <th>Name</th>\n');
    });

    it('table is separate from surrounding paragraphs', () => {
      const delta = new Delta()
        .insert('Before\n')
        .insert('Cell')
        .insert('\n', { 'table-row': 0, 'table-col': 0 })
        .insert('After\n');

      const html = deltaToHtml(delta);

      expect(html).toBe(
        '<p>Before</p><table><tbody><tr><td>Cell</td></tr></tbody></table><p>After</p>',
      );
    });
  });

  // ─── HTML → Delta ──────────────────────────────────────────────────────

  describe('HTML → Delta', () => {
    it('parses a basic table with thead/tbody', () => {
      const html =
        '<table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>Alice</td><td>30</td></tr></tbody></table>';
      const delta = htmlToDelta(html);

      const tableOps = getTableOps(delta);
      expect(tableOps.length).toBe(4);

      // Check header
      expect(tableOps[0]!.attrs).toMatchObject({
        'table-row': 0,
        'table-col': 0,
        'table-header': true,
      });
      expect(tableOps[1]!.attrs).toMatchObject({
        'table-row': 0,
        'table-col': 1,
        'table-header': true,
      });

      // Check body
      expect(tableOps[2]!.attrs).toMatchObject({ 'table-row': 1, 'table-col': 0 });
      expect(tableOps[3]!.attrs).toMatchObject({ 'table-row': 1, 'table-col': 1 });
    });

    it('parses table without thead/tbody (direct tr)', () => {
      const html = '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>';
      const delta = htmlToDelta(html);

      const tableOps = getTableOps(delta);
      expect(tableOps.length).toBe(4);
      expect(tableOps[0]!.attrs['table-row']).toBe(0);
      expect(tableOps[2]!.attrs['table-row']).toBe(1);
    });

    it('parses th elements as table-header', () => {
      const html = '<table><tr><th>H1</th><th>H2</th></tr><tr><td>D1</td><td>D2</td></tr></table>';
      const delta = htmlToDelta(html);

      const tableOps = getTableOps(delta);
      expect(tableOps[0]!.attrs['table-header']).toBe(true);
      expect(tableOps[1]!.attrs['table-header']).toBe(true);
      expect(tableOps[2]!.attrs['table-header']).toBeUndefined();
    });

    it('parses text-align style on cells', () => {
      const html =
        '<table><tr><td style="text-align: center">Centered</td><td style="text-align: right">Right</td></tr></table>';
      const delta = htmlToDelta(html);

      const tableOps = getTableOps(delta);
      expect(tableOps[0]!.attrs['table-col-align']).toBe('center');
      expect(tableOps[1]!.attrs['table-col-align']).toBe('right');
    });

    it('parses inline formatting inside cells', () => {
      const html =
        '<table><tr><td><strong>Bold</strong></td><td><a href="https://example.com">Link</a></td></tr></table>';
      const delta = htmlToDelta(html);

      // Find the bold text op
      const boldOp = delta.ops.find((op) => {
        const a = op.attributes as AttributeMap | undefined;
        return typeof op.insert === 'string' && op.insert === 'Bold' && a?.bold;
      });
      expect(boldOp).toBeDefined();

      // Find the link op
      const linkOp = delta.ops.find((op) => {
        const a = op.attributes as AttributeMap | undefined;
        return typeof op.insert === 'string' && op.insert === 'Link' && a?.link;
      });
      expect(linkOp).toBeDefined();
      expect((linkOp?.attributes as AttributeMap | undefined)?.link).toBe('https://example.com');
    });
  });

  // ─── Delta → Markdown ──────────────────────────────────────────────────

  describe('Delta → Markdown', () => {
    it('renders a GFM table with headers', () => {
      const delta = makeHeaderTable();
      const md = deltaToMarkdown(delta);

      expect(md).toContain('| Name | Age |');
      expect(md).toContain('| --- | --- |');
      expect(md).toContain('| Alice | 30 |');
    });

    it('renders column alignment in separator', () => {
      const delta = new Delta()
        .insert('Left')
        .insert('\n', {
          'table-row': 0,
          'table-col': 0,
          'table-header': true,
          'table-col-align': 'left',
        })
        .insert('Center')
        .insert('\n', {
          'table-row': 0,
          'table-col': 1,
          'table-header': true,
          'table-col-align': 'center',
        })
        .insert('Right')
        .insert('\n', {
          'table-row': 0,
          'table-col': 2,
          'table-header': true,
          'table-col-align': 'right',
        })
        .insert('a')
        .insert('\n', { 'table-row': 1, 'table-col': 0 })
        .insert('b')
        .insert('\n', { 'table-row': 1, 'table-col': 1 })
        .insert('c')
        .insert('\n', { 'table-row': 1, 'table-col': 2 });

      const md = deltaToMarkdown(delta);

      expect(md).toContain('| Left | Center | Right |');
      expect(md).toContain('| :--- | :---: | ---: |');
    });

    it('renders inline formatting in Markdown cells', () => {
      const delta = new Delta()
        .insert('Header')
        .insert('\n', { 'table-row': 0, 'table-col': 0, 'table-header': true })
        .insert('bold', { bold: true })
        .insert('\n', { 'table-row': 1, 'table-col': 0 });

      const md = deltaToMarkdown(delta);
      expect(md).toContain('| **bold** |');
    });

    it('renders table without headers (synthetic empty header)', () => {
      const delta = makeNoHeaderTable();
      const md = deltaToMarkdown(delta);

      // Should have a header row (empty), separator, and body rows
      const lines = md.split('\n');
      const tableLines = lines.filter((l) => l.startsWith('|'));
      expect(tableLines.length).toBeGreaterThanOrEqual(4); // empty header + separator + 2 body rows
    });

    it('escapes pipe characters in cell content', () => {
      const delta = new Delta()
        .insert('a|b')
        .insert('\n', { 'table-row': 0, 'table-col': 0, 'table-header': true })
        .insert('c')
        .insert('\n', { 'table-row': 1, 'table-col': 0 });

      const md = deltaToMarkdown(delta);
      expect(md).toContain('a\\|b');
    });
  });

  // ─── Markdown → Delta ──────────────────────────────────────────────────

  describe('Markdown → Delta', () => {
    it('parses a GFM table', async () => {
      const md = '| Name | Age |\n|------|-----|\n| Alice | 30 |\n';
      const delta = await markdownToDelta(md);

      const tableOps = getTableOps(delta);
      expect(tableOps.length).toBe(4); // 2 header + 2 body

      // Header
      expect(tableOps[0]!.attrs).toMatchObject({
        'table-row': 0,
        'table-col': 0,
        'table-header': true,
      });
      expect(tableOps[1]!.attrs).toMatchObject({
        'table-row': 0,
        'table-col': 1,
        'table-header': true,
      });

      // Body
      expect(tableOps[2]!.attrs).toMatchObject({ 'table-row': 1, 'table-col': 0 });
      expect(tableOps[3]!.attrs).toMatchObject({ 'table-row': 1, 'table-col': 1 });

      // Check content
      const nameOp = delta.ops.find((op) => typeof op.insert === 'string' && op.insert === 'Name');
      expect(nameOp).toBeDefined();

      const aliceOp = delta.ops.find(
        (op) => typeof op.insert === 'string' && op.insert === 'Alice',
      );
      expect(aliceOp).toBeDefined();
    });

    it('parses GFM table with alignment', async () => {
      const md = '| Left | Center | Right |\n|:-----|:------:|------:|\n| a | b | c |\n';
      const delta = await markdownToDelta(md);

      const tableOps = getTableOps(delta);

      // Header row alignment
      expect(tableOps[0]!.attrs['table-col-align']).toBe('left');
      expect(tableOps[1]!.attrs['table-col-align']).toBe('center');
      expect(tableOps[2]!.attrs['table-col-align']).toBe('right');
    });

    it('parses inline formatting in GFM table cells', async () => {
      const md = '| **Bold** | _Italic_ |\n|----------|----------|\n| `code` | [link](url) |\n';
      const delta = await markdownToDelta(md);

      const boldOp = delta.ops.find((op) => {
        const a = op.attributes as AttributeMap | undefined;
        return typeof op.insert === 'string' && op.insert === 'Bold' && a?.bold;
      });
      expect(boldOp).toBeDefined();

      const italicOp = delta.ops.find((op) => {
        const a = op.attributes as AttributeMap | undefined;
        return typeof op.insert === 'string' && op.insert === 'Italic' && a?.italic;
      });
      expect(italicOp).toBeDefined();

      const codeOp = delta.ops.find((op) => {
        const a = op.attributes as AttributeMap | undefined;
        return typeof op.insert === 'string' && op.insert === 'code' && a?.code;
      });
      expect(codeOp).toBeDefined();

      const linkOp = delta.ops.find((op) => {
        const a = op.attributes as AttributeMap | undefined;
        return typeof op.insert === 'string' && op.insert === 'link' && a?.link === 'url';
      });
      expect(linkOp).toBeDefined();
    });
  });

  // ─── Roundtrip Tests ──────────────────────────────────────────────────

  describe('Roundtrip', () => {
    it('Delta → HTML → Delta preserves table structure', () => {
      const original = makeHeaderTable();
      const html = deltaToHtml(original);
      const restored = htmlToDelta(html);

      const origTableOps = getTableOps(original);
      const restoredTableOps = getTableOps(restored);

      expect(restoredTableOps.length).toBe(origTableOps.length);

      for (let i = 0; i < origTableOps.length; i++) {
        expect(restoredTableOps[i]!.attrs['table-row']).toBe(origTableOps[i]!.attrs['table-row']);
        expect(restoredTableOps[i]!.attrs['table-col']).toBe(origTableOps[i]!.attrs['table-col']);
        expect(!!restoredTableOps[i]!.attrs['table-header']).toBe(
          !!origTableOps[i]!.attrs['table-header'],
        );
      }
    });

    it('Delta → Markdown → Delta preserves table structure', async () => {
      const original = makeHeaderTable();
      const md = deltaToMarkdown(original);
      const restored = await markdownToDelta(md);

      const origTableOps = getTableOps(original);
      const restoredTableOps = getTableOps(restored);

      expect(restoredTableOps.length).toBe(origTableOps.length);

      // Check content
      const origContent = original.ops
        .filter((op) => typeof op.insert === 'string' && op.insert !== '\n')
        .map((op) => (op.insert as string).trim());
      const restoredContent = restored.ops
        .filter((op) => typeof op.insert === 'string' && op.insert !== '\n')
        .map((op) => (op.insert as string).trim());

      expect(restoredContent).toEqual(origContent);
    });

    it('HTML table → Delta → HTML roundtrip', () => {
      const html =
        '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>';
      const delta = htmlToDelta(html);
      const result = deltaToHtml(delta);

      expect(result).toContain('<table>');
      expect(result).toContain('<th>A</th>');
      expect(result).toContain('<th>B</th>');
      expect(result).toContain('<td>1</td>');
      expect(result).toContain('<td>2</td>');
    });

    it('Markdown GFM table → Delta → Markdown roundtrip', async () => {
      const md = '| Name | Age |\n|------|-----|\n| Alice | 30 |\n';
      const delta = await markdownToDelta(md);
      const result = deltaToMarkdown(delta);

      expect(result).toContain('| Name | Age |');
      expect(result).toContain('| Alice | 30 |');
    });

    it('Markdown table with alignment roundtrip', async () => {
      const md = '| Left | Center | Right |\n|:-----|:------:|------:|\n| a | b | c |\n';
      const delta = await markdownToDelta(md);
      const result = deltaToMarkdown(delta);

      expect(result).toContain(':---');
      expect(result).toContain(':---:');
      expect(result).toContain('---:');
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('handles table with only header row', () => {
      const delta = new Delta()
        .insert('H1')
        .insert('\n', { 'table-row': 0, 'table-col': 0, 'table-header': true })
        .insert('H2')
        .insert('\n', { 'table-row': 0, 'table-col': 1, 'table-header': true });

      const html = deltaToHtml(delta);
      expect(html).toContain('<thead>');
      expect(html).toContain('<th>H1</th>');
      expect(html).not.toContain('<tbody>');

      const md = deltaToMarkdown(delta);
      expect(md).toContain('| H1 | H2 |');
    });

    it('handles table mixed with other content', () => {
      const delta = new Delta()
        .insert('Paragraph before\n')
        .insert('Cell A')
        .insert('\n', { 'table-row': 0, 'table-col': 0 })
        .insert('Cell B')
        .insert('\n', { 'table-row': 0, 'table-col': 1 })
        .insert('Paragraph after\n');

      const html = deltaToHtml(delta);
      expect(html).toContain('<p>Paragraph before</p>');
      expect(html).toContain('<table>');
      expect(html).toContain('<p>Paragraph after</p>');

      const md = deltaToMarkdown(delta);
      expect(md).toContain('Paragraph before');
      expect(md).toContain('| Cell A | Cell B |');
      expect(md).toContain('Paragraph after');
    });

    it('table followed by paragraph roundtrip (no absorption)', async () => {
      // Regression: without blank line after table in markdown output,
      // remark-gfm absorbs the next paragraph into the table
      const delta = new Delta()
        .insert('Header')
        .insert('\n', { 'table-row': 0, 'table-col': 0, 'table-header': true })
        .insert('Cell')
        .insert('\n', { 'table-row': 1, 'table-col': 0 })
        .insert('Итог:', { bold: true })
        .insert(' Текст после таблицы\n');

      const md = deltaToMarkdown(delta);

      // Must have a blank line between table and paragraph
      expect(md).toMatch(/\| Cell \|\n\n/);
      expect(md).toContain('**Итог:**');

      // Roundtrip: paragraph must NOT become part of the table
      const restored = await markdownToDelta(md);
      const tableOps = getTableOps(restored);
      expect(tableOps.length).toBe(2); // Only 2 table cells, not 3

      // "Итог" must not have table-row attribute
      const itogoOp = restored.ops.find(
        (op) => typeof op.insert === 'string' && (op.insert as string).includes('Итог'),
      );
      expect(itogoOp).toBeDefined();
      const itogoAttrs = itogoOp?.attributes as AttributeMap | undefined;
      expect(itogoAttrs?.['table-row']).toBeUndefined();
    });

    it('handles multiple tables', () => {
      const delta = new Delta()
        .insert('T1')
        .insert('\n', { 'table-row': 0, 'table-col': 0 })
        .insert('Between tables\n')
        .insert('T2')
        .insert('\n', { 'table-row': 0, 'table-col': 0 });

      const html = deltaToHtml(delta);
      const tableCount = (html.match(/<table>/g) || []).length;
      expect(tableCount).toBe(2);
    });
  });
});
