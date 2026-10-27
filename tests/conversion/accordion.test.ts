/**
 * Accordion — flat line attributes, three levels.
 *
 * `accordion: L` (+ `accordion-collapsed`) on a title `\n`, `accordion-body: L`
 * on body lines. Editor profile renders flat `<p data-accordion*>`, export
 * renders nested `<details>`, Markdown uses nested `<details>` as raw HTML.
 */

import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';

import { AccordionLineResolver, normalizeAccordionDelta } from '../../src/conversion/accordion';
import { deltaToDom, deltaToHtml, htmlToDelta } from '../../src/conversion/html';
import { deltaToMarkdown, isRemarkAvailable, markdownToDelta } from '../../src/conversion/markdown';
import { sanitizeDelta } from '../../src/conversion/sanitize';
import { createDefaultRegistry } from '../../src/schema';

/**
 * User scenario, three steps on "Title / one / two / three / four":
 * select all → level 0; select the last three → level 1; select the last two → level 2.
 */
function scenarioDelta(): Delta {
  return new Delta()
    .insert('Title')
    .insert('\n', { accordion: 0 })
    .insert('one')
    .insert('\n', { 'accordion-body': 0 })
    .insert('two')
    .insert('\n', { accordion: 1 })
    .insert('three')
    .insert('\n', { accordion: 2 })
    .insert('four')
    .insert('\n', { 'accordion-body': 2 });
}

describe('AccordionLineResolver', () => {
  it('resolves the scenario levels', () => {
    const resolver = new AccordionLineResolver();
    const roles = [
      { accordion: 0 },
      { 'accordion-body': 0 },
      { accordion: 1 },
      { accordion: 2 },
      { 'accordion-body': 2 },
    ].map((attrs) => resolver.next(attrs));

    expect(roles.map((r) => r && `${r.role}:${r.level}`)).toEqual([
      'title:0',
      'body:0',
      'title:1',
      'title:2',
      'body:2',
    ]);
  });

  it('marks lines under a collapsed title hidden, not the title itself', () => {
    const resolver = new AccordionLineResolver();
    const title = resolver.next({ accordion: 0, 'accordion-collapsed': true });
    const body = resolver.next({ 'accordion-body': 0 });
    const nested = resolver.next({ accordion: 1 });

    expect(title).toMatchObject({ collapsed: true, hidden: false });
    expect(body).toMatchObject({ hidden: true });
    expect(nested).toMatchObject({ level: 1, hidden: true });
  });

  it('demotes a title without an enclosing scope and drops an orphan body', () => {
    const resolver = new AccordionLineResolver();
    expect(resolver.next({ 'accordion-body': 1 })).toBeNull();
    expect(resolver.next({ accordion: 2 })).toMatchObject({ role: 'title', level: 0 });
    expect(resolver.next({ 'accordion-body': 2 })).toMatchObject({ role: 'body', level: 0 });
  });

  it('a body of a lower level closes deeper scopes', () => {
    const resolver = new AccordionLineResolver();
    resolver.next({ accordion: 0 });
    resolver.next({ accordion: 1 });
    resolver.next({ 'accordion-body': 1 });
    expect(resolver.next({ 'accordion-body': 0 })).toMatchObject({ level: 0 });
    expect(resolver.next({ 'accordion-body': 1 })).toMatchObject({ level: 0 });
  });

  it('a plain line ends every scope', () => {
    const resolver = new AccordionLineResolver();
    resolver.next({ accordion: 0 });
    expect(resolver.next(undefined)).toBeNull();
    expect(resolver.next({ 'accordion-body': 0 })).toBeNull();
  });
});

describe('normalizeAccordionDelta', () => {
  it('returns the same Delta when there are no accordion lines', () => {
    const delta = new Delta().insert('a\n', { header: 1 });
    expect(normalizeAccordionDelta(delta)).toBe(delta);
  });

  it('rewrites stored levels to effective ones and drops orphans', () => {
    const delta = new Delta()
      .insert('orphan')
      .insert('\n', { 'accordion-body': 0 })
      .insert('T')
      .insert('\n', { accordion: 2, 'accordion-collapsed': true })
      .insert('b')
      .insert('\n', { 'accordion-body': 1 });

    expect(normalizeAccordionDelta(delta).ops).toEqual([
      { insert: 'orphan\nT' },
      { insert: '\n', attributes: { accordion: 0, 'accordion-collapsed': true } },
      { insert: 'b' },
      { insert: '\n', attributes: { 'accordion-body': 0 } },
    ]);
  });

  it('strips block formats that do not combine with accordion lines', () => {
    const delta = new Delta()
      .insert('T')
      .insert('\n', { accordion: 0, header: 2, align: 'center' })
      .insert('b')
      .insert('\n', { 'accordion-body': 0, list: 'bullet', indent: 1 });

    expect(normalizeAccordionDelta(delta).ops).toEqual([
      { insert: 'T' },
      { insert: '\n', attributes: { accordion: 0 } },
      { insert: 'b' },
      { insert: '\n', attributes: { 'accordion-body': 0 } },
    ]);
  });
});

