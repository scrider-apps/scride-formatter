/**
 * Tests for float behavior on simple embeds (image, video).
 *
 * When an embed op has a `float` attribute, the element gets `data-float`
 * in HTML and is rendered as a block-level element (no <p> wrapper).
 * Without `float`, behavior is unchanged (inline inside <p>).
 */
import { describe, it, expect } from 'vitest';
import { Delta } from '@scrider/delta';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { createDefaultBlockHandlers } from '../../src/schema/defaults';

// ============================================================================
// Helpers
// ============================================================================

function getOpAttrs(op: { attributes?: Record<string, unknown> }): Record<string, unknown> {
  return op.attributes ?? {};
}

function findEmbedOp(
  ops: Array<{ insert: unknown; attributes?: Record<string, unknown> }>,
  embedType: string,
): { insert: unknown; attributes?: Record<string, unknown> } | undefined {
  return ops.find((op) => {
    if (typeof op.insert !== 'object' || op.insert === null) return false;
    return embedType in (op.insert as Record<string, unknown>);
  });
}

// ============================================================================
// Image: Delta → HTML
// ============================================================================

describe('Image float: Delta → HTML', () => {
  it('image without float renders inline in <p>', () => {
    const delta = new Delta().insert({ image: 'photo.jpg' }).insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('<p>');
    expect(html).toContain('<img src="photo.jpg">');
    expect(html).not.toContain('data-float');
  });

  it('image with float left renders without <p> wrapper', () => {
    const delta = new Delta()
      .insert({ image: 'photo.jpg' }, { float: 'left', width: 200 })
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).not.toContain('<p>');
    expect(html).toContain('data-float="left"');
    expect(html).toContain('width="200"');
  });

  it('image with float right', () => {
    const delta = new Delta()
      .insert({ image: 'photo.jpg' }, { float: 'right', width: 300, height: 200 })
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('data-float="right"');
    expect(html).toContain('width="300"');
    expect(html).toContain('height="200"');
  });

  it('image with float center', () => {
    const delta = new Delta()
      .insert({ image: 'photo.jpg' }, { float: 'center', width: 400 })
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('data-float="center"');
  });

  it('image with alt and float', () => {
    const delta = new Delta()
      .insert({ image: 'photo.jpg' }, { alt: 'A photo', float: 'left', width: 200 })
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('alt="A photo"');
    expect(html).toContain('data-float="left"');
  });

  it('float image surrounded by text', () => {
    const delta = new Delta()
      .insert('Before.\n')
      .insert({ image: 'photo.jpg' }, { float: 'left', width: 200 })
      .insert('\n')
      .insert('Text wrapping around the image.\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('Before.');
    expect(html).toContain('data-float="left"');
    expect(html).toContain('Text wrapping around');
  });
});

// ============================================================================
// Image: HTML → Delta
// ============================================================================

describe('Image float: HTML → Delta', () => {
  it('parses img with data-float', () => {
    const html = '<img src="photo.jpg" data-float="left" width="200" height="150">';
    const delta = htmlToDelta(html);
    const op = findEmbedOp(delta.ops, 'image');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBe('left');
    expect(attrs.width).toBe(200);
    expect(attrs.height).toBe(150);
  });

  it('parses img without data-float (no float attr)', () => {
    const html = '<img src="photo.jpg" width="200">';
    const delta = htmlToDelta(html);
    const op = findEmbedOp(delta.ops, 'image');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBeUndefined();
    expect(attrs.width).toBe(200);
  });

  it('parses img with float right and alt', () => {
    const html = '<img src="photo.jpg" alt="Description" data-float="right" width="300">';
    const delta = htmlToDelta(html);
    const op = findEmbedOp(delta.ops, 'image');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBe('right');
    expect(attrs.alt).toBe('Description');
    expect(attrs.width).toBe(300);
  });
});

// ============================================================================
// Video: Delta → HTML
// ============================================================================

describe('Video float: Delta → HTML', () => {
  it('video without float renders normally', () => {
    const delta = new Delta().insert({ video: 'https://example.com/video.mp4' }).insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('<video src=');
    expect(html).not.toContain('data-float');
  });

  it('video with float left', () => {
    const delta = new Delta()
      .insert(
        { video: 'https://example.com/video.mp4' },
        { float: 'left', width: '300px', height: '200px' },
      )
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('data-float="left"');
    expect(html).toContain('width: 300px');
    expect(html).toContain('height: 200px');
  });

  it('youtube iframe with float right', () => {
    const delta = new Delta()
      .insert(
        { video: 'https://www.youtube.com/watch?v=abc123' },
        { float: 'right', width: '400px' },
      )
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('<iframe');
    expect(html).toContain('data-float="right"');
    expect(html).toContain('width: 400px');
  });

  it('video with float center', () => {
    const delta = new Delta()
      .insert({ video: 'https://example.com/video.mp4' }, { float: 'center', width: '500px' })
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('data-float="center"');
  });

  it('video without width/height emits no style', () => {
    const delta = new Delta()
      .insert({ video: 'https://example.com/video.mp4' }, { float: 'left' })
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('data-float="left"');
    expect(html).not.toContain('style=');
  });
});

