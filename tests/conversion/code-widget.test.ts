/**
 * Code Widget embed tests (Phase 8 Part 3.5)
 *
 * Covers:
 *  - toCodeWidgetEmbedUrl: provider URL → embed URL + idempotency
 *  - Delta → HTML: <iframe data-code-widget …> render + float/width/height
 *  - HTML → Delta: data-code-widget routes to codeWidget (not video)
 *  - Disambiguation: a plain video iframe stays video
 *  - Roundtrip Delta → HTML → Delta
 *  - Markdown: ![Widget](url) ↔ { codeWidget } and attributed HTML fallback
 */
import { describe, it, expect } from 'vitest';
import { Delta } from '@scrider/delta';
import type { InsertOp } from '@scrider/delta';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { toCodeWidgetEmbedUrl } from '../../src/conversion/html/config';
import {
  deltaToMarkdown,
  markdownToDelta,
  isRemarkAvailable,
} from '../../src/conversion/markdown';

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

function embedValue(op: { insert: unknown }, key: string): unknown {
  return (op.insert as Record<string, unknown>)[key];
}

// ============================================================================
// toCodeWidgetEmbedUrl: provider conversion
// ============================================================================

describe('toCodeWidgetEmbedUrl', () => {
  it('StackBlitz: appends ?embed=1', () => {
    expect(toCodeWidgetEmbedUrl('https://stackblitz.com/edit/abc123')).toBe(
      'https://stackblitz.com/edit/abc123?embed=1',
    );
  });

  it('StackBlitz: github URL appends ?embed=1', () => {
    expect(toCodeWidgetEmbedUrl('https://stackblitz.com/github/user/repo')).toBe(
      'https://stackblitz.com/github/user/repo?embed=1',
    );
  });

  it('StackBlitz: keeps existing query, adds embed=1', () => {
    expect(toCodeWidgetEmbedUrl('https://stackblitz.com/edit/abc?file=index.ts')).toBe(
      'https://stackblitz.com/edit/abc?file=index.ts&embed=1',
    );
  });

  it('CodeSandbox: /s/{id} → /embed/{id}', () => {
    expect(toCodeWidgetEmbedUrl('https://codesandbox.io/s/abc123')).toBe(
      'https://codesandbox.io/embed/abc123',
    );
  });

  it('Replit: appends ?embed=true', () => {
    expect(toCodeWidgetEmbedUrl('https://replit.com/@user/my-repl')).toBe(
      'https://replit.com/@user/my-repl?embed=true',
    );
  });

  it('CodePen: /pen/ → /embed/', () => {
    expect(toCodeWidgetEmbedUrl('https://codepen.io/user/pen/abcDEF')).toBe(
      'https://codepen.io/user/embed/abcDEF',
    );
  });

  it('JSFiddle: ensures trailing /embedded/', () => {
    expect(toCodeWidgetEmbedUrl('https://jsfiddle.net/user/abc123/')).toBe(
      'https://jsfiddle.net/user/abc123/embedded/',
    );
  });

  it('unknown host returned unchanged', () => {
    expect(toCodeWidgetEmbedUrl('https://example.com/playground/x')).toBe(
      'https://example.com/playground/x',
    );
  });

  it('empty string → empty string', () => {
    expect(toCodeWidgetEmbedUrl('')).toBe('');
  });

  it('idempotent: embed URLs are returned unchanged', () => {
    const urls = [
      'https://stackblitz.com/edit/abc?embed=1',
      'https://codesandbox.io/embed/abc123',
      'https://replit.com/@user/my-repl?embed=true',
      'https://codepen.io/user/embed/abcDEF',
      'https://jsfiddle.net/user/abc123/embedded/',
    ];
    for (const u of urls) {
      expect(toCodeWidgetEmbedUrl(u)).toBe(u);
      // double application is stable
      expect(toCodeWidgetEmbedUrl(toCodeWidgetEmbedUrl(u))).toBe(u);
    }
  });
});

// ============================================================================
// Delta → HTML
// ============================================================================

describe('Code Widget: Delta → HTML', () => {
  it('renders an iframe carrying data-code-widget', () => {
    const delta = new Delta()
      .insert({ codeWidget: 'https://codesandbox.io/s/abc123' })
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('<iframe');
    expect(html).toContain('data-code-widget');
    // src is converted to the embed form
    expect(html).toContain('src="https://codesandbox.io/embed/abc123"');
    expect(html).toContain('allowfullscreen');
  });

  it('delegates cross-origin-isolated so StackBlitz WebContainer can boot', () => {
    const delta = new Delta()
      .insert({ codeWidget: 'https://stackblitz.com/edit/abc' })
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('allow="');
    expect(html).toContain('cross-origin-isolated');
    // credentialless so the frame loads under a cross-origin-isolated (COEP) host
    expect(html).toContain('credentialless');
  });

  it('applies float + width + height', () => {
    const delta = new Delta()
      .insert(
        { codeWidget: 'https://stackblitz.com/edit/abc' },
        { float: 'right', width: '400px', height: '300px' },
      )
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).toContain('data-float="right"');
    expect(html).toContain('width: 400px');
    expect(html).toContain('height: 300px');
  });

  it('no float/dimensions → no style/data-float', () => {
    const delta = new Delta()
      .insert({ codeWidget: 'https://stackblitz.com/edit/abc' })
      .insert('\n');
    const html = deltaToHtml(delta);
    expect(html).not.toContain('data-float');
    expect(html).not.toContain('style=');
  });
});

