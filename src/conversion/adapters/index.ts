/**
 * DOM Adapters
 *
 * Platform-agnostic DOM manipulation for HTML ↔ Delta conversion.
 */

export * from './types';
export { BrowserDOMAdapter, browserAdapter } from './browser';
export { NodeDOMAdapter, nodeAdapter } from './node';

import type { DOMAdapter } from './types';
import { browserAdapter } from './browser';
import { nodeAdapter } from './node';

/**
 * Get the appropriate DOM adapter for the current environment
 *
 * - In browser: returns BrowserDOMAdapter (native DOM)
 * - In Node.js: returns NodeDOMAdapter (jsdom)
 *
 * @returns The appropriate DOM adapter
 * @throws Error if no adapter is available
 */
export function getAdapter(): DOMAdapter {
  if (browserAdapter.isAvailable()) {
    return browserAdapter;
  }

  if (nodeAdapter.isAvailable()) {
    return nodeAdapter;
  }

  throw new Error('No DOM adapter available. In Node.js, install jsdom: pnpm add jsdom');
}

/**
 * Check if any DOM adapter is available
 */
export function isAdapterAvailable(): boolean {
  return browserAdapter.isAvailable() || nodeAdapter.isAvailable();
}
