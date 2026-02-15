/**
 * Delta Sanitization
 *
 * Cleans Delta by removing unknown attributes, validating values,
 * and normalizing through Registry.
 */

import { Delta, isInsert, isRetain, isEmbedInsert, deepClone } from '@scrider/delta';
import type { Op, AttributeMap } from '@scrider/delta';
import type { Registry } from '../schema/Registry';

/**
 * Options for sanitizeDelta
 */
export interface SanitizeOptions {
  /**
   * Remove attributes not registered in the registry
   * @default true
   */
  removeUnknown?: boolean;

  /**
   * Normalize attribute values (e.g., color: 'red' → '#ff0000')
   * @default true
   */
  normalize?: boolean;

  /**
   * Remove operations with invalid embed values
   * @default false
   */
  removeInvalidEmbeds?: boolean;

  /**
   * List of embed types that are allowed (if not set, all registered are allowed)
   */
  allowedEmbeds?: string[];
}

const DEFAULT_OPTIONS: Required<SanitizeOptions> = {
  removeUnknown: true,
  normalize: true,
  removeInvalidEmbeds: false,
  allowedEmbeds: [],
};

/**
 * Sanitize a Delta using a Registry
 *
 * Performs the following operations:
 * 1. Removes attributes not registered in the registry (if removeUnknown=true)
 * 2. Removes attributes with invalid values
 * 3. Normalizes attribute values (if normalize=true)
 * 4. Optionally removes invalid embed operations
 *
 * @param delta - The Delta to sanitize
 * @param registry - The Registry to use for validation/normalization
 * @param options - Sanitization options
 * @returns A new sanitized Delta
 *
 * @example
 * ```typescript
 * const registry = createDefaultRegistry();
 * const dirty = new Delta()
 *   .insert('Hello', { bold: true, unknown: 'value', color: 'red' })
 *   .insert('\n');
 *
 * const clean = sanitizeDelta(dirty, registry);
 * // { bold: true, color: '#ff0000' } - unknown removed, color normalized
 * ```
 */
export function sanitizeDelta(
  delta: Delta,
  registry: Registry,
  options: SanitizeOptions = {},
): Delta {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result = new Delta();

  for (const op of delta.ops) {
    const sanitizedOp = sanitizeOp(op, registry, opts);

    if (sanitizedOp !== null) {
      result.push(sanitizedOp);
    }
  }

  return result;
}

/**
 * Sanitize a single operation
 *
 * @returns Sanitized op, or null if the op should be removed
 */
function sanitizeOp(op: Op, registry: Registry, options: Required<SanitizeOptions>): Op | null {
  // Handle insert operations
  if (isInsert(op)) {
    // Check embed validity
    if (isEmbedInsert(op)) {
      const embedValue = op.insert as Record<string, unknown>;
      const embedType = Object.keys(embedValue)[0];

      // Check if embed has a valid type
      if (!embedType) {
        return options.removeInvalidEmbeds ? null : op;
      }

      // Check if embed type is allowed
      if (options.allowedEmbeds.length > 0) {
        if (!options.allowedEmbeds.includes(embedType)) {
          return options.removeInvalidEmbeds ? null : op;
        }
      }

      // Check if embed type is registered
      if (!registry.has(embedType)) {
        return options.removeInvalidEmbeds ? null : op;
      }

      // Validate embed value
      const format = registry.get(embedType);
      if (format?.validate && !format.validate(embedValue[embedType])) {
        return options.removeInvalidEmbeds ? null : op;
      }
    }

    // Sanitize attributes
    const sanitizedAttrs = sanitizeAttributes(op.attributes, registry, options);

    // Return new op with sanitized attributes
    if (sanitizedAttrs === op.attributes) {
      return op; // No changes
    }

    const newOp: Op = { insert: op.insert };
    if (sanitizedAttrs !== undefined) {
      newOp.attributes = sanitizedAttrs;
    }

    return newOp;
  }

  // Handle retain operations
  if (isRetain(op)) {
    const sanitizedAttrs = sanitizeAttributes(op.attributes, registry, options);

    if (sanitizedAttrs === op.attributes) {
      return op; // No changes
    }

    const newOp: Op = { retain: op.retain };
    if (sanitizedAttrs !== undefined) {
      newOp.attributes = sanitizedAttrs;
    }

    return newOp;
  }

  // Delete operations pass through unchanged
  return op;
}

/**
 * Sanitize attributes using registry
 */
function sanitizeAttributes(
  attributes: AttributeMap | undefined,
  registry: Registry,
  options: Required<SanitizeOptions>,
): AttributeMap | undefined {
  if (!attributes) {
    return undefined;
  }

  let result: AttributeMap | undefined;
  let hasChanges = false;

  for (const [key, value] of Object.entries(attributes)) {
    const format = registry.get(key);

    // Remove unknown attributes
    if (!format && options.removeUnknown) {
      hasChanges = true;
      continue;
    }

    // Skip invalid values
    if (format?.validate && !format.validate(value)) {
      hasChanges = true;
      continue;
    }

    // Initialize result if we're keeping this attribute
    if (!result) {
      result = {};
    }

    // Normalize or keep as-is
    if (format?.normalize && options.normalize) {
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
  if (!hasChanges) {
    return attributes;
  }

  // Return undefined if all attributes were removed
  return result && Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Normalize a Delta's attributes without removing anything
 *
 * This is a lighter operation that only normalizes values,
 * without removing unknown or invalid attributes.
 *
 * @param delta - The Delta to normalize
 * @param registry - The Registry to use for normalization
 * @returns A new Delta with normalized attributes
 */
export function normalizeDelta(delta: Delta, registry: Registry): Delta {
  return sanitizeDelta(delta, registry, {
    removeUnknown: false,
    normalize: true,
    removeInvalidEmbeds: false,
  });
}

/**
 * Validate a Delta against a Registry
 *
 * @param delta - The Delta to validate
 * @param registry - The Registry to use for validation
 * @returns true if all attributes in the Delta are valid
 */
export function validateDelta(delta: Delta, registry: Registry): boolean {
  for (const op of delta.ops) {
    // Check embeds
    if (isInsert(op) && isEmbedInsert(op)) {
      const embedValue = op.insert as Record<string, unknown>;
      const embedType = Object.keys(embedValue)[0];

      // Check if embed has a valid type
      if (!embedType) {
        return false;
      }

      // Check if embed type is registered
      if (!registry.has(embedType)) {
        return false;
      }

      // Validate embed value
      const format = registry.get(embedType);
      if (format?.validate && !format.validate(embedValue[embedType])) {
        return false;
      }
    }

    // Validate attributes (only InsertOp and RetainOp have attributes)
    if ('attributes' in op && op.attributes) {
      if (!registry.validate(op.attributes)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Deep clone a Delta
 *
 * @param delta - The Delta to clone
 * @returns A new Delta with cloned ops
 */
export function cloneDelta(delta: Delta): Delta {
  return new Delta(deepClone(delta.ops));
}
