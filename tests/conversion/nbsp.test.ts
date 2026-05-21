/**
 * Non-breaking space (NBSP, U+00A0) — Phase 7.6 round-trip.
 *
 * NBSP is stored as a literal text character inside Delta strings — NOT as
 * an embed. This keeps the wire format compatible with any external Delta
 * consumer and matches the behaviour of Word / Google Docs / Quill.
 *
 * The suite asserts that the NBSP character survives all four conversion
 * directions:
 *   1. htmlToDelta      — literal U+00A0 and `&nbsp;` entity
 *   2. deltaToHtml      — emits U+00A0 (literal or `&nbsp;`) → htmlToDelta reverses it
 *   3. markdownToDelta  — literal U+00A0 in markdown source and `&nbsp;` entity
 *   4. deltaToMarkdown  — literal U+00A0 → markdownToDelta reverses it
 *
 * Scenarios in each direction:
 *   a. one NBSP between words
 *   b. NBSP at start / end of a line
 *   c. multiple NBSP in a row
 *   d. NBSP inside an inline-formatted run (bold)
 *   e. NBSP inside a heading
 */

import { describe, it, expect } from 'vitest';
import { Delta, isTextInsert } from '@scrider/delta';
import type { InsertOp, Op } from '@scrider/delta';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { deltaToMarkdown } from '../../src/conversion/markdown/delta-to-markdown';
import {
  markdownToDelta,
  isRemarkAvailable,
} from '../../src/conversion/markdown';

const NBSP = '\u00A0';
const remarkAvailable = isRemarkAvailable();

/** Collapse Delta ops into a single string (only text inserts). */
function deltaText(delta: Delta): string {
  let text = '';
  for (const op of delta.ops) {
    if (isTextInsert(op)) {
      text += op.insert;
    }
  }
  return text;
}

function findBoldTextOpWithNbsp(ops: readonly Op[]): InsertOp | undefined {
  return ops.find(
    (op): op is InsertOp =>
      isTextInsert(op) && op.insert.includes(NBSP) && op.attributes?.bold === true,
  );
}

function hasHeaderLineAttribute(ops: readonly Op[]): boolean {
  return ops.some(
    (op): op is InsertOp => isTextInsert(op) && op.attributes?.header === 1,
  );
}

// ============================================================================
// htmlToDelta
// ============================================================================

describe('NBSP — htmlToDelta', () => {
  it('preserves a single literal U+00A0 between words', () => {
    const delta = htmlToDelta(`<p>A${NBSP}B</p>`);
    expect(deltaText(delta)).toBe(`A${NBSP}B\n`);
  });

  it('decodes &nbsp; HTML entity into U+00A0', () => {
    const delta = htmlToDelta('<p>A&nbsp;B</p>');
    expect(deltaText(delta)).toBe(`A${NBSP}B\n`);
  });

  it('preserves NBSP at start and end of a line', () => {
    const delta = htmlToDelta(`<p>${NBSP}word${NBSP}</p>`);
    expect(deltaText(delta)).toBe(`${NBSP}word${NBSP}\n`);
  });

  it('preserves multiple NBSP in a row', () => {
    const delta = htmlToDelta(`<p>A${NBSP}${NBSP}B</p>`);
    expect(deltaText(delta)).toBe(`A${NBSP}${NBSP}B\n`);
  });

  it('preserves NBSP inside a bold run', () => {
    const delta = htmlToDelta(`<p><strong>A${NBSP}B</strong></p>`);
    const boldOp = findBoldTextOpWithNbsp(delta.ops);
    expect(boldOp, 'expected a bold text op containing NBSP').toBeDefined();
    expect(boldOp?.insert).toBe(`A${NBSP}B`);
  });

  it('preserves NBSP inside a heading', () => {
    const delta = htmlToDelta(`<h1>${NBSP}Heading${NBSP}</h1>`);
    expect(deltaText(delta)).toBe(`${NBSP}Heading${NBSP}\n`);
    expect(hasHeaderLineAttribute(delta.ops), 'expected a header line attribute').toBe(true);
  });
});

// ============================================================================
// deltaToHtml + round-trip back through htmlToDelta
// ============================================================================

