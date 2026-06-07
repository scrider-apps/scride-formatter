/**
 * HTML ↔ Delta Mapping Configuration
 *
 * Defines the mapping between HTML elements/attributes and Delta attributes.
 */

import type { FormatRenderContext } from '../../schema/Format';

/**
 * Inline format to HTML tag mapping
 *
 * Order matters for rendering: formats earlier in the list wrap formats later.
 * This creates a canonical nesting order for HTML output.
 */
export const INLINE_FORMAT_TAGS: Record<string, string> = {
  link: 'a',
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  strike: 's',
  subscript: 'sub',
  superscript: 'sup',
  code: 'code',
  mark: 'mark',
  kbd: 'kbd',
};

/**
 * Order of inline formats for nesting (outer to inner)
 *
 * When rendering Delta to HTML, formats are nested in this order.
 * Example: bold + italic + code → <strong><em><code>text</code></em></strong>
 */
export const INLINE_FORMAT_ORDER: string[] = [
  'link',
  'bold',
  'italic',
  'underline',
  'strike',
  'subscript',
  'superscript',
  'code',
  'mark',
  'kbd',
];

/**
 * Inline formats that use CSS styles instead of tags
 */
export const INLINE_STYLE_FORMATS: Record<string, string> = {
  color: 'color',
  background: 'background-color',
  font: 'font-family',
  size: 'font-size',
};

/**
 * Block format to HTML tag mapping
 */
export const BLOCK_FORMAT_TAGS: Record<string, string | ((value: unknown) => string)> = {
  header: (value: unknown) => `h${String(value)}`,
  blockquote: 'blockquote',
  'code-block': 'pre',
  list: 'li', // Wrapped in ul/ol based on list type
};

/**
 * List type to wrapper tag mapping
 */
export const LIST_WRAPPER_TAGS: Record<string, string> = {
  ordered: 'ol',
  bullet: 'ul',
  checked: 'ul',
  unchecked: 'ul',
};

/**
 * Embed format to HTML renderer
 */
export type EmbedRenderer = (
  value: unknown,
  attributes?: Record<string, unknown>,
  context?: FormatRenderContext,
) => string;

