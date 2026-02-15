import { describe, it, expect, beforeEach } from 'vitest';
import {
  NodeDOMAdapter,
  nodeAdapter,
  NODE_TYPE,
  isElement,
  isTextNode,
  getAdapter,
  isAdapterAvailable,
} from '../../src/conversion/adapters';

describe('NodeDOMAdapter', () => {
  let adapter: NodeDOMAdapter;

  beforeEach(() => {
    adapter = new NodeDOMAdapter();
  });

  describe('isAvailable', () => {
    it('returns true when jsdom is installed', () => {
      expect(adapter.isAvailable()).toBe(true);
    });
  });

  describe('parseHTML', () => {
    it('parses simple HTML', () => {
      const fragment = adapter.parseHTML('<p>Hello</p>');

      expect(fragment.childNodes.length).toBe(1);
      expect(fragment.firstChild?.nodeName).toBe('P');
    });

    it('parses multiple elements', () => {
      const fragment = adapter.parseHTML('<p>First</p><p>Second</p>');

      expect(fragment.childNodes.length).toBe(2);
    });

    it('parses nested HTML', () => {
      const fragment = adapter.parseHTML('<div><strong>Bold</strong> text</div>');

      expect(fragment.childNodes.length).toBe(1);
      const div = fragment.firstChild!;
      expect(div.childNodes.length).toBe(2);
    });

    it('parses text content', () => {
      const fragment = adapter.parseHTML('Just text');

      expect(fragment.firstChild?.nodeType).toBe(NODE_TYPE.TEXT_NODE);
      expect(fragment.firstChild?.textContent).toBe('Just text');
    });

    it('parses empty string', () => {
      const fragment = adapter.parseHTML('');

      expect(fragment.childNodes.length).toBe(0);
    });

    it('parses HTML with attributes', () => {
      const fragment = adapter.parseHTML('<a href="https://example.com">Link</a>');

      const link = fragment.firstChild as unknown as Element;
      expect(link.getAttribute('href')).toBe('https://example.com');
    });

    it('parses inline styles', () => {
      const fragment = adapter.parseHTML('<span style="color: red;">Red</span>');

      const span = fragment.firstChild as unknown as HTMLElement;
      expect(span.style.color).toBe('red');
    });
  });

  describe('serializeHTML', () => {
    it('serializes element to HTML string', () => {
      const fragment = adapter.parseHTML('<p>Hello</p>');
      const html = adapter.serializeHTML(fragment);

      expect(html).toBe('<p>Hello</p>');
    });

    it('serializes multiple elements', () => {
      const fragment = adapter.parseHTML('<p>First</p><p>Second</p>');
      const html = adapter.serializeHTML(fragment);

      expect(html).toBe('<p>First</p><p>Second</p>');
    });

    it('serializes nested HTML', () => {
      const fragment = adapter.parseHTML('<div><strong>Bold</strong></div>');
      const html = adapter.serializeHTML(fragment);

      expect(html).toBe('<div><strong>Bold</strong></div>');
    });

    it('serializes single element node', () => {
      const fragment = adapter.parseHTML('<p>Test</p>');
      const element = fragment.firstChild!;
      const html = adapter.serializeHTML(element);

      expect(html).toBe('<p>Test</p>');
    });

    it('serializes text node', () => {
      const fragment = adapter.parseHTML('Just text');
      const textNode = fragment.firstChild!;
      const html = adapter.serializeHTML(textNode);

      expect(html).toBe('Just text');
    });

    it('preserves attributes', () => {
      const fragment = adapter.parseHTML('<a href="https://example.com" target="_blank">Link</a>');
      const html = adapter.serializeHTML(fragment);

      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('target="_blank"');
    });
  });

  describe('createDocument', () => {
    it('creates a document', () => {
      const doc = adapter.createDocument();

      expect(doc).toBeDefined();
      expect(typeof doc.createElement).toBe('function');
      expect(typeof doc.createTextNode).toBe('function');
    });

    it('can create elements', () => {
      const doc = adapter.createDocument();
      const p = doc.createElement('p');

      expect(p.tagName).toBe('P');
    });

    it('can create text nodes', () => {
      const doc = adapter.createDocument();
      const text = doc.createTextNode('Hello');

      expect(text.textContent).toBe('Hello');
    });

    it('can build DOM structures', () => {
      const doc = adapter.createDocument();
      const p = doc.createElement('p');
      const strong = doc.createElement('strong');
      const text = doc.createTextNode('Bold text');

      strong.appendChild(text);
      p.appendChild(strong);

      expect((p as unknown as Element).innerHTML).toBe('<strong>Bold text</strong>');
    });
  });

  describe('roundtrip', () => {
    it('parse → serialize preserves content', () => {
      const original = '<p><strong>Hello</strong> <em>World</em></p>';
      const fragment = adapter.parseHTML(original);
      const result = adapter.serializeHTML(fragment);

      expect(result).toBe(original);
    });

    it('handles complex nested structures', () => {
      const original = '<blockquote><p>Quote with <a href="#">link</a></p></blockquote>';
      const fragment = adapter.parseHTML(original);
      const result = adapter.serializeHTML(fragment);

      expect(result).toBe(original);
    });
  });
});

describe('nodeAdapter singleton', () => {
  it('is available', () => {
    expect(nodeAdapter.isAvailable()).toBe(true);
  });

  it('can parse HTML', () => {
    const fragment = nodeAdapter.parseHTML('<p>Test</p>');
    expect(fragment.firstChild?.nodeName).toBe('P');
  });
});

describe('Type guards', () => {
  describe('isElement', () => {
    it('returns true for element nodes', () => {
      const fragment = nodeAdapter.parseHTML('<p>Test</p>');
      const element = fragment.firstChild!;

      expect(isElement(element)).toBe(true);
    });

    it('returns false for text nodes', () => {
      const fragment = nodeAdapter.parseHTML('Just text');
      const textNode = fragment.firstChild!;

      expect(isElement(textNode)).toBe(false);
    });
  });

  describe('isTextNode', () => {
    it('returns true for text nodes', () => {
      const fragment = nodeAdapter.parseHTML('Just text');
      const textNode = fragment.firstChild!;

      expect(isTextNode(textNode)).toBe(true);
    });

    it('returns false for element nodes', () => {
      const fragment = nodeAdapter.parseHTML('<p>Test</p>');
      const element = fragment.firstChild!;

      expect(isTextNode(element)).toBe(false);
    });
  });
});

describe('NODE_TYPE constants', () => {
  it('has correct values', () => {
    expect(NODE_TYPE.ELEMENT_NODE).toBe(1);
    expect(NODE_TYPE.TEXT_NODE).toBe(3);
    expect(NODE_TYPE.DOCUMENT_NODE).toBe(9);
    expect(NODE_TYPE.DOCUMENT_FRAGMENT_NODE).toBe(11);
  });
});

describe('getAdapter', () => {
  it('returns an adapter in Node.js environment', () => {
    const adapter = getAdapter();

    expect(adapter).toBeDefined();
    expect(adapter.isAvailable()).toBe(true);
  });
});

describe('isAdapterAvailable', () => {
  it('returns true when jsdom is installed', () => {
    expect(isAdapterAvailable()).toBe(true);
  });
});
