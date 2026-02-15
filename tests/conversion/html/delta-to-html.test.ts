import { describe, expect, it } from 'vitest';
import { deltaToHtml } from '../../../src/conversion/html/delta-to-html';
import { Delta } from '@scrider/delta';

describe('deltaToHtml', () => {
  describe('basic text', () => {
    it('converts plain text to paragraph', () => {
      const delta = new Delta().insert('Hello World\n');

      expect(deltaToHtml(delta)).toBe('<p>Hello World</p>');
    });

    it('converts multiple paragraphs', () => {
      const delta = new Delta().insert('First paragraph\n').insert('Second paragraph\n');

      expect(deltaToHtml(delta)).toBe('<p>First paragraph</p><p>Second paragraph</p>');
    });

    it('handles empty lines', () => {
      const delta = new Delta().insert('Before\n').insert('\n').insert('After\n');

      // Empty paragraphs render with <br> to be visible in browsers
      expect(deltaToHtml(delta)).toBe('<p>Before</p><p><br></p><p>After</p>');
    });

    it('escapes HTML special characters', () => {
      const delta = new Delta().insert('<script>alert("xss")</script>\n');

      expect(deltaToHtml(delta)).toBe('<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>');
    });
  });

  describe('inline formatting', () => {
    it('converts bold text', () => {
      const delta = new Delta().insert('Hello ', { bold: true }).insert('World\n');

      expect(deltaToHtml(delta)).toBe('<p><strong>Hello </strong>World</p>');
    });

    it('converts italic text', () => {
      const delta = new Delta().insert('Hello ', { italic: true }).insert('World\n');

      expect(deltaToHtml(delta)).toBe('<p><em>Hello </em>World</p>');
    });

    it('converts underline text', () => {
      const delta = new Delta().insert('Underlined', { underline: true }).insert('\n');

      expect(deltaToHtml(delta)).toBe('<p><u>Underlined</u></p>');
    });

    it('converts subscript text', () => {
      const delta = new Delta().insert('H').insert('2', { subscript: true }).insert('O\n');

      expect(deltaToHtml(delta)).toBe('<p>H<sub>2</sub>O</p>');
    });

    it('converts superscript text', () => {
      const delta = new Delta().insert('E=mc').insert('2', { superscript: true }).insert('\n');

      expect(deltaToHtml(delta)).toBe('<p>E=mc<sup>2</sup></p>');
    });

    it('converts mark text', () => {
      const delta = new Delta().insert('Highlighted', { mark: true }).insert('\n');

      expect(deltaToHtml(delta)).toBe('<p><mark>Highlighted</mark></p>');
    });

    it('converts strike text', () => {
      const delta = new Delta().insert('Strikethrough', { strike: true }).insert('\n');

      expect(deltaToHtml(delta)).toBe('<p><s>Strikethrough</s></p>');
    });

    it('converts inline code', () => {
      const delta = new Delta().insert('Use ').insert('console.log()', { code: true }).insert('\n');

      expect(deltaToHtml(delta)).toBe('<p>Use <code>console.log()</code></p>');
    });

    it('converts links', () => {
      const delta = new Delta()
        .insert('Click ', {})
        .insert('here', { link: 'https://example.com' })
        .insert('\n');

      expect(deltaToHtml(delta)).toBe('<p>Click <a href="https://example.com">here</a></p>');
    });

    it('escapes link URLs', () => {
      const delta = new Delta()
        .insert('Link', { link: 'https://example.com?a=1&b=2' })
        .insert('\n');

      expect(deltaToHtml(delta)).toBe('<p><a href="https://example.com?a=1&amp;b=2">Link</a></p>');
    });

    it('converts combined formatting', () => {
      const delta = new Delta()
        .insert('Bold and Italic', { bold: true, italic: true })
        .insert('\n');

      expect(deltaToHtml(delta)).toBe('<p><strong><em>Bold and Italic</em></strong></p>');
    });

    it('nests formats in correct order', () => {
      const delta = new Delta()
        .insert('All formats', {
          bold: true,
          italic: true,
          underline: true,
          strike: true,
          code: true,
        })
        .insert('\n');

      const html = deltaToHtml(delta);

      // Order should be: strong > em > u > s > code
      expect(html).toBe('<p><strong><em><u><s><code>All formats</code></s></u></em></strong></p>');
    });
  });

  describe('style-based formatting', () => {
    it('converts color', () => {
      const delta = new Delta().insert('Red text', { color: '#ff0000' }).insert('\n');

      expect(deltaToHtml(delta)).toBe('<p><span style="color: #ff0000">Red text</span></p>');
    });

    it('converts background color', () => {
      const delta = new Delta().insert('Highlighted', { background: '#ffff00' }).insert('\n');

      expect(deltaToHtml(delta)).toBe(
        '<p><span style="background-color: #ffff00">Highlighted</span></p>',
      );
    });

    it('combines color and background', () => {
      const delta = new Delta()
        .insert('Styled', { color: '#ffffff', background: '#000000' })
        .insert('\n');

      expect(deltaToHtml(delta)).toBe(
        '<p><span style="color: #ffffff; background-color: #000000">Styled</span></p>',
      );
    });

    it('combines styles with tags', () => {
      const delta = new Delta().insert('Bold Red', { bold: true, color: '#ff0000' }).insert('\n');

      expect(deltaToHtml(delta)).toBe(
        '<p><strong><span style="color: #ff0000">Bold Red</span></strong></p>',
      );
    });
  });

  describe('headers', () => {
    it('converts h1', () => {
      const delta = new Delta().insert('Title\n', { header: 1 });

      expect(deltaToHtml(delta)).toBe('<h1>Title</h1>');
    });

    it('converts h2-h6', () => {
      for (let level = 2; level <= 6; level++) {
        const delta = new Delta().insert(`Heading ${level}\n`, {
          header: level,
        });
        expect(deltaToHtml(delta)).toBe(`<h${level}>Heading ${level}</h${level}>`);
      }
    });

    it('converts header with inline formatting', () => {
      const delta = new Delta()
        .insert('Bold ', { bold: true })
        .insert('Title', {})
        .insert('\n', { header: 1 });

      expect(deltaToHtml(delta)).toBe('<h1><strong>Bold </strong>Title</h1>');
    });
  });

  describe('blockquote', () => {
    it('converts blockquote', () => {
      const delta = new Delta().insert('Quote\n', { blockquote: true });

      expect(deltaToHtml(delta)).toBe('<blockquote>Quote</blockquote>');
    });

    it('converts blockquote with formatting', () => {
      const delta = new Delta()
        .insert('Quoted ', { italic: true })
        .insert('text', {})
        .insert('\n', { blockquote: true });

      expect(deltaToHtml(delta)).toBe('<blockquote><em>Quoted </em>text</blockquote>');
    });
  });

  describe('code block', () => {
    it('converts single-line code block', () => {
      const delta = new Delta().insert('const x = 1;\n', { 'code-block': true });

      expect(deltaToHtml(delta)).toBe('<pre><code>const x = 1;\n</code></pre>');
    });

    it('preserves whitespace in code', () => {
      const delta = new Delta().insert('  indented\n', { 'code-block': true });

      expect(deltaToHtml(delta)).toBe('<pre><code>  indented\n</code></pre>');
    });

    it('converts code block with language', () => {
      const delta = new Delta().insert('const x = 1;\n', { 'code-block': 'javascript' });

      expect(deltaToHtml(delta)).toBe(
        '<pre data-language="javascript"><code class="language-javascript">const x = 1;\n</code></pre>',
      );
    });

    it('groups adjacent code block lines into single pre', () => {
      const delta = new Delta()
        .insert('const a = 1;\n', { 'code-block': 'javascript' })
        .insert('const b = 2;\n', { 'code-block': 'javascript' });

      expect(deltaToHtml(delta)).toBe(
        '<pre data-language="javascript"><code class="language-javascript">const a = 1;\nconst b = 2;\n</code></pre>',
      );
    });

    it('separates code blocks with different languages', () => {
      const delta = new Delta()
        .insert('const x = 1;\n', { 'code-block': 'javascript' })
        .insert('x = 1\n', { 'code-block': 'python' });

      expect(deltaToHtml(delta)).toBe(
        '<pre data-language="javascript"><code class="language-javascript">const x = 1;\n</code></pre>' +
          '<pre data-language="python"><code class="language-python">x = 1\n</code></pre>',
      );
    });

    it('converts multi-line code block without language', () => {
      const delta = new Delta()
        .insert('line 1\n', { 'code-block': true })
        .insert('line 2\n', { 'code-block': true });

      expect(deltaToHtml(delta)).toBe('<pre><code>line 1\nline 2\n</code></pre>');
    });

    it('converts mermaid code block', () => {
      const delta = new Delta()
        .insert('graph TD\n', { 'code-block': 'mermaid' })
        .insert('    A-->B\n', { 'code-block': 'mermaid' });

      expect(deltaToHtml(delta)).toBe(
        '<pre data-language="mermaid"><code class="language-mermaid">graph TD\n    A--&gt;B\n</code></pre>',
      );
    });
  });

  describe('lists', () => {
    it('converts bullet list', () => {
      const delta = new Delta()
        .insert('Item 1\n', { list: 'bullet' })
        .insert('Item 2\n', { list: 'bullet' });

      expect(deltaToHtml(delta)).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>');
    });

    it('converts ordered list', () => {
      const delta = new Delta()
        .insert('First\n', { list: 'ordered' })
        .insert('Second\n', { list: 'ordered' });

      expect(deltaToHtml(delta)).toBe('<ol><li>First</li><li>Second</li></ol>');
    });

    it('converts checked list item', () => {
      const delta = new Delta().insert('Done\n', { list: 'checked' });

      expect(deltaToHtml(delta)).toBe('<ul><li data-checked="true">Done</li></ul>');
    });

    it('converts unchecked list item', () => {
      const delta = new Delta().insert('Todo\n', { list: 'unchecked' });

      expect(deltaToHtml(delta)).toBe('<ul><li data-checked="false">Todo</li></ul>');
    });

    it('converts nested list', () => {
      const delta = new Delta()
        .insert('Parent\n', { list: 'bullet' })
        .insert('Child\n', { list: 'bullet', indent: 1 });

      expect(deltaToHtml(delta)).toBe('<ul><li>Parent</li><ul><li>Child</li></ul></ul>');
    });

    it('closes list before paragraph', () => {
      const delta = new Delta().insert('Item\n', { list: 'bullet' }).insert('Paragraph\n');

      expect(deltaToHtml(delta)).toBe('<ul><li>Item</li></ul><p>Paragraph</p>');
    });

    it('handles mixed list types', () => {
      const delta = new Delta()
        .insert('Bullet\n', { list: 'bullet' })
        .insert('Ordered\n', { list: 'ordered' });

      expect(deltaToHtml(delta)).toBe('<ul><li>Bullet</li></ul><ol><li>Ordered</li></ol>');
    });

    it('generates hierarchical numbers for ordered lists', () => {
      const delta = new Delta()
        .insert('Step one\n', { list: 'ordered' })
        .insert('Step two\n', { list: 'ordered' })
        .insert('Sub-step A\n', { list: 'ordered', indent: 1 })
        .insert('Deeper level\n', { list: 'ordered', indent: 2 })
        .insert('Sub-step B\n', { list: 'ordered', indent: 1 })
        .insert('Step three\n', { list: 'ordered' });

      const html = deltaToHtml(delta, { hierarchicalNumbers: true });

      expect(html).toContain('data-number="1"');
      expect(html).toContain('data-number="2"');
      expect(html).toContain('data-number="2.1"');
      expect(html).toContain('data-number="2.1.1"');
      expect(html).toContain('data-number="2.2"');
      expect(html).toContain('data-number="3"');
    });

    it('does not add data-number when hierarchicalNumbers is false', () => {
      const delta = new Delta()
        .insert('Item\n', { list: 'ordered' })
        .insert('Nested\n', { list: 'ordered', indent: 1 });

      const html = deltaToHtml(delta, { hierarchicalNumbers: false });

      expect(html).not.toContain('data-number');
    });

    it('only applies hierarchical numbers to ordered lists', () => {
      const delta = new Delta()
        .insert('Bullet\n', { list: 'bullet' })
        .insert('Nested bullet\n', { list: 'bullet', indent: 1 });

      const html = deltaToHtml(delta, { hierarchicalNumbers: true });

      expect(html).not.toContain('data-number');
    });
  });

  describe('alignment', () => {
    it('converts center alignment', () => {
      const delta = new Delta().insert('Centered\n', { align: 'center' });

      expect(deltaToHtml(delta)).toBe('<p style="text-align: center">Centered</p>');
    });

    it('converts right alignment', () => {
      const delta = new Delta().insert('Right\n', { align: 'right' });

      expect(deltaToHtml(delta)).toBe('<p style="text-align: right">Right</p>');
    });

    it('converts justify alignment', () => {
      const delta = new Delta().insert('Justified\n', { align: 'justify' });

      expect(deltaToHtml(delta)).toBe('<p style="text-align: justify">Justified</p>');
    });

    it('skips left alignment (default)', () => {
      const delta = new Delta().insert('Left\n', { align: 'left' });

      expect(deltaToHtml(delta)).toBe('<p>Left</p>');
    });
  });

  describe('indent', () => {
    it('converts indented paragraph', () => {
      const delta = new Delta().insert('Indented\n', { indent: 1 });

      expect(deltaToHtml(delta)).toBe('<p style="margin-left: 2em">Indented</p>');
    });

    it('converts multiple indent levels', () => {
      const delta = new Delta().insert('Deep\n', { indent: 3 });

      expect(deltaToHtml(delta)).toBe('<p style="margin-left: 6em">Deep</p>');
    });
  });

  describe('embeds', () => {
    it('converts image', () => {
      const delta = new Delta().insert({ image: 'https://example.com/img.png' }).insert('\n');

      expect(deltaToHtml(delta)).toBe('<p><img src="https://example.com/img.png"></p>');
    });

    it('converts image with alt text', () => {
      const delta = new Delta()
        .insert({ image: 'https://example.com/img.png' }, { alt: 'Description' })
        .insert('\n');

      expect(deltaToHtml(delta)).toBe(
        '<p><img src="https://example.com/img.png" alt="Description"></p>',
      );
    });

    it('converts image with dimensions', () => {
      const delta = new Delta()
        .insert({ image: 'https://example.com/img.png' }, { width: 200, height: 100 })
        .insert('\n');

      expect(deltaToHtml(delta)).toBe(
        '<p><img src="https://example.com/img.png" width="200" height="100"></p>',
      );
    });

    it('converts video', () => {
      const delta = new Delta().insert({ video: 'https://example.com/video.mp4' }).insert('\n');

      expect(deltaToHtml(delta)).toBe(
        '<p><video src="https://example.com/video.mp4" controls></video></p>',
      );
    });

    it('converts YouTube embed', () => {
      const delta = new Delta().insert({ video: 'https://youtube.com/embed/abc123' }).insert('\n');

      expect(deltaToHtml(delta)).toBe(
        '<p><iframe src="https://youtube.com/embed/abc123" frameborder="0" allowfullscreen></iframe></p>',
      );
    });

    it('converts formula', () => {
      const delta = new Delta().insert({ formula: 'E = mc^2' }).insert('\n');

      expect(deltaToHtml(delta)).toBe(
        '<p><span class="formula" data-formula="E = mc^2">E = mc^2</span></p>',
      );
    });

    it('escapes embed values', () => {
      const delta = new Delta()
        .insert({ image: 'https://example.com/img.png?a=1&b=2' })
        .insert('\n');

      expect(deltaToHtml(delta)).toContain('&amp;');
    });

    it('handles unknown embed types', () => {
      const delta = new Delta().insert({ custom: 'value' }).insert('\n');

      expect(deltaToHtml(delta)).toBe(
        '<p><span data-embed="custom" data-value="value"></span></p>',
      );
    });
  });

  describe('options', () => {
    it('wraps output in container', () => {
      const delta = new Delta().insert('Hello\n');

      expect(deltaToHtml(delta, { wrapper: 'div' })).toBe('<div><p>Hello</p></div>');
    });

    it('pretty prints with newlines', () => {
      const delta = new Delta().insert('First\n').insert('Second\n');

      const html = deltaToHtml(delta, { pretty: true });

      expect(html).toBe('<p>First</p>\n<p>Second</p>\n');
    });

    it('uses custom embed renderer', () => {
      const delta = new Delta().insert({ custom: 'test-value' }).insert('\n');

      const html = deltaToHtml(delta, {
        embedRenderers: {
          custom: (value) => `<custom-element>${String(value)}</custom-element>`,
        },
      });

      expect(html).toBe('<p><custom-element>test-value</custom-element></p>');
    });
  });

  describe('edge cases', () => {
    it('handles empty delta', () => {
      const delta = new Delta();

      expect(deltaToHtml(delta)).toBe('');
    });

    it('handles delta without trailing newline', () => {
      const delta = new Delta().insert('No newline');

      expect(deltaToHtml(delta)).toBe('<p>No newline</p>');
    });

    it('handles text with multiple newlines', () => {
      const delta = new Delta().insert('Line 1\nLine 2\nLine 3\n');

      expect(deltaToHtml(delta)).toBe('<p>Line 1</p><p>Line 2</p><p>Line 3</p>');
    });

    it('handles retain and delete ops (ignores them)', () => {
      const delta = new Delta().insert('Hello\n').retain(5).delete(3);

      expect(deltaToHtml(delta)).toBe('<p>Hello</p>');
    });
  });
});
