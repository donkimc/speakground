import { PRACTICE_QUESTION_COUNT } from "./practice";

export const FEEDBACK_KINDS = ["wrong", "too-hard", "too-easy"] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

/** A question index the learner can flag. Null when it is outside today's set. */
export function feedbackItemIndex(index: number): number | null {
  if (!Number.isInteger(index) || index < 0 || index >= PRACTICE_QUESTION_COUNT) return null;
  return index;
}

export function feedbackKind(value: string): FeedbackKind | null {
  return FEEDBACK_KINDS.find((kind) => kind === value) ?? null;
}
