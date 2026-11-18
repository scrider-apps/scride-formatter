/**
 * Quiz plate attributes: the schema keeps them, HTML carries the box and the attempt.
 */

import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';

import { deltaToHtml, htmlToDelta } from '../../src/conversion/html';
import { sanitizeDelta } from '../../src/conversion/sanitize';
import { createDefaultRegistry } from '../../src/schema';

const zone = { 'quiz-id': 'q1', 'quiz-view': 'interactive' as const };

describe('quiz plate attributes', () => {
  it('keeps the box and the attempt, and drops values the plate does not use', () => {
    const delta = new Delta()
      .insert('Title\n', {
        ...zone,
        'quiz-role': 'title',
        'quiz-width': '320',
        'quiz-float': 'left',
        'quiz-phase': 'score',
        'quiz-limit': '300',
        'quiz-time': '83',
      })
      .insert('Prompt\n', { ...zone, 'quiz-role': 'questions', list: 'ordered', 'quiz-pick': 'B' });

    expect(sanitizeDelta(delta, createDefaultRegistry()).ops).toEqual(delta.ops);

    const progress = new Delta().insert('Title\n', {
      ...zone,
      'quiz-role': 'title',
      'quiz-phase': 'progress',
      'quiz-time': 0,
    });
    expect(sanitizeDelta(progress, createDefaultRegistry()).ops).toEqual(progress.ops);

    const invalid = new Delta().insert('Title\n', {
      ...zone,
      'quiz-role': 'title',
      'quiz-width': 'wide',
      'quiz-float': 'none',
      'quiz-pick': 'b',
      'quiz-phase': 'play',
      'quiz-limit': '0',
      'quiz-time': '5:00',
    });
    expect(sanitizeDelta(invalid, createDefaultRegistry()).ops).toEqual([
      { insert: 'Title\n', attributes: { ...zone, 'quiz-role': 'title' } },
    ]);
  });

  it('round-trips the box and the attempt through HTML', () => {
    const delta = new Delta()
      .insert('Title\n', {
        ...zone,
        'quiz-role': 'title',
        'quiz-width': '320',
        'quiz-float': 'left',
        'quiz-phase': 'progress',
        'quiz-limit': '300',
        'quiz-time': '83',
      })
      .insert('Prompt\n', {
        ...zone,
        'quiz-role': 'questions',
        list: 'ordered',
        'quiz-pick': 'skipped',
      });

    const html = deltaToHtml(delta, { hierarchicalNumbers: true });
    expect(html).toContain('data-quiz-width="320"');
    expect(html).toContain('style="width: 320px"');
    expect(html).toContain('data-quiz-float="left"');
    expect(html).toContain('data-quiz-phase="progress"');
    expect(html).toContain('data-quiz-limit="300"');
    expect(html).toContain('data-quiz-time="83"');
    expect(html).toContain('data-quiz-pick="skipped"');
    expect(deltaToHtml(htmlToDelta(html), { hierarchicalNumbers: true })).toBe(html);
  });
});
