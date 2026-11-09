/**
 * Size and position of a block plate (code block, level-0 accordion) set by
 * the editor's resize frame. Lengths are CSS px, written as a string (`"480"`)
 * or a number; floats are the three positions of the plate.
 */

export type BlockBoxFloat = 'left' | 'center' | 'right';

/** Positive px length, rounded; null for anything else. */
export function parseBlockBoxLength(value: unknown): number | null {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\s*\d+(\.\d+)?\s*$/.test(value)
        ? Number.parseFloat(value)
        : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function parseBlockBoxFloat(value: unknown): BlockBoxFloat | null {
  return value === 'left' || value === 'center' || value === 'right' ? value : null;
}

export function isBlockBoxLength(value: unknown): boolean {
  return parseBlockBoxLength(value) !== null;
}

export function isBlockBoxFloat(value: unknown): boolean {
  return parseBlockBoxFloat(value) !== null;
}
