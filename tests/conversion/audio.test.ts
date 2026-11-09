/**
 * Audio embed: `{ audio: src }`. HTML `<audio src controls>`, Markdown `![Audio](src)`.
 */

import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';

import { deltaToHtml, htmlToDelta } from '../../src/conversion/html';
import { deltaToMarkdown, isRemarkAvailable, markdownToDelta } from '../../src/conversion/markdown';
import { sanitizeDelta } from '../../src/conversion/sanitize';
import { audioFormat, createDefaultRegistry } from '../../src/schema';

const SRC = '/api/media/7c1e0000-0000-4000-8000-000000000000';

function audioDelta(src = SRC): Delta {
  return new Delta().insert({ audio: src }).insert('\n');
}

describe('audioFormat', () => {
  it('takes relative paths and http(s) URLs only', () => {
    expect(audioFormat.validate!(SRC)).toBe(true);
    expect(audioFormat.validate!('https://example.com/a.mp3')).toBe(true);
    expect(audioFormat.validate!('javascript:alert(1)')).toBe(false);
    expect(audioFormat.validate!('')).toBe(false);
  });

  it('is in the default registry: sanitizeDelta keeps it', () => {
    expect(sanitizeDelta(audioDelta(), createDefaultRegistry()).ops).toEqual(audioDelta().ops);
  });
});

describe('audio HTML', () => {
  it('renders <audio controls> with and without a registry', () => {
    const html = `<p><audio src="${SRC}" controls></audio></p>`;
    expect(deltaToHtml(audioDelta())).toBe(html);
    expect(deltaToHtml(audioDelta(), { registry: createDefaultRegistry() })).toBe(html);
  });

  it('escapes the src', () => {
    expect(deltaToHtml(audioDelta('/a"b.mp3'))).toContain('src="/a&quot;b.mp3"');
  });

  it('round-trips with and without a registry', () => {
    const html = deltaToHtml(audioDelta());
    expect(htmlToDelta(html).ops).toEqual(audioDelta().ops);
    expect(htmlToDelta(html, { registry: createDefaultRegistry() }).ops).toEqual(audioDelta().ops);
  });

  it('reads <source> when <audio> has no src', () => {
    const html = '<p><audio controls><source src="/a.ogg" type="audio/ogg"></audio></p>';
    expect(htmlToDelta(html).ops).toEqual(audioDelta('/a.ogg').ops);
    expect(htmlToDelta(html, { registry: createDefaultRegistry() }).ops).toEqual(
      audioDelta('/a.ogg').ops,
    );
  });

  it('drops <audio> without any src', () => {
    expect(htmlToDelta('<p>a<audio controls></audio></p>').ops).toEqual([{ insert: 'a\n' }]);
  });
});

describe('audio Markdown', () => {
  it('renders ![Audio](src)', () => {
    expect(deltaToMarkdown(audioDelta())).toContain(`![Audio](${SRC})`);
  });

  it.runIf(isRemarkAvailable())('round-trips', async () => {
    const md = deltaToMarkdown(audioDelta());
    expect((await markdownToDelta(md)).ops).toEqual(audioDelta().ops);
  });
});
