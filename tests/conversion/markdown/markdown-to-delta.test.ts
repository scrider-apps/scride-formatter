/**
 * Markdown → Delta Conversion Tests
 */

import { describe, expect, it } from 'vitest';
import {
  deltaToMarkdown,
  isRemarkAvailable,
  markdownToDelta,
  markdownToDeltaSync,
} from '../../../src/conversion/markdown';
import { Delta } from '@scrider/delta';
import type { InsertOp } from '@scrider/delta';

// Skip tests if remark is not available
const runTests = isRemarkAvailable();

describe.runIf(runTests)('markdownToDelta', () => {
  describe('basic text', () => {
    it('converts plain text', async () => {
      const delta = await markdownToDelta('Hello World');
      expect(delta.ops).toEqual([{ insert: 'Hello World\n' }]);
    });

    it('converts multiple paragraphs', async () => {
      const delta = await markdownToDelta('First paragraph\n\nSecond paragraph');
      // Delta compacts consecutive text with same attributes
      expect(delta.ops).toEqual([{ insert: 'First paragraph\nSecond paragraph\n' }]);
    });
  });

  describe('inline formatting', () => {
    it('converts bold text', async () => {
      const delta = await markdownToDelta('Hello **World**');
      expect(delta.ops).toEqual([
        { insert: 'Hello ' },
        { insert: 'World', attributes: { bold: true } },
        { insert: '\n' },
      ]);
    });

    it('converts italic text', async () => {
      const delta = await markdownToDelta('Hello _World_');
      expect(delta.ops).toEqual([
        { insert: 'Hello ' },
        { insert: 'World', attributes: { italic: true } },
        { insert: '\n' },
      ]);
    });

    it('converts strikethrough text (GFM)', async () => {
      const delta = await markdownToDelta('Hello ~~World~~');
      expect(delta.ops).toEqual([
        { insert: 'Hello ' },
        { insert: 'World', attributes: { strike: true } },
        { insert: '\n' },
      ]);
    });

    it('converts inline code', async () => {
      const delta = await markdownToDelta('Use `const` keyword');
      expect(delta.ops).toEqual([
        { insert: 'Use ' },
        { insert: 'const', attributes: { code: true } },
        { insert: ' keyword\n' },
      ]);
    });

    it('converts combined bold+italic', async () => {
      const delta = await markdownToDelta('Hello ***World***');
      expect(delta.ops).toEqual([
        { insert: 'Hello ' },
        { insert: 'World', attributes: { bold: true, italic: true } },
        { insert: '\n' },
      ]);
    });

    it('converts inline HTML underline (<u>)', async () => {
      const delta = await markdownToDelta('This is <u>underlined</u> text');
      expect(delta.ops).toEqual([
        { insert: 'This is ' },
        { insert: 'underlined', attributes: { underline: true } },
        { insert: ' text\n' },
      ]);
    });

    it('converts inline HTML underline (<ins>)', async () => {
      const delta = await markdownToDelta('This is <ins>inserted</ins> text');
      expect(delta.ops).toEqual([
        { insert: 'This is ' },
        { insert: 'inserted', attributes: { underline: true } },
        { insert: ' text\n' },
      ]);
    });

    it('converts inline HTML subscript (<sub>)', async () => {
      const delta = await markdownToDelta('H<sub>2</sub>O');
      expect(delta.ops).toEqual([
        { insert: 'H' },
        { insert: '2', attributes: { subscript: true } },
        { insert: 'O\n' },
      ]);
    });

    it('converts inline HTML superscript (<sup>)', async () => {
      const delta = await markdownToDelta('E=mc<sup>2</sup>');
      expect(delta.ops).toEqual([
        { insert: 'E=mc' },
        { insert: '2', attributes: { superscript: true } },
        { insert: '\n' },
      ]);
    });

    it('converts inline HTML mark (<mark>)', async () => {
      const delta = await markdownToDelta('This is <mark>highlighted</mark>');
      expect(delta.ops).toEqual([
        { insert: 'This is ' },
        { insert: 'highlighted', attributes: { mark: true } },
        { insert: '\n' },
      ]);
    });

    it('converts links', async () => {
      const delta = await markdownToDelta('Visit [Google](https://google.com)');
      expect(delta.ops).toEqual([
        { insert: 'Visit ' },
        { insert: 'Google', attributes: { link: 'https://google.com' } },
        { insert: '\n' },
      ]);
    });

    it('converts bold link', async () => {
      const delta = await markdownToDelta('Click [**here**](https://example.com)');
      expect(delta.ops).toEqual([
        { insert: 'Click ' },
        { insert: 'here', attributes: { link: 'https://example.com', bold: true } },
        { insert: '\n' },
      ]);
    });
  });

  describe('headers', () => {
    it('converts h1', async () => {
      const delta = await markdownToDelta('# Title');
      expect(delta.ops).toEqual([{ insert: 'Title' }, { insert: '\n', attributes: { header: 1 } }]);
    });

    it('converts h2', async () => {
      const delta = await markdownToDelta('## Subtitle');
      expect(delta.ops).toEqual([
        { insert: 'Subtitle' },
        { insert: '\n', attributes: { header: 2 } },
      ]);
    });

    it('converts h3-h6', async () => {
      const delta = await markdownToDelta('### H3\n\n#### H4\n\n##### H5\n\n###### H6');
      expect(delta.ops).toEqual([
        { insert: 'H3' },
        { insert: '\n', attributes: { header: 3 } },
        { insert: 'H4' },
        { insert: '\n', attributes: { header: 4 } },
        { insert: 'H5' },
        { insert: '\n', attributes: { header: 5 } },
        { insert: 'H6' },
        { insert: '\n', attributes: { header: 6 } },
      ]);
    });

    it('converts header with inline formatting', async () => {
      const delta = await markdownToDelta('# **Bold** Title');
      expect(delta.ops).toEqual([
        { insert: 'Bold', attributes: { bold: true } },
        { insert: ' Title' },
        { insert: '\n', attributes: { header: 1 } },
      ]);
    });
  });

  describe('lists', () => {
    it('converts bullet list', async () => {
      const delta = await markdownToDelta('- Item 1\n- Item 2\n- Item 3');
      expect(delta.ops).toEqual([
        { insert: 'Item 1' },
        { insert: '\n', attributes: { list: 'bullet' } },
        { insert: 'Item 2' },
        { insert: '\n', attributes: { list: 'bullet' } },
        { insert: 'Item 3' },
        { insert: '\n', attributes: { list: 'bullet' } },
      ]);
    });

    it('converts ordered list', async () => {
      const delta = await markdownToDelta('1. First\n2. Second\n3. Third');
      expect(delta.ops).toEqual([
        { insert: 'First' },
        { insert: '\n', attributes: { list: 'ordered' } },
        { insert: 'Second' },
        { insert: '\n', attributes: { list: 'ordered' } },
        { insert: 'Third' },
        { insert: '\n', attributes: { list: 'ordered' } },
      ]);
    });

    it('converts task list (GFM)', async () => {
      const delta = await markdownToDelta('- [x] Done task\n- [ ] Todo task');
      expect(delta.ops).toEqual([
        { insert: 'Done task' },
        { insert: '\n', attributes: { list: 'checked' } },
        { insert: 'Todo task' },
        { insert: '\n', attributes: { list: 'unchecked' } },
      ]);
    });

    it('converts nested list', async () => {
      const delta = await markdownToDelta('- Parent\n  - Child\n    - Grandchild');
      expect(delta.ops).toEqual([
        { insert: 'Parent' },
        { insert: '\n', attributes: { list: 'bullet' } },
        { insert: 'Child' },
        { insert: '\n', attributes: { list: 'bullet', indent: 1 } },
        { insert: 'Grandchild' },
        { insert: '\n', attributes: { list: 'bullet', indent: 2 } },
      ]);
    });
  });

  describe('blockquote', () => {
    it('converts blockquote', async () => {
      const delta = await markdownToDelta('> Quoted text');
      expect(delta.ops).toEqual([
        { insert: 'Quoted text' },
        { insert: '\n', attributes: { blockquote: true } },
      ]);
    });
  });

  describe('code blocks', () => {
    it('converts code block without language', async () => {
      const delta = await markdownToDelta('```\nconst x = 1;\n```');
      expect(delta.ops).toEqual([
        { insert: 'const x = 1;' },
        { insert: '\n', attributes: { 'code-block': true } },
      ]);
    });

    it('converts code block with language', async () => {
      const delta = await markdownToDelta('```javascript\nfunction hello() {}\n```');
      expect(delta.ops).toEqual([
        { insert: 'function hello() {}' },
        { insert: '\n', attributes: { 'code-block': 'javascript' } },
      ]);
    });

    it('converts multi-line code block', async () => {
      const delta = await markdownToDelta('```typescript\nconst a = 1;\nconst b = 2;\n```');
      expect(delta.ops).toEqual([
        { insert: 'const a = 1;' },
        { insert: '\n', attributes: { 'code-block': 'typescript' } },
        { insert: 'const b = 2;' },
        { insert: '\n', attributes: { 'code-block': 'typescript' } },
      ]);
    });
  });

  describe('embeds', () => {
    it('converts image', async () => {
      const delta = await markdownToDelta('![Logo](https://example.com/img.png)');
      expect(delta.ops).toEqual([
        { insert: { image: 'https://example.com/img.png' }, attributes: { alt: 'Logo' } },
        { insert: '\n' },
      ]);
    });

    it('converts image without alt', async () => {
      const delta = await markdownToDelta('![](https://example.com/img.png)');
      expect(delta.ops).toEqual([
        { insert: { image: 'https://example.com/img.png' } },
        { insert: '\n' },
      ]);
    });
  });

  describe('sync version', () => {
    it('works synchronously', () => {
      const delta = markdownToDeltaSync('**Bold** text');
      expect(delta.ops).toEqual([
        { insert: 'Bold', attributes: { bold: true } },
        { insert: ' text\n' },
      ]);
    });
  });

  describe('complex documents', () => {
    it('converts document with mixed content', async () => {
      const md = `# Title

This is a **bold** paragraph.

- Item 1
- Item 2`;

      const delta = await markdownToDelta(md);
      // Delta compacts consecutive text with same attributes
      // Text before list gets merged with "Item 1" since both have no attributes
      expect(delta.ops).toEqual([
        { insert: 'Title' },
        { insert: '\n', attributes: { header: 1 } },
        { insert: 'This is a ' },
        { insert: 'bold', attributes: { bold: true } },
        { insert: ' paragraph.\nItem 1' },
        { insert: '\n', attributes: { list: 'bullet' } },
        { insert: 'Item 2' },
        { insert: '\n', attributes: { list: 'bullet' } },
      ]);
    });
  });

  describe('LaTeX math delimiters', () => {
    it('parses \\( ... \\) as inline formula', async () => {
      const md = 'The formula \\( E = mc^2 \\) is famous.\n';
      const delta = await markdownToDelta(md);

      const formulaOp = delta.ops.find(
        (op) =>
          'insert' in op && typeof op.insert === 'object' &&
          op.insert !== null &&
          'formula' in (op.insert),
      );
      expect(formulaOp).toBeDefined();
      expect(((formulaOp as InsertOp).insert as Record<string, unknown>).formula).toBe('E = mc^2');
    });

    it('parses \\[ ... \\] as display math block', async () => {
      const md = 'Before\n\n\\[\nx^2 + y^2 = z^2\n\\]\n\nAfter\n';
      const delta = await markdownToDelta(md);

      const mathLineOp = delta.ops.find(
        (op) =>
          'insert' in op && typeof op.insert === 'string' &&
          op.insert === '\n' &&
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'math',
      );
      expect(mathLineOp).toBeDefined();
    });

    it('roundtrip: LaTeX delimiters → Delta → dollar syntax', async () => {
      const md = 'The formula \\( e^{x} \\) is special.\n';
      const delta = await markdownToDelta(md);
      const { deltaToMarkdown } =
        await import('../../../src/conversion/markdown/delta-to-markdown');
      const result = deltaToMarkdown(delta);
      expect(result).toContain('$');
      expect(result).toContain('e^{x}');
    });

    it('roundtrip: LaTeX delimiters → Delta → LaTeX output', async () => {
      const md = 'The formula \\( e^{x} \\) is special.\n';
      const delta = await markdownToDelta(md);
      const { deltaToMarkdown } =
        await import('../../../src/conversion/markdown/delta-to-markdown');
      const result = deltaToMarkdown(delta, { mathSyntax: 'latex' });
      expect(result).toContain('\\(');
      expect(result).toContain('\\)');
      expect(result).toContain('e^{x}');
    });
  });

  describe('mathBlock option', () => {
    it('mathBlock: true (default) — display math becomes code-block', async () => {
      const md = '$$\nx^2 + y^2 = z^2\n$$\n';
      const delta = await markdownToDelta(md, { mathBlock: true });

      const mathLineOp = delta.ops.find(
        (op) =>
          'insert' in op && typeof op.insert === 'string' &&
          op.insert === '\n' &&
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'math',
      );
      expect(mathLineOp).toBeDefined();
    });

    it('mathBlock: false — display math becomes inline formula embed', async () => {
      const md = '$$\nx^2 + y^2 = z^2\n$$\n';
      const delta = await markdownToDelta(md, { mathBlock: false });

      // Should have a formula embed, NOT a code-block
      const formulaOp = delta.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'formula' in op.insert,
      );
      expect(formulaOp).toBeDefined();
      expect(((formulaOp as InsertOp).insert as Record<string, unknown>).formula).toBe('x^2 + y^2 = z^2');

      // Should NOT have code-block: "math"
      const codeBlockOp = delta.ops.find(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'math',
      );
      expect(codeBlockOp).toBeUndefined();
    });

    it('mathBlock: false does not affect inline math ($...$)', async () => {
      const md = 'The value $E = mc^2$ is famous.\n';
      const delta = await markdownToDelta(md, { mathBlock: false });

      const formulaOp = delta.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'formula' in op.insert,
      );
      expect(formulaOp).toBeDefined();
      expect(((formulaOp as InsertOp).insert as Record<string, unknown>).formula).toBe('E = mc^2');
    });

    it('roundtrip: mathBlock ON → OFF → ON preserves structure via baseDelta', async () => {
      // Start: code-block math
      const md1 = '```math\nx^2\n```\n';
      const delta1 = await markdownToDelta(md1, { mathBlock: true });

      // Verify it's a code-block
      const codeBlockOp = delta1.ops.find(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'math',
      );
      expect(codeBlockOp).toBeDefined();

      // Convert to OFF mode
      const { deltaToMarkdown } =
        await import('../../../src/conversion/markdown/delta-to-markdown');
      const mdOff = deltaToMarkdown(delta1, { mathBlock: false });
      expect(mdOff).toBe('\n$x^2$\n');

      // Parse in OFF mode → inline formula
      const deltaOff = await markdownToDelta(mdOff, { mathBlock: false });
      const formulaOp = deltaOff.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'formula' in op.insert,
      );
      expect(formulaOp).toBeDefined();
    });

    it('mathBlock: true promotes standalone $...$ to code-block math', async () => {
      // A standalone formula on its own line → should become code-block
      const md = 'Before\n\n$\\int e^{x} \\, dx = e^{x} + C$\n\nAfter\n';
      const delta = await markdownToDelta(md, { mathBlock: true });

      const codeBlockOp = delta.ops.find(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'math',
      );
      expect(codeBlockOp).toBeDefined();
    });

    it('mathBlock: true promotes standalone $...$ WITHOUT blank lines', async () => {
      // DeepSeek-style: formula on its own line but no blank lines around it
      const md =
        '### Основная формула:\n$\\int e^{x} \\, dx = e^{x} + C$\nГде **C** — константа.\n';
      const delta = await markdownToDelta(md, { mathBlock: true });

      const codeBlockOp = delta.ops.find(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'math',
      );
      expect(codeBlockOp).toBeDefined();
    });

    it('mathBlock: true keeps inline $...$ within text as formula embed', async () => {
      // Formula inside text → stays as inline formula embed
      const md = 'The value $e^{x}$ is cool\n';
      const delta = await markdownToDelta(md, { mathBlock: true });

      const formulaOp = delta.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'formula' in op.insert,
      );
      expect(formulaOp).toBeDefined();

      // Should NOT have code-block
      const codeBlockOp = delta.ops.find(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'math',
      );
      expect(codeBlockOp).toBeUndefined();
    });

    it('mathBlock: false keeps standalone $...$ as inline formula', async () => {
      const md = '$\\int e^{x} \\, dx = e^{x} + C$\n';
      const delta = await markdownToDelta(md, { mathBlock: false });

      const formulaOp = delta.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'formula' in op.insert,
      );
      expect(formulaOp).toBeDefined();

      // Should NOT have code-block
      const codeBlockOp = delta.ops.find(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'math',
      );
      expect(codeBlockOp).toBeUndefined();
    });
  });

  describe('mermaid code block', () => {
    it('parses mermaid fenced code block', async () => {
      const md = '```mermaid\ngraph TD\n    A-->B\n```\n';
      const delta = await markdownToDelta(md);

      const mermaidOp = delta.ops.find(
        (op) =>
          'insert' in op && typeof op.insert === 'string' &&
          op.insert === '\n' &&
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'mermaid',
      );
      expect(mermaidOp).toBeDefined();

      // Should contain the diagram text
      const textOps = delta.ops.filter((op): op is InsertOp => 'insert' in op && typeof op.insert === 'string' && op.insert !== '\n');
      const text = textOps.map((op) => op.insert as string).join('');
      expect(text).toContain('graph TD');
      expect(text).toContain('A-->B');
    });

    it('parses multi-line mermaid sequence diagram', async () => {
      const md =
        '```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi!\n```\n';
      const delta = await markdownToDelta(md);

      // All code lines should have code-block: "mermaid"
      const mermaidOps = delta.ops.filter(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'mermaid',
      );
      expect(mermaidOps.length).toBe(3); // 3 lines
    });

    it('roundtrip: mermaid Markdown → Delta → Markdown', async () => {
      const originalMd = '```mermaid\ngraph LR\n    A-->B\n    B-->C\n```';
      const delta = await markdownToDelta(originalMd);
      const resultMd = deltaToMarkdown(delta);
      expect(resultMd).toBe('```mermaid\ngraph LR\n    A-->B\n    B-->C\n```');
    });
  });

  describe('mermaidBlock option', () => {
    it('mermaidBlock: true (default) — mermaid becomes code-block', async () => {
      const md = '```mermaid\ngraph TD\n    A-->B\n```\n';
      const delta = await markdownToDelta(md, { mermaidBlock: true });

      const mermaidOp = delta.ops.find(
        (op) =>
          'insert' in op && typeof op.insert === 'string' &&
          op.insert === '\n' &&
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'mermaid',
      );
      expect(mermaidOp).toBeDefined();
    });

    it('mermaidBlock: false — mermaid becomes inline { diagram } embed', async () => {
      const md = '```mermaid\ngraph TD\n    A-->B\n```\n';
      const delta = await markdownToDelta(md, { mermaidBlock: false });

      // Should have a diagram embed, NOT a code-block
      const diagramOp = delta.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'diagram' in op.insert,
      );
      expect(diagramOp).toBeDefined();
      expect(((diagramOp as InsertOp).insert as Record<string, unknown>).diagram).toBe('graph TD\n    A-->B');

      // Should NOT have code-block mermaid
      const codeBlockOp = delta.ops.find(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'mermaid',
      );
      expect(codeBlockOp).toBeUndefined();
    });

    it('mermaidBlock: false does not affect other code blocks', async () => {
      const md = '```javascript\nconsole.log("hello")\n```\n';
      const delta = await markdownToDelta(md, { mermaidBlock: false });

      // JavaScript code block should still be a code-block
      const jsOp = delta.ops.find(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'javascript',
      );
      expect(jsOp).toBeDefined();

      // No diagram embed
      const diagramOp = delta.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'diagram' in op.insert,
      );
      expect(diagramOp).toBeUndefined();
    });

    it('roundtrip: mermaidBlock ON → OFF preserves content', async () => {
      const md = '```mermaid\ngraph LR\n    A-->B\n```\n';

      // Parse with mermaidBlock=true → code-block
      const delta1 = await markdownToDelta(md, { mermaidBlock: true });
      const codeBlockOp = delta1.ops.find(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'mermaid',
      );
      expect(codeBlockOp).toBeDefined();

      // Convert back to Markdown
      const mdResult = deltaToMarkdown(delta1);
      expect(mdResult).toContain('```mermaid');
      expect(mdResult).toContain('A-->B');
    });
  });

  describe('plantuml code block', () => {
    it('parses plantuml fenced code block', async () => {
      const md = '```plantuml\n@startuml\nAlice -> Bob: Hello\n@enduml\n```\n';
      const delta = await markdownToDelta(md);

      const plantumlOp = delta.ops.find(
        (op) =>
          'insert' in op && typeof op.insert === 'string' &&
          op.insert === '\n' &&
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'plantuml',
      );
      expect(plantumlOp).toBeDefined();

      const textOps = delta.ops.filter((op): op is InsertOp => 'insert' in op && typeof op.insert === 'string' && op.insert !== '\n');
      const text = textOps.map((op) => op.insert as string).join('');
      expect(text).toContain('@startuml');
      expect(text).toContain('Alice -> Bob: Hello');
    });

    it('roundtrip: plantuml Markdown → Delta → Markdown', async () => {
      const originalMd = '```plantuml\n@startuml\nAlice -> Bob: Hello\n@enduml\n```';
      const delta = await markdownToDelta(originalMd);
      const resultMd = deltaToMarkdown(delta);
      expect(resultMd).toBe('```plantuml\n@startuml\nAlice -> Bob: Hello\n@enduml\n```');
    });
  });

  describe('plantumlBlock option', () => {
    it('plantumlBlock: true (default) — plantuml becomes code-block', async () => {
      const md = '```plantuml\n@startuml\nAlice -> Bob: Hello\n@enduml\n```\n';
      const delta = await markdownToDelta(md, { plantumlBlock: true });

      const plantumlOp = delta.ops.find(
        (op) =>
          'insert' in op && typeof op.insert === 'string' &&
          op.insert === '\n' &&
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'plantuml',
      );
      expect(plantumlOp).toBeDefined();
    });

    it('plantumlBlock: false — plantuml becomes inline { diagram } embed', async () => {
      const md = '```plantuml\n@startuml\nAlice -> Bob: Hello\n@enduml\n```\n';
      const delta = await markdownToDelta(md, { plantumlBlock: false });

      // Should have a diagram embed, NOT a code-block
      const diagramOp = delta.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'diagram' in op.insert,
      );
      expect(diagramOp).toBeDefined();
      expect(((diagramOp as InsertOp).insert as Record<string, unknown>).diagram).toBe(
        '@startuml\nAlice -> Bob: Hello\n@enduml',
      );

      // Should NOT have code-block plantuml
      const codeBlockOp = delta.ops.find(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'plantuml',
      );
      expect(codeBlockOp).toBeUndefined();
    });

    it('plantumlBlock: false does not affect mermaid code blocks', async () => {
      const md = '```mermaid\ngraph TD\n    A-->B\n```\n';
      const delta = await markdownToDelta(md, { plantumlBlock: false });

      // Mermaid should still be a code-block
      const mermaidOp = delta.ops.find(
        (op) =>
          'attributes' in op && op.attributes != null &&
          (op.attributes as Record<string, unknown>)['code-block'] === 'mermaid',
      );
      expect(mermaidOp).toBeDefined();
    });

    it('{ diagram } embed with @startuml → renders as ```plantuml in Markdown', () => {
      const delta = new Delta()
        .insert({ diagram: '@startuml\nAlice -> Bob\n@enduml' })
        .insert('\n');

      const md = deltaToMarkdown(delta);
      expect(md).toContain('```plantuml');
      expect(md).toContain('@startuml');
    });

    it('{ diagram } embed without @startuml → renders as ```mermaid in Markdown', () => {
      const delta = new Delta().insert({ diagram: 'graph TD\n    A-->B' }).insert('\n');

      const md = deltaToMarkdown(delta);
      expect(md).toContain('```mermaid');
      expect(md).toContain('A-->B');
    });
  });

  describe('drawio embed', () => {
    it('![alt](file.drawio) → { drawio } embed (not image)', async () => {
      const md = '![C4 Model](./assets/diagram.drawio)\n';
      const delta = await markdownToDelta(md);

      const drawioOp = delta.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'drawio' in op.insert,
      );
      expect(drawioOp).toBeDefined();
      expect(((drawioOp as InsertOp).insert as Record<string, unknown>).drawio).toBe('./assets/diagram.drawio');
      expect((drawioOp as InsertOp).attributes).toEqual({ alt: 'C4 Model' });

      // Should NOT be an image embed
      const imageOp = delta.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'image' in op.insert,
      );
      expect(imageOp).toBeUndefined();
    });

    it('![alt](photo.png) → { image } embed (not drawio)', async () => {
      const md = '![photo](./assets/photo.png)\n';
      const delta = await markdownToDelta(md);

      const imageOp = delta.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'image' in op.insert,
      );
      expect(imageOp).toBeDefined();

      const drawioOp = delta.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'drawio' in op.insert,
      );
      expect(drawioOp).toBeUndefined();
    });

    it('{ drawio } embed → ![alt](path.drawio) roundtrip', async () => {
      const delta = new Delta()
        .insert({ drawio: './assets/model.drawio' }, { alt: 'Architecture' })
        .insert('\n');

      const md = deltaToMarkdown(delta);
      expect(md).toContain('![Architecture](./assets/model.drawio)');

      // Parse back
      const delta2 = await markdownToDelta(md);
      const drawioOp = delta2.ops.find(
        (op) => 'insert' in op && typeof op.insert === 'object' && op.insert !== null && 'drawio' in op.insert,
      );
      expect(drawioOp).toBeDefined();
      expect(((drawioOp as InsertOp).insert as Record<string, unknown>).drawio).toBe('./assets/model.drawio');
    });

    it('{ drawio } embed without alt → ![](path.drawio)', () => {
      const delta = new Delta().insert({ drawio: '/drawio/diagram.drawio' }).insert('\n');

      const md = deltaToMarkdown(delta);
      expect(md).toContain('![](/drawio/diagram.drawio)');
    });
  });
});

// Test for when remark is not available
describe.skipIf(runTests)('markdownToDelta (no remark)', () => {
  it('reports remark as unavailable', () => {
    expect(isRemarkAvailable()).toBe(false);
  });
});
