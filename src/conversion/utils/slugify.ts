/**
 * GitHub-compatible slugify for heading anchor links.
 *
 * Algorithm matches GitHub's heading-to-id conversion:
 * 1. Trim leading/trailing whitespace
 * 2. Convert to lowercase
 * 3. Remove everything except word characters (letters, digits, underscore),
 *    spaces, hyphens (preserves Unicode letters via \p{L})
 * 4. Replace spaces with hyphens
 * 5. Collapse consecutive hyphens
 * 6. Trim leading/trailing hyphens
 *
 * @param text - heading plain text content
 * @returns slugified string suitable for HTML id attribute
 *
 * @example
 * ```typescript
 * slugify('Getting Started');     // 'getting-started'
 * slugify('API Reference (v2)');  // 'api-reference-v2'
 * slugify('Что нового?');         // 'что-нового'
 * slugify('  Hello  World  ');    // 'hello--world' → 'hello-world'
 * ```
 */
export function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      // Remove everything except: letters (Unicode), digits, spaces, hyphens, underscores
      .replace(/[^\p{L}\p{N}\s\-_]/gu, '')
      // Replace whitespace with hyphens
      .replace(/\s+/g, '-')
      // Collapse consecutive hyphens
      .replace(/-{2,}/g, '-')
      // Trim leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
  );
}

/**
 * Slugify with deduplication: appends `-1`, `-2`, etc. on collision.
 *
 * Tracks used slugs via a Map. Call this for each heading in order during
 * a single document render pass.
 *
 * @param text - heading plain text content
 * @param usedSlugs - mutable map tracking slug usage counts
 * @returns unique slugified string
 *
 * @example
 * ```typescript
 * const used = new Map<string, number>();
 * slugifyWithDedup('FAQ', used);  // 'faq'
 * slugifyWithDedup('FAQ', used);  // 'faq-1'
 * slugifyWithDedup('FAQ', used);  // 'faq-2'
 * ```
 */
export function slugifyWithDedup(text: string, usedSlugs: Map<string, number>): string {
  const base = slugify(text);
  const count = usedSlugs.get(base) ?? 0;
  usedSlugs.set(base, count + 1);

  if (count === 0) {
    return base;
  }
  return `${base}-${count}`;
}
