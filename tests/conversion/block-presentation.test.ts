import { describe, it, expect } from 'vitest';

import { Delta } from '@scrider/delta';

import {
  parseScriderLineHeightMultiplier,
  SCRIDER_LINE_HEIGHT_KEY,
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
