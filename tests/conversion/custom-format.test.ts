/**
 * Integration tests for custom Format render/match/toMarkdown.
 *
 * Verifies end-to-end: Delta → HTML → Delta roundtrip via registry,
 * and Delta → Markdown via registry.
 */
import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';
import type { AttributeMap } from '@scrider/delta';
import { Registry } from '../../src/schema/Registry';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { deltaToMarkdown } from '../../src/conversion/markdown/delta-to-markdown';
import type { Format, FormatMatchResult } from '../../src/schema/Format';
import type { DOMElement } from '../../src/conversion/adapters/types';

/**
 * Custom StackBlitz embed format — the example from the concept doc.
 *
 * Level 2 (render + match) + Level 3 (toMarkdown).
 */
const stackblitzFormat: Format<string> = {
  name: 'stackblitz',
  scope: 'embed',

  validate(value: string): boolean {
    return typeof value === 'string' && value.includes('stackblitz.com');
  },

  render(value: string): string {
    return `<iframe src="${value}" class="stackblitz-embed" frameborder="0"></iframe>`;
  },

  match(element: DOMElement): FormatMatchResult<string> | null {
    const tag = element.tagName.toLowerCase();
    if (tag !== 'iframe') return null;
    const src = element.getAttribute('src');
    if (!src || !src.includes('stackblitz.com')) return null;
    return { value: src };
  },

  toMarkdown(value: string): string {
    return `![StackBlitz](${value})`;
  },
};

/**
 * Minimal custom embed — Level 1 only (validate, no render/match).
 * Should be ignored by converters (no render/match methods).
 */
const minimalFormat: Format<string> = {
  name: 'custom-widget',
  scope: 'embed',
  validate(value: string): boolean {
    return typeof value === 'string' && value.length > 0;
  },
};

/**
 * Custom format with render + match + toMarkdown returning null.
 * Should fall back to HTML-in-Markdown.
 */
const figmaFormat: Format<string> = {
  name: 'figma',
  scope: 'embed',

  validate(value: string): boolean {
    return typeof value === 'string' && value.includes('figma.com');
  },

  render(value: string): string {
    return `<iframe src="${value}" class="figma-embed"></iframe>`;
  },

  match(element: DOMElement): FormatMatchResult<string> | null {
    if (element.tagName.toLowerCase() !== 'iframe') return null;
    const src = element.getAttribute('src');
    if (!src || !src.includes('figma.com')) return null;
    return { value: src };
  },

  toMarkdown(): string | null {
    return null; // no Markdown representation — fallback to HTML
  },
};

function createRegistry(...formats: Format[]): Registry {
  const registry = new Registry();
  for (const f of formats) {
    registry.register(f);
  }
  return registry;
}

