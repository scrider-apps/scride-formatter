import type { AttributeMap } from '@scrider/delta';
import type { Format, FormatScope } from './Format';

/**
 * Registry of formats
 *
 * Manages a collection of Format definitions for validation,
 * normalization, and sanitization of Delta attributes.
 *
 * @example
 * ```typescript
 * const registry = new Registry()
 *   .register(boldFormat)
 *   .register(italicFormat)
 *   .register(colorFormat);
 *
 * // Normalize attributes
 * registry.normalize({ color: 'red' });
 * // { color: '#ff0000' }
 *
 * // Validate attributes
 * registry.validate({ header: 3 }); // true
 * registry.validate({ header: 10 }); // false
 * ```
 */
export class Registry {
  private formats: Map<string, Format> = new Map();

  /**
   * Register a format or array of formats
   *
   * @param format - Format or array of formats to register
   * @returns this for chaining
   */
  register(format: Format): this;
  register(formats: Format[]): this;
  register(formatOrFormats: Format | Format[]): this {
    const formats = Array.isArray(formatOrFormats) ? formatOrFormats : [formatOrFormats];

    for (const format of formats) {
      if (this.formats.has(format.name)) {
        throw new Error(`Format "${format.name}" is already registered`);
      }
      this.formats.set(format.name, format);
    }

    return this;
  }

  /**
   * Get a format by name
   *
   * @param name - Format name
   * @returns Format or undefined if not found
   */
  get(name: string): Format | undefined {
    return this.formats.get(name);
  }

  /**
   * Check if a format is registered
   *
   * @param name - Format name
   * @returns true if format exists
   */
  has(name: string): boolean {
    return this.formats.has(name);
  }

  /**
   * Get all formats with a specific scope
   *
   * @param scope - Format scope to filter by
   * @returns Array of formats with the given scope
   */
  getByScope(scope: FormatScope): Format[] {
    const result: Format[] = [];
    for (const format of this.formats.values()) {
      if (format.scope === scope) {
        result.push(format);
      }
    }
    return result;
  }

  /**
   * Get all registered format names
   *
   * @returns Array of format names
   */
  getNames(): string[] {
    return Array.from(this.formats.keys());
  }

  /**
   * Normalize all attributes using registered formats
   *
   * Applies normalize() for each attribute that has a registered format.
   * Unknown attributes are passed through unchanged.
   *
   * @param attributes - Attributes to normalize
   * @returns New object with normalized attributes
   */
  normalize(attributes: AttributeMap | undefined): AttributeMap | undefined {
    if (!attributes) return undefined;

    const result: AttributeMap = {};
    let hasChanges = false;

    for (const [key, value] of Object.entries(attributes)) {
      const format = this.formats.get(key);

      if (format?.normalize) {
        const normalized = format.normalize(value);
        result[key] = normalized;
        if (normalized !== value) {
          hasChanges = true;
        }
      } else {
        result[key] = value;
      }
    }

    // Return original if no changes (optimization)
    return hasChanges ? result : attributes;
  }

  /**
   * Validate all attributes
   *
   * @param attributes - Attributes to validate
   * @returns true if all known attributes are valid
   */
  validate(attributes: AttributeMap | undefined): boolean {
    if (!attributes) return true;

    for (const [key, value] of Object.entries(attributes)) {
      const format = this.formats.get(key);

      if (format?.validate && !format.validate(value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize attributes by removing invalid values
   *
   * Removes attributes that:
   * - Are not registered (unknown formats)
   * - Fail validation
   *
   * @param attributes - Attributes to sanitize
   * @param removeUnknown - If true, remove unregistered attributes (default: true)
   * @returns New object with only valid attributes
   */
  sanitize(
    attributes: AttributeMap | undefined,
    removeUnknown: boolean = true,
  ): AttributeMap | undefined {
    if (!attributes) return undefined;

    const result: AttributeMap = {};
    let hasKeys = false;

    for (const [key, value] of Object.entries(attributes)) {
      const format = this.formats.get(key);

      // Skip unknown formats if removeUnknown is true
      if (!format && removeUnknown) {
        continue;
      }

      // Skip invalid values
      if (format?.validate && !format.validate(value)) {
        continue;
      }

      // Normalize if possible
      if (format?.normalize) {
        result[key] = format.normalize(value);
      } else {
        result[key] = value;
      }
      hasKeys = true;
    }

    return hasKeys ? result : undefined;
  }

  /**
   * Get the number of registered formats
   */
  get size(): number {
    return this.formats.size;
  }
}
