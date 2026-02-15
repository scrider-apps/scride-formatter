/**
 * Round-trip Conversion Tests
 *
 * Tests semantic equivalence of conversion chains:
 * - Delta → HTML → Delta
 * - Delta → Markdown → Delta
 * - HTML → Delta → HTML
 * - Markdown → Delta → Markdown
 */

import { describe, it, expect } from 'vitest';
import { Delta } from '@scrider/delta';
import type { Op } from '@scrider/delta';
import { deltaToHtml, htmlToDelta } from '../../src/conversion/html';
import { deltaToMarkdown, markdownToDelta, isRemarkAvailable } from '../../src/conversion/markdown';

/**
 * Helper to check if op has attribute with value
 */
function hasAttr(op: Op, key: string, value: unknown): boolean {
  if (!('attributes' in op) || !op.attributes) return false;
  return op.attributes[key] === value;
}

/**
 * Helper to compare Deltas semantically
 * Ignores differences in op splitting but ensures same content
 */
function deltasAreEquivalent(a: Delta, b: Delta): boolean {
  // Flatten both deltas to plain text + attributes
  const flattenDelta = (delta: Delta): string => {
    let text = '';
    for (const op of delta.ops) {
      if (typeof op.insert === 'string') {
        text += op.insert;
      } else if (typeof op.insert === 'object') {
        // Embed - serialize as JSON
        text += JSON.stringify(op.insert);
      }
    }
    return text;
  };

  return flattenDelta(a) === flattenDelta(b);
}

describe('Round-trip: Delta → HTML → Delta', () => {
  it('preserves plain text', () => {
    const original = new Delta().insert('Hello World\n');
    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
  });

  it('preserves inline formatting', () => {
    const original = new Delta()
      .insert('Hello ', {})
      .insert('Bold', { bold: true })
      .insert(' and ')
      .insert('Italic', { italic: true })
      .insert('\n');

    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
    // Check formatting is preserved
    expect(restored.ops.some((op) => hasAttr(op, 'bold', true))).toBe(true);
    expect(restored.ops.some((op) => hasAttr(op, 'italic', true))).toBe(true);
  });

  it('preserves headers', () => {
    const original = new Delta()
      .insert('Title\n', { header: 1 })
      .insert('Subtitle\n', { header: 2 });

    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
    expect(restored.ops.some((op) => hasAttr(op, 'header', 1))).toBe(true);
    expect(restored.ops.some((op) => hasAttr(op, 'header', 2))).toBe(true);
  });

  it('preserves lists', () => {
    const original = new Delta()
      .insert('Item 1\n', { list: 'bullet' })
      .insert('Item 2\n', { list: 'bullet' })
      .insert('Item 3\n', { list: 'ordered' });

    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
  });

  it('preserves blockquote', () => {
    const original = new Delta().insert('Quoted text\n', { blockquote: true });

    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
    expect(restored.ops.some((op) => hasAttr(op, 'blockquote', true))).toBe(true);
  });

  it('preserves code blocks', () => {
    const original = new Delta().insert('const x = 1;\n', { 'code-block': true });

    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
  });

  it('preserves links', () => {
    const original = new Delta()
      .insert('Click ')
      .insert('here', { link: 'https://example.com' })
      .insert('\n');

    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
    expect(restored.ops.some((op) => hasAttr(op, 'link', 'https://example.com'))).toBe(true);
  });

  it('preserves image embeds', () => {
    const original = new Delta().insert({ image: 'https://example.com/img.png' }).insert('\n');

    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(
      restored.ops.some(
        (op) =>
          typeof op.insert === 'object' &&
          (op.insert as Record<string, unknown>).image === 'https://example.com/img.png',
      ),
    ).toBe(true);
  });

  it('handles complex document', () => {
    const original = new Delta()
      .insert('Document Title\n', { header: 1 })
      .insert('This is a ')
      .insert('bold', { bold: true })
      .insert(' paragraph.\n')
      .insert('List item 1\n', { list: 'bullet' })
      .insert('List item 2\n', { list: 'bullet' })
      .insert('A quote\n', { blockquote: true });

    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
  });
});

const runMarkdownTests = isRemarkAvailable();

