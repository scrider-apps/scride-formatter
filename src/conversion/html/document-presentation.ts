/**
 * Document-level HTML presentation for deltaToHtml (clipboard, export).
 * Mirrors editor Settings when block attrs are absent.
 * Per-block line spacing: {@link blockLineHeightStyleParts} (`scrider-line-height` on `\n`).
 * Per-block paragraph spacing: {@link blockParagraphMarginStyleParts}
 * (`scrider-margin-before` / `scrider-margin-after` on `\n`).
 */

import type { AttributeMap } from '@scrider/delta';

import type { ScriderDocumentMetadata } from '../../schema/document-metadata';

import {
  blockLineHeightStyleParts,
  blockParagraphMarginStyleParts,
  blockTextIndentStyleParts,
  LINE_HEIGHT_BLOCK_TAGS,
} from './block-presentation';

export interface DocumentPresentation {
  /** Line spacing multiplier, e.g. 1.5 */
  lineSpacing?: number;
  /** Space after plain paragraphs in em, e.g. 0.5 */
  paragraphSpacingAfterEm?: number;
  /** Space before plain paragraphs in em, e.g. 0.5 */
  paragraphSpacingBeforeEm?: number;
  /** First-line indent in cm on `<p>` only (lists: use listBlockIndentCm). */
  textIndentCm?: number;
  /** Extra left padding on top-level `<ul>`/`<ol>` — shifts marker + text as a block. */
  listBlockIndentCm?: number;
}

export interface ResolvedDocumentPresentation {
  lineSpacing: number | undefined;
  paragraphSpacingAfterEm: number | undefined;
  paragraphSpacingBeforeEm: number | undefined;
  textIndentCm: number | undefined;
  listBlockIndentCm: number | undefined;
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
  const listBlockIndentCm =
    typeof presentation.listBlockIndentCm === 'number' && presentation.listBlockIndentCm > 0
      ? presentation.listBlockIndentCm
      : undefined;
  const paragraphSpacingAfterEm =
    typeof presentation.paragraphSpacingAfterEm === 'number' &&
    Number.isFinite(presentation.paragraphSpacingAfterEm) &&
    presentation.paragraphSpacingAfterEm >= 0
      ? presentation.paragraphSpacingAfterEm
      : undefined;
  const paragraphSpacingBeforeEm =
    typeof presentation.paragraphSpacingBeforeEm === 'number' &&
    Number.isFinite(presentation.paragraphSpacingBeforeEm) &&
    presentation.paragraphSpacingBeforeEm >= 0
      ? presentation.paragraphSpacingBeforeEm
      : undefined;

  if (
    lineSpacing === undefined &&
    paragraphSpacingAfterEm === undefined &&
    paragraphSpacingBeforeEm === undefined &&
    textIndentCm === undefined &&
    listBlockIndentCm === undefined
  ) {
    return undefined;
  }

  return {
    lineSpacing,
    paragraphSpacingAfterEm,
    paragraphSpacingBeforeEm,
    textIndentCm,
    listBlockIndentCm,
  };
}

/**
 * Project {@link ScriderDocumentMetadata} onto an HTML {@link DocumentPresentation}
 * (export / clipboard inline CSS for paragraphs/lists).
 *
 * Maps line/paragraph spacing and indent only. Heading policy is projected
 * separately via {@link resolveHeadingPolicy} / {@link headingPolicyStyleParts}
 * onto `h1`–`h6`. `tablePresentation` is read from metadata in `deltaToHtml`
 * when the explicit option is omitted. Returns `undefined` when nothing maps.
 */
export function documentMetadataToPresentation(
  metadata: ScriderDocumentMetadata | undefined,
): DocumentPresentation | undefined {
  if (!metadata) return undefined;

  const presentation: DocumentPresentation = {};
  if (typeof metadata.lineSpacing === 'number') {
    presentation.lineSpacing = metadata.lineSpacing;
  }
  if (typeof metadata.paragraphSpacingBeforeEm === 'number') {
    presentation.paragraphSpacingBeforeEm = metadata.paragraphSpacingBeforeEm;
  }
  if (typeof metadata.paragraphSpacingAfterEm === 'number') {
    presentation.paragraphSpacingAfterEm = metadata.paragraphSpacingAfterEm;
  }
  if (typeof metadata.textIndentCm === 'number') {
    presentation.textIndentCm = metadata.textIndentCm;
  }
  if (typeof metadata.listBlockIndentCm === 'number') {
    presentation.listBlockIndentCm = metadata.listBlockIndentCm;
  }

  return Object.keys(presentation).length > 0 ? presentation : undefined;
}

/** Block tags that receive document first-line indent. */
const TEXT_INDENT_TAGS = new Set(['p']);

/** Extra padding on top-level `<ul>`/`<ol>` — shifts marker + text (list block indent). */
export function documentPresentationListWrapperStyleParts(
  resolved: ResolvedDocumentPresentation | undefined,
): string[] {
  if (!resolved?.listBlockIndentCm) return [];
  return [`padding-left:1.25em`, `margin-left:${resolved.listBlockIndentCm}cm`];
}

/**
 * Document-level first-line indent only (no per-block attr).
 *
 * @deprecated Superseded by {@link blockTextIndentStyleParts}, which resolves the
 * per-block `scrider-text-indent` attr with the document default as fallback and
 * is what {@link blockPresentationStyleParts} now uses. Kept exported for
 * backward compatibility; output is unchanged for document-only callers.
 */
export function documentPresentationStyleParts(
  tag: string,
  resolved: ResolvedDocumentPresentation | undefined,
): string[] {
  if (!resolved) return [];

  const parts: string[] = [];

  if (resolved.textIndentCm !== undefined && TEXT_INDENT_TAGS.has(tag)) {
    parts.push(`text-indent:${resolved.textIndentCm}cm`);
  }

  return parts;
}

/**
 * All block presentation styles for deltaToHtml: Delta attrs, then document defaults.
 *
 * First-line indent now resolves per-block: baked `scrider-text-indent` wins over
 * the document `textIndentCm` default (previously the per-block attr was dropped
 * on export). Output for document-only paragraphs is unchanged.
 */
export function blockPresentationStyleParts(
  tag: string,
  blockAttributes: AttributeMap | undefined,
  resolved: ResolvedDocumentPresentation | undefined,
): string[] {
  return [
    ...blockLineHeightStyleParts(tag, blockAttributes, resolved),
    ...blockParagraphMarginStyleParts(tag, blockAttributes, resolved),
    ...blockTextIndentStyleParts(tag, blockAttributes, resolved),
  ];
}

export { LINE_HEIGHT_BLOCK_TAGS };

export function joinStyleParts(parts: string[]): string {
  return parts.length > 0 ? ` style="${parts.join('; ')}"` : '';
}
