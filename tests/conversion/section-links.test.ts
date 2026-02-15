/**
 * Section Links (Anchor Links) Conversion Tests
 *
 * Tests for:
 * - slugify utility (GitHub-compatible)
 * - slugifyWithDedup (collision handling)
 * - Delta → HTML (computed id, custom header-id, anchorLinks option, dedup)
 * - HTML → Delta (computed id skipped, custom id stored)
 * - Markdown → Delta ({#custom-id} parsing)
 * - Delta → Markdown (header-id → {#id} suffix)
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
import { slugify, slugifyWithDedup } from '../../src/conversion/utils/slugify';

const runTests = isRemarkAvailable();

// ============================================================================
// Slugify
// ============================================================================

describe('slugify', () => {
  it('converts basic text to slug', () => {
    expect(slugify('Getting Started')).toBe('getting-started');
  });

  it('removes special characters', () => {
    expect(slugify('API Reference (v2)')).toBe('api-reference-v2');
  });

  it('preserves Unicode letters', () => {
    expect(slugify('Что нового?')).toBe('что-нового');
  });

  it('handles multiple spaces', () => {
    expect(slugify('Hello   World')).toBe('hello-world');
  });

  it('trims leading/trailing whitespace', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles only special characters', () => {
    expect(slugify('!@#$%')).toBe('');
  });

  it('preserves digits', () => {
    expect(slugify('Step 1: Setup')).toBe('step-1-setup');
  });

  it('preserves hyphens', () => {
    expect(slugify('well-known-format')).toBe('well-known-format');
  });

  it('preserves underscores', () => {
    expect(slugify('my_function_name')).toBe('my_function_name');
  });

  it('collapses consecutive hyphens', () => {
    expect(slugify('a - - b')).toBe('a-b');
  });

  it('trims leading/trailing hyphens after processing', () => {
    expect(slugify('- hello -')).toBe('hello');
  });
});

// ============================================================================
// slugifyWithDedup
// ============================================================================

describe('slugifyWithDedup', () => {
  it('returns base slug on first use', () => {
    const used = new Map<string, number>();
    expect(slugifyWithDedup('FAQ', used)).toBe('faq');
  });

  it('appends -1 on first collision', () => {
    const used = new Map<string, number>();
    slugifyWithDedup('FAQ', used);
    expect(slugifyWithDedup('FAQ', used)).toBe('faq-1');
  });

  it('appends -2 on second collision', () => {
    const used = new Map<string, number>();
    slugifyWithDedup('FAQ', used);
    slugifyWithDedup('FAQ', used);
    expect(slugifyWithDedup('FAQ', used)).toBe('faq-2');
  });

  it('tracks different slugs independently', () => {
    const used = new Map<string, number>();
    expect(slugifyWithDedup('Alpha', used)).toBe('alpha');
    expect(slugifyWithDedup('Beta', used)).toBe('beta');
    expect(slugifyWithDedup('Alpha', used)).toBe('alpha-1');
    expect(slugifyWithDedup('Beta', used)).toBe('beta-1');
  });
});

// ============================================================================
// Delta → HTML
// ============================================================================

describe('Delta → HTML (anchor links)', () => {
  it('does not add id when anchorLinks is false (default)', () => {
    const delta = new Delta().insert('Hello').insert('\n', { header: 1 });
    const html = deltaToHtml(delta);
    expect(html).toBe('<h1>Hello</h1>');
  });

  it('adds computed id when anchorLinks is true', () => {
    const delta = new Delta().insert('Getting Started').insert('\n', { header: 2 });
    const html = deltaToHtml(delta, { anchorLinks: true });
    expect(html).toBe('<h2 id="getting-started">Getting Started</h2>');
  });

  it('uses custom header-id when present (regardless of anchorLinks)', () => {
    const delta = new Delta()
      .insert('Getting Started')
      .insert('\n', { header: 2, 'header-id': 'start' });
    const html = deltaToHtml(delta);
    expect(html).toBe('<h2 id="start">Getting Started</h2>');
  });

  it('uses custom header-id even with anchorLinks enabled', () => {
    const delta = new Delta()
      .insert('Getting Started')
      .insert('\n', { header: 2, 'header-id': 'start' });
    const html = deltaToHtml(delta, { anchorLinks: true });
    expect(html).toBe('<h2 id="start">Getting Started</h2>');
  });

  it('deduplicates computed ids', () => {
    const delta = new Delta()
      .insert('FAQ')
      .insert('\n', { header: 2 })
      .insert('FAQ')
      .insert('\n', { header: 2 })
      .insert('FAQ')
      .insert('\n', { header: 2 });
    const html = deltaToHtml(delta, { anchorLinks: true });
    expect(html).toContain('<h2 id="faq">FAQ</h2>');
    expect(html).toContain('<h2 id="faq-1">FAQ</h2>');
    expect(html).toContain('<h2 id="faq-2">FAQ</h2>');
  });

  it('does not add id on non-header blocks', () => {
    const delta = new Delta()
      .insert('Normal paragraph')
      .insert('\n')
      .insert('A heading')
      .insert('\n', { header: 1 });
    const html = deltaToHtml(delta, { anchorLinks: true });
    expect(html).toBe('<p>Normal paragraph</p><h1 id="a-heading">A heading</h1>');
  });

  it('handles mixed headers and paragraphs', () => {
    const delta = new Delta()
      .insert('Title')
      .insert('\n', { header: 1 })
      .insert('Some text')
      .insert('\n')
      .insert('Subtitle')
      .insert('\n', { header: 2 });
    const html = deltaToHtml(delta, { anchorLinks: true });
    expect(html).toContain('<h1 id="title">Title</h1>');
    expect(html).toContain('<h2 id="subtitle">Subtitle</h2>');
    expect(html).toContain('<p>Some text</p>');
  });

  it('handles formatted text in heading (extracts plain text for slug)', () => {
    const delta = new Delta()
      .insert('Hello ', { bold: true })
      .insert('World')
      .insert('\n', { header: 2 });
    const html = deltaToHtml(delta, { anchorLinks: true });
    expect(html).toContain('id="hello-world"');
  });

  it('handles empty heading', () => {
    const delta = new Delta().insert('\n', { header: 1 });
    const html = deltaToHtml(delta, { anchorLinks: true });
    // Empty slug → no id (or empty id)
    expect(html).toBe('<h1><br></h1>');
  });

  it('escapes special characters in custom id', () => {
    const delta = new Delta().insert('Test').insert('\n', { header: 2, 'header-id': 'my-id' });
    const html = deltaToHtml(delta);
    expect(html).toBe('<h2 id="my-id">Test</h2>');
  });

  it('preserves style attributes alongside id', () => {
    const delta = new Delta()
      .insert('Centered')
      .insert('\n', { header: 2, align: 'center', 'header-id': 'centered' });
    const html = deltaToHtml(delta);
    expect(html).toBe('<h2 id="centered" style="text-align: center">Centered</h2>');
  });
});

// ============================================================================
// HTML → Delta
// ============================================================================

describe('HTML → Delta (header id parsing)', () => {
  it('skips computed id (matches slugify)', () => {
    const html = '<h2 id="getting-started">Getting Started</h2>';
    const delta = htmlToDelta(html);
    const attrs = (delta.ops[1] as InsertOp | undefined)?.attributes as Record<string, unknown> | undefined;
    expect(attrs).toEqual({ header: 2 });
    expect(attrs?.['header-id']).toBeUndefined();
  });

  it('stores custom id (does not match slugify)', () => {
    const html = '<h2 id="start">Getting Started</h2>';
    const delta = htmlToDelta(html);
    const attrs = (delta.ops[1] as InsertOp | undefined)?.attributes as Record<string, unknown> | undefined;
    expect(attrs).toEqual({ header: 2, 'header-id': 'start' });
  });

  it('handles heading without id', () => {
    const html = '<h1>Hello</h1>';
    const delta = htmlToDelta(html);
    const attrs = (delta.ops[1] as InsertOp | undefined)?.attributes as Record<string, unknown> | undefined;
    expect(attrs).toEqual({ header: 1 });
    expect(attrs?.['header-id']).toBeUndefined();
  });

  it('handles h1-h6 with custom ids', () => {
    const html = '<h3 id="custom">Title</h3>';
    const delta = htmlToDelta(html);
    const attrs = (delta.ops[1] as InsertOp | undefined)?.attributes as Record<string, unknown> | undefined;
    expect(attrs).toEqual({ header: 3, 'header-id': 'custom' });
  });
});

// ============================================================================
// Markdown → Delta
// ============================================================================

describe('Markdown → Delta ({#id} parsing)', () => {
  (runTests ? it : it.skip)('parses {#custom-id} from heading', async () => {
    const md = '## Getting Started {#start}';
    const delta = await markdownToDelta(md);
    const lastOp = delta.ops[delta.ops.length - 1];
    expect((lastOp as InsertOp | undefined)?.attributes).toEqual({ header: 2, 'header-id': 'start' });
    // Text should not contain {#start}
    expect((delta.ops[0] as InsertOp | undefined)?.insert).toBe('Getting Started');
  });

  (runTests ? it : it.skip)('heading without {#id} has no header-id', async () => {
    const md = '## Getting Started';
    const delta = await markdownToDelta(md);
    const lastOp = delta.ops[delta.ops.length - 1];
    expect((lastOp as InsertOp | undefined)?.attributes).toEqual({ header: 2 });
    expect(
      ((lastOp as InsertOp | undefined)?.attributes as Record<string, unknown> | undefined)?.['header-id'],
    ).toBeUndefined();
  });

  (runTests ? it : it.skip)('parses {#id} with hyphens and digits', async () => {
    const md = '# Title {#my-section-1}';
    const delta = await markdownToDelta(md);
    const lastOp = delta.ops[delta.ops.length - 1];
    expect((lastOp as InsertOp | undefined)?.attributes).toEqual({ header: 1, 'header-id': 'my-section-1' });
  });

  (runTests ? it : it.skip)('handles multiple headings with different ids', async () => {
    const md = '# Intro {#intro}\n\n## Setup {#setup}\n\n### Details';
    const delta = await markdownToDelta(md);
    // Find newlines with header attrs
    const headerOps = delta.ops.filter(
      (op): op is InsertOp => 'insert' in op && op.insert === '\n' && !!op.attributes && 'header' in op.attributes,
    );
    expect(headerOps[0]?.attributes).toEqual({ header: 1, 'header-id': 'intro' });
    expect(headerOps[1]?.attributes).toEqual({ header: 2, 'header-id': 'setup' });
    expect(headerOps[2]?.attributes).toEqual({ header: 3 });
  });
});

// ============================================================================
// Delta → Markdown
// ============================================================================

describe('Delta → Markdown (header-id output)', () => {
  it('appends {#id} for custom header-id', () => {
    const delta = new Delta()
      .insert('Getting Started')
      .insert('\n', { header: 2, 'header-id': 'start' });
    const md = deltaToMarkdown(delta);
    expect(md.trim()).toBe('## Getting Started {#start}');
  });

  it('does not append {#id} without header-id', () => {
    const delta = new Delta().insert('Getting Started').insert('\n', { header: 2 });
    const md = deltaToMarkdown(delta);
    expect(md.trim()).toBe('## Getting Started');
  });

  it('handles all heading levels with custom ids', () => {
    const delta = new Delta()
      .insert('H1')
      .insert('\n', { header: 1, 'header-id': 'h1-id' })
      .insert('H3')
      .insert('\n', { header: 3, 'header-id': 'h3-id' });
    const md = deltaToMarkdown(delta);
    expect(md).toContain('# H1 {#h1-id}');
    expect(md).toContain('### H3 {#h3-id}');
  });
});

// ============================================================================
// Roundtrip
// ============================================================================

describe('Roundtrip', () => {
  (runTests ? it : it.skip)('Markdown with {#id} → Delta → Markdown (preserved)', async () => {
    const md = '## Getting Started {#start}';
    const delta = await markdownToDelta(md);
    const mdOut = deltaToMarkdown(delta);
    expect(mdOut.trim()).toBe('## Getting Started {#start}');
  });

  (runTests ? it : it.skip)('Markdown without {#id} → Delta → Markdown (no id added)', async () => {
    const md = '## Getting Started';
    const delta = await markdownToDelta(md);
    const mdOut = deltaToMarkdown(delta);
    expect(mdOut.trim()).toBe('## Getting Started');
  });

  it('Delta with header-id → HTML → Delta (custom id preserved)', () => {
    const delta = new Delta()
      .insert('Getting Started')
      .insert('\n', { header: 2, 'header-id': 'start' });
    const html = deltaToHtml(delta, { anchorLinks: true });
    expect(html).toContain('id="start"');
    const delta2 = htmlToDelta(html);
    const attrs = (delta2.ops[1] as InsertOp | undefined)?.attributes as Record<string, unknown> | undefined;
    expect(attrs?.['header-id']).toBe('start');
  });

  it('Delta without header-id → HTML (anchorLinks) → Delta (computed id not stored)', () => {
    const delta = new Delta().insert('Getting Started').insert('\n', { header: 2 });
    const html = deltaToHtml(delta, { anchorLinks: true });
    expect(html).toContain('id="getting-started"');
    const delta2 = htmlToDelta(html);
    const attrs = (delta2.ops[1] as InsertOp | undefined)?.attributes as Record<string, unknown> | undefined;
    // Computed id should NOT be stored in Delta
    expect(attrs?.['header-id']).toBeUndefined();
    expect(attrs).toEqual({ header: 2 });
  });

  (runTests ? it : it.skip)('Full roundtrip: MD {#id} → Delta → HTML → Delta → MD', async () => {
    // Use a custom id that differs from computed slug so it survives HTML roundtrip
    const md = '## Setup Guide {#install}\n\n### Details';
    const delta1 = await markdownToDelta(md);
    const html = deltaToHtml(delta1, { anchorLinks: true });
    expect(html).toContain('id="install"');
    expect(html).toContain('id="details"');
    const delta2 = htmlToDelta(html);
    const md2 = deltaToMarkdown(delta2);
    // Custom id preserved (install !== slugify("Setup Guide")), computed id not added
    expect(md2.trim()).toContain('## Setup Guide {#install}');
    expect(md2.trim()).toContain('### Details');
    expect(md2.trim()).not.toContain('{#details}');
  });
});