export const EMBED_RENDERERS: Record<string, EmbedRenderer> = {
  image: (value, attrs) => {
    const src = typeof value === 'string' ? value : '';
    const altVal = attrs?.alt;
    const widthVal = attrs?.width;
    const heightVal = attrs?.height;
    const floatVal = attrs?.float;
    const alt =
      altVal != null && (typeof altVal === 'string' || typeof altVal === 'number')
        ? ` alt="${escapeHtml(String(altVal))}"`
        : '';
    const width =
      widthVal != null && (typeof widthVal === 'string' || typeof widthVal === 'number')
        ? ` width="${String(widthVal)}"`
        : '';
    const height =
      heightVal != null && (typeof heightVal === 'string' || typeof heightVal === 'number')
        ? ` height="${String(heightVal)}"`
        : '';
    // Float: data-float attribute for CSS-driven text wrapping
    const float =
      floatVal != null && typeof floatVal === 'string' && floatVal !== 'none'
        ? ` data-float="${escapeHtml(floatVal)}"`
        : '';
    return `<img src="${escapeHtml(src)}"${alt}${width}${height}${float}>`;
  },

  video: (value, attrs, context) => {
    const src = typeof value === 'string' ? value : '';
    const floatVal = attrs?.float;
    const widthVal = attrs?.width;
    const heightVal = attrs?.height;
    // Float: data-float attribute for CSS-driven text wrapping
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
    const embedSrc = toVideoEmbedUrl(src);
    if (embedSrc) {
      return `<iframe src="${escapeHtml(embedSrc)}" frameborder="0" allowfullscreen${renderEmbedIframeIsolationAttrs(context, 'video')}${float}${style}></iframe>`;
    }
    return `<video src="${escapeHtml(src)}" controls${float}${style}></video>`;
  },

  codeWidget: (value, attrs, context) => {
    const src = typeof value === 'string' ? value : '';
    const floatVal = attrs?.float;
    const widthVal = attrs?.width;
    const heightVal = attrs?.height;
    // Float: data-float attribute for CSS-driven text wrapping
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

  formula: (value) => {
    const latex = typeof value === 'string' ? value : '';
    return `<span class="formula" data-formula="${escapeHtml(latex)}">${escapeHtml(latex)}</span>`;
  },

  diagram: (value) => {
    const source = typeof value === 'string' ? value : '';
    return `<span class="diagram" data-diagram="${escapeHtml(source)}">${escapeHtml(source)}</span>`;
  },

  drawio: (value, attrs) => {
    const src = typeof value === 'string' ? value : '';
    const altVal = attrs?.alt;
    const alt =
      altVal != null && (typeof altVal === 'string' || typeof altVal === 'number')
        ? ` data-alt="${escapeHtml(String(altVal))}"`
        : '';
    return `<span class="drawio" data-drawio-src="${escapeHtml(src)}"${alt}></span>`;
  },

  'footnote-ref': (value) => {
    const id = typeof value === 'string' ? value : String(value);
    return `<sup class="footnote-ref"><a href="#fn-${escapeHtml(id)}" id="fnref-${escapeHtml(id)}">[${escapeHtml(id)}]</a></sup>`;
  },

  divider: () => '<hr>',

  // Soft line break (Shift+Enter equivalent). Emitted with an explicit
  // `data-scrider-embed` marker so that html-to-delta can distinguish this
  // embed from the placeholder `<br>` that appears inside an empty
  // paragraph (`<p><br></p>`) without relying solely on positional
  // heuristics. See `soft-break.ts` for the format definition.
  softBreak: () => '<br data-scrider-embed>',
};

/**
 * HTML tag to inline format mapping (for parsing)
 */
export const TAG_TO_INLINE_FORMAT: Record<string, { format: string; value: unknown }> = {
  strong: { format: 'bold', value: true },
  b: { format: 'bold', value: true },
  em: { format: 'italic', value: true },
  i: { format: 'italic', value: true },
  u: { format: 'underline', value: true },
  ins: { format: 'underline', value: true },
  s: { format: 'strike', value: true },
  strike: { format: 'strike', value: true },
  del: { format: 'strike', value: true },
  sub: { format: 'subscript', value: true },
  sup: { format: 'superscript', value: true },
  code: { format: 'code', value: true },
  mark: { format: 'mark', value: true },
  kbd: { format: 'kbd', value: true },
};

/**
 * HTML tag to block format mapping (for parsing)
 */
export const TAG_TO_BLOCK_FORMAT: Record<string, { format: string; value: unknown }> = {
  h1: { format: 'header', value: 1 },
  h2: { format: 'header', value: 2 },
  h3: { format: 'header', value: 3 },
  h4: { format: 'header', value: 4 },
  h5: { format: 'header', value: 5 },
  h6: { format: 'header', value: 6 },
  blockquote: { format: 'blockquote', value: true },
  pre: { format: 'code-block', value: true },
};

/**
 * CSS text-align values to align format values
 */
export const CSS_ALIGN_TO_FORMAT: Record<string, string> = {
  left: 'left',
  center: 'center',
  right: 'right',
  justify: 'justify',
};

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Unescape HTML entities
 */
export function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Convert a video URL to an embeddable URL for rendering in <iframe>.
 * Returns null if the URL should be rendered as a <video> tag instead.
 *
 * Video rendering strategy:
 *
 *   Service      | Embed URL format                          | HTML tag
 *   -------------|-------------------------------------------|----------
 *   YouTube      | youtube.com/embed/VIDEO_ID                | <iframe>
 *   VK Video     | vkvideo.ru/video_ext.php?oid=&id=&hash=   | <iframe>
 *   Vimeo        | player.vimeo.com/video/ID                 | <iframe>
 *   Dailymotion  | dailymotion.com/embed/video/ID            | <iframe>
 *   Direct file  | example.com/video.mp4                     | <video>
 *
 * Note: VK Video requires a `hash` parameter in the embed URL for security.
 * The hash can only be obtained from VK's "Share → Embed" dialog;
 * it cannot be computed from a regular vkvideo.ru/video-... page URL.
 *
 * Supported input URL conversions:
 * - youtube.com/embed/ID        → pass through
 * - youtube.com/watch?v=ID      → youtube.com/embed/ID
 * - youtu.be/ID                 → youtube.com/embed/ID
 * - player.vimeo.com/video/ID   → pass through
 * - dailymotion.com/embed/...   → pass through
 * - *://video_ext.php?...       → pass through (VK Video embed)
 * - anything else               → null (render as <video>)
 */
export function toVideoEmbedUrl(url: string): string | null {
  // Already an embed URL — pass through
  if (
    url.includes('youtube.com/embed') ||
    url.includes('player.vimeo.com') ||
    url.includes('dailymotion.com/embed') ||
    url.includes('video_ext.php') ||
    url.includes('rutube.ru/play/embed')
  ) {
    return url;
  }

  // YouTube watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  const ytMatch = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // YouTube short URL: https://youtu.be/VIDEO_ID
  const ytShortMatch = url.match(/youtu\.be\/([\w-]+)/);
  if (ytShortMatch) {
    return `https://www.youtube.com/embed/${ytShortMatch[1]}`;
  }

  // Rutube watch URL: https://rutube.ru/video/HASH/
  const rtMatch = url.match(/rutube\.ru\/video\/([\w]+)/);
  if (rtMatch) {
    return `https://rutube.ru/play/embed/${rtMatch[1]}`;
  }

  return null;
}

/**
 * Convert an embed URL back to a canonical video URL.
 * Used when parsing HTML (<iframe>) back to Delta.
 *
 * Conversions:
 * - YouTube embed  → youtube.com/watch?v=ID (canonical)
 * - VK Video, Vimeo, Dailymotion, etc. → kept as-is
 *   (VK Video hash cannot be reconstructed from canonical URL)
 */
export function fromVideoEmbedUrl(embedUrl: string): string {
  // YouTube embed → canonical watch URL
  const ytMatch = embedUrl.match(/youtube\.com\/embed\/([\w-]+)/);
  if (ytMatch) {
    return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
  }

  // Rutube embed → canonical watch URL
  const rtMatch = embedUrl.match(/rutube\.ru\/play\/embed\/([\w]+)/);
  if (rtMatch) {
    return `https://rutube.ru/video/${rtMatch[1]}/`;
  }

  // VK Video, Vimeo, Dailymotion, etc. — keep embed URL as-is
  // (VK Video requires hash parameter that can't be reconstructed)
  return embedUrl;
}

/** Split a URL into base path, query (incl. leading `?`) and hash (incl. `#`). */
function splitUrl(url: string): { base: string; query: string; hash: string } {
  let rest = url;
  let hash = '';
  const hashIdx = rest.indexOf('#');
  if (hashIdx >= 0) {
    hash = rest.slice(hashIdx);
    rest = rest.slice(0, hashIdx);
  }
  let query = '';
  const qIdx = rest.indexOf('?');
  if (qIdx >= 0) {
    query = rest.slice(qIdx);
    rest = rest.slice(0, qIdx);
  }
  return { base: rest, query, hash };
}

/** Whether the URL already carries the given query parameter. */
function hasQueryParam(url: string, key: string): boolean {
  const { query } = splitUrl(url);
  return new RegExp(`[?&]${key}=`, 'i').test(query);
}

/** Append `key=value` to the URL's query string, preserving any hash. */
function appendQueryParam(url: string, key: string, value: string): string {
  const { base, query, hash } = splitUrl(url);
  const next = query ? `${query}&${key}=${value}` : `?${key}=${value}`;
  return `${base}${next}${hash}`;
}

/**
 * Permissions-Policy `allow` list for code-widget iframes (Phase 8 Part 3.5).
 *
 * `cross-origin-isolated` is the load-bearing token: StackBlitz projects run a
 * dev server inside a WebContainer, which needs `SharedArrayBuffer` and thus a
 * cross-origin-isolated context. StackBlitz holds the Chrome
 * `UnrestrictedSharedArrayBuffer` origin trial, but that capability only
 * propagates into a cross-origin iframe when the embedder delegates it via
 * `allow="cross-origin-isolated"`. Without it the WebContainer never boots and
 * the embed renders blank (CodeSandbox/CodePen/Replit/JSFiddle don't use
 * WebContainers, so the token is simply ignored — harmless). The remaining
 * device tokens mirror the StackBlitz SDK default embed iframe.
 * Opt-in via `deltaToHtml({ embed: { crossOriginIsolated: true } })` on
 * codeWidget iframes. Together with `embed.credentialless`, enables
 * isolation-ready output for hosts that serve `COOP` + `COEP`.
 *
 * See https://webcontainers.io/guides/troubleshooting.
 */
export const CODE_WIDGET_IFRAME_ALLOW =
  'accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; vr; xr-spatial-tracking; cross-origin-isolated';

/**
 * Optional iframe isolation attributes for cross-origin embeds (video iframe,
 * codeWidget). Emitted only when the host passes `deltaToHtml({ embed: … })`.
 */
export function renderEmbedIframeIsolationAttrs(
  context: FormatRenderContext | undefined,
  kind: 'codeWidget' | 'video',
): string {
  const opts = context?.embed;
  const parts: string[] = [];
  if (kind === 'codeWidget' && opts?.crossOriginIsolated) {
    parts.push(`allow="${CODE_WIDGET_IFRAME_ALLOW}"`);
  }
  if (opts?.credentialless) {
    parts.push('credentialless');
  }
  return parts.length ? ` ${parts.join(' ')}` : '';
}

/**
 * Convert a code-playground URL to an embeddable iframe URL (Phase 8 Part 3.5).
 *
 * Idempotent: a URL that is already in embed form is returned unchanged, so the
 * Delta → HTML → Delta round-trip is stable regardless of which form is stored.
 *
 *   Provider     | User URL                         | Embed URL
 *   -------------|----------------------------------|-----------------------------------
 *   StackBlitz   | stackblitz.com/edit/{id}         | …?embed=1
 *                | stackblitz.com/github/{u}/{r}    | …?embed=1
 *   CodeSandbox  | codesandbox.io/s/{id}            | codesandbox.io/embed/{id}
 *   Replit       | replit.com/@{u}/{repl}           | …?embed=true
 *   CodePen      | codepen.io/{u}/pen/{id}          | codepen.io/{u}/embed/{id}
 *   JSFiddle     | jsfiddle.net/{u}/{id}/           | jsfiddle.net/{u}/{id}/embedded/
 *
 * Unknown hosts are returned unchanged (the marker `data-code-widget` still
 * makes them render as an iframe; auto-detection of bare URLs lives in the
 * editor layer).
 */
export function toCodeWidgetEmbedUrl(url: string): string {
  const u = typeof url === 'string' ? url.trim() : '';
  if (!u) return '';

  // StackBlitz — add ?embed=1
  if (/(?:\/\/|^)(?:[\w-]+\.)*stackblitz\.com\//i.test(u)) {
    return hasQueryParam(u, 'embed') ? u : appendQueryParam(u, 'embed', '1');
  }

  // CodeSandbox — /s/{id} → /embed/{id}
  if (/(?:\/\/|^)(?:[\w-]+\.)*codesandbox\.io\//i.test(u)) {
    if (/codesandbox\.io\/embed\//i.test(u)) return u;
    return u.replace(/codesandbox\.io\/s\//i, 'codesandbox.io/embed/');
  }

  // Replit — add ?embed=true
  if (/(?:\/\/|^)(?:[\w-]+\.)*replit\.com\//i.test(u)) {
    return hasQueryParam(u, 'embed') ? u : appendQueryParam(u, 'embed', 'true');
  }

  // CodePen — /{user}/pen/{id} → /{user}/embed/{id}
  if (/(?:\/\/|^)(?:[\w-]+\.)*codepen\.io\//i.test(u)) {
    if (/codepen\.io\/[^/]+\/embed\//i.test(u)) return u;
    return u.replace(/(codepen\.io\/[^/]+)\/pen\//i, '$1/embed/');
  }

  // JSFiddle — ensure trailing /embedded/
  if (/(?:\/\/|^)(?:[\w-]+\.)*jsfiddle\.net\//i.test(u)) {
    const { base, query, hash } = splitUrl(u);
    if (/\/embedded(?:\/|$)/i.test(base)) return u;
    const trimmed = base.replace(/\/+$/, '');
    return `${trimmed}/embedded/${query}${hash}`;
  }

  return u;
}
