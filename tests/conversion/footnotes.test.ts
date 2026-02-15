/**
 * Footnotes Conversion Tests
 *
 * Tests for footnote-ref inline embed and footnotes block embed:
 * - Markdown → Delta (remark-gfm footnote parsing)
 * - Delta → HTML (inline ref + section.footnotes)
 * - HTML → Delta (parsing sup.footnote-ref + section.footnotes)
 * - Delta → Markdown ([^id] + [^id]: content)
 * - Roundtrip tests
 */

import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';
import type { InsertOp } from '@scrider/delta';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { deltaToMarkdown } from '../../src/conversion/markdown/delta-to-markdown';
import {
  isRemarkAvailable,
  markdownToDelta,
} from '../../src/conversion/markdown/markdown-to-delta';
import { createDefaultBlockHandlers } from '../../src/schema/defaults';
import { footnotesBlockHandler } from '../../src/schema/blocks/footnotes';
import type { FootnotesBlockData } from '../../src/schema/blocks/footnotes';

const blockHandlers = createDefaultBlockHandlers();
const runTests = isRemarkAvailable();

// ============================================================================
// Helper: create Delta with footnotes
// ============================================================================

function footnotesDelta(
  textOps: InsertOp[],
  notes: Record<string, { ops: InsertOp[] }>,
): Delta {
  const ops: InsertOp[] = [
    ...textOps,
    {
      insert: {
        block: {
          type: 'footnotes' as const,
          notes,
        },
      },
    },
    { insert: '\n' },
  ];
  return new Delta(ops);
}

// ============================================================================
// Schema: FootnotesBlockHandler.validate()
// ============================================================================

describe('FootnotesBlockHandler', () => {
  describe('validate', () => {
    it('validates a simple footnotes block', () => {
      const data: FootnotesBlockData = {
        type: 'footnotes',
        notes: {
          '1': { ops: [{ insert: 'First note.\n' }] },
        },
      };
      expect(footnotesBlockHandler.validate(data)).toBe(true);
    });

    it('validates multiple notes', () => {
      const data: FootnotesBlockData = {
        type: 'footnotes',
        notes: {
          '1': { ops: [{ insert: 'Note one.\n' }] },
          abc: { ops: [{ insert: 'Note abc.\n' }] },
          'my-ref': { ops: [{ insert: 'My ref.\n' }] },
        },
      };
      expect(footnotesBlockHandler.validate(data)).toBe(true);
    });

    it('validates notes with rich content', () => {
      const data: FootnotesBlockData = {
        type: 'footnotes',
        notes: {
          '1': {
            ops: [{ insert: 'Bold ', attributes: { bold: true } }, { insert: 'text.\n' }],
          },
        },
      };
      expect(footnotesBlockHandler.validate(data)).toBe(true);
    });

    it('rejects wrong type', () => {
      expect(footnotesBlockHandler.validate({ type: 'table', notes: {} } as never)).toBe(false);
    });

    it('rejects empty notes', () => {
      expect(footnotesBlockHandler.validate({ type: 'footnotes', notes: {} })).toBe(false);
    });

    it('rejects note with empty ops', () => {
      const data: FootnotesBlockData = {
        type: 'footnotes',
        notes: {
          '1': { ops: [] },
        },
      };
      expect(footnotesBlockHandler.validate(data)).toBe(false);
    });

    it('rejects null data', () => {
      expect(footnotesBlockHandler.validate(null as never)).toBe(false);
    });
  });

  describe('getNestedDeltas / setNestedDeltas', () => {
    it('extracts and restores nested deltas', () => {
      const data: FootnotesBlockData = {
        type: 'footnotes',
        notes: {
          '1': { ops: [{ insert: 'A\n' }] },
          '2': { ops: [{ insert: 'B\n' }] },
        },
      };

      const deltas = footnotesBlockHandler.getNestedDeltas!(data);
      expect(deltas).toHaveLength(2);
      expect(deltas[0]).toEqual([{ insert: 'A\n' }]);
      expect(deltas[1]).toEqual([{ insert: 'B\n' }]);

      // Modify and set back
      const modified = [[{ insert: 'X\n' }], [{ insert: 'Y\n' }]];
      const updated = footnotesBlockHandler.setNestedDeltas!(data, modified);
      expect(updated.notes['1']!.ops).toEqual([{ insert: 'X\n' }]);
      expect(updated.notes['2']!.ops).toEqual([{ insert: 'Y\n' }]);
    });
  });
});

