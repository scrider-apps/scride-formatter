/**
 * Inline HTML in Markdown + Block HTML Dispatch Tests (Stage O)
 *
 * Tests for:
 * - kbd format roundtrip (MD ↔ Delta ↔ HTML)
 * - color/background via <span style> roundtrip (MD → Delta → MD)
 * - HTML tags for existing formats (<b>, <i>, <s> → native MD output)
 * - Nested <span> with attribute stack
 * - Block HTML dispatch (Extended Table, Columns, Inline-Box via htmlToDelta)
 * - HTML entities (remark CommonMark character references)
 */

import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { deltaToMarkdown } from '../../src/conversion/markdown/delta-to-markdown';
import {
  isRemarkAvailable,
  markdownToDelta,
} from '../../src/conversion/markdown/markdown-to-delta';
import { createDefaultBlockHandlers } from '../../src/schema/defaults';

const runTests = isRemarkAvailable();
const blockHandlers = createDefaultBlockHandlers();

// ============================================================================
// kbd format
// ============================================================================

describe('kbd format — HTML roundtrip', () => {
  it('Delta → HTML → Delta', () => {
    const delta = new Delta().insert('CTRL', { kbd: true }).insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('<kbd>CTRL</kbd>');
    const back = htmlToDelta(html);
    expect(back.ops).toEqual(delta.ops);
  });

  it('HTML <kbd> → Delta', () => {
    const delta = htmlToDelta('<p><kbd>Enter</kbd></p>');
    expect(delta.ops).toEqual([{ insert: 'Enter', attributes: { kbd: true } }, { insert: '\n' }]);
  });
});

describe.runIf(runTests)('kbd format — Markdown roundtrip', () => {
  it('MD → Delta: <kbd> tags parsed', async () => {
    const delta = await markdownToDelta('<kbd>CTRL</kbd> + <kbd>P</kbd>');
    expect(delta.ops).toEqual([
      { insert: 'CTRL', attributes: { kbd: true } },
      { insert: ' + ' },
      { insert: 'P', attributes: { kbd: true } },
      { insert: '\n' },
    ]);
  });

  it('Delta → MD: kbd outputs <kbd> tags', () => {
    const delta = new Delta()
      .insert('Press ')
      .insert('CTRL', { kbd: true })
      .insert(' + ')
      .insert('C', { kbd: true })
      .insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('<kbd>CTRL</kbd>');
    expect(md).toContain('<kbd>C</kbd>');
  });

  it('MD → Delta → MD roundtrip', async () => {
    const original = 'Press <kbd>CTRL</kbd> + <kbd>P</kbd> to print.\n';
    const delta = await markdownToDelta(original);
    const md = deltaToMarkdown(delta);
    expect(md).toContain('<kbd>CTRL</kbd>');
    expect(md).toContain('<kbd>P</kbd>');
  });
});

// ============================================================================
// color / background via <span style>
// ============================================================================

describe.runIf(runTests)('color — Markdown roundtrip', () => {
  it('MD → Delta: <span style="color: red"> parsed', async () => {
    const delta = await markdownToDelta('<span style="color: red">red text</span>');
    expect(delta.ops).toEqual([
      { insert: 'red text', attributes: { color: 'red' } },
      { insert: '\n' },
    ]);
  });

  it('MD → Delta: hex color parsed', async () => {
    const delta = await markdownToDelta('<span style="color: #ff0000">text</span>');
    expect(delta.ops).toEqual([
      { insert: 'text', attributes: { color: '#ff0000' } },
      { insert: '\n' },
    ]);
  });

  it('Delta → MD: color outputs <span style>', () => {
    const delta = new Delta().insert('red text', { color: 'red' }).insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('<span style="color: red">red text</span>');
  });

  it('MD → Delta → MD roundtrip', async () => {
    const original = '<span style="color: #0066cc">blue text</span>\n';
    const delta = await markdownToDelta(original);
    const md = deltaToMarkdown(delta);
    expect(md).toContain('<span style="color: #0066cc">');
    expect(md).toContain('blue text');
  });
});

