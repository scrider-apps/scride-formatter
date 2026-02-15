/**
 * HTML ↔ Delta Mapping Configuration
 *
 * Defines the mapping between HTML elements/attributes and Delta attributes.
 */

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
export type EmbedRenderer = (value: unknown, attributes?: Record<string, unknown>) => string;

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

  video: (value, attrs) => {
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
      return `<iframe src="${escapeHtml(embedSrc)}" frameborder="0" allowfullscreen${float}${style}></iframe>`;
    }
    return `<video src="${escapeHtml(src)}" controls${float}${style}></video>`;
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