// ============================================================================
// Delta → HTML
// ============================================================================

describe('Footnotes: Delta → HTML', () => {
  it('renders footnote-ref as <sup> link', () => {
    const delta = new Delta([
      { insert: 'Text' },
      { insert: { 'footnote-ref': '1' } },
      { insert: '.\n' },
    ]);

    const html = deltaToHtml(delta);
    expect(html).toContain('<sup class="footnote-ref">');
    expect(html).toContain('href="#fn-1"');
    expect(html).toContain('id="fnref-1"');
    expect(html).toContain('>[1]</a>');
  });

  it('renders multiple footnote refs', () => {
    const delta = new Delta([
      { insert: 'A' },
      { insert: { 'footnote-ref': '1' } },
      { insert: ' B' },
      { insert: { 'footnote-ref': 'note' } },
      { insert: '.\n' },
    ]);

    const html = deltaToHtml(delta);
    expect(html).toContain('#fn-1');
    expect(html).toContain('#fn-note');
  });

  it('renders footnotes block as <section>', () => {
    const delta = footnotesDelta(
      [{ insert: 'Text' }, { insert: { 'footnote-ref': '1' } }, { insert: '\n' }],
      { '1': { ops: [{ insert: 'Footnote text.\n' }] } },
    );

    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('<section class="footnotes">');
    expect(html).toContain('<ol>');
    expect(html).toContain('<li id="fn-1">');
    expect(html).toContain('Footnote text.');
    expect(html).toContain('footnote-backref');
    expect(html).toContain('↩');
    expect(html).toContain('</section>');
  });

  it('renders rich content in footnote definitions', () => {
    const delta = footnotesDelta(
      [{ insert: 'Text' }, { insert: { 'footnote-ref': '1' } }, { insert: '\n' }],
      {
        '1': {
          ops: [{ insert: 'Bold', attributes: { bold: true } }, { insert: ' text.\n' }],
        },
      },
    );

    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain(' text.');
  });
});

// ============================================================================
// HTML → Delta
// ============================================================================

describe('Footnotes: HTML → Delta', () => {
  it('parses <sup class="footnote-ref"> to footnote-ref embed', () => {
    const html = '<p>Text<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">1</a></sup>.</p>';
    const delta = htmlToDelta(html, { blockHandlers });

    const hasFootnoteRef = delta.ops.some(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'footnote-ref' in (op.insert),
    );
    expect(hasFootnoteRef).toBe(true);

    const refOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'footnote-ref' in (op.insert),
    );
    expect(((refOp as InsertOp).insert as Record<string, unknown>)['footnote-ref']).toBe('1');
  });

  it('parses <section class="footnotes"> to block embed', () => {
    const html = `
      <p>Text<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">1</a></sup>.</p>
      <section class="footnotes">
        <ol>
          <li id="fn-1">
            <p>Footnote text.</p>
            <a href="#fnref-1" class="footnote-backref">↩</a>
          </li>
        </ol>
      </section>
    `;

    const delta = htmlToDelta(html, { blockHandlers });

    // Find block embed
    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();

    const blockData = ((blockOp as InsertOp).insert as Record<string, unknown>).block as FootnotesBlockData;
    expect(blockData.type).toBe('footnotes');
    expect(blockData.notes['1']).toBeDefined();
    expect(blockData.notes['1']!.ops.length).toBeGreaterThan(0);
  });

  it('parses multiple footnotes from section', () => {
    const html = `
      <section class="footnotes">
        <ol>
          <li id="fn-1"><p>First note.</p><a href="#fnref-1" class="footnote-backref">↩</a></li>
          <li id="fn-2"><p>Second note.</p><a href="#fnref-2" class="footnote-backref">↩</a></li>
        </ol>
      </section>
    `;

    const delta = htmlToDelta(html, { blockHandlers });

    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();

    const blockData = ((blockOp as InsertOp).insert as Record<string, unknown>).block as FootnotesBlockData;
    expect(blockData.notes['1']).toBeDefined();
    expect(blockData.notes['2']).toBeDefined();
  });
});

