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

const QUIZ_ROLES = ['title', 'description', 'questions', 'legend', 'key'] as const;

/**
 * Which zone of the plate a line belongs to.
 * `description` is the intro under the title.
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
 * Where the attempt is. Absent = Start has not been pressed.
 * `progress` = the attempt is open, `score` = the score screen was reached.
 * Lives on the title line.
 *
 * Delta: { insert: "\n", attributes: { "quiz-role": "title", "quiz-phase": "progress" } }
 */
export const quizPhaseFormat: Format<string> = {
  name: 'quiz-phase',
  scope: 'block',

  validate(value: string): boolean {
    return value === 'progress' || value === 'score';
  },
};

/**
 * Whole seconds. `min` is 0 for the elapsed time and 1 for a limit:
 * a limit of 0 means "no limit" and is not stored.
 */
export function parseQuizSeconds(value: unknown, min: number): number | null {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : NaN;
  return Number.isInteger(n) && n >= min ? n : null;
}

/**
 * Time limit of the attempt, whole seconds. Absent = no limit.
 * Lives on the title line. `00:00` is not stored.
 *
 * Delta: { insert: "\n", attributes: { "quiz-role": "title", "quiz-limit": "300" } }
 */
export const quizLimitFormat: Format<string | number> = {
  name: 'quiz-limit',
  scope: 'block',

  validate(value: string | number): boolean {
    return parseQuizSeconds(value, 1) != null;
  },
};

/**
 * Seconds from Start to the score screen. Absent before Start.
 * Lives on the title line. Reset removes it with the phase.
 *
 * Delta: { insert: "\n", attributes: { "quiz-role": "title", "quiz-time": "83" } }
 */
export const quizTimeFormat: Format<string | number> = {
  name: 'quiz-time',
  scope: 'block',

  validate(value: string | number): boolean {
    return parseQuizSeconds(value, 0) != null;
  },
};
