/**
 * RenderProfile — export vs. editor
 *
 * `deltaToHtml` (export) produces self-contained markup with document/table
 * presentation projected to inline CSS. `deltaToDom` (editor) drops that
 * presentation — the editor applies it live via CSS custom properties on the
 * container — while keeping per-block baked attributes that are part of the
 * document content.
 */

import { describe, it, expect } from 'vitest';
import { Delta } from '@scrider/delta';

import {
  deltaToHtml,
  deltaToDom,
  renderDelta,
} from '../../src/conversion/html/delta-to-html';

describe('renderDelta / RenderProfile', () => {
  it("export profile is identical to deltaToHtml (byte-for-byte)", () => {
    const delta = new Delta().insert('x').insert('\n');
    const options = { documentPresentation: { lineSpacing: 1.5, textIndentCm: 1.25 } };

    expect(renderDelta(delta, 'export', options)).toBe(deltaToHtml(delta, options));
  });

  it('deltaToDom equals renderDelta(delta, "editor", ...)', () => {
    const delta = new Delta().insert('x').insert('\n');
    const options = { documentPresentation: { lineSpacing: 1.5 } };

    expect(deltaToDom(delta, options)).toBe(renderDelta(delta, 'editor', options));
  });
});

describe('deltaToDom (editor profile) — document presentation dropped', () => {
  it('drops documentPresentation line spacing / indent (applied via CSS vars)', () => {
    const delta = new Delta().insert('x').insert('\n');

    const dom = deltaToDom(delta, {
      documentPresentation: { lineSpacing: 1.5, textIndentCm: 1.25 },
    });

    expect(dom).toBe('<p>x</p>');
    expect(dom).not.toMatch(/line-height/);
    expect(dom).not.toMatch(/text-indent/);
  });

  it('drops documentMetadata projection (applied via CSS vars)', () => {
    const delta = new Delta().insert('x').insert('\n');

    const dom = deltaToDom(delta, { documentMetadata: { lineSpacing: 2 } });

    expect(dom).toBe('<p>x</p>');
  });

  it('drops tablePresentation — bare <table> for the editor surface', () => {
    const delta = new Delta()
      .insert('A')
      .insert('\n', { 'table-row': 0, 'table-col': 0 });

    const dom = deltaToDom(delta, {
      tablePresentation: { grid: true, headerShade: true },
    });

    expect(dom).toMatch(/<table>/);
  });
});

describe('deltaToDom (editor profile) — content-level attributes preserved', () => {
  it('keeps per-block baked scrider-line-height and scrider-text-indent', () => {
    const delta = new Delta()
      .insert('x')
      .insert('\n', { 'scrider-line-height': '2', 'scrider-text-indent': '1.25cm' });

    const dom = deltaToDom(delta);

    expect(dom).toMatch(/line-height:2/);
    expect(dom).toMatch(/text-indent:1\.25cm/);
  });

  it('renders softBreak as <br data-scrider-embed> without an embed-renderer override', () => {
    const delta = new Delta()
      .insert('foo')
      .insert({ softBreak: true })
      .insert('bar\n');

    const dom = deltaToDom(delta);

    expect(dom).toBe('<p>foo<br data-scrider-embed>bar</p>');
  });
});
