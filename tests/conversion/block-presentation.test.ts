import { describe, it, expect } from 'vitest';

import { Delta } from '@scrider/delta';

import {
  parseScriderLineHeightMultiplier,
  parseScriderMarginAfterEm,
  parseScriderMarginBeforeEm,
  SCRIDER_LINE_HEIGHT_KEY,
  SCRIDER_MARGIN_AFTER_KEY,
  SCRIDER_MARGIN_BEFORE_KEY,
} from '../../src/conversion/html/block-presentation';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';

describe('parseScriderLineHeightMultiplier', () => {
  it('parses unitless multipliers', () => {
    expect(parseScriderLineHeightMultiplier('1.5')).toBe(1.5);
    expect(parseScriderLineHeightMultiplier('2')).toBe(2);
  });

  it('parses percentages', () => {
    expect(parseScriderLineHeightMultiplier('150%')).toBe(1.5);
  });

  it('returns undefined for invalid values', () => {
    expect(parseScriderLineHeightMultiplier('')).toBeUndefined();
    expect(parseScriderLineHeightMultiplier('abc')).toBeUndefined();
  });
});

describe('parseScriderMarginAfterEm', () => {
  it('parses em and unitless values', () => {
    expect(parseScriderMarginAfterEm('0.5em')).toBe(0.5);
    expect(parseScriderMarginAfterEm('0.5')).toBe(0.5);
    expect(parseScriderMarginAfterEm('0')).toBe(0);
  });

  it('returns undefined for invalid values', () => {
    expect(parseScriderMarginAfterEm('')).toBeUndefined();
    expect(parseScriderMarginAfterEm('-1em')).toBeUndefined();
    expect(parseScriderMarginAfterEm('abc')).toBeUndefined();
  });
});

describe('parseScriderMarginBeforeEm', () => {
  it('parses em and unitless values', () => {
    expect(parseScriderMarginBeforeEm('0.5em')).toBe(0.5);
    expect(parseScriderMarginBeforeEm('0.5')).toBe(0.5);
    expect(parseScriderMarginBeforeEm('0')).toBe(0);
  });

  it('returns undefined for invalid values', () => {
    expect(parseScriderMarginBeforeEm('')).toBeUndefined();
    expect(parseScriderMarginBeforeEm('-1em')).toBeUndefined();
    expect(parseScriderMarginBeforeEm('abc')).toBeUndefined();
  });
});

describe('deltaToHtml scrider-line-height', () => {
  it('adds line-height from block attr on paragraph', () => {
    const delta = new Delta()
      .insert('Line one')
      .insert('\n', { [SCRIDER_LINE_HEIGHT_KEY]: '2' })
      .insert('Line two')
      .insert('\n');

    const html = deltaToHtml(delta);
    expect(html).toMatch(/<p[^>]*line-height:2/);
    expect(html).toMatch(/mso-line-height-alt:200%/);
  });

  it('block attr overrides documentPresentation lineSpacing', () => {
    const delta = new Delta().insert('Body').insert('\n', { [SCRIDER_LINE_HEIGHT_KEY]: '1.15' });

    const html = deltaToHtml(delta, { documentPresentation: { lineSpacing: 2 } });
    expect(html).toMatch(/line-height:1\.15/);
    expect(html).not.toMatch(/line-height:2/);
  });

  it('falls back to documentPresentation when block attr absent', () => {
    const delta = new Delta().insert('Body').insert('\n');
    const html = deltaToHtml(delta, { documentPresentation: { lineSpacing: 1.5 } });
    expect(html).toMatch(/line-height:1\.5/);
  });

  it('adds line-height on list items from block attr', () => {
    const delta = new Delta()
      .insert('Para')
      .insert('\n')
      .insert('Item')
      .insert('\n', { list: 'bullet', [SCRIDER_LINE_HEIGHT_KEY]: '2' });

    const html = deltaToHtml(delta);
    expect(html).toMatch(/<li[^>]*line-height:2/);
  });

  it('adds line-height on blockquote from block attr', () => {
    const delta = new Delta()
      .insert('Quote')
      .insert('\n', { blockquote: true, [SCRIDER_LINE_HEIGHT_KEY]: '1.5' });

    const html = deltaToHtml(delta);
    expect(html).toMatch(/<blockquote[^>]*line-height:1\.5/);
  });

  it('does not add line-height to headings from documentPresentation', () => {
    const delta = new Delta()
      .insert('Title')
      .insert('\n', { header: 2 })
      .insert('Body')
      .insert('\n');

    const html = deltaToHtml(delta, { documentPresentation: { lineSpacing: 1.5 } });
    expect(html).not.toMatch(/<h2[^>]*line-height/);
    expect(html).toMatch(/<p[^>]*line-height:1\.5/);
  });

  it('does not add line-height to headings from block attr', () => {
    const delta = new Delta().insert('Title').insert('\n', {
      header: 1,
      [SCRIDER_LINE_HEIGHT_KEY]: '2',
    });

    const html = deltaToHtml(delta);
    expect(html).not.toMatch(/<h1[^>]*line-height/);
  });
});

