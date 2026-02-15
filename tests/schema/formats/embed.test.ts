import { describe, expect, it } from 'vitest';
import {
  blockFormat,
  diagramFormat,
  dividerFormat,
  drawioFormat,
  footnoteRefFormat,
  formulaFormat,
  imageFormat,
  videoFormat,
} from '../../../src/schema/formats/embed';
import { getAdapter } from '../../../src/conversion/adapters';
import type { DOMElement } from '../../../src/conversion/adapters/types';
import { isElement } from '../../../src/conversion/adapters/types';

/** Helper: parse HTML string and return the first element as DOMElement */
function parseElement(html: string): DOMElement {
  const adapter = getAdapter();
  const fragment = adapter.parseHTML(html);
  const node = fragment.firstChild!;
  if (!isElement(node)) throw new Error(`Expected element, got nodeType=${String(node.nodeType)}`);
  return node;
}

describe('Embed Formats', () => {
  describe('imageFormat', () => {
    it('should have correct name and scope', () => {
      expect(imageFormat.name).toBe('image');
      expect(imageFormat.scope).toBe('embed');
    });

    it('should normalize by trimming', () => {
      expect(imageFormat.normalize!('  https://example.com/img.png  ')).toBe(
        'https://example.com/img.png',
      );
    });

    it('should validate absolute URLs', () => {
      expect(imageFormat.validate!('https://example.com/image.png')).toBe(true);
      expect(imageFormat.validate!('http://example.com/image.jpg')).toBe(true);
    });

    it('should validate relative URLs', () => {
      expect(imageFormat.validate!('/images/photo.png')).toBe(true);
      expect(imageFormat.validate!('./photo.png')).toBe(true);
      expect(imageFormat.validate!('../photo.png')).toBe(true);
    });

    it('should validate data URIs', () => {
      expect(imageFormat.validate!('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
      expect(imageFormat.validate!('data:image/jpeg;base64,/9j/4AAQ=')).toBe(true);
    });

    it('should validate protocol-relative URLs', () => {
      expect(imageFormat.validate!('//example.com/image.png')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(imageFormat.validate!('')).toBe(false);
      expect(imageFormat.validate!('not a url')).toBe(false);
      expect(imageFormat.validate!('ftp://example.com/image.png')).toBe(false);
    });
  });

  describe('videoFormat', () => {
    it('should have correct name and scope', () => {
      expect(videoFormat.name).toBe('video');
      expect(videoFormat.scope).toBe('embed');
    });

    it('should normalize by trimming', () => {
      expect(videoFormat.normalize!('  https://youtube.com/watch?v=abc  ')).toBe(
        'https://youtube.com/watch?v=abc',
      );
    });

    it('should validate absolute URLs', () => {
      expect(videoFormat.validate!('https://youtube.com/watch?v=abc')).toBe(true);
      expect(videoFormat.validate!('https://vimeo.com/12345')).toBe(true);
    });

    it('should validate relative URLs', () => {
      expect(videoFormat.validate!('/videos/intro.mp4')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(videoFormat.validate!('')).toBe(false);
      expect(videoFormat.validate!('not a url')).toBe(false);
    });
  });

  describe('formulaFormat', () => {
    it('should have correct name and scope', () => {
      expect(formulaFormat.name).toBe('formula');
      expect(formulaFormat.scope).toBe('embed');
    });

    it('should normalize by trimming', () => {
      expect(formulaFormat.normalize!('  E = mc^2  ')).toBe('E = mc^2');
    });

    it('should validate simple formulas', () => {
      expect(formulaFormat.validate!('E = mc^2')).toBe(true);
      expect(formulaFormat.validate!('x^2 + y^2 = z^2')).toBe(true);
    });

    it('should validate LaTeX commands', () => {
      expect(formulaFormat.validate!('\\frac{1}{2}')).toBe(true);
      expect(formulaFormat.validate!('\\sqrt{x}')).toBe(true);
      expect(formulaFormat.validate!('\\sum_{i=1}^{n} x_i')).toBe(true);
    });

    it('should validate balanced braces', () => {
      expect(formulaFormat.validate!('{a + b}')).toBe(true);
      expect(formulaFormat.validate!('{{nested}}')).toBe(true);
    });

    it('should reject unbalanced braces', () => {
      expect(formulaFormat.validate!('{unclosed')).toBe(false);
      expect(formulaFormat.validate!('extra}')).toBe(false);
      expect(formulaFormat.validate!('{{{}')).toBe(false);
    });

    it('should reject unbalanced brackets', () => {
      expect(formulaFormat.validate!('[unclosed')).toBe(false);
      expect(formulaFormat.validate!('extra]')).toBe(false);
    });

    it('should reject empty formulas', () => {
      expect(formulaFormat.validate!('')).toBe(false);
      expect(formulaFormat.validate!('   ')).toBe(false);
    });
  });

  describe('blockFormat', () => {
    it('should have correct name and scope', () => {
      expect(blockFormat.name).toBe('block');
      expect(blockFormat.scope).toBe('embed');
    });

    it('should validate objects with type string', () => {
      expect(blockFormat.validate!({ type: 'table' })).toBe(true);
      expect(blockFormat.validate!({ type: 'columns', data: [1, 2] })).toBe(true);
      expect(blockFormat.validate!({ type: 'diagram', source: 'graph TD;' })).toBe(true);
    });

    it('should validate objects with type and additional properties', () => {
      expect(
        blockFormat.validate!({
          type: 'table',
          colWidths: [50, 50],
          headerRows: 1,
          cells: { '0:0': { ops: [{ insert: '\n' }] } },
        }),
      ).toBe(true);
    });

    it('should reject non-objects', () => {
      expect(blockFormat.validate!('string' as unknown as Record<string, unknown>)).toBe(false);
      expect(blockFormat.validate!(42 as unknown as Record<string, unknown>)).toBe(false);
      expect(blockFormat.validate!(true as unknown as Record<string, unknown>)).toBe(false);
      expect(blockFormat.validate!(null as unknown as Record<string, unknown>)).toBe(false);
    });

    it('should reject arrays', () => {
      expect(blockFormat.validate!([] as unknown as Record<string, unknown>)).toBe(false);
      expect(blockFormat.validate!([{ type: 'table' }] as unknown as Record<string, unknown>)).toBe(
        false,
      );
    });

    it('should reject objects without type', () => {
      expect(blockFormat.validate!({} as Record<string, unknown>)).toBe(false);
      expect(blockFormat.validate!({ name: 'table' } as Record<string, unknown>)).toBe(false);
    });

    it('should reject objects with non-string type', () => {
      expect(blockFormat.validate!({ type: 42 })).toBe(false);
      expect(blockFormat.validate!({ type: true })).toBe(false);
      expect(blockFormat.validate!({ type: null })).toBe(false);
      expect(blockFormat.validate!({ type: {} })).toBe(false);
    });

    it('should reject objects with empty type', () => {
      expect(blockFormat.validate!({ type: '' })).toBe(false);
    });
  });

  // ── render / match tests ──────────────────────────────────

  describe('imageFormat.render', () => {
    it('should render basic image', () => {
      expect(imageFormat.render!('https://example.com/img.png')).toBe(
        '<img src="https://example.com/img.png">',
      );
    });

    it('should render with alt, width, height', () => {
      const html = imageFormat.render!('https://example.com/img.png', {
        alt: 'Photo',
        width: 200,
        height: 100,
      });
      expect(html).toContain('alt="Photo"');
      expect(html).toContain('width="200"');
      expect(html).toContain('height="100"');
    });

    it('should render with float', () => {
      const html = imageFormat.render!('https://example.com/img.png', { float: 'left' });
      expect(html).toContain('data-float="left"');
    });
  });

  describe('imageFormat.match', () => {
    it('should match <img> element', () => {
      const el = parseElement('<img src="https://example.com/img.png">');
      const result = imageFormat.match!(el);
      expect(result).toEqual({ value: 'https://example.com/img.png' });
    });

    it('should extract alt, width, height, float', () => {
      const el = parseElement(
        '<img src="https://example.com/img.png" alt="Photo" width="200" height="100" data-float="left">',
      );
      const result = imageFormat.match!(el);
      expect(result).toEqual({
        value: 'https://example.com/img.png',
        attributes: { alt: 'Photo', width: 200, height: 100, float: 'left' },
      });
    });

    it('should return null for non-img element', () => {
      const el = parseElement('<span>text</span>');
      expect(imageFormat.match!(el)).toBeNull();
    });

    it('should return null for img without src', () => {
      const el = parseElement('<img alt="no src">');
      expect(imageFormat.match!(el)).toBeNull();
    });
  });

  describe('videoFormat.render', () => {
    it('should render YouTube as iframe', () => {
      const html = videoFormat.render!('https://www.youtube.com/watch?v=abc');
      expect(html).toContain('<iframe');
      expect(html).toContain('youtube.com/embed/abc');
    });

    it('should render direct video as <video>', () => {
      const html = videoFormat.render!('https://example.com/video.mp4');
      expect(html).toContain('<video');
      expect(html).toContain('controls');
    });
  });

  describe('videoFormat.match', () => {
    it('should match <iframe> element', () => {
      const el = parseElement(
        '<iframe src="https://www.youtube.com/embed/abc" frameborder="0"></iframe>',
      );
      const result = videoFormat.match!(el);
      expect(result).toEqual({ value: 'https://www.youtube.com/watch?v=abc' });
    });

    it('should match <video> element', () => {
      const el = parseElement('<video src="https://example.com/video.mp4" controls></video>');
      const result = videoFormat.match!(el);
      expect(result).toEqual({ value: 'https://example.com/video.mp4' });
    });

    it('should return null for non-video element', () => {
      const el = parseElement('<div>text</div>');
      expect(videoFormat.match!(el)).toBeNull();
    });
  });

  describe('formulaFormat.render', () => {
    it('should render formula span', () => {
      const html = formulaFormat.render!('E = mc^2');
      expect(html).toBe('<span class="formula" data-formula="E = mc^2">E = mc^2</span>');
    });

    it('should escape HTML in formula', () => {
      const html = formulaFormat.render!('a < b');
      expect(html).toContain('a &lt; b');
    });
  });

  describe('formulaFormat.match', () => {
    it('should match <span class="formula">', () => {
      const el = parseElement('<span class="formula" data-formula="E = mc^2">E = mc^2</span>');
      const result = formulaFormat.match!(el);
      expect(result).toEqual({ value: 'E = mc^2' });
    });

    it('should return null for span without formula class', () => {
      const el = parseElement('<span class="other" data-formula="x">x</span>');
      expect(formulaFormat.match!(el)).toBeNull();
    });

    it('should return null for non-span', () => {
      const el = parseElement('<div class="formula">x</div>');
      expect(formulaFormat.match!(el)).toBeNull();
    });
  });

  describe('dividerFormat.render', () => {
    it('should render <hr>', () => {
      expect(dividerFormat.render!(true)).toBe('<hr>');
    });
  });

  describe('dividerFormat.match', () => {
    it('should match <hr> element', () => {
      const el = parseElement('<hr>');
      const result = dividerFormat.match!(el);
      expect(result).toEqual({ value: true });
    });

    it('should return null for non-hr element', () => {
      const el = parseElement('<br>');
      expect(dividerFormat.match!(el)).toBeNull();
    });
  });

  describe('diagramFormat.render', () => {
    it('should render diagram span', () => {
      const html = diagramFormat.render!('graph TD\n  A-->B');
      expect(html).toContain('class="diagram"');
      expect(html).toContain('data-diagram=');
    });
  });

  describe('diagramFormat.match', () => {
    it('should match <span class="diagram">', () => {
      const el = parseElement('<span class="diagram" data-diagram="graph TD">graph TD</span>');
      const result = diagramFormat.match!(el);
      expect(result).toEqual({ value: 'graph TD' });
    });

    it('should return null for non-diagram span', () => {
      const el = parseElement('<span class="formula" data-diagram="x">x</span>');
      expect(diagramFormat.match!(el)).toBeNull();
    });
  });

  describe('drawioFormat.render', () => {
    it('should render drawio span', () => {
      const html = drawioFormat.render!('./assets/diagram.drawio');
      expect(html).toContain('class="drawio"');
      expect(html).toContain('data-drawio-src="./assets/diagram.drawio"');
    });

    it('should render with alt attribute', () => {
      const html = drawioFormat.render!('./diagram.drawio', { alt: 'My Diagram' });
      expect(html).toContain('data-alt="My Diagram"');
    });
  });

  describe('drawioFormat.match', () => {
    it('should match <span class="drawio">', () => {
      const el = parseElement('<span class="drawio" data-drawio-src="./diagram.drawio"></span>');
      const result = drawioFormat.match!(el);
      expect(result).toEqual({ value: './diagram.drawio' });
    });

    it('should extract alt attribute', () => {
      const el = parseElement(
        '<span class="drawio" data-drawio-src="./d.drawio" data-alt="My Diagram"></span>',
      );
      const result = drawioFormat.match!(el);
      expect(result).toEqual({
        value: './d.drawio',
        attributes: { alt: 'My Diagram' },
      });
    });
  });

  describe('footnoteRefFormat.render', () => {
    it('should render footnote reference', () => {
      const html = footnoteRefFormat.render!('1');
      expect(html).toContain('class="footnote-ref"');
      expect(html).toContain('href="#fn-1"');
      expect(html).toContain('id="fnref-1"');
      expect(html).toContain('[1]');
    });
  });

  describe('footnoteRefFormat.match', () => {
    it('should match <sup class="footnote-ref">', () => {
      const el = parseElement(
        '<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">[1]</a></sup>',
      );
      const result = footnoteRefFormat.match!(el);
      expect(result).toEqual({ value: '1' });
    });

    it('should return null for non-sup element', () => {
      const el = parseElement('<span class="footnote-ref">1</span>');
      expect(footnoteRefFormat.match!(el)).toBeNull();
    });
  });
});
