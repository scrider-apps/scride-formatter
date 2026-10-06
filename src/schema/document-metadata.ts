/**
 * Document-level metadata (Scrider format extension).
 *
 * Concrete schema for the opaque `scrider-metadata` sibling field defined in
 * `@scrider/delta` (`ScriderDocument`). It carries document-wide defaults ONCE
 * (line spacing, paragraph spacing, indent, heading policy, fonts, table
 * presentation) instead of duplicating them as block attributes on every `\n`.
 *
 * Layering:
 * - `@scrider/delta` treats the value as opaque `Record<string, unknown>` — it
 *   never participates in `length()`, selection indices, OT, or partial copy/paste.
 * - `@scrider/formatter` is the CONTRACT OWNER of this concrete shape.
 * - `@scrider/editor-core` / `@scrider/editor-react` consume it (state, CSS vars,
 *   export projection).
 *
 * All fields are optional and additive: extending the interface never changes the
 * op-stream and is backward compatible.
 *
 * Projection:
 * - Spacing / indent → {@link documentMetadataToPresentation} (paragraph CSS).
 * - Heading policy → {@link resolveHeadingPolicy} / heading block styles on `h1`–`h6`.
 * - `tablePresentation` → same shape as `DeltaToHtmlOptions.tablePresentation`
 *   (used when the explicit option is omitted).
 */

import type { TablePresentation } from '../conversion/html/table-presentation';

export interface ScriderDocumentMetadata {
  /** Line spacing multiplier, e.g. `1.5`. */
  lineSpacing?: number;
  /** Space before plain paragraphs in em, e.g. `0.5`. */
  paragraphSpacingBeforeEm?: number;
  /** Space after plain paragraphs in em, e.g. `0.5`. */
  paragraphSpacingAfterEm?: number;
  /** First-line indent in cm on `<p>` (lists use {@link listBlockIndentCm}). */
  textIndentCm?: number;
  /** Extra left indent in cm on top-level `<ul>`/`<ol>` (shifts marker + text). */
  listBlockIndentCm?: number;
  /**
   * Top-level list shift, in em of the document size. `text` puts the body on
   * one 2em tab (markers hang in the gutter, 2em − 1.5em). `marker` shifts the
   * whole list by one 2em tab. Omitted = no extra left indent.
   * Stacks with {@link listBlockIndentCm}.
   */
  listLeftIndent?: 'text' | 'marker';
  /**
   * Vertical margin around a top-level list. Omitted = the editor default
   * (0.5em). `1em` and `1.5em` replace that margin. Stacks with
   * {@link listBlockIndentCm}.
   */
  listIntervalIndent?: '1em' | '1.5em';
  /**
   * Extra space above/below a list block (beyond body line-height).
   * Default on when omitted. Unused by projection; interval lives in
   * {@link listIntervalIndent}.
   */
  listTopPadding?: boolean;
  /** Document heading horizontal alignment policy. Presence = policy on. */
  headingAlign?: 'left' | 'center' | 'right';
  /** Document heading bold policy. `true` = force bold on `h1`–`h6`. */
  headingBold?: boolean;
  /**
   * Named heading size-grid preset id (`scrider` | `google` | `word` | `browser` | `githubEm`).
   * Ignored when {@link headingAuto} is true.
   */
  headingSizeGridPreset?: string;
  /**
   * When true, headings use browser/CSS natural size (no size-grid projection).
   * Mutually exclusive with {@link headingSizeGridPreset} in Settings UI.
   */
  headingAuto?: boolean;
  /**
   * Heading decoration preset (`none` | `scrider` | `github`).
   * Editor: `data-scrider-heading-decoration`. Export: PDF/HTML vertical rhythm + rules.
   */
  headingDecoration?: 'none' | 'scrider' | 'github';
  /**
   * When true, `h1`–`h6` also get the document first-line indent
   * ({@link textIndentCm}). Off by default: body indent does not move headings.
   * Never applied to center / right aligned headings.
   */
  headingTextIndent?: boolean;
  /** Default document font family (bare family name, e.g. `Georgia`). */
  defaultFont?: string;
  /** Default document font size as a CSS length, e.g. `12pt`. */
  defaultFontSize?: string;
  /**
   * Simple / view table chrome (borders, header shade, zebra). Same shape as
   * `DeltaToHtmlOptions.tablePresentation`. Persisted with the document so export
   * matches Settings without a separate channel.
   */
  tablePresentation?: TablePresentation;
}