// ============================================================================
// Video: HTML → Delta
// ============================================================================

describe('Video float: HTML → Delta', () => {
  it('parses video with data-float and style dimensions', () => {
    const html =
      '<video src="https://example.com/video.mp4" controls data-float="left" style="width: 300px; height: 200px"></video>';
    const delta = htmlToDelta(html);
    const op = findEmbedOp(delta.ops, 'video');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBe('left');
    expect(attrs.width).toBe('300');
    expect(attrs.height).toBe('200');
  });

  it('parses iframe with data-float', () => {
    const html =
      '<iframe src="https://www.youtube.com/embed/abc123" frameborder="0" allowfullscreen data-float="right" style="width: 400px"></iframe>';
    const delta = htmlToDelta(html);
    const op = findEmbedOp(delta.ops, 'video');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBe('right');
    expect(attrs.width).toBe('400');
  });

  it('parses video without data-float (no float attr)', () => {
    const html = '<video src="https://example.com/video.mp4" controls></video>';
    const delta = htmlToDelta(html);
    const op = findEmbedOp(delta.ops, 'video');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBeUndefined();
  });
});

// ============================================================================
// Roundtrip: Delta → HTML → Delta
// ============================================================================

describe('Embed float: Roundtrip', () => {
  it('image float left roundtrip', () => {
    const original = new Delta()
      .insert({ image: 'photo.jpg' }, { float: 'left', width: 200, height: 150 })
      .insert('\n');
    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    const op = findEmbedOp(restored.ops, 'image');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBe('left');
    expect(attrs.width).toBe(200);
    expect(attrs.height).toBe(150);
  });

  it('image float right with alt roundtrip', () => {
    const original = new Delta()
      .insert({ image: 'photo.jpg' }, { alt: 'Photo', float: 'right', width: 300 })
      .insert('\n');
    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    const op = findEmbedOp(restored.ops, 'image');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBe('right');
    expect(attrs.alt).toBe('Photo');
    expect(attrs.width).toBe(300);
  });

  it('video float left roundtrip', () => {
    const original = new Delta()
      .insert(
        { video: 'https://example.com/video.mp4' },
        { float: 'left', width: '300', height: '200' },
      )
      .insert('\n');
    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    const op = findEmbedOp(restored.ops, 'video');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBe('left');
    expect(attrs.width).toBe('300');
    expect(attrs.height).toBe('200');
  });

  it('image without float stays unchanged in roundtrip', () => {
    const original = new Delta().insert({ image: 'photo.jpg' }, { alt: 'Normal' }).insert('\n');
    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);

    const op = findEmbedOp(restored.ops, 'image');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBeUndefined();
    expect(attrs.alt).toBe('Normal');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Embed float: Edge cases', () => {
  it('multiple float images in document', () => {
    const delta = new Delta()
      .insert({ image: 'left.jpg' }, { float: 'left', width: 200 })
      .insert('\n')
      .insert('Text between images.\n')
      .insert({ image: 'right.jpg' }, { float: 'right', width: 200 })
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('data-float="left"');
    expect(html).toContain('data-float="right"');
    expect(html).toContain('Text between images.');
  });

  it('float none is not emitted', () => {
    const delta = new Delta().insert({ image: 'photo.jpg' }, { float: 'none' }).insert('\n');
    const html = deltaToHtml(delta);
    expect(html).not.toContain('data-float');
  });

  it('float image mixed with inline-box', () => {
    const blockHandlers = createDefaultBlockHandlers();
    const delta = new Delta()
      .insert({ image: 'photo.jpg' }, { float: 'left', width: 200 })
      .insert('\n')
      .insert(
        {
          block: {
            type: 'box',
            content: { ops: [{ insert: 'Box content\n' }] },
          },
        },
        { float: 'right', width: '300px' },
      )
      .insert('\n')
      .insert('Surrounding text.\n');
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('data-float="left"');
    expect(html).toContain('class="inline-box"');
    expect(html).toContain('Surrounding text.');
  });
});
