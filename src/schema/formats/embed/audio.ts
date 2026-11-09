import type { Format, FormatMatchResult } from '../../Format';
import { isElement, type DOMElement } from '../../../conversion/adapters/types';
import { escapeHtml } from '../../../conversion/html/config';
import { videoFormat } from './video';

/**
 * Audio embed format
 *
 * Delta: { insert: { audio: "/media/talk.mp3" } }
 *
 * Value is the file URL: a relative path or http(s). Same rules as `video`.
 * HTML: `<audio src="…" controls></audio>`; `<audio><source src="…"></audio>` is read too.
 */
export const audioFormat: Format<string> = {
  name: 'audio',
  scope: 'embed',

  normalize(value: string): string {
    return value.trim();
  },

  validate(value: string): boolean {
    return videoFormat.validate!(value);
  },

  render(value: string): string {
    const src = typeof value === 'string' ? value : '';
    return `<audio src="${escapeHtml(src)}" controls></audio>`;
  },

  match(element: DOMElement): FormatMatchResult<string> | null {
    if (element.tagName.toLowerCase() !== 'audio') return null;
    const src = audioSrc(element);
    return src ? { value: src } : null;
  },
};

/** `src` of `<audio>`, or of its first `<source>` child. */
export function audioSrc(element: DOMElement): string | null {
  const own = element.getAttribute('src');
  if (own) return own;
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child && isElement(child) && child.tagName.toLowerCase() === 'source') {
      const src = child.getAttribute('src');
      if (src) return src;
    }
  }
  return null;
}