describe.runIf(runTests)('background — Markdown roundtrip', () => {
  it('MD → Delta: <span style="background-color: yellow"> parsed', async () => {
    const delta = await markdownToDelta(
      '<span style="background-color: yellow">highlighted</span>',
    );
    expect(delta.ops).toEqual([
      { insert: 'highlighted', attributes: { background: 'yellow' } },
      { insert: '\n' },
    ]);
  });

  it('MD → Delta: shorthand "background:" parsed', async () => {
    const delta = await markdownToDelta('<span style="background: #ffff00">text</span>');
    expect(delta.ops).toEqual([
      { insert: 'text', attributes: { background: '#ffff00' } },
      { insert: '\n' },
    ]);
  });

  it('Delta → MD: background outputs <span style>', () => {
    const delta = new Delta().insert('highlighted', { background: 'yellow' }).insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('<span style="background-color: yellow">highlighted</span>');
  });
});

describe.runIf(runTests)('combined color + background', () => {
  it('MD → Delta: both in one span', async () => {
    const delta = await markdownToDelta(
      '<span style="color: red; background-color: yellow">text</span>',
    );
    expect(delta.ops).toEqual([
      { insert: 'text', attributes: { color: 'red', background: 'yellow' } },
      { insert: '\n' },
    ]);
  });

  it('color + bold roundtrip', async () => {
    const original = '<span style="color: red">**bold red**</span>\n';
    const delta = await markdownToDelta(original);
    expect(delta.ops[0]).toEqual({
      insert: 'bold red',
      attributes: { bold: true, color: 'red' },
    });
    const md = deltaToMarkdown(delta);
    expect(md).toContain('<span style="color: red">');
    expect(md).toContain('**bold red**');
  });
});

describe.runIf(runTests)('nested <span> with attribute stack', () => {
  it('nested color + background correctly unstacked', async () => {
    const md =
      '<span style="color: red">red <span style="background-color: yellow">both</span> red again</span>';
    const delta = await markdownToDelta(md);
    expect(delta.ops).toEqual([
      { insert: 'red ', attributes: { color: 'red' } },
      { insert: 'both', attributes: { color: 'red', background: 'yellow' } },
      { insert: ' red again', attributes: { color: 'red' } },
      { insert: '\n' },
    ]);
  });
});

// ============================================================================
// HTML tags for existing formats (<b>, <i>, <s> → native MD output)
// ============================================================================

describe.runIf(runTests)('HTML tags → Delta → native MD', () => {
  it('<b> → bold → **', async () => {
    const delta = await markdownToDelta('<b>bold</b>');
    expect(delta.ops[0]).toEqual({ insert: 'bold', attributes: { bold: true } });
    const md = deltaToMarkdown(delta);
    expect(md).toContain('**bold**');
  });

  it('<strong> → bold → **', async () => {
    const delta = await markdownToDelta('<strong>bold</strong>');
    expect(delta.ops[0]).toEqual({ insert: 'bold', attributes: { bold: true } });
  });

  it('<i> → italic → _', async () => {
    const delta = await markdownToDelta('<i>italic</i>');
    expect(delta.ops[0]).toEqual({ insert: 'italic', attributes: { italic: true } });
    const md = deltaToMarkdown(delta);
    expect(md).toContain('_italic_');
  });

  it('<em> → italic', async () => {
    const delta = await markdownToDelta('<em>italic</em>');
    expect(delta.ops[0]).toEqual({ insert: 'italic', attributes: { italic: true } });
  });

  it('<s> → strike → ~~', async () => {
    const delta = await markdownToDelta('<s>strike</s>');
    expect(delta.ops[0]).toEqual({ insert: 'strike', attributes: { strike: true } });
    const md = deltaToMarkdown(delta);
    expect(md).toContain('~~strike~~');
  });

  it('<del> → strike', async () => {
    const delta = await markdownToDelta('<del>deleted</del>');
    expect(delta.ops[0]).toEqual({ insert: 'deleted', attributes: { strike: true } });
  });
});

// ============================================================================
// Block HTML Dispatch
// ============================================================================

describe.runIf(runTests)('Block HTML Dispatch — Columns', () => {
  it('Columns HTML in Markdown → Delta block embed', async () => {
    const md =
      '<div class="columns columns-2"><div class="column"><p>Left</p></div><div class="column"><p>Right</p></div></div>';
    const delta = await markdownToDelta(md, { blockHandlers });
    // Should produce a block embed with type "columns"
    const blockOp = delta.ops.find(
      (op) => typeof op.insert === 'object' && op.insert !== null && 'block' in op.insert,
    );
    expect(blockOp).toBeDefined();
    const block = (blockOp?.insert as Record<string, unknown>)?.block as Record<string, unknown>;
    expect(block?.type).toBe('columns');
  });
});

