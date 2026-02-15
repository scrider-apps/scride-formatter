import { describe, expect, it } from 'vitest';
import { htmlToDelta } from '../../../src/conversion/html/html-to-delta';

describe('htmlToDelta', () => {
  describe('basic text', () => {
    it('converts paragraph to text with newline', () => {
      const delta = htmlToDelta('<p>Hello World</p>');

      expect(delta.ops).toEqual([{ insert: 'Hello World\n' }]);
    });

    it('converts multiple paragraphs', () => {
      const delta = htmlToDelta('<p>First</p><p>Second</p>');

      // Delta concatenates adjacent text without attributes
      expect(delta.ops).toEqual([{ insert: 'First\nSecond\n' }]);
    });

    it('handles empty paragraph', () => {
      const delta = htmlToDelta('<p></p>');

      expect(delta.ops).toEqual([{ insert: '\n' }]);
    });

    it('normalizes whitespace', () => {
      const delta = htmlToDelta('<p>Hello    World</p>');

      expect(delta.ops).toEqual([{ insert: 'Hello World\n' }]);
    });

    it('trims leading whitespace at line start', () => {
      const delta = htmlToDelta('<p>   Hello</p>');

      expect(delta.ops).toEqual([{ insert: 'Hello\n' }]);
    });

    it('converts br to newline', () => {
      const delta = htmlToDelta('<p>Line 1<br>Line 2</p>');

      // br creates newline within paragraph, paragraph adds final newline
      expect(delta.ops).toEqual([{ insert: 'Line 1\nLine 2\n' }]);
    });

    it('handles plain text without wrapper', () => {
      const delta = htmlToDelta('Just text');

      expect(delta.ops).toEqual([{ insert: 'Just text\n' }]);
    });
  });

  describe('inline formatting', () => {
    it('converts strong to bold', () => {
      const delta = htmlToDelta('<p><strong>Bold</strong></p>');

      expect(delta.ops).toEqual([{ insert: 'Bold', attributes: { bold: true } }, { insert: '\n' }]);
    });

    it('converts b to bold', () => {
      const delta = htmlToDelta('<p><b>Bold</b></p>');

      expect(delta.ops).toEqual([{ insert: 'Bold', attributes: { bold: true } }, { insert: '\n' }]);
    });

    it('converts em to italic', () => {
      const delta = htmlToDelta('<p><em>Italic</em></p>');

      expect(delta.ops).toEqual([
        { insert: 'Italic', attributes: { italic: true } },
        { insert: '\n' },
      ]);
    });

    it('converts i to italic', () => {
      const delta = htmlToDelta('<p><i>Italic</i></p>');

      expect(delta.ops).toEqual([
        { insert: 'Italic', attributes: { italic: true } },
        { insert: '\n' },
      ]);
    });

    it('converts u to underline', () => {
      const delta = htmlToDelta('<p><u>Underlined</u></p>');

      expect(delta.ops).toEqual([
        { insert: 'Underlined', attributes: { underline: true } },
        { insert: '\n' },
      ]);
    });

    it('converts ins to underline', () => {
      const delta = htmlToDelta('<p><ins>Inserted</ins></p>');

      expect(delta.ops).toEqual([
        { insert: 'Inserted', attributes: { underline: true } },
        { insert: '\n' },
      ]);
    });

    it('converts sub to subscript', () => {
      const delta = htmlToDelta('<p>H<sub>2</sub>O</p>');

      expect(delta.ops).toEqual([
        { insert: 'H' },
        { insert: '2', attributes: { subscript: true } },
        { insert: 'O\n' },
      ]);
    });

    it('converts sup to superscript', () => {
      const delta = htmlToDelta('<p>E=mc<sup>2</sup></p>');

      expect(delta.ops).toEqual([
        { insert: 'E=mc' },
        { insert: '2', attributes: { superscript: true } },
        { insert: '\n' },
      ]);
    });

    it('converts mark to mark', () => {
      const delta = htmlToDelta('<p><mark>Highlighted</mark></p>');

      expect(delta.ops).toEqual([
        { insert: 'Highlighted', attributes: { mark: true } },
        { insert: '\n' },
      ]);
    });

    it('converts s to strike', () => {
      const delta = htmlToDelta('<p><s>Strikethrough</s></p>');

      expect(delta.ops).toEqual([
        { insert: 'Strikethrough', attributes: { strike: true } },
        { insert: '\n' },
      ]);
    });

    it('converts strike to strike', () => {
      const delta = htmlToDelta('<p><strike>Strikethrough</strike></p>');

      expect(delta.ops).toEqual([
        { insert: 'Strikethrough', attributes: { strike: true } },
        { insert: '\n' },
      ]);
    });

    it('converts del to strike', () => {
      const delta = htmlToDelta('<p><del>Deleted</del></p>');

      expect(delta.ops).toEqual([
        { insert: 'Deleted', attributes: { strike: true } },
        { insert: '\n' },
      ]);
    });

    it('converts code to code', () => {
      const delta = htmlToDelta('<p><code>const x = 1</code></p>');

      expect(delta.ops).toEqual([
        { insert: 'const x = 1', attributes: { code: true } },
        { insert: '\n' },
      ]);
    });

    it('converts nested formatting', () => {
      const delta = htmlToDelta('<p><strong><em>Bold Italic</em></strong></p>');

      expect(delta.ops).toEqual([
        { insert: 'Bold Italic', attributes: { bold: true, italic: true } },
        { insert: '\n' },
      ]);
    });

    it('converts mixed inline content', () => {
      const delta = htmlToDelta('<p>Normal <strong>bold</strong> normal</p>');

      expect(delta.ops).toEqual([
        { insert: 'Normal ' },
        { insert: 'bold', attributes: { bold: true } },
        { insert: ' normal\n' },
      ]);
    });
  });

  describe('links', () => {
    it('converts link', () => {
      const delta = htmlToDelta('<p><a href="https://example.com">Link</a></p>');

      expect(delta.ops).toEqual([
        { insert: 'Link', attributes: { link: 'https://example.com' } },
        { insert: '\n' },
      ]);
    });

    it('converts link without href', () => {
      const delta = htmlToDelta('<p><a>No href</a></p>');

      expect(delta.ops).toEqual([{ insert: 'No href\n' }]);
    });

    it('converts link with formatting', () => {
      const delta = htmlToDelta(
        '<p><a href="https://example.com"><strong>Bold Link</strong></a></p>',
      );

      expect(delta.ops).toEqual([
        {
          insert: 'Bold Link',
          attributes: { link: 'https://example.com', bold: true },
        },
        { insert: '\n' },
      ]);
    });
  });

  describe('colors and styles', () => {
    it('converts color style', () => {
      const delta = htmlToDelta('<p><span style="color: red">Red</span></p>');

      expect(delta.ops).toEqual([
        { insert: 'Red', attributes: { color: 'red' } },
        { insert: '\n' },
      ]);
    });

    it('converts background style', () => {
      const delta = htmlToDelta('<p><span style="background-color: yellow">Highlighted</span></p>');

      expect(delta.ops).toEqual([
        { insert: 'Highlighted', attributes: { background: 'yellow' } },
        { insert: '\n' },
      ]);
    });
  });

  describe('headers', () => {
    it('converts h1', () => {
      const delta = htmlToDelta('<h1>Title</h1>');

      // Block attributes apply to newline only
      expect(delta.ops).toEqual([{ insert: 'Title' }, { insert: '\n', attributes: { header: 1 } }]);
    });

    it('converts h2-h6', () => {
      for (let level = 2; level <= 6; level++) {
        const delta = htmlToDelta(`<h${level}>Heading</h${level}>`);
        expect(delta.ops).toEqual([
          { insert: 'Heading' },
          { insert: '\n', attributes: { header: level } },
        ]);
      }
    });

    it('converts header with inline formatting', () => {
      const delta = htmlToDelta('<h1><strong>Bold</strong> Title</h1>');

      expect(delta.ops).toEqual([
        { insert: 'Bold', attributes: { bold: true } },
        { insert: ' Title' },
        { insert: '\n', attributes: { header: 1 } },
      ]);
    });
  });

  describe('blockquote', () => {
    it('converts blockquote', () => {
      const delta = htmlToDelta('<blockquote>Quote</blockquote>');

      // Block attributes apply to newline only
      expect(delta.ops).toEqual([
        { insert: 'Quote' },
        { insert: '\n', attributes: { blockquote: true } },
      ]);
    });

    it('converts blockquote with formatting', () => {
      const delta = htmlToDelta('<blockquote><em>Italic quote</em></blockquote>');

      expect(delta.ops).toEqual([
        { insert: 'Italic quote', attributes: { italic: true } },
        { insert: '\n', attributes: { blockquote: true } },
      ]);
    });
  });

  describe('code block', () => {
    it('converts pre to code-block', () => {
      const delta = htmlToDelta('<pre>const x = 1;</pre>');

      expect(delta.ops).toEqual([
        { insert: 'const x = 1;' },
        { insert: '\n', attributes: { 'code-block': true } },
      ]);
    });

    it('converts pre>code to code-block', () => {
      const delta = htmlToDelta('<pre><code>const x = 1;\n</code></pre>');

      expect(delta.ops).toEqual([
        { insert: 'const x = 1;' },
        { insert: '\n', attributes: { 'code-block': true } },
      ]);
    });

    it('extracts language from code class', () => {
      const delta = htmlToDelta(
        '<pre data-language="javascript"><code class="language-javascript">const x = 1;\n</code></pre>',
      );

      expect(delta.ops).toEqual([
        { insert: 'const x = 1;' },
        { insert: '\n', attributes: { 'code-block': 'javascript' } },
      ]);
    });

    it('parses multi-line code block', () => {
      const delta = htmlToDelta(
        '<pre data-language="javascript"><code class="language-javascript">const a = 1;\nconst b = 2;\n</code></pre>',
      );

      expect(delta.ops).toEqual([
        { insert: 'const a = 1;' },
        { insert: '\n', attributes: { 'code-block': 'javascript' } },
        { insert: 'const b = 2;' },
        { insert: '\n', attributes: { 'code-block': 'javascript' } },
      ]);
    });

    it('extracts language from code class without data-language', () => {
      const delta = htmlToDelta('<pre><code class="language-python">x = 1\n</code></pre>');

      expect(delta.ops).toEqual([
        { insert: 'x = 1' },
        { insert: '\n', attributes: { 'code-block': 'python' } },
      ]);
    });

    it('parses mermaid code block', () => {
      const delta = htmlToDelta(
        '<pre data-language="mermaid"><code class="language-mermaid">graph TD\n    A-->B\n</code></pre>',
      );

      expect(delta.ops).toEqual([
        { insert: 'graph TD' },
        { insert: '\n', attributes: { 'code-block': 'mermaid' } },
        { insert: '    A-->B' },
        { insert: '\n', attributes: { 'code-block': 'mermaid' } },
      ]);
    });
  });

  describe('lists', () => {
    it('converts unordered list', () => {
      const delta = htmlToDelta('<ul><li>Item 1</li><li>Item 2</li></ul>');

      // Block attributes apply to newline only
      expect(delta.ops).toEqual([
        { insert: 'Item 1' },
        { insert: '\n', attributes: { list: 'bullet' } },
        { insert: 'Item 2' },
        { insert: '\n', attributes: { list: 'bullet' } },
      ]);
    });

    it('converts ordered list', () => {
      const delta = htmlToDelta('<ol><li>First</li><li>Second</li></ol>');

      expect(delta.ops).toEqual([
        { insert: 'First' },
        { insert: '\n', attributes: { list: 'ordered' } },
        { insert: 'Second' },
        { insert: '\n', attributes: { list: 'ordered' } },
      ]);
    });

    it('converts checked list item', () => {
      const delta = htmlToDelta('<ul><li data-checked="true">Done</li></ul>');

      expect(delta.ops).toEqual([
        { insert: 'Done' },
        { insert: '\n', attributes: { list: 'checked' } },
      ]);
    });

    it('converts unchecked list item', () => {
      const delta = htmlToDelta('<ul><li data-checked="false">Todo</li></ul>');

      expect(delta.ops).toEqual([
        { insert: 'Todo' },
        { insert: '\n', attributes: { list: 'unchecked' } },
      ]);
    });

    it('converts nested list', () => {
      const delta = htmlToDelta('<ul><li>Parent<ul><li>Child</li></ul></li></ul>');

      expect(delta.ops).toEqual([
        { insert: 'Parent' },
        { insert: '\n', attributes: { list: 'bullet' } },
        { insert: 'Child' },
        { insert: '\n', attributes: { list: 'bullet', indent: 1 } },
      ]);
    });

    it('converts list with formatting', () => {
      const delta = htmlToDelta('<ul><li><strong>Bold item</strong></li></ul>');

      expect(delta.ops).toEqual([
        { insert: 'Bold item', attributes: { bold: true } },
        { insert: '\n', attributes: { list: 'bullet' } },
      ]);
    });
  });

  describe('alignment', () => {
    it('converts center alignment', () => {
      const delta = htmlToDelta('<p style="text-align: center">Centered</p>');

      // Block attributes apply to newline only
      expect(delta.ops).toEqual([
        { insert: 'Centered' },
        { insert: '\n', attributes: { align: 'center' } },
      ]);
    });

    it('converts right alignment', () => {
      const delta = htmlToDelta('<p style="text-align: right">Right</p>');

      expect(delta.ops).toEqual([
        { insert: 'Right' },
        { insert: '\n', attributes: { align: 'right' } },
      ]);
    });

    it('converts justify alignment', () => {
      const delta = htmlToDelta('<p style="text-align: justify">Justified</p>');

      expect(delta.ops).toEqual([
        { insert: 'Justified' },
        { insert: '\n', attributes: { align: 'justify' } },
      ]);
    });
  });

  describe('embeds', () => {
    it('converts image', () => {
      const delta = htmlToDelta('<p><img src="https://example.com/img.png"></p>');

      expect(delta.ops).toEqual([
        { insert: { image: 'https://example.com/img.png' } },
        { insert: '\n' },
      ]);
    });

    it('converts image with alt and dimensions', () => {
      const delta = htmlToDelta(
        '<p><img src="test.png" alt="Description" width="200" height="100"></p>',
      );

      expect(delta.ops).toEqual([
        {
          insert: { image: 'test.png' },
          attributes: { alt: 'Description', width: 200, height: 100 },
        },
        { insert: '\n' },
      ]);
    });

    it('converts video', () => {
      const delta = htmlToDelta('<p><video src="https://example.com/video.mp4"></video></p>');

      expect(delta.ops).toEqual([
        { insert: { video: 'https://example.com/video.mp4' } },
        { insert: '\n' },
      ]);
    });

    it('converts iframe', () => {
      // YouTube embed URL is converted back to canonical watch URL (round-trip)
      const delta = htmlToDelta('<p><iframe src="https://youtube.com/embed/abc"></iframe></p>');

      expect(delta.ops).toEqual([
        { insert: { video: 'https://www.youtube.com/watch?v=abc' } },
        { insert: '\n' },
      ]);
    });
  });

  describe('options', () => {
    it('disables whitespace normalization', () => {
      const delta = htmlToDelta('<p>Hello    World</p>', {
        normalizeWhitespace: false,
      });

      // Whitespace is preserved
      expect(delta.ops[0].insert).toContain('    ');
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const delta = htmlToDelta('');

      expect(delta.ops).toEqual([]);
    });

    it('handles div as block', () => {
      const delta = htmlToDelta('<div>Content</div>');

      expect(delta.ops).toEqual([{ insert: 'Content\n' }]);
    });

    it('handles unknown elements (processes children)', () => {
      const delta = htmlToDelta('<p><custom>Text</custom></p>');

      expect(delta.ops).toEqual([{ insert: 'Text\n' }]);
    });

    it('handles complex nested structure', () => {
      const delta = htmlToDelta('<div><p><strong><em>Bold Italic</em></strong></p></div>');

      // Both div and p are block elements, each adds newline
      expect(delta.ops).toEqual([
        { insert: 'Bold Italic', attributes: { bold: true, italic: true } },
        { insert: '\n\n' },
      ]);
    });
  });
});
