import type { Format } from '../../Format';
import { isBlockBoxFloat, isBlockBoxLength } from './block-box';

/**
 * Id of a quiz plate. Every line of the plate carries the same id.
 *
 * Delta: { insert: "\n", attributes: { "quiz-id": "q1", "quiz-role": "title" } }
 */
export const quizIdFormat: Format<string> = {
  name: 'quiz-id',
  scope: 'block',

  validate(value: string): boolean {
    return typeof value === 'string' && value.length > 0;
  },
};

const QUIZ_ROLES = ['title', 'questions', 'legend', 'key'] as const;

/**
 * Which zone of the plate a line belongs to.
 *
 * Delta: { insert: "\n", attributes: { "quiz-id": "q1", "quiz-role": "questions" } }
 */
export const quizRoleFormat: Format<string> = {
  name: 'quiz-role',
  scope: 'block',

  validate(value: string): boolean {
    return (QUIZ_ROLES as readonly string[]).includes(value);
  },
};

/**
 * Text / Interactive mode, stored on the plate and restored on reload.
 *
 * Delta: { insert: "\n", attributes: { "quiz-id": "q1", "quiz-view": "interactive" } }
 */
export const quizViewFormat: Format<string> = {
  name: 'quiz-view',
  scope: 'block',

  validate(value: string): boolean {
    return value === 'text' || value === 'interactive';
  },
};

/**
 * Width of the plate, CSS px. Absent = full column. Lives on the title line.
 *
 * Delta: { insert: "\n", attributes: { "quiz-role": "title", "quiz-width": "320" } }
 */
export const quizWidthFormat: Format<string | number> = {
  name: 'quiz-width',
  scope: 'block',

  validate(value: string | number): boolean {
    return isBlockBoxLength(value);
  },
};

/**
 * Position of the plate: `left` / `center` / `right`. Absent = in the line.
 * Lives on the title line.
 *
 * Delta: { insert: "\n", attributes: { "quiz-role": "title", "quiz-float": "left" } }
 */
export const quizFloatFormat: Format<string> = {
  name: 'quiz-float',
  scope: 'block',

  validate(value: string): boolean {
    return isBlockBoxFloat(value);
  },
};

/**
 * The reader's pick on a question line: a letter (`A`, `B`, …) or `skipped`.
 * Absent = not answered. The verdict is not stored; the key still decides it.
 *
 * Delta: { insert: "\n", attributes: { "quiz-role": "questions", "quiz-pick": "B" } }
 */
export const quizPickFormat: Format<string> = {
  name: 'quiz-pick',
  scope: 'block',

  validate(value: string): boolean {
    return value === 'skipped' || /^[A-Z]+$/.test(value);
  },
};

/**
 * The plate was finished. Absent = still on the questions.
 * Lives on the title line. Only `score` is stored.
 *
 * Delta: { insert: "\n", attributes: { "quiz-role": "title", "quiz-phase": "score" } }
 */
export const quizPhaseFormat: Format<string> = {
  name: 'quiz-phase',
  scope: 'block',

  validate(value: string): boolean {
    return value === 'score';
  },
};