describe.runIf(runTests)('Block HTML Dispatch — Inline-Box', () => {
  it('Inline-Box HTML in Markdown → Delta block embed', async () => {
    const md =
      '<div class="inline-box" data-float="left" style="width: 200px"><p>Content</p></div>';
    const delta = await markdownToDelta(md, { blockHandlers });
    const blockOp = delta.ops.find(
      (op) => typeof op.insert === 'object' && op.insert !== null && 'block' in op.insert,
    );
    expect(blockOp).toBeDefined();
    const block = (blockOp?.insert as Record<string, unknown>)?.block as Record<string, unknown>;
    expect(block?.type).toBe('box');
  });
});

describe.runIf(runTests)('Block HTML Dispatch — Extended Table', () => {
  it('Table HTML in Markdown → Delta (parses via htmlToDelta)', async () => {
    const md =
      '<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Alice</td></tr></tbody></table>';
    const delta = await markdownToDelta(md, { blockHandlers });
    // Should produce some content (table-row attrs or block embed depending on complexity)
    expect(delta.ops.length).toBeGreaterThan(1);
  });
});

// ============================================================================
// HTML entities (remark CommonMark character references)
// ============================================================================

describe.runIf(runTests)('HTML entities — remark parsing', () => {
  it('named entity &macr; → Unicode', async () => {
    const delta = await markdownToDelta('A&macr;');
    expect(delta.ops[0]?.insert).toContain('\u00AF');
  });

  it('named entity &copy; → Unicode', async () => {
    const delta = await markdownToDelta('&copy; 2026');
    expect(delta.ops[0]?.insert).toContain('\u00A9');
  });

  it('decimal entity &#175; → Unicode', async () => {
    const delta = await markdownToDelta('&#175;');
    expect(delta.ops[0]?.insert).toContain('\u00AF');
  });

  it('hex entity &#x00AF; → Unicode', async () => {
    const delta = await markdownToDelta('&#x00AF;');
    expect(delta.ops[0]?.insert).toContain('\u00AF');
  });
});

// ============================================================================
// Stage O.1: Video / Float Markdown Roundtrip
// ============================================================================

