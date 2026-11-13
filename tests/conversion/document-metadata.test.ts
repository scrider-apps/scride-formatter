import { describe, it, expect } from 'vitest';

import { Delta } from '@scrider/delta';

import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { documentMetadataToPresentation } from '../../src/conversion/html/document-presentation';
import type { ScriderDocumentMetadata } from '../../src/schema/document-metadata';

const paragraphs = (): Delta =>
  new Delta().insert('Line one').insert('\n').insert('Line two').insert('\n');

const listDelta = (): Delta =>
  new Delta().insert('Item').insert('\n', { list: 'bullet' });

describe('documentMetadataToPresentation', () => {
  it('maps presentation-relevant fields', () => {
    const metadata: ScriderDocumentMetadata = {
      lineSpacing: 1.5,
      paragraphSpacingBeforeEm: 0.25,
      paragraphSpacingAfterEm: 0.5,
      textIndentCm: 1.25,
      listBlockIndentCm: 0.75,
    };

    expect(documentMetadataToPresentation(metadata)).toEqual({
      lineSpacing: 1.5,
      paragraphSpacingBeforeEm: 0.25,
      paragraphSpacingAfterEm: 0.5,
      textIndentCm: 1.25,
      listBlockIndentCm: 0.75,
    });
  });

  it('ignores heading/table fields (projected on other paths)', () => {
    const metadata: ScriderDocumentMetadata = {
      lineSpacing: 2,
      headingAlign: 'center',
      headingBold: true,
      headingSizeGridPreset: 'scrider',
      headingAuto: true,
      tablePresentation: { grid: true },
    };

    expect(documentMetadataToPresentation(metadata)).toEqual({ lineSpacing: 2 });
  });

  it('maps document font; size only in pt', () => {
    expect(
      documentMetadataToPresentation({ defaultFont: 'Georgia', defaultFontSize: '14pt' }),
    ).toEqual({ fontFamily: 'Georgia', fontSize: '14pt' });
    expect(documentMetadataToPresentation({ defaultFontSize: '16px' })).toBeUndefined();
    expect(documentMetadataToPresentation({ defaultFont: ' inherit ' })).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(documentMetadataToPresentation(undefined)).toBeUndefined();
  });

  it('returns undefined when no presentation fields are present', () => {
    expect(documentMetadataToPresentation({ headingAlign: 'left' })).toBeUndefined();
    expect(documentMetadataToPresentation({})).toBeUndefined();
  });
});

