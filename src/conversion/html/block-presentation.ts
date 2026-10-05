import type { AttributeMap } from '@scrider/delta';

import type { ResolvedDocumentPresentation } from './document-presentation';

/** Per-paragraph line spacing stored on `\n` (Word paste, Settings Apply, toolbar). */
export const SCRIDER_LINE_HEIGHT_KEY = 'scrider-line-height';

/** Space after plain paragraph (`margin-bottom`) on `\n` (Settings Apply). */
export const SCRIDER_MARGIN_AFTER_KEY = 'scrider-margin-after';

/** Space before plain paragraph (`margin-top`) on `\n` (Settings Apply). */
export const SCRIDER_MARGIN_BEFORE_KEY = 'scrider-margin-before';

/** Per-paragraph first-line indent stored on `\n` (Word paste, Settings Apply). */
export const SCRIDER_TEXT_INDENT_KEY = 'scrider-text-indent';

/** Block tags that receive line spacing (not headings). */
export const LINE_HEIGHT_BLOCK_TAGS = new Set(['p', 'li', 'blockquote']);

/** Block tags that receive the document first-line indent (plain `<p>` only). */
export const TEXT_INDENT_BLOCK_TAGS = new Set(['p']);

/**
 * Heading tags that honor a per-line `scrider-text-indent` (toolbar). The document
 * default reaches headings only via heading policy (`headingTextIndent`).
 */
export const HEADING_TEXT_INDENT_BLOCK_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** Block tags that receive paragraph spacing after (plain `<p>` only). */
export const PARAGRAPH_SPACING_BLOCK_TAGS = new Set(['p']);

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

/**
 * First-line indent for a plain `<p>`: `scrider-text-indent` on the line (baked,
 * e.g. Word paste) → documentPresentation `textIndentCm` → none.
 *
 * The block attr wins over the document default (mirrors line-height / margin
 * resolution). The raw block value is a CSS length string (e.g. `1.25cm`).
 * Headings take the block attr only; their document default is heading policy.
 */
export function blockTextIndentStyleParts(
  tag: string,
  blockAttributes: AttributeMap | undefined,
  resolved: ResolvedDocumentPresentation | undefined,
): string[] {
  const isHeading = HEADING_TEXT_INDENT_BLOCK_TAGS.has(tag);
  if (!TEXT_INDENT_BLOCK_TAGS.has(tag) && !isHeading) return [];

  const raw = blockAttributes?.[SCRIDER_TEXT_INDENT_KEY];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) return [`text-indent:${trimmed}`];
  }
  if (isHeading) return [];

  if (resolved?.textIndentCm !== undefined) {
    return [`text-indent:${resolved.textIndentCm}cm`];
  }

  return [];
}

/**
 * Parse paragraph margin in em from Delta / inline CSS (`0.5em`, `0.5`).
 */
export function parseScriderMarginEm(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const emMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*em$/i);
  if (emMatch) {
    const n = Number.parseFloat(emMatch[1]!);
    if (Number.isFinite(n) && n >= 0) return n;
    return undefined;
  }

  const n = Number.parseFloat(trimmed);
  if (Number.isFinite(n) && n >= 0) return n;
  return undefined;
}

/** Same parser as {@link parseScriderMarginEm} for margin-after values. */
export const parseScriderMarginAfterEm = parseScriderMarginEm;

/** Same parser as {@link parseScriderMarginEm} for margin-before values. */
export const parseScriderMarginBeforeEm = parseScriderMarginEm;

function resolveParagraphMarginEm(
  blockAttributes: AttributeMap | undefined,
  blockKey: string,
  documentEm: number | undefined,
): number | undefined {
  const raw = blockAttributes?.[blockKey];
  if (typeof raw === 'string') {
    const fromBlock = parseScriderMarginEm(raw);
    if (fromBlock !== undefined) return fromBlock;
  }
  return documentEm;
}

/**
 * Paragraph spacing before/after on plain `<p>`: block attrs → documentPresentation → none.
 * When only after is set, adds `margin-top:0` for Word paste compatibility.
 */
export function blockParagraphMarginStyleParts(
  tag: string,
  blockAttributes: AttributeMap | undefined,
  resolved: ResolvedDocumentPresentation | undefined,
): string[] {
  if (!PARAGRAPH_SPACING_BLOCK_TAGS.has(tag)) return [];

  const marginTop = resolveParagraphMarginEm(
    blockAttributes,
    SCRIDER_MARGIN_BEFORE_KEY,
    resolved?.paragraphSpacingBeforeEm,
  );
  const marginBottom = resolveParagraphMarginEm(
    blockAttributes,
    SCRIDER_MARGIN_AFTER_KEY,
    resolved?.paragraphSpacingAfterEm,
  );

  if (marginTop === undefined && marginBottom === undefined) return [];

  const parts: string[] = [];
  if (marginTop !== undefined) {
    parts.push(`margin-top:${marginTop}em`);
  } else if (marginBottom !== undefined) {
    parts.push('margin-top:0');
  }
  if (marginBottom !== undefined) {
    parts.push(`margin-bottom:${marginBottom}em`);
  }
  return parts;
}

/**
 * Paragraph spacing after: `scrider-margin-after` on the line → documentPresentation → none.
 */
export function blockMarginAfterStyleParts(
  tag: string,
  blockAttributes: AttributeMap | undefined,
  resolved: ResolvedDocumentPresentation | undefined,
): string[] {
  if (!PARAGRAPH_SPACING_BLOCK_TAGS.has(tag)) return [];

  const marginBottom = resolveParagraphMarginEm(
    blockAttributes,
    SCRIDER_MARGIN_AFTER_KEY,
    resolved?.paragraphSpacingAfterEm,
  );
  if (marginBottom === undefined) return [];

  return ['margin-top:0', `margin-bottom:${marginBottom}em`];
}

/**
 * Paragraph spacing before: `scrider-margin-before` on the line → documentPresentation → none.
 */
export function blockMarginBeforeStyleParts(
  tag: string,
  blockAttributes: AttributeMap | undefined,
  resolved: ResolvedDocumentPresentation | undefined,
): string[] {
  if (!PARAGRAPH_SPACING_BLOCK_TAGS.has(tag)) return [];

  const marginTop = resolveParagraphMarginEm(
    blockAttributes,
    SCRIDER_MARGIN_BEFORE_KEY,
    resolved?.paragraphSpacingBeforeEm,
  );
  if (marginTop === undefined) return [];

  return [`margin-top:${marginTop}em`];
}