// ============================================================================
// Delta → Markdown
// ============================================================================

describe('Footnotes: Delta → Markdown', () => {
  it('renders footnote-ref as [^id]', () => {
    const delta = new Delta([
      { insert: 'Text' },
      { insert: { 'footnote-ref': '1' } },
      { insert: '.\n' },
    ]);

    const md = deltaToMarkdown(delta);
    expect(md).toContain('[^1]');
  });

  it('renders footnotes block as [^id]: content', () => {
    const delta = footnotesDelta(
      [{ insert: 'Text' }, { insert: { 'footnote-ref': '1' } }, { insert: '\n' }],
      { '1': { ops: [{ insert: 'Footnote text.\n' }] } },
    );

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('[^1]');
    expect(md).toContain('[^1]: Footnote text.');
  });

  it('renders multiple footnote definitions', () => {
    const delta = footnotesDelta(
      [
        { insert: 'A' },
        { insert: { 'footnote-ref': '1' } },
        { insert: ' B' },
        { insert: { 'footnote-ref': '2' } },
        { insert: '\n' },
      ],
      {
        '1': { ops: [{ insert: 'First.\n' }] },
        '2': { ops: [{ insert: 'Second.\n' }] },
      },
    );

    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('[^1]: First.');
    expect(md).toContain('[^2]: Second.');
  });

  it('renders arbitrary footnote IDs', () => {
    const delta = new Delta([
      { insert: 'Text' },
      { insert: { 'footnote-ref': 'my-note' } },
      { insert: '\n' },
    ]);

    const md = deltaToMarkdown(delta);
    expect(md).toContain('[^my-note]');
  });
});

// ============================================================================
// Markdown → Delta (requires remark)
// ============================================================================

describe.runIf(runTests)('Footnotes: Markdown → Delta', () => {
  it('parses simple footnote', async () => {
    const md = 'Text[^1] here.\n\n[^1]: Footnote content.';
    const delta = await markdownToDelta(md);

    // Should have footnote-ref embed
    const refOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'footnote-ref' in (op.insert),
    );
    expect(refOp).toBeDefined();
    expect(((refOp as InsertOp).insert as Record<string, unknown>)['footnote-ref']).toBe('1');

    // Should have footnotes block embed
    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();

    const blockData = ((blockOp as InsertOp).insert as Record<string, unknown>).block as FootnotesBlockData;
    expect(blockData.type).toBe('footnotes');
    expect(blockData.notes['1']).toBeDefined();
  });

  it('parses multiple footnotes', async () => {
    const md = 'A[^1] and B[^2].\n\n[^1]: First note.\n\n[^2]: Second note.';
    const delta = await markdownToDelta(md);

    // Two refs
    const refs = delta.ops.filter(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'footnote-ref' in (op.insert),
    );
    expect(refs).toHaveLength(2);

    // Footnotes block with two notes
    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();

    const blockData = ((blockOp as InsertOp).insert as Record<string, unknown>).block as FootnotesBlockData;
    expect(Object.keys(blockData.notes)).toHaveLength(2);
    expect(blockData.notes['1']).toBeDefined();
    expect(blockData.notes['2']).toBeDefined();
  });

  it('parses footnote with arbitrary ID', async () => {
    const md = 'Text[^my-note].\n\n[^my-note]: Content here.';
    const delta = await markdownToDelta(md);

    const refOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'footnote-ref' in (op.insert),
    );
    expect(((refOp as InsertOp).insert as Record<string, unknown>)['footnote-ref']).toBe('my-note');

    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    const blockData = ((blockOp as InsertOp).insert as Record<string, unknown>).block as FootnotesBlockData;
    expect(blockData.notes['my-note']).toBeDefined();
  });

  it('parses footnote with inline formatting in definition', async () => {
    const md = 'Text[^1].\n\n[^1]: **Bold** and _italic_ content.';
    const delta = await markdownToDelta(md);

    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    const blockData = ((blockOp as InsertOp).insert as Record<string, unknown>).block as FootnotesBlockData;
    const noteOps = blockData.notes['1']!.ops;

    // Should contain bold attribute
    const boldOp = noteOps.find(
      (op) => 'attributes' in op && op.attributes && (op.attributes as Record<string, unknown>).bold === true,
    );
    expect(boldOp).toBeDefined();
  });

  it('handles footnote mixed with other content', async () => {
    const md = '# Title\n\nText[^1] and **bold**.\n\n---\n\n[^1]: A footnote.';
    const delta = await markdownToDelta(md);

    // Should have header, bold, footnote-ref, divider, and footnotes block
    expect(delta.ops.length).toBeGreaterThan(3);

    const hasRef = delta.ops.some(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'footnote-ref' in (op.insert),
    );
    expect(hasRef).toBe(true);

    const hasBlock = delta.ops.some(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(hasBlock).toBe(true);
  });
});

