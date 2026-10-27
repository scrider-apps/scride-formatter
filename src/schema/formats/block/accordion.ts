import type { Format } from '../../Format';

/** Deepest accordion level: three levels, `0 → 1 → 2`. */
export const ACCORDION_MAX_LEVEL = 2;

function clampAccordionLevel(value: number): number {
  return Math.max(0, Math.min(ACCORDION_MAX_LEVEL, Math.floor(value)));
}

function isAccordionLevel(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= ACCORDION_MAX_LEVEL
  );
}

/**
 * Accordion title line.
 *
 * Delta: { insert: "\n", attributes: { accordion: 0 } }
 *
 * Value is the level (0–2). The title owns the lines after it that carry
 * `accordion-body` of the same or a deeper level, and deeper titles. Grouping
 * is render-only — Delta stays per-line, like blockquote.
 */
export const accordionFormat: Format<number> = {
  name: 'accordion',
  scope: 'block',

  normalize(value: number): number {
    return clampAccordionLevel(value);
  },

  validate(value: number): boolean {
    return isAccordionLevel(value);
  },
};

/**
 * Collapsed state of an accordion title.
 *
 * Delta: { insert: "\n", attributes: { accordion: 0, "accordion-collapsed": true } }
 *
 * Absent = expanded. Only meaningful next to `accordion`.
 */
export const accordionCollapsedFormat: Format<boolean> = {
  name: 'accordion-collapsed',
  scope: 'block',

  validate(value: boolean): boolean {
    return value === true;
  },
};

/**
 * Accordion body line.
 *
 * Delta: { insert: "\n", attributes: { "accordion-body": 0 } }
 *
 * Value is the level of the owning title (0–2).
 */
export const accordionBodyFormat: Format<number> = {
  name: 'accordion-body',
  scope: 'block',

  normalize(value: number): number {
    return clampAccordionLevel(value);
  },

  validate(value: number): boolean {
    return isAccordionLevel(value);
  },
};