// ============================================================================
// HTML → Delta + disambiguation from video
// ============================================================================

describe('Code Widget: HTML → Delta', () => {
  it('iframe with data-code-widget → codeWidget embed', () => {
    const html =
      '<iframe data-code-widget src="https://codesandbox.io/embed/abc123" frameborder="0" allowfullscreen></iframe>';
    const delta = htmlToDelta(html);
    const op = findEmbedOp(delta.ops as InsertOp[], 'codeWidget');
    expect(op).toBeDefined();
    expect(embedValue(op!, 'codeWidget')).toBe('https://codesandbox.io/embed/abc123');
    // must NOT be misread as a video
    expect(findEmbedOp(delta.ops as InsertOp[], 'video')).toBeUndefined();
  });

  it('plain iframe (no marker) stays a video', () => {
    const html =
      '<iframe src="https://www.youtube.com/embed/abc123" frameborder="0" allowfullscreen></iframe>';
    const delta = htmlToDelta(html);
    expect(findEmbedOp(delta.ops as InsertOp[], 'video')).toBeDefined();
    expect(findEmbedOp(delta.ops as InsertOp[], 'codeWidget')).toBeUndefined();
  });

  it('parses data-float + style dimensions', () => {
    const html =
      '<iframe data-code-widget src="https://stackblitz.com/edit/abc?embed=1" data-float="left" style="width: 400px; height: 300px"></iframe>';
    const delta = htmlToDelta(html);
    const op = findEmbedOp(delta.ops as InsertOp[], 'codeWidget');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBe('left');
    expect(attrs.width).toBe('400');
    expect(attrs.height).toBe('300');
  });
});

// ============================================================================
// Roundtrip Delta → HTML → Delta
// ============================================================================

describe('Code Widget: Delta → HTML → Delta roundtrip', () => {
  it('simple widget roundtrips (value becomes the embed URL, idempotent)', () => {
    const original = new Delta()
      .insert({ codeWidget: 'https://codesandbox.io/s/abc123' })
      .insert('\n');
    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);
    const op = findEmbedOp(restored.ops as InsertOp[], 'codeWidget');
    expect(op).toBeDefined();
    expect(embedValue(op!, 'codeWidget')).toBe('https://codesandbox.io/embed/abc123');
  });

  it('attributed widget roundtrips float/width/height', () => {
    const original = new Delta()
      .insert(
        { codeWidget: 'https://stackblitz.com/edit/abc?embed=1' },
        { float: 'right', width: '400', height: '300' },
      )
      .insert('\n');
    const html = deltaToHtml(original);
    const restored = htmlToDelta(html);
    const op = findEmbedOp(restored.ops as InsertOp[], 'codeWidget');
    expect(op).toBeDefined();
    const attrs = getOpAttrs(op!);
    expect(attrs.float).toBe('right');
    expect(attrs.width).toBe('400');
    expect(attrs.height).toBe('300');
  });
});

// ============================================================================
// Markdown roundtrip
// ============================================================================

const runMd = isRemarkAvailable();

describe.runIf(runMd)('Code Widget: Markdown', () => {
  it('Delta → Markdown emits ![Widget](url) for simple widget', () => {
    const delta = new Delta()
      .insert({ codeWidget: 'https://codesandbox.io/s/abc123' })
      .insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('![Widget](https://codesandbox.io/s/abc123)');
  });

  it('Markdown ![Widget](url) → codeWidget embed', async () => {
    const delta = await markdownToDelta('![Widget](https://codesandbox.io/s/abc123)');
    const op = findEmbedOp(delta.ops as InsertOp[], 'codeWidget');
    expect(op).toBeDefined();
    expect(embedValue(op!, 'codeWidget')).toBe('https://codesandbox.io/s/abc123');
  });

  it('![Widget] is case-insensitive', async () => {
    const delta = await markdownToDelta('![WIDGET](https://stackblitz.com/edit/abc)');
    expect(findEmbedOp(delta.ops as InsertOp[], 'codeWidget')).toBeDefined();
  });

  it('attributed widget → HTML iframe fallback, parses back to codeWidget', async () => {
    const delta = new Delta()
      .insert(
        { codeWidget: 'https://stackblitz.com/edit/abc?embed=1' },
        { float: 'left', width: '400' },
      )
      .insert('\n');
    const md = deltaToMarkdown(delta);
    expect(md).toContain('data-code-widget');
    const restored = await markdownToDelta(md);
    const op = findEmbedOp(restored.ops as InsertOp[], 'codeWidget');
    expect(op).toBeDefined();
    expect(getOpAttrs(op!).float).toBe('left');
    expect(findEmbedOp(restored.ops as InsertOp[], 'video')).toBeUndefined();
  });
});
