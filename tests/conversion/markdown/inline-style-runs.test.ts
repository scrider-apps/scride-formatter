/**
 * Delta → Markdown: one style wrapper per run of equally styled inline content.
 */

import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';
import { deltaToMarkdown, markdownToDelta } from '../../../src/conversion/markdown';

const font = { font: 'Times New Roman' };

describe('deltaToMarkdown inline style runs', () => {
  it('wraps a run once and keeps marks inside', () => {
    const delta = new Delta()
      .insert('Try ', font)
      .insert('Ctrl+B', { ...font, bold: true })
      .insert(' for bold.', font)
      .insert('\n');
    expect(deltaToMarkdown(delta)).toBe(
      '<span style="font-family: Times New Roman">Try **Ctrl+B** for bold.</span>',
    );
  });

  it('starts a new wrapper where the style changes', () => {
    const delta = new Delta()
      .insert('a', font)
      .insert('b', { font: 'Arial' })
      .insert('c')
      .insert('d', font)
      .insert('\n');
    expect(deltaToMarkdown(delta)).toBe(
      '<span style="font-family: Times New Roman">a</span><span style="font-family: Arial">b</span>c<span style="font-family: Times New Roman">d</span>',
    );
  });

  it('round-trips through markdownToDelta', async () => {
    const delta = new Delta()
      .insert('Try ', { ...font, size: '14pt' })
      .insert('Ctrl+B', { ...font, size: '14pt', bold: true })
      .insert(' now', { ...font, size: '14pt' })
      .insert('\n');
    const back = await markdownToDelta(deltaToMarkdown(delta));
    expect(back.ops).toEqual(delta.ops);
  });

  it('takes a custom wrapper', () => {
    const delta = new Delta().insert('a ', font).insert('b', { ...font, italic: true }).insert('\n');
    const md = deltaToMarkdown(delta, {
      inlineStyleWrapper: (content, style) => `[${content}]{font="${style.font}"}`,
    });
    expect(md).toBe('[a _b_]{font="Times New Roman"}');
  });

  it('a nested call keeps its own wrapper', () => {
    const inner = new Delta().insert('x', font).insert('\n');
    const md = deltaToMarkdown(new Delta().insert('y', font).insert('\n'), {
      inlineStyleWrapper: (content) => `[${content}]`,
      embedRenderers: {},
    });
    expect(md).toBe('[y]');
    expect(deltaToMarkdown(inner)).toBe('<span style="font-family: Times New Roman">x</span>');
  });
});
