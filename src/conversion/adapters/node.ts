/**
 * Node.js DOM Adapter
 *
 * Uses jsdom for HTML parsing and serialization in Node.js environment.
 */

import type { DOMAdapter, DOMDocument, DOMDocumentFragment, DOMNode } from './types';

// jsdom types - loaded dynamically
interface JsdomInstance {
  window: {
    document: Document;
  };
}

interface JsdomConstructor {
  new (html: string): JsdomInstance;
}

interface JsdomModuleType {
  JSDOM: JsdomConstructor;
}

/**
 * Cached jsdom module (lazy loaded)
 */
let jsdomModule: JsdomModuleType | null = null;
let jsdomLoadError: Error | null = null;

/**
 * Attempt to load jsdom module
 */
async function loadJsdom(): Promise<JsdomModuleType> {
  if (jsdomLoadError) {
    throw jsdomLoadError;
  }

  if (jsdomModule) {
    return jsdomModule;
  }

  try {
    // Dynamic import for optional dependency
    const mod = await import('jsdom');
    jsdomModule = mod as unknown as JsdomModuleType;
    return jsdomModule;
  } catch {
    jsdomLoadError = new Error('jsdom is not installed. Install it with: pnpm add jsdom');
    throw jsdomLoadError;
  }
}

/**
 * Synchronously check if jsdom is available (without loading)
 */
function isJsdomAvailable(): boolean {
  // In Node.js environment, we can check if the module exists
  if (typeof window !== 'undefined') {
    return false; // Browser environment
  }

  try {
    // Check if already loaded
    if (jsdomModule) return true;
    if (jsdomLoadError) return false;

    // Try to require jsdom (sync check)
    require.resolve('jsdom');
    return true;
  } catch {
    return false;
  }
}

/**
 * Node.js DOM Adapter implementation
 *
 * Uses jsdom for DOM operations in Node.js environment.
 * jsdom is loaded lazily to avoid issues in browser bundles.
 */
export class NodeDOMAdapter implements DOMAdapter {
  private jsdom: JsdomInstance | null = null;

  /**
   * Parse HTML string into a document fragment
   */
  parseHTML(html: string): DOMDocumentFragment {
    const dom = this.getOrCreateJsdom();
    const template = dom.window.document.createElement('template');
    template.innerHTML = html;

    return template.content as unknown as DOMDocumentFragment;
  }

  /**
   * Serialize a node to HTML string
   */
  serializeHTML(node: DOMNode | DOMDocumentFragment): string {
    const dom = this.getOrCreateJsdom();

    // DocumentFragment - serialize all children
    if (node.nodeType === 11) {
      const container = dom.window.document.createElement('div');
      const clone = (node as unknown as DocumentFragment).cloneNode(true);
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
    const dom = this.getOrCreateJsdom();
    return dom.window.document as unknown as DOMDocument;
  }

  /**
   * Check if jsdom is available
   */
  isAvailable(): boolean {
    return isJsdomAvailable();
  }

  /**
   * Initialize the adapter with jsdom (async)
   *
   * Call this before using the adapter if you want to handle
   * loading errors gracefully.
   */
  async initialize(): Promise<void> {
    const mod = await loadJsdom();
    this.jsdom = new mod.JSDOM('<!DOCTYPE html><html><body></body></html>');
  }

  /**
   * Get or create jsdom instance (sync, throws if not available)
   */
  private getOrCreateJsdom(): JsdomInstance {
    if (this.jsdom) {
      return this.jsdom;
    }

    // Synchronous require for already-resolved module
    if (!isJsdomAvailable()) {
      throw new Error('jsdom is not available. Install it with: pnpm add jsdom');
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('jsdom') as JsdomModuleType;
    this.jsdom = new mod.JSDOM('<!DOCTYPE html><html><body></body></html>');

    return this.jsdom;
  }
}

/**
 * Singleton instance of Node adapter
 */
export const nodeAdapter = new NodeDOMAdapter();
