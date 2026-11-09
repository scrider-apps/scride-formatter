/**
 * Code block plate: `code-block-width` / `code-block-height` / `code-block-float`
 * on every line of the block. HTML carries them on `<pre>` the way the editor's
 * live DOM does: `data-scrider-cb-width`, `data-scrider-cb-height`, `data-float`.
 */

import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';

import { deltaToHtml, htmlToDelta } from '../../src/conversion/html';
import { sanitizeDelta } from '../../src/conversion/sanitize';
import { createDefaultRegistry } from '../../src/schema';

const BOX = {
  'code-block': 'mermaid',
  'code-block-id': 'cb-1',
  'code-block-width': '480',
  'code-block-height': '320',
  'code-block-float': 'center',
};

function sizedDelta(): Delta {
  return new Delta().insert('graph TD').insert('\n', BOX).insert('A-->B').insert('\n', BOX);
}

describe('code block plate', () => {
  it('sanitizeDelta keeps valid keys and drops invalid ones', () => {
    const sized = new Delta().insert('x').insert('\n', {
      'code-block': 'mermaid',
      'code-block-width': '480',
      'code-block-height': '320',
      'code-block-float': 'center',
    });
    expect(sanitizeDelta(sized, createDefaultRegistry()).ops).toEqual(sized.ops);

    const invalid = new Delta().insert('x').insert('\n', {
      'code-block': true,
      'code-block-width': '-5',
      'code-block-height': 'auto',
      'code-block-float': 'none',
    });
    expect(sanitizeDelta(invalid, createDefaultRegistry()).ops).toEqual([
      { insert: 'x' },
      { insert: '\n', attributes: { 'code-block': true } },
    ]);
  });

  it('deltaToHtml puts them on <pre>', () => {
    expect(deltaToHtml(sizedDelta())).toBe(
      '<pre data-language="mermaid" data-code-block-id="cb-1" data-scrider-cb-width="480" ' +
        'data-scrider-cb-height="320" data-float="center" style="width: 480px; height: 320px">' +
        '<code class="language-mermaid">graph TD\nA--&gt;B\n</code></pre>',
    );
  });

  it('round-trips through HTML', () => {
    const delta = sizedDelta();
    expect(htmlToDelta(deltaToHtml(delta)).ops).toEqual(delta.ops);
  });

  it('a block without them renders and parses as before', () => {
    const delta = new Delta()
      .insert('x')
      .insert('\n', { 'code-block': true, 'code-block-id': 'cb-1' });
    expect(deltaToHtml(delta)).toBe('<pre data-code-block-id="cb-1"><code>x\n</code></pre>');
    expect(htmlToDelta(deltaToHtml(delta)).ops).toEqual(delta.ops);
  });
});
