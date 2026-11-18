/**
 * Quiz plate — line attributes and the lettered list used only inside it.
 *
 * Delta stays flat text plus lists. The plate is a run of lines that share
 * `quiz-id`. `quiz-role` says which zone the line belongs to. `quiz-view` is
 * the Text / Interactive mode, stored on the plate and restored on reload.
 * `quiz-width` and `quiz-float` size the plate (title line). `quiz-pick` is
 * the reader's letter or `skipped` on a question line. `quiz-phase: score`
 * on the title line means the attempt was finished.
 *
 * `list: "alpha"` is a quiz-owned marker (A, B, C, …). It is not hierarchical
 * `ordered` (`1.1.`) and not a document-wide outline scheme.
 */

import type { AttributeMap } from '@scrider/delta';

import { parseBlockBoxFloat, parseBlockBoxLength } from '../schema/formats/block/block-box';
import type { BlockBoxFloat } from '../schema/formats/block/block-box';

export const QUIZ_ID_ATTR = 'quiz-id';
export const QUIZ_ROLE_ATTR = 'quiz-role';
export const QUIZ_VIEW_ATTR = 'quiz-view';
export const QUIZ_WIDTH_ATTR = 'quiz-width';
export const QUIZ_FLOAT_ATTR = 'quiz-float';
export const QUIZ_PICK_ATTR = 'quiz-pick';
export const QUIZ_PHASE_ATTR = 'quiz-phase';

export const QUIZ_ROLES = ['title', 'questions', 'legend', 'key'] as const;
export type QuizRole = (typeof QUIZ_ROLES)[number];

export const QUIZ_VIEWS = ['text', 'interactive'] as const;
export type QuizView = (typeof QUIZ_VIEWS)[number];

export function readQuizId(attrs: AttributeMap | undefined): string | null {
  const id = attrs?.[QUIZ_ID_ATTR];
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function readQuizRole(attrs: AttributeMap | undefined): QuizRole | null {
  const role = attrs?.[QUIZ_ROLE_ATTR];
  return role === 'title' || role === 'questions' || role === 'legend' || role === 'key'
    ? role
    : null;
}

export function readQuizView(attrs: AttributeMap | undefined): QuizView | null {
  const view = attrs?.[QUIZ_VIEW_ATTR];
  return view === 'text' || view === 'interactive' ? view : null;
}

/** CSS px, or null when the value is not a positive length. */
export function readQuizWidth(attrs: AttributeMap | undefined): number | null {
  return parseBlockBoxLength(attrs?.[QUIZ_WIDTH_ATTR]);
}

export function readQuizFloat(attrs: AttributeMap | undefined): BlockBoxFloat | null {
  return parseBlockBoxFloat(attrs?.[QUIZ_FLOAT_ATTR]);
}

/** A letter (`A`, `B`, …) or `skipped`. Anything else is not a pick. */
export function readQuizPick(attrs: AttributeMap | undefined): string | null {
  const pick = attrs?.[QUIZ_PICK_ATTR];
  if (pick === 'skipped') return 'skipped';
  return typeof pick === 'string' && /^[A-Z]+$/.test(pick) ? pick : null;
}

/** Only a finished attempt is stored. Absent means the questions are still open. */
export function readQuizPhase(attrs: AttributeMap | undefined): 'score' | null {
  return attrs?.[QUIZ_PHASE_ATTR] === 'score' ? 'score' : null;
}

/** 1 → A, 26 → Z, 27 → AA. */
export function alphaMarker(index: number): string {
  let n = index;
  let out = '';
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out || 'A';
}

/** HTML data-attributes for one quiz line. Empty when the line is not in a plate. */
export function quizMarkerAttrs(attrs: AttributeMap | undefined): string {
  const id = readQuizId(attrs);
  if (!id) return '';
  const role = readQuizRole(attrs);
  const view = readQuizView(attrs);
  let html = ` data-quiz-id="${escapeAttr(id)}"`;
  if (role) html += ` data-quiz-role="${role}"`;
  if (view) html += ` data-quiz-view="${view}"`;
  const width = readQuizWidth(attrs);
  const float = readQuizFloat(attrs);
  const pick = readQuizPick(attrs);
  const phase = readQuizPhase(attrs);
  if (width != null) html += ` data-quiz-width="${width}"`;
  if (float) html += ` data-quiz-float="${float}"`;
  if (pick) html += ` data-quiz-pick="${escapeAttr(pick)}"`;
  if (phase) html += ` data-quiz-phase="${phase}"`;
  return html;
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
