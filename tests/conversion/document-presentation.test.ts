import { describe, it, expect } from 'vitest';
import { Delta } from '@scrider/delta';

import { deltaToHtml } from '../../src/conversion/html/delta-to-html';

describe('deltaToHtml documentPresentation', () => {
  it('adds line-height to paragraphs', () => {
    const delta = new Delta().insert('Line one').insert('\n').insert('Line two').insert('\n');
    const html = deltaToHtml(delta, { documentPresentation: { lineSpacing: 1.5 } });
    expect(html).toMatch(/<p[^>]*line-height:1\.5/);
    expect(html).toMatch(/mso-line-height-alt:150%/);
  });

  it('does not add line-height to headings', () => {
    const delta = new Delta()
      .insert('Title')
      .insert('\n', { header: 3 })
      .insert('Body')
      .insert('\n');
    const html = deltaToHtml(delta, { documentPresentation: { lineSpacing: 1.5 } });
    expect(html).toMatch(/<h3>Title<\/h3>/);
    expect(html).not.toMatch(/<h3[^>]*line-height/);
    expect(html).toMatch(/<p[^>]*line-height:1\.5/);
  });

  it('adds text-indent on p and li', () => {
    const delta = new Delta()
      .insert('Para')
      .insert('\n')
      .insert('Item')
      .insert('\n', { list: 'bullet' });
    const html = deltaToHtml(delta, {
      documentPresentation: { lineSpacing: 1.5, textIndentCm: 1.25 },
    });
    expect(html).toMatch(/<p[^>]*text-indent:1\.25cm/);
    expect(html).toMatch(/<li[^>]*text-indent:1\.25cm/);
  });

  it('omits styles when documentPresentation not set', () => {
    const html = deltaToHtml(new Delta().insert('x').insert('\n'));
    expect(html).toBe('<p>x</p>');
  });
});