describe('Custom Format Integration', () => {
  describe('deltaToHtml with registry', () => {
    it('should render custom embed via format.render()', () => {
      const registry = createRegistry(stackblitzFormat);
      const delta = new Delta()
        .insert({ stackblitz: 'https://stackblitz.com/edit/my-app' })
        .insert('\n');

      const html = deltaToHtml(delta, { registry });
      expect(html).toContain('<iframe src="https://stackblitz.com/edit/my-app"');
      expect(html).toContain('class="stackblitz-embed"');
    });

    it('should fall back to EMBED_RENDERERS when format has no render()', () => {
      const registry = createRegistry(minimalFormat);
      const delta = new Delta().insert({ image: 'https://example.com/img.png' }).insert('\n');

      const html = deltaToHtml(delta, { registry });
      // image is not in registry → falls back to built-in EMBED_RENDERERS
      expect(html).toContain('<img src="https://example.com/img.png">');
    });

    it('should fall back to data-embed for unknown format without render()', () => {
      const registry = createRegistry(minimalFormat);
      const delta = new Delta().insert({ 'custom-widget': 'some-value' }).insert('\n');

      const html = deltaToHtml(delta, { registry });
      // minimalFormat has no render(), and custom-widget is not in EMBED_RENDERERS
      expect(html).toContain('data-embed="custom-widget"');
    });
  });

  describe('htmlToDelta with registry', () => {
    it('should match custom embed via format.match()', () => {
      const registry = createRegistry(stackblitzFormat);
      const html =
        '<p><iframe src="https://stackblitz.com/edit/my-app" class="stackblitz-embed" frameborder="0"></iframe></p>';

      const delta = htmlToDelta(html, { registry });
      const ops = delta.ops;

      // Should have the custom embed op
      const embedOp = ops.find(
        (op) => typeof op.insert === 'object' && op.insert !== null && 'stackblitz' in op.insert,
      );
      expect(embedOp).toBeDefined();
      expect((embedOp!.insert as Record<string, unknown>).stackblitz).toBe(
        'https://stackblitz.com/edit/my-app',
      );
    });

    it('should fall back to built-in matching without registry', () => {
      // Without registry, iframe is matched as video
      const html =
        '<p><iframe src="https://www.youtube.com/embed/abc" frameborder="0"></iframe></p>';
      const delta = htmlToDelta(html);
      const ops = delta.ops;
      const embedOp = ops.find(
        (op) => typeof op.insert === 'object' && op.insert !== null && 'video' in op.insert,
      );
      expect(embedOp).toBeDefined();
    });

    it('should prefer registry match over built-in for custom iframe', () => {
      // With registry, stackblitz iframe is NOT matched as video but as stackblitz
      const registry = createRegistry(stackblitzFormat);
      const html =
        '<p><iframe src="https://stackblitz.com/edit/my-app" class="stackblitz-embed"></iframe></p>';

      const delta = htmlToDelta(html, { registry });
      const ops = delta.ops;

      const stackblitzOp = ops.find(
        (op) => typeof op.insert === 'object' && op.insert !== null && 'stackblitz' in op.insert,
      );
      expect(stackblitzOp).toBeDefined();

      // Should NOT have a video op
      const videoOp = ops.find(
        (op) => typeof op.insert === 'object' && op.insert !== null && 'video' in op.insert,
      );
      expect(videoOp).toBeUndefined();
    });
  });

  describe('Delta → HTML → Delta roundtrip with registry', () => {
    it('should roundtrip custom stackblitz embed', () => {
      const registry = createRegistry(stackblitzFormat);
      const original = new Delta()
        .insert({ stackblitz: 'https://stackblitz.com/edit/my-app' })
        .insert('\n');

      const html = deltaToHtml(original, { registry });
      const restored = htmlToDelta(html, { registry });

      const embedOp = restored.ops.find(
        (op) => typeof op.insert === 'object' && op.insert !== null && 'stackblitz' in op.insert,
      );
      expect(embedOp).toBeDefined();
      expect((embedOp!.insert as Record<string, unknown>).stackblitz).toBe(
        'https://stackblitz.com/edit/my-app',
      );
    });
  });

  describe('deltaToMarkdown with registry', () => {
    it('should use format.toMarkdown() for custom embed', () => {
      const registry = createRegistry(stackblitzFormat);
      const delta = new Delta()
        .insert({ stackblitz: 'https://stackblitz.com/edit/my-app' })
        .insert('\n');

      const md = deltaToMarkdown(delta, { registry });
      expect(md).toContain('![StackBlitz](https://stackblitz.com/edit/my-app)');
    });

    it('should fall back to render() when toMarkdown() returns null', () => {
      const registry = createRegistry(figmaFormat);
      const delta = new Delta().insert({ figma: 'https://www.figma.com/file/abc' }).insert('\n');

      const md = deltaToMarkdown(delta, { registry });
      // toMarkdown returns null → fallback to render() → HTML in Markdown
      expect(md).toContain('<iframe src="https://www.figma.com/file/abc"');
      expect(md).toContain('class="figma-embed"');
    });

    it('should use built-in handlers when format has no toMarkdown or render', () => {
      const registry = createRegistry(minimalFormat);
      const delta = new Delta().insert({ image: 'https://example.com/img.png' }).insert('\n');

      const md = deltaToMarkdown(delta, { registry });
      // image format is not in this registry → built-in handler → ![](url)
      expect(md).toContain('![](https://example.com/img.png)');
    });
  });

  describe('multiple custom formats', () => {
    it('should handle multiple custom formats in one registry', () => {
      const registry = createRegistry(stackblitzFormat, figmaFormat);

      const delta = new Delta()
        .insert({ stackblitz: 'https://stackblitz.com/edit/my-app' })
        .insert({ figma: 'https://www.figma.com/file/abc' })
        .insert('\n');

      const html = deltaToHtml(delta, { registry });
      expect(html).toContain('stackblitz-embed');
      expect(html).toContain('figma-embed');
    });
  });

  describe('custom format with attributes', () => {
    const mapFormat: Format<string> = {
      name: 'google-map',
      scope: 'embed',
      validate: (v: string) => typeof v === 'string',
      render(value: string, attrs?: AttributeMap): string {
        const w = typeof attrs?.width === 'string' ? ` width="${attrs.width}"` : '';
        const h = typeof attrs?.height === 'string' ? ` height="${attrs.height}"` : '';
        return `<iframe src="${value}" class="google-map"${w}${h}></iframe>`;
      },
      match(element: DOMElement): FormatMatchResult<string> | null {
        if (element.tagName.toLowerCase() !== 'iframe') return null;
        const src = element.getAttribute('src');
        if (!src || !src.includes('google.com/maps')) return null;
        const attrs: AttributeMap = {};
        const w = element.getAttribute('width');
        const h = element.getAttribute('height');
        if (w) attrs.width = w;
        if (h) attrs.height = h;
        if (Object.keys(attrs).length > 0) {
          return { value: src, attributes: attrs };
        }
        return { value: src };
      },
    };

    it('should render with attributes', () => {
      const registry = createRegistry(mapFormat);
      const delta = new Delta()
        .insert(
          { 'google-map': 'https://www.google.com/maps/embed?pb=abc' },
          { width: '600', height: '400' },
        )
        .insert('\n');

      const html = deltaToHtml(delta, { registry });
      expect(html).toContain('width="600"');
      expect(html).toContain('height="400"');
      expect(html).toContain('class="google-map"');
    });

    it('should match and extract attributes', () => {
      const registry = createRegistry(mapFormat);
      const html =
        '<p><iframe src="https://www.google.com/maps/embed?pb=abc" class="google-map" width="600" height="400"></iframe></p>';

      const delta = htmlToDelta(html, { registry });
      const embedOp = delta.ops.find(
        (op) => typeof op.insert === 'object' && op.insert !== null && 'google-map' in op.insert,
      );
      expect(embedOp).toBeDefined();
      expect((embedOp!.insert as Record<string, unknown>)['google-map']).toBe(
        'https://www.google.com/maps/embed?pb=abc',
      );
      expect(embedOp!.attributes).toEqual({ width: '600', height: '400' });
    });
  });
});
