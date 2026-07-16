/**
 * Document-level metadata (Scrider format extension).
 *
 * Concrete schema for the opaque `scrider-metadata` sibling field defined in
 * `@scrider/delta` (`ScriderDocument`). It carries document-wide defaults ONCE
 * (line spacing, paragraph spacing, indent, heading policy, fonts) instead of
 * duplicating them as block attributes on every `\n`.
 *
 * Layering:
 * - `@scrider/delta` treats the value as opaque `Record<string, unknown>` — it
 *   never participates in `length()`, selection indices, OT, or partial copy/paste.
 * - `@scrider/formatter` is the CONTRACT OWNER of this concrete shape.
 * - `@scrider/editor-core` / `@scrider/editor-react` consume it (state, CSS vars,
 *   export projection).
 *
 * All fields are optional and additive: extending the interface never changes the
 * op-stream and is backward compatible. Presentation-relevant fields are projected
 * to HTML via {@link documentMetadataToPresentation}; heading/font policy is applied
 * by upstream layers (CSS vars, bake) and is intentionally NOT part of the inline
 * export projection.
 */
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
  /** Document heading horizontal alignment policy. */
  headingAlign?: 'left' | 'center' | 'right';
  /** Document heading bold policy. */
  headingBold?: boolean;
  /** Named heading size-grid preset id (schema defined upstream). */
  headingSizeGridPreset?: string;
  /** Default document font family (bare family name, e.g. `Georgia`). */
  defaultFont?: string;
  /** Default document font size as a CSS length, e.g. `12pt`. */
  defaultFontSize?: string;
}