// ============================================================================
// Roundtrip: Delta → HTML → Delta
// ============================================================================

describe('Footnotes: Delta → HTML → Delta roundtrip', () => {
  it('roundtrips footnote-ref embed', () => {
    const original = new Delta([
      { insert: 'Text' },
      { insert: { 'footnote-ref': '1' } },
      { insert: '.\n' },
    ]);

    const html = deltaToHtml(original);
    const restored = htmlToDelta(html, { blockHandlers });

    const refOp = restored.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'footnote-ref' in (op.insert),
    );
    expect(refOp).toBeDefined();
    expect(((refOp as InsertOp).insert as Record<string, unknown>)['footnote-ref']).toBe('1');
  });

  it('roundtrips footnotes block embed', () => {
    const original = footnotesDelta(
      [{ insert: 'Text' }, { insert: { 'footnote-ref': '1' } }, { insert: '\n' }],
      { '1': { ops: [{ insert: 'Note content.\n' }] } },
    );

    const html = deltaToHtml(original, { blockHandlers });
    expect(html).toContain('<section class="footnotes">');

    const restored = htmlToDelta(html, { blockHandlers });

    const blockOp = restored.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();

    const blockData = ((blockOp as InsertOp).insert as Record<string, unknown>).block as FootnotesBlockData;
    expect(blockData.type).toBe('footnotes');
    expect(blockData.notes['1']).toBeDefined();
  });
});

// ============================================================================
// Roundtrip: Delta → Markdown → Delta (requires remark)
// ============================================================================

describe.runIf(runTests)('Footnotes: Delta → Markdown → Delta roundtrip', () => {
  it('roundtrips simple footnote', async () => {
    const original = footnotesDelta(
      [{ insert: 'Text' }, { insert: { 'footnote-ref': '1' } }, { insert: '\n' }],
      { '1': { ops: [{ insert: 'Footnote text.\n' }] } },
    );

    const md = deltaToMarkdown(original, { blockHandlers });
    expect(md).toContain('[^1]');
    expect(md).toContain('[^1]:');

    const restored = await markdownToDelta(md);

    // Should have footnote-ref
    const refOp = restored.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'footnote-ref' in (op.insert),
    );
    expect(refOp).toBeDefined();

    // Should have footnotes block
    const blockOp = restored.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();
  });
});

// ============================================================================
// Roundtrip: Markdown → Delta → Markdown (requires remark)
// ============================================================================

describe.runIf(runTests)('Footnotes: Markdown → Delta → Markdown roundtrip', () => {
  it('roundtrips basic footnote', async () => {
    const md = 'Text[^1] here.\n\n[^1]: Footnote content.\n';
    const delta = await markdownToDelta(md);
    const output = deltaToMarkdown(delta, { blockHandlers });

    // Should preserve footnote reference
    expect(output).toContain('[^1]');
    // Should preserve footnote definition
    expect(output).toContain('[^1]:');
    expect(output).toContain('Footnote content');
  });
});
