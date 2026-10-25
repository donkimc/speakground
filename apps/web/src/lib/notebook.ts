import {
  initialReview,
  NOTEBOOK_REVIEW_LIMIT,
  type NotebookDraft,
  notebookKey,
  practiceDate,
  scheduleReview,
} from "@fluentloop/core";
import {
  findNotebookEntry,
  listDueNotebook,
  listNotebook,
  reviewNotebookEntry,
  upsertNotebookEntries,
} from "@fluentloop/db";

import { getDb } from "./db";

export type NotebookCard = {
  id: string;
  term: string;
  meaningKo: string;
  example: string;
  due: boolean;
};

/** Saved phrases should not block practice if the notebook table is not ready. */
export async function rememberMisses(userId: string, drafts: readonly NotebookDraft[]) {
  if (drafts.length === 0) return;
  try {
    const today = practiceDate(new Date());
    const schedule = initialReview(today);
    await upsertNotebookEntries(
      getDb(),
      drafts.map((draft) => ({
        id: crypto.randomUUID(),
        userId,
        term: draft.term,
        termKey: notebookKey(draft.term),
        meaningKo: draft.meaningKo,
        example: draft.example,
        intervalDays: schedule.intervalDays,
        dueOn: schedule.dueOn,
      })),
    );
  } catch (error) {
    console.error("[notebook]", error instanceof Error ? error.message : error);
  }
}

export async function loadNotebook(userId: string): Promise<NotebookCard[]> {
  const today = practiceDate(new Date());
  const rows = await listNotebook(getDb(), userId);
  return rows.map((row) => ({
    id: row.id,
    term: row.term,
    meaningKo: row.meaningKo,
    example: row.example,
    due: row.dueOn <= today,
  }));
}

export async function loadDueCards(userId: string): Promise<NotebookCard[]> {
  try {
    const today = practiceDate(new Date());
    const rows = await listDueNotebook(getDb(), userId, today, NOTEBOOK_REVIEW_LIMIT);
    return rows.map((row) => ({
      id: row.id,
      term: row.term,
      meaningKo: row.meaningKo,
      example: row.example,
      due: true,
    }));
  } catch (error) {
    console.error("[notebook]", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function gradeNotebook(
  userId: string,
  id: string,
  grade: "again" | "good",
): Promise<boolean> {
  const db = getDb();
  const current = await findNotebookEntry(db, userId, id);
  if (!current) return false;
  const next = scheduleReview(current.intervalDays, grade, practiceDate(new Date()));
  const updated = await reviewNotebookEntry(db, {
    userId,
    id,
    intervalDays: next.intervalDays,
    dueOn: next.dueOn,
  });
  return updated !== null;
}