describe('deltaToHtml documentMetadata', () => {
  it('projects lineSpacing onto paragraphs, matching documentPresentation', () => {
    const metadata: ScriderDocumentMetadata = { lineSpacing: 1.5 };

    const viaMetadata = deltaToHtml(paragraphs(), { documentMetadata: metadata });
    const viaPresentation = deltaToHtml(paragraphs(), {
      documentPresentation: { lineSpacing: 1.5 },
    });

    expect(viaMetadata).toMatch(/<p[^>]*line-height:1\.5/);
    expect(viaMetadata).toMatch(/mso-line-height-alt:150%/);
    expect(viaMetadata).toBe(viaPresentation);
  });

  it('projects paragraph spacing and first-line indent', () => {
    const metadata: ScriderDocumentMetadata = {
      paragraphSpacingAfterEm: 0.5,
      textIndentCm: 1.25,
    };

    const html = deltaToHtml(paragraphs(), { documentMetadata: metadata });

    expect(html).toMatch(/margin-bottom:0\.5em/);
    expect(html).toMatch(/text-indent:1\.25cm/);
  });

  it('projects document font onto text blocks; headings get the family only', () => {
    const metadata: ScriderDocumentMetadata = {
      defaultFont: 'Times New Roman',
      defaultFontSize: '14pt',
    };
    const delta = new Delta()
      .insert('Title')
      .insert('\n', { header: 1 })
      .insert('Body')
      .insert('\n')
      .insert('Item')
      .insert('\n', { list: 'bullet' })
      .insert('code')
      .insert('\n', { 'code-block': 'plain' });

    const html = deltaToHtml(delta, { documentMetadata: metadata });

    expect(html).toMatch(/<h1[^>]*font-family:'Times New Roman'/);
    expect(html).not.toMatch(/<h1[^>]*font-size:14pt/);
    expect(html).toMatch(/<p[^>]*font-family:'Times New Roman'; font-size:14pt[^>]*>Body/);
    expect(html).toMatch(/<li[^>]*font-family:'Times New Roman'; font-size:14pt/);
    expect(html).not.toMatch(/<pre[^>]*font-family/);
  });

  it('keeps inline font spans over the document font', () => {
    const delta = new Delta().insert('Mono', { font: 'Courier New' }).insert('\n');
    const html = deltaToHtml(delta, { documentMetadata: { defaultFont: 'Georgia' } });

    expect(html).toMatch(/<p[^>]*font-family:Georgia/);
    expect(html).toMatch(/<span[^>]*font-family: ?Courier New[^>]*>Mono/);
  });

  it('projects document font onto simple table cells', () => {
    const delta = new Delta()
      .insert('A')
      .insert('\n', { 'table-row': 1, 'table-col': 1 })
      .insert('B')
      .insert('\n', { 'table-row': 2, 'table-col': 1 });
    const html = deltaToHtml(delta, {
      documentMetadata: { defaultFont: 'Georgia', defaultFontSize: '14pt' },
    });

    expect(html).toMatch(/<td[^>]*font-family:Georgia; font-size:14pt[^>]*>/);
  });

  it('projects listBlockIndentCm onto top-level lists', () => {
    const metadata: ScriderDocumentMetadata = { listBlockIndentCm: 0.75 };

    const viaMetadata = deltaToHtml(listDelta(), { documentMetadata: metadata });
    const viaPresentation = deltaToHtml(listDelta(), {
      documentPresentation: { listBlockIndentCm: 0.75 },
    });

    expect(viaMetadata).toMatch(/margin-left:0\.75cm/);
    expect(viaMetadata).toBe(viaPresentation);
  });

  it('projects list left indent and interval onto top-level lists', () => {
    const metadata: ScriderDocumentMetadata = {
      listLeftIndent: 'marker',
      listIntervalIndent: '1.5em',
    };

    const html = deltaToHtml(listDelta(), { documentMetadata: metadata });

    expect(html).toMatch(/margin-left:2em/);
    expect(html).toMatch(/margin-top:1\.5em/);
    expect(html).toMatch(/margin-bottom:1\.5em/);
    expect(html).not.toMatch(/padding-left/);
  });

  it('stacks list left indent on list block cm', () => {
    const html = deltaToHtml(listDelta(), {
      documentMetadata: { listBlockIndentCm: 0.75, listLeftIndent: 'text' },
    });

    expect(html).toMatch(/margin-left:calc\(0\.75cm \+ 0\.5em\)/);
    expect(html).toMatch(/padding-left:1\.25em/);
  });

  it('gives explicit documentPresentation precedence over documentMetadata', () => {
    const html = deltaToHtml(paragraphs(), {
      documentPresentation: { lineSpacing: 2 },
      documentMetadata: { lineSpacing: 1.5 },
    });

    expect(html).toMatch(/line-height:2/);
    expect(html).not.toMatch(/line-height:1\.5/);
  });

  it('is a no-op on paragraphs when metadata has only heading fields', () => {
    const withMeta = deltaToHtml(paragraphs(), {
      documentMetadata: { headingAlign: 'center' },
    });
    const plain = deltaToHtml(paragraphs());

    expect(withMeta).toBe(plain);
  });

  it('does not apply line-height to headings', () => {
    const delta = new Delta().insert('Title').insert('\n', { header: 2 }).insert('Body').insert('\n');

    const html = deltaToHtml(delta, { documentMetadata: { lineSpacing: 1.5 } });

    expect(html).toMatch(/<h2[^>]*>/);
    expect(html).not.toMatch(/<h2[^>]*line-height/);
  });

  it('projects headingAlign / headingBold / size-grid onto h1–h6', () => {
    const delta = new Delta().insert('Title').insert('\n', { header: 1 });

    const html = deltaToHtml(delta, {
      documentMetadata: {
        headingAlign: 'center',
        headingBold: true,
        headingSizeGridPreset: 'scrider',
      },
    });

    expect(html).toMatch(/<h1[^>]*text-align: center/);
    expect(html).toMatch(/<h1[^>]*font-weight: bold/);
    expect(html).toMatch(/<h1[^>]*font-size: 32pt/);
  });

  it('baked align on heading wins over metadata headingAlign', () => {
    const delta = new Delta().insert('Title').insert('\n', { header: 2, align: 'right' });

    const html = deltaToHtml(delta, {
      documentMetadata: { headingAlign: 'center' },
    });

    expect(html).toMatch(/text-align: right/);
    expect(html).not.toMatch(/text-align: center/);
  });

  it('headingAuto skips size-grid font-size', () => {
    const delta = new Delta().insert('Title').insert('\n', { header: 1 });

    const html = deltaToHtml(delta, {
      documentMetadata: {
        headingAuto: true,
        headingSizeGridPreset: 'scrider',
        headingBold: true,
      },
    });

    expect(html).toMatch(/font-weight: bold/);
    expect(html).not.toMatch(/font-size:/);
  });

  it('does not indent headings from textIndentCm alone', () => {
    const delta = new Delta().insert('Title').insert('\n', { header: 2 }).insert('Body').insert('\n');

    const html = deltaToHtml(delta, { documentMetadata: { textIndentCm: 1.25 } });

    expect(html).toMatch(/<p[^>]*text-indent:1\.25cm/);
    expect(html).not.toMatch(/<h2[^>]*text-indent/);
  });

  it('indents headings when headingTextIndent is on', () => {
    const delta = new Delta().insert('Title').insert('\n', { header: 2 }).insert('Body').insert('\n');

    const html = deltaToHtml(delta, {
      documentMetadata: { textIndentCm: 1.25, headingTextIndent: true },
    });

    expect(html).toMatch(/<h2[^>]*text-indent:1\.25cm/);
    expect(html).toMatch(/<p[^>]*text-indent:1\.25cm/);
  });

  it('headingTextIndent is a no-op without textIndentCm', () => {
    const delta = new Delta().insert('Title').insert('\n', { header: 1 });

    const withFlag = deltaToHtml(delta, { documentMetadata: { headingTextIndent: true } });

    expect(withFlag).toBe(deltaToHtml(delta));
  });

  it('skips heading indent on center / right aligned headings', () => {
    const delta = new Delta()
      .insert('Centered')
      .insert('\n', { header: 1 })
      .insert('Right')
      .insert('\n', { header: 2, align: 'right' });

    const html = deltaToHtml(delta, {
      documentMetadata: { textIndentCm: 1.25, headingTextIndent: true, headingAlign: 'center' },
    });

    expect(html).not.toMatch(/<h1[^>]*text-indent/);
    expect(html).not.toMatch(/<h2[^>]*text-indent/);
  });

  it('baked left align keeps heading indent under a centered policy', () => {
    const delta = new Delta().insert('Title').insert('\n', { header: 3, align: 'left' });

    const html = deltaToHtml(delta, {
      documentMetadata: { textIndentCm: 1, headingTextIndent: true, headingAlign: 'center' },
    });

    expect(html).toMatch(/<h3[^>]*text-indent:1cm/);
  });

  it('per-line scrider-text-indent on a heading wins over heading policy', () => {
    const delta = new Delta()
      .insert('Title')
      .insert('\n', { header: 2, 'scrider-text-indent': '2cm' });

    const html = deltaToHtml(delta, {
      documentMetadata: { textIndentCm: 1.25, headingTextIndent: true },
    });

    expect(html).toMatch(/<h2[^>]*text-indent:2cm/);
    expect(html).not.toMatch(/text-indent:1\.25cm/);
  });

  it('per-line scrider-text-indent on a heading applies without heading policy', () => {
    const delta = new Delta()
      .insert('Title')
      .insert('\n', { header: 2, 'scrider-text-indent': '1.25cm' });

    expect(deltaToHtml(delta)).toMatch(/<h2[^>]*text-indent:1\.25cm/);
  });

  it('uses metadata.tablePresentation when tablePresentation option is omitted', () => {
    const delta = new Delta()
      .insert('A')
      .insert('\n', { 'table-row': 0, 'table-col': 0, 'table-header': true })
      .insert('B')
      .insert('\n', { 'table-row': 1, 'table-col': 0 });

    const html = deltaToHtml(delta, {
      documentMetadata: { tablePresentation: { grid: true, borderColor: '#abc123' } },
    });

    expect(html).toMatch(/border[^"]*#abc123|#abc123/);
  });
});
