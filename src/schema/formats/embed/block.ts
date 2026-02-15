import type { Format } from '../../Format';

/**
 * Block embed format — structural validation for complex block embeds.
 *
 * Delta: `{ insert: { block: { type: "table", ... } } }`
 *
 * This is the first level of two-level validation:
 * 1. blockFormat.validate() — structural: is it an object with `type`?
 * 2. BlockHandlerRegistry.get(type).validate() — semantic: is it a valid table?
 *
 * The `block` key is a **category**, not "just another embed".
 * It signals to converters and OT layer: "nested structure, needs special handling".
 */
export const blockFormat: Format<Record<string, unknown>> = {
  name: 'block',
  scope: 'embed',

  validate(value: Record<string, unknown>): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof value.type === 'string' &&
      value.type.length > 0
    );
  },
};