describe('NBSP — deltaToHtml', () => {
  it('emits NBSP between words and reverses it cleanly', () => {
    const original = new Delta().insert(`A${NBSP}B\n`);
    const html = deltaToHtml(original);
    expect(html).toContain(NBSP);
    expect(deltaText(htmlToDelta(html))).toBe(`A${NBSP}B\n`);
  });

  it('round-trips multiple NBSP in a row', () => {
    const original = new Delta().insert(`A${NBSP}${NBSP}B\n`);
    const html = deltaToHtml(original);
    expect(deltaText(htmlToDelta(html))).toBe(`A${NBSP}${NBSP}B\n`);
  });

  it('round-trips NBSP inside a bold run', () => {
    const original = new Delta()
      .insert(`A${NBSP}B`, { bold: true })
      .insert('\n');
    const html = deltaToHtml(original);
    const back = htmlToDelta(html);
    const boldOp = findBoldTextOpWithNbsp(back.ops);
    expect(boldOp?.insert).toBe(`A${NBSP}B`);
  });

  it('round-trips NBSP inside a heading', () => {
    const original = new Delta()
      .insert(`${NBSP}Heading${NBSP}`)
      .insert('\n', { header: 1 });
    const html = deltaToHtml(original);
    const back = htmlToDelta(html);
    expect(deltaText(back)).toBe(`${NBSP}Heading${NBSP}\n`);
    expect(hasHeaderLineAttribute(back.ops)).toBe(true);
  });
});

// ============================================================================
// markdownToDelta
// ============================================================================

describe.runIf(remarkAvailable)('NBSP — markdownToDelta', () => {
  it('preserves a single literal NBSP between words', async () => {
    const delta = await markdownToDelta(`A${NBSP}B`);
    expect(deltaText(delta)).toBe(`A${NBSP}B\n`);
  });

  it('decodes inline &nbsp; HTML entity (markdown allows raw HTML)', async () => {
    const delta = await markdownToDelta('A&nbsp;B');
    expect(deltaText(delta)).toBe(`A${NBSP}B\n`);
  });

  it('preserves NBSP at start and end of a line', async () => {
    const delta = await markdownToDelta(`${NBSP}word${NBSP}`);
    expect(deltaText(delta)).toBe(`${NBSP}word${NBSP}\n`);
  });

  it('preserves multiple NBSP in a row', async () => {
    const delta = await markdownToDelta(`A${NBSP}${NBSP}B`);
    expect(deltaText(delta)).toBe(`A${NBSP}${NBSP}B\n`);
  });

  it('preserves NBSP inside a bold run', async () => {
    const delta = await markdownToDelta(`**A${NBSP}B**`);
    const boldOp = findBoldTextOpWithNbsp(delta.ops);
    expect(boldOp?.insert).toBe(`A${NBSP}B`);
  });

  it('preserves NBSP inside a heading', async () => {
    const delta = await markdownToDelta(`# ${NBSP}Heading${NBSP}`);
    expect(deltaText(delta)).toBe(`${NBSP}Heading${NBSP}\n`);
    expect(hasHeaderLineAttribute(delta.ops)).toBe(true);
  });
});

// ============================================================================
// deltaToMarkdown + round-trip back through markdownToDelta
// ============================================================================

describe.runIf(remarkAvailable)('NBSP — deltaToMarkdown', () => {
  it('emits literal NBSP between words and reverses it cleanly', async () => {
    const original = new Delta().insert(`A${NBSP}B\n`);
    const md = deltaToMarkdown(original);
    expect(md).toContain(NBSP);
    const back = await markdownToDelta(md);
    expect(deltaText(back)).toBe(`A${NBSP}B\n`);
  });

  it('round-trips multiple NBSP in a row', async () => {
    const original = new Delta().insert(`A${NBSP}${NBSP}B\n`);
    const md = deltaToMarkdown(original);
    const back = await markdownToDelta(md);
    expect(deltaText(back)).toBe(`A${NBSP}${NBSP}B\n`);
  });

  it('round-trips NBSP inside a bold run', async () => {
    const original = new Delta()
      .insert(`A${NBSP}B`, { bold: true })
      .insert('\n');
    const md = deltaToMarkdown(original);
    const back = await markdownToDelta(md);
    const boldOp = findBoldTextOpWithNbsp(back.ops);
    expect(boldOp?.insert).toBe(`A${NBSP}B`);
  });

  it('round-trips NBSP inside a heading', async () => {
    const original = new Delta()
      .insert(`${NBSP}Heading${NBSP}`)
      .insert('\n', { header: 1 });
    const md = deltaToMarkdown(original);
    const back = await markdownToDelta(md);
    expect(deltaText(back)).toBe(`${NBSP}Heading${NBSP}\n`);
    expect(hasHeaderLineAttribute(back.ops)).toBe(true);
  });
});
