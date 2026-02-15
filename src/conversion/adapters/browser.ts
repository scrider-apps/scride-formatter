/**
 * Browser DOM Adapter
 *
 * Uses native browser DOM APIs for HTML parsing and serialization.
 * Only available in browser environments.
 */

import type { DOMAdapter, DOMDocument, DOMDocumentFragment, DOMNode } from './types';

/**
 * Browser DOM Adapter implementation
 *
 * Uses native browser APIs:
 * - DOMParser for parsing HTML
 * - Element.outerHTML for serialization
 */
export class BrowserDOMAdapter implements DOMAdapter {
  /**
   * Parse HTML string into a document fragment
   *
   * Uses a template element to parse arbitrary HTML safely.
   */
  parseHTML(html: string): DOMDocumentFragment {
    if (!this.isAvailable()) {
      throw new Error('BrowserDOMAdapter is not available in this environment');
    }

    const template = document.createElement('template');
    template.innerHTML = html;

    return template.content as unknown as DOMDocumentFragment;
  }

  /**
   * Serialize a node to HTML string
   */
  serializeHTML(node: DOMNode | DOMDocumentFragment): string {
    if (!this.isAvailable()) {
      throw new Error('BrowserDOMAdapter is not available in this environment');
    }

    // DocumentFragment - serialize all children
    if (node.nodeType === 11) {
      const container = document.createElement('div');
      const clone = (node as DocumentFragment).cloneNode(true);
      container.appendChild(clone);
      return container.innerHTML;
    }

    // Element - use outerHTML
    if (node.nodeType === 1) {
      return (node as unknown as Element).outerHTML;
    }

    // Text node - return text content
    if (node.nodeType === 3) {
      return String(node.textContent ?? '');
    }

    return '';
  }

  /**
   * Create a new document for building DOM structures
   */
  createDocument(): DOMDocument {
    if (!this.isAvailable()) {
      throw new Error('BrowserDOMAdapter is not available in this environment');
    }

    return document as unknown as DOMDocument;
  }

  /**
   * Check if browser DOM APIs are available
   */
  isAvailable(): boolean {
    return typeof document !== 'undefined' && typeof document.createElement === 'function';
  }
}

/**
 * Singleton instance of browser adapter
 */
export const browserAdapter = new BrowserDOMAdapter();