describe('deltaToHtml scrider-margin-after', () => {
  it('adds margin-bottom from block attr on paragraph', () => {
    const delta = new Delta()
      .insert('Line one')
      .insert('\n', { [SCRIDER_MARGIN_AFTER_KEY]: '0.75em' })
      .insert('Line two')
      .insert('\n');

    const html = deltaToHtml(delta);
    expect(html).toMatch(/<p[^>]*margin-bottom:0\.75em/);
    expect(html).toMatch(/margin-top:0/);
  });

  it('block attr overrides documentPresentation paragraphSpacingAfterEm', () => {
    const delta = new Delta().insert('Body').insert('\n', { [SCRIDER_MARGIN_AFTER_KEY]: '1em' });

    const html = deltaToHtml(delta, { documentPresentation: { paragraphSpacingAfterEm: 0.25 } });
    expect(html).toMatch(/margin-bottom:1em/);
    expect(html).not.toMatch(/margin-bottom:0\.25em/);
  });

  it('falls back to documentPresentation when block attr absent', () => {
    const delta = new Delta().insert('Body').insert('\n');
    const html = deltaToHtml(delta, { documentPresentation: { paragraphSpacingAfterEm: 0.5 } });
    expect(html).toMatch(/margin-bottom:0\.5em/);
  });

  it('does not add margin-after on list items or blockquote from documentPresentation', () => {
    const delta = new Delta()
      .insert('Item')
      .insert('\n', { list: 'bullet' })
      .insert('Quote')
      .insert('\n', { blockquote: true });

    const html = deltaToHtml(delta, { documentPresentation: { paragraphSpacingAfterEm: 0.5 } });
    expect(html).not.toMatch(/<li[^>]*margin-bottom/);
    expect(html).not.toMatch(/<blockquote[^>]*margin-bottom/);
  });

  it('does not add margin-after to headings from block attr or documentPresentation', () => {
    const delta = new Delta()
      .insert('Title')
      .insert('\n', { header: 2, [SCRIDER_MARGIN_AFTER_KEY]: '1em' })
      .insert('Body')
      .insert('\n');

    const html = deltaToHtml(delta, { documentPresentation: { paragraphSpacingAfterEm: 0.5 } });
    expect(html).not.toMatch(/<h2[^>]*margin-bottom/);
    expect(html).toMatch(/<p[^>]*margin-bottom:0\.5em/);
  });

  it('combines line-height and margin-after on paragraph', () => {
    const delta = new Delta().insert('Body').insert('\n', {
      [SCRIDER_LINE_HEIGHT_KEY]: '1.5',
      [SCRIDER_MARGIN_AFTER_KEY]: '0.5em',
    });

    const html = deltaToHtml(delta);
    expect(html).toMatch(/line-height:1\.5/);
    expect(html).toMatch(/margin-bottom:0\.5em/);
  });
});

describe('deltaToHtml scrider-margin-before', () => {
  it('adds margin-top from block attr on paragraph', () => {
    const delta = new Delta()
      .insert('Line one')
      .insert('\n', { [SCRIDER_MARGIN_BEFORE_KEY]: '0.75em' })
      .insert('Line two')
      .insert('\n');

    const html = deltaToHtml(delta);
    expect(html).toMatch(/<p[^>]*margin-top:0\.75em/);
    expect(html).not.toMatch(/margin-bottom:/);
  });

  it('block attr overrides documentPresentation paragraphSpacingBeforeEm', () => {
    const delta = new Delta().insert('Body').insert('\n', { [SCRIDER_MARGIN_BEFORE_KEY]: '1em' });

    const html = deltaToHtml(delta, { documentPresentation: { paragraphSpacingBeforeEm: 0.25 } });
    expect(html).toMatch(/margin-top:1em/);
    expect(html).not.toMatch(/margin-top:0\.25em/);
  });

  it('falls back to documentPresentation when block attr absent', () => {
    const delta = new Delta().insert('Body').insert('\n');
    const html = deltaToHtml(delta, { documentPresentation: { paragraphSpacingBeforeEm: 0.5 } });
    expect(html).toMatch(/margin-top:0\.5em/);
  });

  it('does not add margin-before on list items or blockquote from documentPresentation', () => {
    const delta = new Delta()
      .insert('Item')
      .insert('\n', { list: 'bullet' })
      .insert('Quote')
      .insert('\n', { blockquote: true });

    const html = deltaToHtml(delta, { documentPresentation: { paragraphSpacingBeforeEm: 0.5 } });
    expect(html).not.toMatch(/<li[^>]*margin-top/);
    expect(html).not.toMatch(/<blockquote[^>]*margin-top/);
  });

  it('does not add margin-before to headings from block attr or documentPresentation', () => {
    const delta = new Delta()
      .insert('Title')
      .insert('\n', { header: 2, [SCRIDER_MARGIN_BEFORE_KEY]: '1em' })
      .insert('Body')
      .insert('\n');

    const html = deltaToHtml(delta, { documentPresentation: { paragraphSpacingBeforeEm: 0.5 } });
    expect(html).not.toMatch(/<h2[^>]*margin-top/);
    expect(html).toMatch(/<p[^>]*margin-top:0\.5em/);
  });

  it('combines margin-before and margin-after on paragraph', () => {
    const delta = new Delta().insert('Body').insert('\n', {
      [SCRIDER_MARGIN_BEFORE_KEY]: '0.3em',
      [SCRIDER_MARGIN_AFTER_KEY]: '0.5em',
    });

    const html = deltaToHtml(delta);
    expect(html).toMatch(/margin-top:0\.3em/);
    expect(html).toMatch(/margin-bottom:0\.5em/);
    expect(html).not.toMatch(/margin-top:0;/);
  });

  it('combines line-height, margin-before and margin-after on paragraph', () => {
    const delta = new Delta().insert('Body').insert('\n', {
      [SCRIDER_LINE_HEIGHT_KEY]: '1.5',
      [SCRIDER_MARGIN_BEFORE_KEY]: '0.25em',
      [SCRIDER_MARGIN_AFTER_KEY]: '0.5em',
    });

    const html = deltaToHtml(delta);
    expect(html).toMatch(/line-height:1\.5/);
    expect(html).toMatch(/margin-top:0\.25em/);
    expect(html).toMatch(/margin-bottom:0\.5em/);
  });
});