describe('sanitizeDelta keeps accordion formats', () => {
  it('registers accordion, accordion-collapsed, accordion-body', () => {
    const delta = new Delta()
      .insert('T')
      .insert('\n', { accordion: 0, 'accordion-collapsed': true })
      .insert('b')
      .insert('\n', { 'accordion-body': 0 });

    expect(sanitizeDelta(delta, createDefaultRegistry()).ops).toEqual(delta.ops);
  });

  it('drops out-of-range levels', () => {
    const delta = new Delta().insert('T').insert('\n', { accordion: 5 });
    expect(sanitizeDelta(delta, createDefaultRegistry()).ops).toEqual([{ insert: 'T\n' }]);
  });
});

describe('deltaToHtml (export) — nested <details>', () => {
  it('renders the scenario as nested details', () => {
    expect(deltaToHtml(scenarioDelta())).toBe(
      '<details class="scrider-accordion" data-level="0" open><summary>Title</summary>' +
        '<p>one</p>' +
        '<details class="scrider-accordion" data-level="1" open><summary>two</summary>' +
        '<details class="scrider-accordion" data-level="2" open><summary>three</summary>' +
        '<p>four</p>' +
        '</details></details></details>',
    );
  });

  it('collapsed title has no `open`, empty body line keeps height', () => {
    const delta = new Delta()
      .insert('T')
      .insert('\n', { accordion: 0, 'accordion-collapsed': true })
      .insert('\n', { 'accordion-body': 0 })
      .insert('after\n');

    expect(deltaToHtml(delta)).toBe(
      '<details class="scrider-accordion" data-level="0"><summary>T</summary>' +
        '<p><br></p></details><p>after</p>',
    );
  });

  it('keeps inline formatting in summary and body', () => {
    const delta = new Delta()
      .insert('Bold', { bold: true })
      .insert('\n', { accordion: 0 })
      .insert('em', { italic: true })
      .insert('\n', { 'accordion-body': 0 });

    expect(deltaToHtml(delta)).toBe(
      '<details class="scrider-accordion" data-level="0" open>' +
        '<summary><strong>Bold</strong></summary><p><em>em</em></p></details>',
    );
  });
});

describe('deltaToDom (editor) — flat <p> lines', () => {
  it('renders one <p> per line with resolved levels', () => {
    expect(deltaToDom(scenarioDelta())).toBe(
      '<p class="scrider-accordion-title" data-accordion="0">Title</p>' +
        '<p class="scrider-accordion-body" data-accordion-body="0">one</p>' +
        '<p class="scrider-accordion-title" data-accordion="1">two</p>' +
        '<p class="scrider-accordion-title" data-accordion="2">three</p>' +
        '<p class="scrider-accordion-body" data-accordion-body="2">four</p>',
    );
  });

  it('marks the collapsed scope hidden', () => {
    const delta = new Delta()
      .insert('T')
      .insert('\n', { accordion: 1, 'accordion-collapsed': true })
      .insert('b')
      .insert('\n', { 'accordion-body': 1 });

    expect(deltaToDom(delta)).toBe(
      '<p class="scrider-accordion-title" data-accordion="0" data-accordion-collapsed="true">T</p>' +
        '<p class="scrider-accordion-body" data-accordion-body="0" data-accordion-hidden="true">b</p>',
    );
  });

  it('orphan body renders as a plain paragraph', () => {
    const delta = new Delta().insert('x').insert('\n', { 'accordion-body': 0 });
    expect(deltaToDom(delta)).toBe('<p>x</p>');
  });

  it('explicit accordionMarkup wins over the profile default', () => {
    const delta = new Delta().insert('T').insert('\n', { accordion: 0 });
    expect(deltaToDom(delta, { accordionMarkup: 'details' })).toContain('<details');
  });
});