describe.runIf(runTests)('Video — Delta → Markdown → Delta', () => {
  it('YouTube video → ![Video](url) in Markdown', () => {
    const delta = new Delta()
      .insert({ video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
      .insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('![Video]');
    expect(md).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(md).not.toContain('<iframe');
  });

  it('YouTube video roundtrip MD → Delta → MD', async () => {
    const delta = new Delta()
      .insert({ video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
      .insert('\n');
    const md = deltaToMarkdown(delta);
    const back = await markdownToDelta(md);
    expect(back.ops).toEqual(delta.ops);
  });

  it('direct mp4 video → ![Video](url) in Markdown', () => {
    const delta = new Delta().insert({ video: 'https://example.com/clip.mp4' }).insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('![Video](https://example.com/clip.mp4)');
    expect(md).not.toContain('<video');
  });

  it('direct mp4 video roundtrip', async () => {
    const delta = new Delta().insert({ video: 'https://example.com/clip.mp4' }).insert('\n');
    const md = deltaToMarkdown(delta);
    const back = await markdownToDelta(md);
    expect(back.ops).toEqual(delta.ops);
  });

  it('video with float and dimensions', () => {
    const delta = new Delta()
      .insert(
        { video: 'https://www.youtube.com/watch?v=abc123' },
        { float: 'left', width: '560', height: '315' },
      )
      .insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('data-float="left"');
    expect(md).toContain('width: 560');
    expect(md).toContain('height: 315');
  });

  it('video with float roundtrip', async () => {
    const delta = new Delta()
      .insert(
        { video: 'https://www.youtube.com/watch?v=abc123' },
        { float: 'left', width: '560', height: '315' },
      )
      .insert('\n');
    const md = deltaToMarkdown(delta);
    const back = await markdownToDelta(md, { blockHandlers });
    expect(back.ops).toEqual(delta.ops);
  });
});

describe.runIf(runTests)('Image with float — Delta → Markdown → Delta', () => {
  it('image with float → <img> HTML (not ![](...))', () => {
    const delta = new Delta()
      .insert({ image: 'https://example.com/photo.jpg' }, { float: 'left', width: 200 })
      .insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('<img');
    expect(md).toContain('data-float="left"');
    expect(md).toContain('width="200"');
    expect(md).not.toContain('![');
  });

  it('image without float → standard ![](…) Markdown', () => {
    const delta = new Delta().insert({ image: 'https://example.com/photo.jpg' }).insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('![');
    expect(md).not.toContain('<img');
  });

  it('image with float roundtrip', async () => {
    const delta = new Delta()
      .insert({ image: 'https://example.com/photo.jpg' }, { float: 'left', width: 200 })
      .insert('\n');
    const md = deltaToMarkdown(delta);
    const back = await markdownToDelta(md, { blockHandlers });
    expect(back.ops).toEqual(delta.ops);
  });

  it('image with float+alt roundtrip', async () => {
    const delta = new Delta()
      .insert(
        { image: 'https://example.com/photo.jpg' },
        { alt: 'A photo', float: 'right', width: 300, height: 200 },
      )
      .insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('alt="A photo"');
    expect(md).toContain('data-float="right"');
    const back = await markdownToDelta(md, { blockHandlers });
    expect(back.ops).toEqual(delta.ops);
  });

  it('image with width only (no float) → <img> HTML', () => {
    const delta = new Delta()
      .insert({ image: 'https://example.com/photo.jpg' }, { width: 400 })
      .insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('<img');
    expect(md).toContain('width="400"');
  });

  it('image with width only roundtrip', async () => {
    const delta = new Delta()
      .insert({ image: 'https://example.com/photo.jpg' }, { width: 400 })
      .insert('\n');
    const md = deltaToMarkdown(delta);
    const back = await markdownToDelta(md, { blockHandlers });
    expect(back.ops).toEqual(delta.ops);
  });
});

// ============================================================================
// ![Video](url) — image-like syntax for video embeds
// ============================================================================

describe.runIf(runTests)('![Video](url) — Markdown image syntax as video embed', () => {
  it('![Video](url) → video embed', async () => {
    const delta = await markdownToDelta('![Video](https://www.youtube.com/watch?v=abc123)');
    const videoOp = delta.ops.find(
      (op) => typeof op.insert === 'object' && op.insert !== null && 'video' in op.insert,
    );
    expect(videoOp).toBeDefined();
    expect((videoOp?.insert as Record<string, unknown>)?.video).toBe(
      'https://www.youtube.com/watch?v=abc123',
    );
  });

  it('![video](url) — case-insensitive', async () => {
    const delta = await markdownToDelta('![video](https://example.com/clip.mp4)');
    const videoOp = delta.ops.find(
      (op) => typeof op.insert === 'object' && op.insert !== null && 'video' in op.insert,
    );
    expect(videoOp).toBeDefined();
    expect((videoOp?.insert as Record<string, unknown>)?.video).toBe(
      'https://example.com/clip.mp4',
    );
  });

  it('![VIDEO](url) — uppercase', async () => {
    const delta = await markdownToDelta('![VIDEO](https://vk.com/video123)');
    const videoOp = delta.ops.find(
      (op) => typeof op.insert === 'object' && op.insert !== null && 'video' in op.insert,
    );
    expect(videoOp).toBeDefined();
  });

  it('![photo](url) — regular image, NOT video', async () => {
    const delta = await markdownToDelta('![photo](https://example.com/img.jpg)');
    const videoOp = delta.ops.find(
      (op) => typeof op.insert === 'object' && op.insert !== null && 'video' in op.insert,
    );
    expect(videoOp).toBeUndefined();
    const imageOp = delta.ops.find(
      (op) => typeof op.insert === 'object' && op.insert !== null && 'image' in op.insert,
    );
    expect(imageOp).toBeDefined();
  });

  it('Delta → MD: simple video → ![Video](url)', () => {
    const delta = new Delta()
      .insert({ video: 'https://www.youtube.com/watch?v=abc123' })
      .insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('![Video]');
    expect(md).toContain('https://www.youtube.com/watch?v=abc123');
    expect(md).not.toContain('<iframe');
  });

  it('full roundtrip: ![Video](url) → Delta → ![Video](url)', async () => {
    const delta = new Delta()
      .insert({ video: 'https://www.youtube.com/watch?v=abc123' })
      .insert('\n');
    const md = deltaToMarkdown(delta);
    const back = await markdownToDelta(md);
    expect(back.ops).toEqual(delta.ops);
  });

  it('full roundtrip: mp4 video', async () => {
    const delta = new Delta().insert({ video: 'https://example.com/clip.mp4' }).insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('![Video](https://example.com/clip.mp4)');
    const back = await markdownToDelta(md);
    expect(back.ops).toEqual(delta.ops);
  });
});
