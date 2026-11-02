/**
 * Quiz plate — line attributes and the lettered list used only inside it.
 *
 * Delta stays flat text plus lists. The plate is a run of lines that share
 * `quiz-id`. `quiz-role` says which zone the line belongs to. `quiz-view` is
 * the Text / Interactive mode, stored on the plate and restored on reload.
 * Reader answers are not a formatter concern.
 *
 * `list: "alpha"` is a quiz-owned marker (A, B, C, …). It is not hierarchical
 * `ordered` (`1.1.`) and not a document-wide outline scheme.
 */

import type { AttributeMap } from '@scrider/delta';

export const QUIZ_ID_ATTR = 'quiz-id';
export const QUIZ_ROLE_ATTR = 'quiz-role';
export const QUIZ_VIEW_ATTR = 'quiz-view';

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
  return html;
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
