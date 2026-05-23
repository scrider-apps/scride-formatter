/**
 * Document-level HTML presentation for deltaToHtml (clipboard, export).
 * Not stored in Delta — mirrors editor Settings (line spacing, first-line indent).
 */

export interface DocumentPresentation {
  /** Line spacing multiplier, e.g. 1.5 */
  lineSpacing?: number;
  /** First-line indent in centimeters, e.g. 1.25 */
  textIndentCm?: number;
}

export interface ResolvedDocumentPresentation {
  lineSpacing: number | undefined;
  textIndentCm: number | undefined;
}

export function resolveDocumentPresentation(
  presentation?: DocumentPresentation,
): ResolvedDocumentPresentation | undefined {
  if (!presentation) return undefined;

  const lineSpacing =
    typeof presentation.lineSpacing === 'number' && presentation.lineSpacing > 0
      ? presentation.lineSpacing
      : undefined;
  const textIndentCm =
    typeof presentation.textIndentCm === 'number' && presentation.textIndentCm > 0
      ? presentation.textIndentCm
      : undefined;

  if (lineSpacing === undefined && textIndentCm === undefined) return undefined;

  return { lineSpacing, textIndentCm };
}

/** Block tags that receive document line spacing (not headings). */
const LINE_HEIGHT_TAGS = new Set(['p', 'li', 'blockquote']);

export function documentPresentationStyleParts(
  tag: string,
  resolved: ResolvedDocumentPresentation | undefined,
): string[] {
  if (!resolved) return [];

  const parts: string[] = [];

  if (resolved.lineSpacing !== undefined && LINE_HEIGHT_TAGS.has(tag)) {
    const pct = Math.round(resolved.lineSpacing * 100);
    parts.push(`line-height:${resolved.lineSpacing}`);
    parts.push(`mso-line-height-alt:${pct}%`);
  }

  if (resolved.textIndentCm !== undefined && tag === 'p') {
    parts.push(`text-indent:${resolved.textIndentCm}cm`);
  }

  return parts;
}

export function joinStyleParts(parts: string[]): string {
  return parts.length > 0 ? ` style="${parts.join('; ')}"` : '';
}
