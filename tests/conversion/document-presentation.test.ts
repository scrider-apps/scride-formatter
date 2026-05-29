import { describe, it, expect } from 'vitest';

import { Delta } from '@scrider/delta';



import { deltaToHtml } from '../../src/conversion/html/delta-to-html';



const listDelta = (): Delta =>

  new Delta().insert('Para').insert('\n').insert('Item').insert('\n', { list: 'bullet' });



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



  it('adds first-line text-indent on p only', () => {

    const html = deltaToHtml(listDelta(), {

      documentPresentation: { textIndentCm: 1.25 },

    });

    expect(html).toMatch(/<p[^>]*text-indent:1\.25cm/);

    expect(html).not.toMatch(/<li[^>]*text-indent/);

    expect(html).not.toMatch(/<ul[^>]*padding-left/);

  });



  it('adds list block indent on top-level ul only', () => {

    const html = deltaToHtml(listDelta(), {

      documentPresentation: { listBlockIndentCm: 1.25 },

    });

    expect(html).toMatch(/<ul[^>]*padding-left:1\.25em/);

    expect(html).toMatch(/<ul[^>]*margin-left:1\.25cm/);

    expect(html).not.toMatch(/<p[^>]*text-indent/);

    expect(html).not.toMatch(/<li[^>]*text-indent/);

  });



  it('applies paragraph first-line and list block indent independently', () => {

    const html = deltaToHtml(listDelta(), {

      documentPresentation: { textIndentCm: 1.0, listBlockIndentCm: 1.25 },

    });

    expect(html).toMatch(/<p[^>]*text-indent:1cm/);

    expect(html).not.toMatch(/<li[^>]*text-indent/);

    expect(html).toMatch(/<ul[^>]*margin-left:1\.25cm/);

  });



  it('omits styles when documentPresentation not set', () => {

    const html = deltaToHtml(new Delta().insert('x').insert('\n'));

    expect(html).toBe('<p>x</p>');

  });



  it('adds margin-bottom after paragraphs from paragraphSpacingAfterEm', () => {

    const delta = new Delta().insert('Line one').insert('\n').insert('Line two').insert('\n');

    const html = deltaToHtml(delta, { documentPresentation: { paragraphSpacingAfterEm: 0.5 } });

    expect(html).toMatch(/<p[^>]*margin-bottom:0\.5em/);

  });



  it('does not add margin-after to headings from paragraphSpacingAfterEm', () => {

    const delta = new Delta()

      .insert('Title')

      .insert('\n', { header: 3 })

      .insert('Body')

      .insert('\n');

    const html = deltaToHtml(delta, { documentPresentation: { paragraphSpacingAfterEm: 0.5 } });

    expect(html).not.toMatch(/<h3[^>]*margin-bottom/);

    expect(html).toMatch(/<p[^>]*margin-bottom:0\.5em/);

  });

});


