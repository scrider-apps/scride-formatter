/**
 * Accordion — line-attribute model shared by HTML / Markdown / normalization.
 *
 * Delta is flat (per-line attributes on `\n`, like blockquote):
 * - `accordion: L` (+ `accordion-collapsed: true`) — title line of level L;
 * - `accordion-body: L` — body line owned by the nearest title of level L.
 *
 * Scope of a level-L title: following body lines of level ≥ L and titles of
 * level > L. It ends at a body line of level < L, a title of level ≤ L, or a
 * line without accordion attributes.
 *
 * Stored levels are hints: the resolver derives the effective level from the
 * enclosing scope (a level-2 title outside any scope becomes level 0; a body
 * line without a title is an orphan and renders as a plain paragraph).
 */

import { Delta, isInsert } from '@scrider/delta';
import type { AttributeMap, Op } from '@scrider/delta';

import { ACCORDION_MAX_LEVEL } from '../schema/formats/block/accordion';

export const ACCORDION_ATTR = 'accordion';
export const ACCORDION_COLLAPSED_ATTR = 'accordion-collapsed';
export const ACCORDION_BODY_ATTR = 'accordion-body';

/** Block formats that do not combine with accordion lines (text-only model). */
export const ACCORDION_EXCLUSIVE_BLOCK_ATTRS: readonly string[] = [
  'header',
  'header-id',
  'list',
  'blockquote',
  'code-block',
  'code-block-id',
  'indent',
  'align',
  'table-row',
  'table-col',
  'table-header',
  'table-col-align',
];

export interface AccordionLineInfo {
  role: 'title' | 'body';
  /** Effective level (0–2). */
  level: number;
  /** Title only: own collapsed state. */
  collapsed: boolean;
  /** Inside the scope of a collapsed title (the line itself is not shown). */
  hidden: boolean;
}

function readAccordionLevel(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(ACCORDION_MAX_LEVEL, Math.floor(value)));
}

/** Line carries `accordion` or `accordion-body`. */
export function hasAccordionAttributes(attrs: AttributeMap | undefined): boolean {
  if (!attrs) return false;
  return (
    readAccordionLevel(attrs[ACCORDION_ATTR]) !== null ||
    readAccordionLevel(attrs[ACCORDION_BODY_ATTR]) !== null
  );
}

/**
 * Walks lines top-down and resolves effective accordion roles.
 * Feed every line of a document (or of a contiguous run) in order.
 */
export class AccordionLineResolver {
  /** Collapsed flag per open title, index = level. */
  private stack: boolean[] = [];

  next(attrs: AttributeMap | undefined): AccordionLineInfo | null {
    const title = readAccordionLevel(attrs?.[ACCORDION_ATTR]);
    if (title !== null) {
      if (this.stack.length > title) this.stack.length = title;
      const level = this.stack.length;
      const hidden = this.stack.includes(true);
      const collapsed = attrs?.[ACCORDION_COLLAPSED_ATTR] === true;
      this.stack.push(collapsed);
      return { role: 'title', level, collapsed, hidden };
    }

    const body = readAccordionLevel(attrs?.[ACCORDION_BODY_ATTR]);
    if (body !== null) {
      if (this.stack.length > body + 1) this.stack.length = body + 1;
      if (this.stack.length === 0) return null;
      return {
        role: 'body',
        level: this.stack.length - 1,
        collapsed: false,
        hidden: this.stack.includes(true),
      };
    }

    this.stack.length = 0;
    return null;
  }
}

/**
 * Line attributes rewritten to the effective accordion role: levels fixed,
 * orphan body dropped, block formats that do not combine with accordion removed.
 */
export function normalizeAccordionLineAttributes(
  attrs: AttributeMap | undefined,
  info: AccordionLineInfo | null,
): AttributeMap | undefined {
  if (!attrs) return attrs;
  const out: AttributeMap = { ...attrs };
  delete out[ACCORDION_ATTR];
  delete out[ACCORDION_COLLAPSED_ATTR];
  delete out[ACCORDION_BODY_ATTR];

  if (info) {
    for (const key of ACCORDION_EXCLUSIVE_BLOCK_ATTRS) delete out[key];
    if (info.role === 'title') {
      out[ACCORDION_ATTR] = info.level;
      if (info.collapsed) out[ACCORDION_COLLAPSED_ATTR] = true;
    } else {
      out[ACCORDION_BODY_ATTR] = info.level;
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function deltaHasAccordion(ops: readonly Op[]): boolean {
  return ops.some(
    (op) =>
      isInsert(op) &&
      typeof op.insert === 'string' &&
      op.insert.includes('\n') &&
      (hasAccordionAttributes(op.attributes) ||
        op.attributes?.[ACCORDION_COLLAPSED_ATTR] !== undefined),
  );
}

/**
 * Rewrites accordion attributes of a content Delta to their effective values
 * (see {@link AccordionLineResolver}). Returns the same Delta when it has no
 * accordion lines.
 */
export function normalizeAccordionDelta(delta: Delta): Delta {
  if (!deltaHasAccordion(delta.ops)) return delta;

  const resolver = new AccordionLineResolver();
  const out = new Delta();

  for (const op of delta.ops) {
    if (!isInsert(op) || typeof op.insert !== 'string' || !op.insert.includes('\n')) {
      out.push(op);
      continue;
    }
    const parts = op.insert.split('\n');
    parts.forEach((text, i) => {
      if (text) out.insert(text, op.attributes);
      if (i < parts.length - 1) {
        const info = resolver.next(op.attributes);
        out.insert('\n', normalizeAccordionLineAttributes(op.attributes, info));
      }
    });
  }

  return out;
}

/** Accordion tree node for nested renderers (`<details>`, Markdown). */
export type AccordionNode<T> =
  | { kind: 'title'; line: T; info: AccordionLineInfo; children: AccordionNode<T>[] }
  | { kind: 'line'; line: T; info: AccordionLineInfo | null };

/** Groups a contiguous run of lines into nested accordion nodes. */
export function buildAccordionTree<T>(
  lines: readonly T[],
  getAttributes: (line: T) => AttributeMap | undefined,
): AccordionNode<T>[] {
  const resolver = new AccordionLineResolver();
  const root: AccordionNode<T>[] = [];
  const open: Extract<AccordionNode<T>, { kind: 'title' }>[] = [];

  for (const line of lines) {
    const info = resolver.next(getAttributes(line));
    if (!info) {
      open.length = 0;
      root.push({ kind: 'line', line, info: null });
      continue;
    }
    if (info.role === 'title') {
      open.length = info.level;
      const node: Extract<AccordionNode<T>, { kind: 'title' }> = {
        kind: 'title',
        line,
        info,
        children: [],
      };
      (open[info.level - 1]?.children ?? root).push(node);
      open.push(node);
    } else {
      open.length = info.level + 1;
      open[info.level]!.children.push({ kind: 'line', line, info });
    }
  }

  return root;
}
