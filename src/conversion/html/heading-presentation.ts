/**
 * Document-level heading policy projected to export HTML (`h1`–`h6` inline CSS).
 *
 * Editor applies the same policy via CSS vars (`--scrider-heading-*`, `--scrider-hN-size`).
 * Size maps mirror `editor-core` `HEADER_SIZE_PRESETS` — keep in sync.
 */

import type { AttributeMap } from '@scrider/delta';

import type { ScriderDocumentMetadata } from '../../schema/document-metadata';

import { SCRIDER_TEXT_INDENT_KEY } from './block-presentation';

export type HeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeaderSizeMap = Readonly<Record<HeaderLevel, string>>;
export type HeaderSizePresetName = 'scrider' | 'google' | 'word' | 'browser' | 'githubEm';

/** Keep in sync with `@scrider/editor-core` `HEADER_SIZE_PRESETS`. */
export const HEADER_SIZE_PRESETS: Readonly<Record<HeaderSizePresetName, HeaderSizeMap>> =
  Object.freeze({
    scrider: Object.freeze({
      1: '32pt',
      2: '24pt',
      3: '20pt',
      4: '18pt',
      5: '16pt',
      6: '14pt',
    }),
    google: Object.freeze({
      1: '26pt',
      2: '20pt',
      3: '16pt',
      4: '14pt',
      5: '12pt',
      6: '11pt',
    }),
    word: Object.freeze({
      1: '22pt',
      2: '18pt',
      3: '16pt',
      4: '14pt',
      5: '12pt',
      6: '12pt',
    }),
    browser: Object.freeze({
      1: '24pt',
      2: '18pt',
      3: '14pt',
      4: '12pt',
      5: '10pt',
      6: '8pt',
    }),
    githubEm: Object.freeze({
      1: '32pt',
      2: '24pt',
      3: '20pt',
      4: '16pt',
      5: '14pt',
      6: '14pt',
    }),
  });

export interface ResolvedHeadingPolicy {
  align: 'left' | 'center' | 'right' | undefined;
  bold: boolean;
  /** When set and `auto` is false, emit font-size on `hN` when Delta has no inline size. */
  sizePreset: HeaderSizePresetName | undefined;
  auto: boolean;
  /** Document first-line indent in cm, set only when `headingTextIndent` is on. */
  textIndentCm: number | undefined;
}

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function isHeaderSizePresetName(value: string): value is HeaderSizePresetName {
  return Object.prototype.hasOwnProperty.call(HEADER_SIZE_PRESETS, value);
}

export function resolveHeadingPolicy(
  metadata: ScriderDocumentMetadata | undefined,
): ResolvedHeadingPolicy | undefined {
  if (!metadata) return undefined;

  const align =
    metadata.headingAlign === 'left' ||
    metadata.headingAlign === 'center' ||
    metadata.headingAlign === 'right'
      ? metadata.headingAlign
      : undefined;
  const bold = metadata.headingBold === true;
  const auto = metadata.headingAuto === true;
  const presetRaw = metadata.headingSizeGridPreset;
  const sizePreset =
    !auto && typeof presetRaw === 'string' && isHeaderSizePresetName(presetRaw)
      ? presetRaw
      : undefined;
  const textIndentCm =
    metadata.headingTextIndent === true &&
    typeof metadata.textIndentCm === 'number' &&
    metadata.textIndentCm > 0
      ? metadata.textIndentCm
      : undefined;

  if (
    align === undefined &&
    !bold &&
    sizePreset === undefined &&
    !auto &&
    textIndentCm === undefined
  ) {
    return undefined;
  }

  return { align, bold, sizePreset, auto, textIndentCm };
}

/** First-line indent only makes sense on start-aligned text. */
function alignAllowsTextIndent(align: string | undefined): boolean {
  return align === undefined || align === '' || align === 'left' || align === 'justify';
}

function headingLevelFromTag(tag: string): HeaderLevel | undefined {
  if (!HEADING_TAGS.has(tag)) return undefined;
  const n = Number(tag.slice(1));
  if (n >= 1 && n <= 6) return n as HeaderLevel;
  return undefined;
}

/**
 * Inline styles for a heading block from document metadata.
 * Baked Delta attrs win: `align` on `\n` skips metadata align; presence of any
 * text with explicit `size` is not detectable at block level — size from preset
 * is always emitted when policy is on (matches editor CSS vars on `hN`).
 */
export function headingPolicyStyleParts(
  tag: string,
  blockAttributes: AttributeMap | undefined,
  policy: ResolvedHeadingPolicy | undefined,
): string[] {
  if (!policy) return [];
  const level = headingLevelFromTag(tag);
  if (level === undefined) return [];

  const parts: string[] = [];

  const bakedAlign = blockAttributes?.align;
  if (
    policy.align &&
    policy.align !== 'left' &&
    !(typeof bakedAlign === 'string' && bakedAlign.length > 0)
  ) {
    parts.push(`text-align: ${policy.align}`);
  }

  if (policy.bold) {
    parts.push('font-weight: bold');
  }

  if (policy.sizePreset) {
    const size = HEADER_SIZE_PRESETS[policy.sizePreset][level];
    if (size) parts.push(`font-size: ${size}`);
  }

  const effectiveAlign =
    typeof bakedAlign === 'string' && bakedAlign.length > 0 ? bakedAlign : policy.align;
  if (
    policy.textIndentCm !== undefined &&
    blockAttributes?.[SCRIDER_TEXT_INDENT_KEY] === undefined &&
    alignAllowsTextIndent(effectiveAlign)
  ) {
    parts.push(`text-indent:${policy.textIndentCm}cm`);
  }

  return parts;
}
