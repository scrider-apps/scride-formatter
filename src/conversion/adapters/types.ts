/**
 * DOM Adapter Interface
 *
 * Provides a unified interface for DOM operations across different environments:
 * - Browser: uses native DOM APIs
 * - Node.js: uses jsdom
 *
 * This abstraction allows the same conversion code to work in both environments.
 */

/**
 * Minimal Document interface required for HTML parsing/rendering
 */
export interface DOMDocument {
  createElement(tagName: string): DOMElement;
  createTextNode(text: string): DOMNode;
  createDocumentFragment(): DOMDocumentFragment;
  readonly body: DOMElement;
}

/**
 * Minimal DocumentFragment interface
 */
export interface DOMDocumentFragment {
  appendChild(node: DOMNode): DOMNode;
  readonly childNodes: DOMNodeList;
  readonly firstChild: DOMNode | null;
  readonly nodeType: number;
  readonly textContent: string | null;
}

/**
 * Minimal Node interface
 */
export interface DOMNode {
  readonly nodeType: number;
  readonly nodeName: string;
  readonly parentNode: DOMNode | null;
  readonly childNodes: DOMNodeList;
  readonly firstChild: DOMNode | null;
  readonly nextSibling: DOMNode | null;
  textContent: string | null;
  appendChild(node: DOMNode): DOMNode;
  cloneNode(deep?: boolean): DOMNode;
}

/**
 * Minimal Element interface
 */
export interface DOMElement extends DOMNode {
  readonly tagName: string;
  innerHTML: string;
  outerHTML: string;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  hasAttribute(name: string): boolean;
  removeAttribute(name: string): void;
  readonly style: DOMCSSStyleDeclaration;
  readonly classList: DOMTokenList;
  querySelector(selector: string): DOMElement | null;
  querySelectorAll(selector: string): DOMNodeList;
}

/**
 * Minimal CSSStyleDeclaration interface
 */
export interface DOMCSSStyleDeclaration {
  getPropertyValue(property: string): string;
  setProperty(property: string, value: string): void;
  // Common CSS properties
  color?: string;
  backgroundColor?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
}

/**
 * Minimal DOMTokenList interface (for classList)
 */
export interface DOMTokenList {
  add(...tokens: string[]): void;
  remove(...tokens: string[]): void;
  contains(token: string): boolean;
  readonly length: number;
}

/**
 * Minimal NodeList interface
 */
export interface DOMNodeList {
  readonly length: number;
  item(index: number): DOMNode | null;
  [index: number]: DOMNode;
  forEach(callback: (node: DOMNode, index: number) => void): void;
}

/**
 * Node type constants
 */
export const NODE_TYPE = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  DOCUMENT_NODE: 9,
  DOCUMENT_FRAGMENT_NODE: 11,
} as const;

/**
 * DOM Adapter interface
 *
 * Provides methods for creating and manipulating DOM structures
 * in a platform-agnostic way.
 */
export interface DOMAdapter {
  /**
   * Parse HTML string into a document fragment
   */
  parseHTML(html: string): DOMDocumentFragment;

  /**
   * Serialize a node to HTML string
   */
  serializeHTML(node: DOMNode | DOMDocumentFragment): string;

  /**
   * Create a new document for building DOM structures
   */
  createDocument(): DOMDocument;

  /**
   * Check if this adapter is available in the current environment
   */
  isAvailable(): boolean;
}

/**
 * Type guard: check if node is an Element
 */
export function isElement(node: DOMNode): node is DOMElement {
  return node.nodeType === NODE_TYPE.ELEMENT_NODE;
}

/**
 * Type guard: check if node is a Text node
 */
export function isTextNode(node: DOMNode): boolean {
  return node.nodeType === NODE_TYPE.TEXT_NODE;
}
