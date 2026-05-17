/**
 * Soft Line Break — Phase 7 Part 0
 *
 * The `{ softBreak: true }` embed represents a "Shift+Enter" style line
 * break that does NOT split the containing block. This suite covers the
 * full Delta ↔ HTML ↔ Markdown round-trip for the embed across the
 * default registry / converters.
 */

import { describe, it, expect } from 'vitest';
import { Delta } from '@scrider/delta';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { deltaToMarkdown } from '../../src/conversion/markdown/delta-to-markdown';
import { markdownToDelta } from '../../src/conversion/markdown/markdown-to-delta';
import { createDefaultRegistry } from '../../src/schema/defaults';
import { softBreakFormat } from '../../src/schema/formats/embed/soft-break';

describe('Soft line break — format definition', () => {
  it('is registered in the default registry under "softBreak"', () => {
    const registry = createDefaultRegistry();
    const format = registry.get('softBreak');
    expect(format).toBeDefined();
    expect(format).toBe(softBreakFormat);
    expect(format?.scope).toBe('embed');
  });

  it('normalises and validates the boolean value', () => {
    expect(softBreakFormat.normalize?.(true)).toBe(true);
    expect(softBreakFormat.normalize?.(false as unknown as boolean)).toBe(false);
    expect(softBreakFormat.validate?.(true)).toBe(true);
    expect(softBreakFormat.validate?.(false as unknown as boolean)).toBe(false);
  });

  it('renders to "<br data-scrider-embed>"', () => {
    expect(softBreakFormat.render?.(true)).toBe('<br data-scrider-embed>');
  });
});

describe('Soft line break — HTML conversion', () => {
  it('htmlToDelta: inline <br> between text becomes softBreak embed', () => {
    const delta = htmlToDelta('<p>foo<br>bar</p>');
    expect(delta.ops).toEqual([
      { insert: 'foo' },
      { insert: { softBreak: true } },
      { insert: 'bar\n' },
    ]);
  });

  it('htmlToDelta: <br data-scrider-embed> always becomes softBreak', () => {
    const delta = htmlToDelta('<p>foo<br data-scrider-embed>bar</p>');
    expect(delta.ops).toEqual([
      { insert: 'foo' },
      { insert: { softBreak: true } },
      { insert: 'bar\n' },
    ]);
  });

  it('htmlToDelta: placeholder <br> in empty paragraph stays a newline', () => {
    const delta = htmlToDelta('<p><br></p>');
    // The `<br>` inside an otherwise empty <p> is a contenteditable
    // placeholder, not a soft break.
    expect(delta.ops).toEqual([{ insert: '\n' }]);
  });

  it('htmlToDelta: leading <br> followed by text falls back to newline', () => {
    const delta = htmlToDelta('<p><br>bar</p>');
    expect(delta.ops).toEqual([{ insert: '\nbar\n' }]);
  });

  it('htmlToDelta: multiple inline soft breaks in one paragraph', () => {
    const delta = htmlToDelta('<p>a<br>b<br>c</p>');
    expect(delta.ops).toEqual([
      { insert: 'a' },
      { insert: { softBreak: true } },
      { insert: 'b' },
      { insert: { softBreak: true } },
      { insert: 'c\n' },
    ]);
  });

  it('deltaToHtml: softBreak embed renders as <br data-scrider-embed>', () => {
    const delta = new Delta()
      .insert('foo')
      .insert({ softBreak: true })
      .insert('bar\n');
    const html = deltaToHtml(delta);
    expect(html).toBe('<p>foo<br data-scrider-embed>bar</p>');
  });

  it('HTML round-trip: soft break survives delta → html → delta', () => {
    const delta = new Delta()
      .insert('hello')
      .insert({ softBreak: true })
      .insert('world\n');
    const html = deltaToHtml(delta);
    const back = htmlToDelta(html);
    expect(back.ops).toEqual(delta.ops);
  });
});

describe('Soft line break — Markdown conversion', () => {
  it('deltaToMarkdown: default style emits "  \\n" (GFM hard break)', () => {
    const delta = new Delta()
      .insert('foo')
      .insert({ softBreak: true })
      .insert('bar\n');
    expect(deltaToMarkdown(delta)).toBe('foo  \nbar');
  });

  it('deltaToMarkdown: softBreakStyle="html" emits inline <br>', () => {
    const delta = new Delta()
      .insert('foo')
      .insert({ softBreak: true })
      .insert('bar\n');
    expect(deltaToMarkdown(delta, { softBreakStyle: 'html' })).toBe('foo<br>bar');
  });

  it('markdownToDelta: GFM hard break ("  \\n") becomes softBreak embed', async () => {
    const delta = await markdownToDelta('foo  \nbar\n');
    expect(delta.ops).toEqual([
      { insert: 'foo' },
      { insert: { softBreak: true } },
      { insert: 'bar\n' },
    ]);
  });

  it('markdownToDelta: inline <br> becomes softBreak embed', async () => {
    const delta = await markdownToDelta('foo<br>bar\n');
    expect(delta.ops).toEqual([
      { insert: 'foo' },
      { insert: { softBreak: true } },
      { insert: 'bar\n' },
    ]);
  });

  it('Markdown round-trip (spaces): delta → md → delta is stable', async () => {
    const delta = new Delta()
      .insert('one')
      .insert({ softBreak: true })
      .insert('two\n');
    const md = deltaToMarkdown(delta);
    const back = await markdownToDelta(md);
    expect(back.ops).toEqual(delta.ops);
  });

  it('Markdown round-trip (html style): delta → md → delta is stable', async () => {
    const delta = new Delta()
      .insert('one')
      .insert({ softBreak: true })
      .insert('two\n');
    const md = deltaToMarkdown(delta, { softBreakStyle: 'html' });
    const back = await markdownToDelta(md);
    expect(back.ops).toEqual(delta.ops);
  });

  it('Markdown: soft break inside table cell always renders as <br>', () => {
    const delta = new Delta()
      .insert('head1', undefined)
      .insert('\n', { 'table-row': 0, 'table-col': 0, 'table-header': true })
      .insert('head2', undefined)
      .insert('\n', { 'table-row': 0, 'table-col': 1, 'table-header': true })
      .insert('foo')
      .insert({ softBreak: true })
      .insert('bar')
      .insert('\n', { 'table-row': 1, 'table-col': 0 })
      .insert('baz')
      .insert('\n', { 'table-row': 1, 'table-col': 1 });
    const md = deltaToMarkdown(delta);
    // Inside a cell `  \n` would break GFM's pipe-table layout, so the
    // embed must downgrade to inline <br> even with the default style.
    expect(md).toContain('foo<br>bar');
    expect(md).not.toContain('foo  \nbar');
  });
});