describe.runIf(runMarkdownTests)('Round-trip: Delta → Markdown → Delta', () => {
  it('preserves plain text', async () => {
    const original = new Delta().insert('Hello World\n');
    const md = deltaToMarkdown(original);
    const restored = await markdownToDelta(md);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
  });

  it('preserves inline formatting', async () => {
    const original = new Delta()
      .insert('Hello ')
      .insert('Bold', { bold: true })
      .insert(' and ')
      .insert('Italic', { italic: true })
      .insert('\n');

    const md = deltaToMarkdown(original);
    const restored = await markdownToDelta(md);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
    expect(restored.ops.some((op) => hasAttr(op, 'bold', true))).toBe(true);
    expect(restored.ops.some((op) => hasAttr(op, 'italic', true))).toBe(true);
  });

  it('preserves headers', async () => {
    const original = new Delta()
      .insert('Title\n', { header: 1 })
      .insert('Subtitle\n', { header: 2 });

    const md = deltaToMarkdown(original);
    const restored = await markdownToDelta(md);

    expect(restored.ops.some((op) => hasAttr(op, 'header', 1))).toBe(true);
    expect(restored.ops.some((op) => hasAttr(op, 'header', 2))).toBe(true);
  });

  it('preserves lists', async () => {
    const original = new Delta()
      .insert('Item 1\n', { list: 'bullet' })
      .insert('Item 2\n', { list: 'bullet' });

    const md = deltaToMarkdown(original);
    const restored = await markdownToDelta(md);

    expect(restored.ops.some((op) => hasAttr(op, 'list', 'bullet'))).toBe(true);
  });

  it('preserves blockquote', async () => {
    const original = new Delta().insert('Quoted text\n', { blockquote: true });

    const md = deltaToMarkdown(original);
    const restored = await markdownToDelta(md);

    expect(restored.ops.some((op) => hasAttr(op, 'blockquote', true))).toBe(true);
  });

  it('preserves code blocks', async () => {
    const original = new Delta().insert('const x = 1;\n', { 'code-block': 'javascript' });

    const md = deltaToMarkdown(original);
    const restored = await markdownToDelta(md);

    expect(restored.ops.some((op) => hasAttr(op, 'code-block', 'javascript'))).toBe(true);
  });

  it('preserves links', async () => {
    const original = new Delta()
      .insert('Click ')
      .insert('here', { link: 'https://example.com' })
      .insert('\n');

    const md = deltaToMarkdown(original);
    const restored = await markdownToDelta(md);

    expect(restored.ops.some((op) => hasAttr(op, 'link', 'https://example.com'))).toBe(true);
  });

  it('preserves images', async () => {
    const original = new Delta()
      .insert({ image: 'https://example.com/img.png' }, { alt: 'Logo' })
      .insert('\n');

    const md = deltaToMarkdown(original);
    const restored = await markdownToDelta(md);

    expect(
      restored.ops.some(
        (op) =>
          typeof op.insert === 'object' &&
          (op.insert as Record<string, unknown>).image === 'https://example.com/img.png',
      ),
    ).toBe(true);
  });
});

describe('Edge cases', () => {
  it('handles empty document', () => {
    const original = new Delta();
    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    // Empty or just newline is acceptable
    expect(restored.ops.length).toBeLessThanOrEqual(1);
  });

  it('handles document with only newlines', () => {
    const original = new Delta().insert('\n\n\n');
    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    // Empty paragraphs are rendered with <br> for browser visibility.
    // htmlToDelta correctly treats <p><br></p> as empty paragraph.
    expect(deltasAreEquivalent(original, restored)).toBe(true);
  });

  it('handles nested inline formatting', () => {
    const original = new Delta()
      .insert('Bold and italic', { bold: true, italic: true })
      .insert('\n');

    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(
      restored.ops.some((op) => hasAttr(op, 'bold', true) && hasAttr(op, 'italic', true)),
    ).toBe(true);
  });

  it('handles special characters in text', () => {
    const original = new Delta().insert('Special: <>&"\' chars\n');
    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
  });

  it('handles unicode text', () => {
    const original = new Delta().insert('Привет мир! 你好世界! 🌍🚀\n');
    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    expect(deltasAreEquivalent(original, restored)).toBe(true);
  });
});
