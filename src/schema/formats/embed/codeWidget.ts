import type { Format, FormatMatchResult, FormatRenderContext } from '../../Format';
import type { DOMElement } from '../../../conversion/adapters/types';
import type { AttributeMap } from '@scrider/delta';
import {
  escapeHtml,
  renderEmbedIframeIsolationAttrs,
  toCodeWidgetEmbedUrl,
} from '../../../conversion/html/config';
/**
 * Code Widget embed format (Phase 8 Part 3.5)
 *
 * Delta: { insert: { codeWidget: "https://codesandbox.io/s/abc123" } }
 *
 * Value is a URL to an interactive code playground (StackBlitz, CodeSandbox,
 * Replit, CodePen, JSFiddle, Trinket, OneCompiler). Rendered as an <iframe> carrying a
 * `data-code-widget` marker so it can be told apart from a plain video iframe
 * during HTML → Delta (see videoFormat.match guard).
 *
 * Markdown: ![Widget](url)
 * HTML: <iframe data-code-widget src="<embed-url>" frameborder="0" allowfullscreen
 *         [allow="…; cross-origin-isolated"] [credentialless]>
 *
 * Isolation attrs (`allow="…; cross-origin-isolated"`, `credentialless`) are
 * opt-in via `deltaToHtml({ embed: { crossOriginIsolated, credentialless } })`.
 * Default off — public embeds (CodePen) load with browser cookies.
 *
 * The `allow="…; cross-origin-isolated"` list (see CODE_WIDGET_IFRAME_ALLOW)
 * delegates the cross-origin-isolated capability so StackBlitz WebContainer
 * embeds can boot SharedArrayBuffer when the host is cross-origin-isolated.
 * `credentialless` keeps the frame loadable under COEP on such a host.
 *
 * The src is run through `toCodeWidgetEmbedUrl` at render time, which is
 * idempotent, so resize/float attributes and the Delta ↔ HTML round-trip stay
 * stable regardless of whether the stored value is the user URL or embed URL.
 */
export const codeWidgetFormat: Format<string> = {
  name: 'codeWidget',
  scope: 'embed',

  normalize(value: string): string {
    return typeof value === 'string' ? value.trim() : value;
  },

  validate(value: string): boolean {
    if (typeof value !== 'string' || value.length === 0) {
      return false;
    }

    const trimmed = value.trim();

    // Relative paths
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return true;
    }

    // Protocol-relative
    if (trimmed.startsWith('//')) {
      return true;
    }

    // Absolute URLs
    try {
      const url = new URL(trimmed);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  },

  render(value: string, attributes?: AttributeMap, context?: FormatRenderContext): string {
    const src = typeof value === 'string' ? value : '';
    const floatVal = attributes?.float;
    const widthVal = attributes?.width;
    const heightVal = attributes?.height;
    const float =
      floatVal != null && typeof floatVal === 'string' && floatVal !== 'none'
        ? ` data-float="${escapeHtml(floatVal)}"`
        : '';
    const styles: string[] = [];
    if (widthVal != null && (typeof widthVal === 'string' || typeof widthVal === 'number')) {
      const w = String(widthVal);
      if (w && w !== 'auto') styles.push(`width: ${/^\d+$/.test(w) ? w + 'px' : w}`);
    }
    if (heightVal != null && (typeof heightVal === 'string' || typeof heightVal === 'number')) {
      const h = String(heightVal);
      if (h && h !== 'auto') styles.push(`height: ${/^\d+$/.test(h) ? h + 'px' : h}`);
    }
    const style = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    const embedSrc = toCodeWidgetEmbedUrl(src);
    return `<iframe data-code-widget src="${escapeHtml(embedSrc)}" frameborder="0" allowfullscreen${renderEmbedIframeIsolationAttrs(context, 'codeWidget')}${float}${style}></iframe>`;
  },

  match(element: DOMElement): FormatMatchResult<string> | null {
    if (element.tagName.toLowerCase() !== 'iframe') return null;
    if (element.getAttribute('data-code-widget') === null) return null;

    const src = element.getAttribute('src');
    if (!src) return null;

    const attrs: AttributeMap = {};
    const float = element.getAttribute('data-float');
    const styleAttr = element.getAttribute('style') || '';

    if (float) attrs.float = float;

    // Extract width/height from inline style (parity with videoFormat)
    const widthMatch = styleAttr.match(/(?:^|;\s*)width:\s*([^;]+)/);
    if (widthMatch?.[1]) attrs.width = widthMatch[1].trim().replace(/px$/, '');
    const heightMatch = styleAttr.match(/(?:^|;\s*)height:\s*([^;]+)/);
    if (heightMatch?.[1]) attrs.height = heightMatch[1].trim().replace(/px$/, '');

    if (Object.keys(attrs).length > 0) {
      return { value: src, attributes: attrs };
    }
    return { value: src };
  },

  toMarkdown(value: string): string {
    const src = typeof value === 'string' ? value : '';
    return `![Widget](${src})`;
  },
};
