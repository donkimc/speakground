/** How many saved phrases open a practice session. The rest stay on the notebook page. */
export const NOTEBOOK_REVIEW_LIMIT = 5;

const REVIEW_STEPS = [1, 3, 7, 14, 30] as const;

export type NotebookDraft = {
  term: string;
  meaningKo: string;
  example: string;
};

export type ReviewGrade = "again" | "good";

export type ReviewSchedule = {
  intervalDays: number;
  dueOn: string;
};

type MissedQuestion = {
  question: string;
  options: readonly string[];
  answerIndex: number;
  explanation: { ko: string };
};

type WritingCorrection = {
  suggestion: string;
  note: { ko: string };
};

/** Phrases from wrong multiple-choice answers. One entry per term. */
export function entriesFromMisses(
  items: readonly MissedQuestion[],
  correct: readonly boolean[],
): NotebookDraft[] {
  const drafts: NotebookDraft[] = [];
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (correct[index]) return;
    const draft = draftFrom(
      item.options[item.answerIndex] ?? "",
      item.explanation.ko,
      fillBlank(item.question, item.options[item.answerIndex] ?? ""),
    );
    pushDraft(drafts, seen, draft);
  });
  return drafts;
}

/** Phrases from writing corrections. The suggestion is the phrase to remember. */
export function entriesFromCorrections(corrections: readonly WritingCorrection[]): NotebookDraft[] {
  const drafts: NotebookDraft[] = [];
  const seen = new Set<string>();
  for (const correction of corrections) {
    pushDraft(
      drafts,
      seen,
      draftFrom(correction.suggestion, correction.note.ko, correction.suggestion),
    );
  }
  return drafts;
}

export function notebookKey(term: string): string {
  return term.trim().toLowerCase();
}

/** A new phrase is due the next day, not again in the session that created it. */
export function initialReview(today: string): ReviewSchedule {
  return { intervalDays: 1, dueOn: addDays(today, 1) };
}

/** Again means tomorrow. Good moves to the next gap: 1, 3, 7, 14, then 30 days. */
export function scheduleReview(
  intervalDays: number,
  grade: ReviewGrade,
  today: string,
): ReviewSchedule {
  if (grade === "again") return { intervalDays: 1, dueOn: addDays(today, 1) };
  const next = REVIEW_STEPS.find((step) => step > intervalDays) ?? 30;
  return { intervalDays: next, dueOn: addDays(today, next) };
}

function draftFrom(term: string, meaningKo: string, example: string): NotebookDraft | null {
  const cleanTerm = term.trim();
  const cleanMeaning = meaningKo.trim();
  const cleanExample = example.trim();
  if (!cleanTerm || cleanTerm.length > 80) return null;
  if (!cleanMeaning || cleanMeaning.length > 240) return null;
  if (!cleanExample || cleanExample.length > 300) return null;
  return { term: cleanTerm, meaningKo: cleanMeaning, example: cleanExample };
}

function pushDraft(drafts: NotebookDraft[], seen: Set<string>, draft: NotebookDraft | null) {
  if (!draft) return;
  const key = notebookKey(draft.term);
  if (seen.has(key)) return;
  seen.add(key);
  drafts.push(draft);
}

function fillBlank(question: string, answer: string): string {
  if (/_{2,}/.test(question)) return question.replace(/_{2,}/, answer);
  return `${question} ${answer}`.trim();
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}
