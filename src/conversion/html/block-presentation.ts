import type { AttributeMap } from '@scrider/delta';

import type { ResolvedDocumentPresentation } from './document-presentation';

/** Per-paragraph line spacing stored on `\n` (Word paste, Settings Apply, toolbar). */
export const SCRIDER_LINE_HEIGHT_KEY = 'scrider-line-height';

/** Block tags that receive line spacing (not headings). */
export const LINE_HEIGHT_BLOCK_TAGS = new Set(['p', 'li', 'blockquote']);

/**
 * Parse a line-height multiplier from Delta / inline CSS values
 * (`1.5`, `2`, `150%`).
 */
export function parseScriderLineHeightMultiplier(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.endsWith('%')) {
    const pct = Number.parseFloat(trimmed.slice(0, -1));
    if (Number.isFinite(pct) && pct > 0) return pct / 100;
    return undefined;
  }

  const n = Number.parseFloat(trimmed);
  if (Number.isFinite(n) && n > 0) return n;
  return undefined;
}

function lineHeightStyleParts(multiplier: number): string[] {
  const pct = Math.round(multiplier * 100);
  return [`line-height:${multiplier}`, `mso-line-height-alt:${pct}%`];
}

/**
 * Line-height for a block tag: `scrider-line-height` on the line → documentPresentation → none.
 */
export function blockLineHeightStyleParts(
  tag: string,
  blockAttributes: AttributeMap | undefined,
  resolved: ResolvedDocumentPresentation | undefined,
): string[] {
  if (!LINE_HEIGHT_BLOCK_TAGS.has(tag)) return [];

  const raw = blockAttributes?.[SCRIDER_LINE_HEIGHT_KEY];
  if (typeof raw === 'string') {
    const fromBlock = parseScriderLineHeightMultiplier(raw);
    if (fromBlock !== undefined) return lineHeightStyleParts(fromBlock);
  }

  if (resolved?.lineSpacing !== undefined) {
    return lineHeightStyleParts(resolved.lineSpacing);
  }

  return [];
}
