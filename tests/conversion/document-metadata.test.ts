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

  it('ignores non-presentation fields (heading policy, fonts)', () => {
    const metadata: ScriderDocumentMetadata = {
      lineSpacing: 2,
      headingAlign: 'center',
      headingBold: true,
      headingSizeGridPreset: 'compact',
      defaultFont: 'Georgia',
      defaultFontSize: '12pt',
    };

    expect(documentMetadataToPresentation(metadata)).toEqual({ lineSpacing: 2 });
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

  it('projects listBlockIndentCm onto top-level lists', () => {
    const metadata: ScriderDocumentMetadata = { listBlockIndentCm: 0.75 };

    const viaMetadata = deltaToHtml(listDelta(), { documentMetadata: metadata });
    const viaPresentation = deltaToHtml(listDelta(), {
      documentPresentation: { listBlockIndentCm: 0.75 },
    });

    expect(viaMetadata).toMatch(/margin-left:0\.75cm/);
    expect(viaMetadata).toBe(viaPresentation);
  });

  it('gives explicit documentPresentation precedence over documentMetadata', () => {
    const html = deltaToHtml(paragraphs(), {
      documentPresentation: { lineSpacing: 2 },
      documentMetadata: { lineSpacing: 1.5 },
    });

    expect(html).toMatch(/line-height:2/);
    expect(html).not.toMatch(/line-height:1\.5/);
  });

  it('is a no-op when metadata has no presentation fields', () => {
    const withMeta = deltaToHtml(paragraphs(), {
      documentMetadata: { headingAlign: 'center', defaultFont: 'Georgia' },
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
});
