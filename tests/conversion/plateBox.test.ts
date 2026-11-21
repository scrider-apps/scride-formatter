/**
 * Dialog and Voice plate size: the schema keeps the box, HTML carries it.
 * The rest of those plates stays outside the schema.
 */

import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';

import { deltaToHtml, htmlToDelta } from '../../src/conversion/html';
import { sanitizeDelta } from '../../src/conversion/sanitize';
import { createDefaultRegistry } from '../../src/schema';

describe('dialog and voice plate box', () => {
  it('keeps a positive length and a float, and drops anything else', () => {
    const dialog = new Delta().insert('Title\n', {
      'dialog-width': '280',
      'dialog-float': 'right',
    });
    const voice = new Delta().insert('Title\n', { 'voice-width': 320, 'voice-float': 'left' });

    expect(sanitizeDelta(dialog, createDefaultRegistry()).ops).toEqual(dialog.ops);
    expect(sanitizeDelta(voice, createDefaultRegistry()).ops).toEqual(voice.ops);

    const invalid = new Delta()
      .insert('Dialog\n', { 'dialog-width': '0', 'dialog-float': 'none' })
      .insert('Voice\n', { 'voice-width': 'wide', 'voice-float': 'top' });
    expect(sanitizeDelta(invalid, createDefaultRegistry()).ops).toEqual([
      { insert: 'Dialog\nVoice\n' },
    ]);
  });

  it('round-trips the box through HTML and leaves the cue line alone', () => {
    const delta = new Delta()
      .insert('Dialog\n', { 'dialog-width': '280', 'dialog-float': 'right' })
      .insert('Cue\n')
      .insert('Voice\n', { 'voice-width': '320', 'voice-float': 'left' });

    const html = deltaToHtml(delta);
    expect(html).toContain('data-dialog-width="280"');
    expect(html).toContain('data-dialog-float="right"');
    expect(html).toContain('style="width: 280px"');
    expect(html).toContain('data-voice-width="320"');
    expect(html).toContain('data-voice-float="left"');
    expect(html).not.toContain('data-dialog-width="280" data-voice');

    expect(deltaToHtml(htmlToDelta(html))).toBe(html);
  });

  it('reads the box from the title line and not from a wrapper around it', () => {
    const wrapped = htmlToDelta(
      '<div data-dialog-width="280"><p data-dialog-width="280" data-dialog-float="right">Title</p><p>Cue</p></div>',
    );
    expect(wrapped.ops).toEqual([
      { insert: 'Title' },
      { insert: '\n', attributes: { 'dialog-width': '280', 'dialog-float': 'right' } },
      { insert: 'Cue\n\n' },
    ]);

    const bare = htmlToDelta('<div data-dialog-width="280"><p>Title</p><p>Cue</p></div>');
    expect(bare.ops).toEqual([{ insert: 'Title\nCue\n\n' }]);
  });
});