describe('htmlToDelta', () => {
  it('parses export markup back to the same Delta', () => {
    const delta = scenarioDelta();
    expect(htmlToDelta(deltaToHtml(delta)).ops).toEqual(delta.ops);
  });

  it('parses pretty export markup back to the same Delta', () => {
    const delta = scenarioDelta();
    expect(htmlToDelta(deltaToHtml(delta, { pretty: true })).ops).toEqual(delta.ops);
  });

  it('parses editor markup back to the same Delta', () => {
    const delta = new Delta()
      .insert('T')
      .insert('\n', { accordion: 0, 'accordion-collapsed': true })
      .insert('b')
      .insert('\n', { 'accordion-body': 0 })
      .insert('\n', { 'accordion-body': 0 });

    expect(htmlToDelta(deltaToDom(delta)).ops).toEqual(delta.ops);
  });

  it('details without open is collapsed; loose body text becomes a line', () => {
    const delta = htmlToDelta('<details><summary>T</summary>loose</details><p>x</p>');
    expect(delta.ops).toEqual([
      { insert: 'T' },
      { insert: '\n', attributes: { accordion: 0, 'accordion-collapsed': true } },
      { insert: 'loose' },
      { insert: '\n', attributes: { 'accordion-body': 0 } },
      { insert: 'x\n' },
    ]);
  });

  it('missing summary gives an empty title; <p> inside summary is one title line', () => {
    expect(htmlToDelta('<details open><p>b</p></details>').ops).toEqual([
      { insert: '\n', attributes: { accordion: 0 } },
      { insert: 'b' },
      { insert: '\n', attributes: { 'accordion-body': 0 } },
    ]);
    expect(htmlToDelta('<details open><summary><p>T</p></summary></details>').ops).toEqual([
      { insert: 'T' },
      { insert: '\n', attributes: { accordion: 0 } },
    ]);
  });

  it('nesting deeper than level 2 folds into the level-2 body', () => {
    const html =
      '<details open><summary>a</summary><details open><summary>b</summary>' +
      '<details open><summary>c</summary><details open><summary>d</summary>' +
      '<p>e</p></details></details></details></details>';

    expect(htmlToDelta(html).ops).toEqual([
      { insert: 'a' },
      { insert: '\n', attributes: { accordion: 0 } },
      { insert: 'b' },
      { insert: '\n', attributes: { accordion: 1 } },
      { insert: 'c' },
      { insert: '\n', attributes: { accordion: 2 } },
      { insert: 'd' },
      { insert: '\n', attributes: { 'accordion-body': 2 } },
      { insert: 'e' },
      { insert: '\n', attributes: { 'accordion-body': 2 } },
    ]);
  });
});

describe('deltaToMarkdown — nested <details>', () => {
  it('renders the scenario', () => {
    expect(deltaToMarkdown(new Delta().insert('before\n').concat(scenarioDelta()))).toBe(
      [
        'before',
        '',
        '<details open>',
        '<summary>Title</summary>',
        '',
        'one',
        '',
        '<details open>',
        '<summary>two</summary>',
        '',
        '<details open>',
        '<summary>three</summary>',
        '',
        'four',
        '',
        '</details>',
        '',
        '</details>',
        '',
        '</details>',
        '',
      ].join('\n'),
    );
  });

  it('collapsed title, empty body line and inline HTML in summary', () => {
    const delta = new Delta()
      .insert('B', { bold: true })
      .insert('\n', { accordion: 0, 'accordion-collapsed': true })
      .insert('\n', { 'accordion-body': 0 });

    expect(deltaToMarkdown(delta)).toBe(
      ['<details>', '<summary><strong>B</strong></summary>', '', '<br>', '', '</details>', ''].join(
        '\n',
      ),
    );
  });
});

describe.runIf(isRemarkAvailable())('markdownToDelta — nested <details>', () => {
  it('round-trips the scenario', async () => {
    const delta = new Delta().insert('before\n').concat(scenarioDelta()).insert('after\n');
    const restored = await markdownToDelta(deltaToMarkdown(delta));
    expect(restored.ops).toEqual(delta.ops);
  });

  it('round-trips collapsed titles, empty body lines and inline formatting', async () => {
    const delta = new Delta()
      .insert('B', { bold: true })
      .insert('\n', { accordion: 0, 'accordion-collapsed': true })
      .insert('\n', { 'accordion-body': 0 })
      .insert('x', { italic: true })
      .insert('\n', { 'accordion-body': 0 })
      .insert('T')
      .insert('\n', { accordion: 1, 'accordion-collapsed': true })
      .insert('y')
      .insert('\n', { 'accordion-body': 1 });

    const restored = await markdownToDelta(deltaToMarkdown(delta));
    expect(restored.ops).toEqual(delta.ops);
  });

  it('parses hand-written details in one HTML block', async () => {
    const restored = await markdownToDelta(
      '<details><summary>T</summary><p>b</p></details>\n\nafter',
    );
    expect(restored.ops).toEqual([
      { insert: 'T' },
      { insert: '\n', attributes: { accordion: 0, 'accordion-collapsed': true } },
      { insert: 'b' },
      { insert: '\n', attributes: { 'accordion-body': 0 } },
      { insert: 'after\n' },
    ]);
  });

  it('Markdown body inside details keeps inline formatting', async () => {
    const restored = await markdownToDelta(
      '<details open>\n<summary>T</summary>\n\nsome **bold**\n\n</details>\n',
    );
    expect(restored.ops).toEqual([
      { insert: 'T' },
      { insert: '\n', attributes: { accordion: 0 } },
      { insert: 'some ' },
      { insert: 'bold', attributes: { bold: true } },
      { insert: '\n', attributes: { 'accordion-body': 0 } },
    ]);
  });
});
