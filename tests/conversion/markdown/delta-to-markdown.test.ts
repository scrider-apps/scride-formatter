/**
 * Delta → Markdown Conversion Tests
 */

import { describe, expect, it } from 'vitest';
import { deltaToMarkdown } from '../../../src/conversion/markdown';
import { Delta } from '@scrider/delta';

describe('deltaToMarkdown', () => {
  describe('basic text', () => {
    it('converts plain text', () => {
      const delta = new Delta().insert('Hello World\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('Hello World');
    });

    it('converts multiple paragraphs', () => {
      const delta = new Delta().insert('First\n').insert('Second\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('First\nSecond');
    });

    it('escapes special Markdown characters', () => {
      const delta = new Delta().insert('Use *asterisks* and _underscores_ with `code`\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('Use \\*asterisks\\* and \\_underscores\\_ with \\`code\\`');
    });
  });

  describe('inline formatting', () => {
    it('converts bold text', () => {
      const delta = new Delta().insert('Hello ', {}).insert('World', { bold: true }).insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('Hello **World**');
    });

    it('converts italic text', () => {
      const delta = new Delta().insert('Hello ', {}).insert('World', { italic: true }).insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('Hello _World_');
    });

    it('converts strikethrough text', () => {
      const delta = new Delta().insert('Hello ', {}).insert('World', { strike: true }).insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('Hello ~~World~~');
    });

    it('converts inline code', () => {
      const delta = new Delta()
        .insert('Use ', {})
        .insert('const', { code: true })
        .insert(' keyword\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('Use `const` keyword');
    });

    it('converts underline text (HTML in Markdown)', () => {
      const delta = new Delta()
        .insert('Hello ', {})
        .insert('World', { underline: true })
        .insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('Hello <u>World</u>');
    });

    it('converts subscript text (HTML in Markdown)', () => {
      const delta = new Delta().insert('H').insert('2', { subscript: true }).insert('O\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('H<sub>2</sub>O');
    });

    it('converts superscript text (HTML in Markdown)', () => {
      const delta = new Delta().insert('E=mc').insert('2', { superscript: true }).insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('E=mc<sup>2</sup>');
    });

    it('converts mark text (HTML in Markdown)', () => {
      const delta = new Delta()
        .insert('This is ', {})
        .insert('highlighted', { mark: true })
        .insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('This is <mark>highlighted</mark>');
    });

    it('converts combined bold+italic', () => {
      const delta = new Delta()
        .insert('Hello ', {})
        .insert('World', { bold: true, italic: true })
        .insert('\n');
      const md = deltaToMarkdown(delta);
      // Bold wraps italic: **_World_**
      expect(md).toBe('Hello **_World_**');
    });

    it('converts links', () => {
      const delta = new Delta()
        .insert('Visit ', {})
        .insert('Google', { link: 'https://google.com' })
        .insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('Visit [Google](https://google.com)');
    });

    it('converts bold link', () => {
      const delta = new Delta()
        .insert('Click ', {})
        .insert('here', { bold: true, link: 'https://example.com' })
        .insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('Click [**here**](https://example.com)');
    });
  });

  describe('headers', () => {
    it('converts h1', () => {
      const delta = new Delta().insert('Title\n', { header: 1 });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('# Title');
    });

    it('converts h2', () => {
      const delta = new Delta().insert('Subtitle\n', { header: 2 });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('## Subtitle');
    });

    it('converts h3-h6', () => {
      const delta = new Delta()
        .insert('H3\n', { header: 3 })
        .insert('H4\n', { header: 4 })
        .insert('H5\n', { header: 5 })
        .insert('H6\n', { header: 6 });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('### H3\n#### H4\n##### H5\n###### H6');
    });

    it('converts header with inline formatting', () => {
      const delta = new Delta().insert('Bold', { bold: true }).insert(' Title\n', { header: 1 });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('# **Bold** Title');
    });
  });

  describe('lists', () => {
    it('converts bullet list', () => {
      const delta = new Delta()
        .insert('Item 1\n', { list: 'bullet' })
        .insert('Item 2\n', { list: 'bullet' })
        .insert('Item 3\n', { list: 'bullet' });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('- Item 1\n- Item 2\n- Item 3');
    });

    it('converts ordered list', () => {
      const delta = new Delta()
        .insert('First\n', { list: 'ordered' })
        .insert('Second\n', { list: 'ordered' })
        .insert('Third\n', { list: 'ordered' });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('1. First\n2. Second\n3. Third');
    });

    it('converts task list (checked)', () => {
      const delta = new Delta()
        .insert('Done task\n', { list: 'checked' })
        .insert('Todo task\n', { list: 'unchecked' });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('- [x] Done task\n- [ ] Todo task');
    });

    it('converts nested list with indent', () => {
      const delta = new Delta()
        .insert('Parent\n', { list: 'bullet' })
        .insert('Child\n', { list: 'bullet', indent: 1 })
        .insert('Grandchild\n', { list: 'bullet', indent: 2 });
      const md = deltaToMarkdown(delta);
      // 4 spaces per indent level for proper Markdown nesting
      expect(md).toBe('- Parent\n    - Child\n        - Grandchild');
    });
  });

  describe('blockquote', () => {
    it('converts blockquote', () => {
      const delta = new Delta().insert('Quoted text\n', { blockquote: true });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('> Quoted text');
    });

    it('converts multi-line blockquote', () => {
      const delta = new Delta()
        .insert('Line 1\n', { blockquote: true })
        .insert('Line 2\n', { blockquote: true });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('> Line 1\n> Line 2');
    });
  });

  describe('code blocks', () => {
    it('converts code block without language', () => {
      const delta = new Delta()
        .insert('const x = 1;\n', { 'code-block': true })
        .insert('const y = 2;\n', { 'code-block': true });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('```\nconst x = 1;\nconst y = 2;\n```');
    });

    it('converts code block with language', () => {
      const delta = new Delta()
        .insert('function hello() {\n', { 'code-block': 'javascript' })
        .insert('  return "world";\n', { 'code-block': 'javascript' })
        .insert('}\n', { 'code-block': 'javascript' });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('```javascript\nfunction hello() {\n  return "world";\n}\n```');
    });
  });

  describe('embeds', () => {
    it('converts image embed', () => {
      const delta = new Delta().insert({ image: 'https://example.com/img.png' }).insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('![](https://example.com/img.png)');
    });

    it('converts image embed with alt text', () => {
      const delta = new Delta()
        .insert({ image: 'https://example.com/img.png' }, { alt: 'Logo' })
        .insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('![Logo](https://example.com/img.png)');
    });

    it('converts video embed as ![Video](url)', () => {
      const delta = new Delta().insert({ video: 'https://youtube.com/watch?v=123' }).insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toContain('![Video](https://youtube.com/watch?v=123)');
    });

    it('converts formula embed', () => {
      const delta = new Delta().insert({ formula: 'E = mc^2' }).insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toBe('$E = mc^2$');
    });

    it('converts formula embed with mathSyntax: latex', () => {
      const delta = new Delta().insert({ formula: 'E = mc^2' }).insert('\n');
      const md = deltaToMarkdown(delta, { mathSyntax: 'latex' });
      expect(md).toBe('\\(E = mc^2\\)');
    });

    it('converts math code-block with mathSyntax: latex', () => {
      const delta = new Delta().insert('x^2 + y^2 = z^2').insert('\n', { 'code-block': 'math' });
      const md = deltaToMarkdown(delta, { mathSyntax: 'latex' });
      expect(md).toBe('\\[\nx^2 + y^2 = z^2\n\\]');
    });

    it('uses dollar syntax by default for math code-block', () => {
      const delta = new Delta().insert('x^2 + y^2 = z^2').insert('\n', { 'code-block': 'math' });
      const md = deltaToMarkdown(delta);
      expect(md).toContain('```math');
      expect(md).toContain('x^2 + y^2 = z^2');
    });

    it('renders math code-block as inline $...$ when mathBlock: false', () => {
      const delta = new Delta().insert('x^2 + y^2 = z^2').insert('\n', { 'code-block': 'math' });
      const md = deltaToMarkdown(delta, { mathBlock: false });
      expect(md).toBe('\n$x^2 + y^2 = z^2$\n');
    });

    it('renders math code-block as ```math when mathBlock: true (default)', () => {
      const delta = new Delta().insert('x^2 + y^2 = z^2').insert('\n', { 'code-block': 'math' });
      const md = deltaToMarkdown(delta, { mathBlock: true });
      expect(md).toContain('```math');
      expect(md).toContain('x^2 + y^2 = z^2');
    });

    it('mathBlock: false does not affect inline formula embeds', () => {
      const delta = new Delta()
        .insert('The value is ')
        .insert({ formula: 'E = mc^2' })
        .insert(' ok\n');
      const md = deltaToMarkdown(delta, { mathBlock: false });
      expect(md).toBe('The value is $E = mc^2$ ok');
    });

    it('uses custom embed renderer', () => {
      const delta = new Delta().insert({ mention: '@john' }).insert('\n');
      const md = deltaToMarkdown(delta, {
        embedRenderers: {
          mention: (value) => `@${String(value).replace('@', '')}`,
        },
      });
      expect(md).toBe('@john');
    });

    it('converts mermaid code-block to markdown fenced block', () => {
      const delta = new Delta()
        .insert('graph TD')
        .insert('\n', { 'code-block': 'mermaid' })
        .insert('    A-->B')
        .insert('\n', { 'code-block': 'mermaid' });
      const md = deltaToMarkdown(delta);
      expect(md).toBe('```mermaid\ngraph TD\n    A-->B\n```');
    });

    it('converts multi-line mermaid diagram', () => {
      const delta = new Delta()
        .insert('sequenceDiagram')
        .insert('\n', { 'code-block': 'mermaid' })
        .insert('    Alice->>Bob: Hello')
        .insert('\n', { 'code-block': 'mermaid' })
        .insert('    Bob-->>Alice: Hi!')
        .insert('\n', { 'code-block': 'mermaid' });
      const md = deltaToMarkdown(delta);
      expect(md).toBe(
        '```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi!\n```',
      );
    });

    it('converts { diagram } embed to fenced mermaid code block', () => {
      const delta = new Delta().insert({ diagram: 'graph TD\n    A-->B' }).insert('\n');
      const md = deltaToMarkdown(delta);
      expect(md).toContain('```mermaid');
      expect(md).toContain('graph TD');
      expect(md).toContain('A-->B');
    });
  });

  describe('complex documents', () => {
    it('converts document with mixed content', () => {
      const delta = new Delta()
        .insert('Title\n', { header: 1 })
        .insert('This is a ')
        .insert('bold', { bold: true })
        .insert(' paragraph.\n')
        .insert('Item 1\n', { list: 'bullet' })
        .insert('Item 2\n', { list: 'bullet' });

      const md = deltaToMarkdown(delta);
      expect(md).toBe('# Title\nThis is a **bold** paragraph.\n- Item 1\n- Item 2');
    });
  });
});
