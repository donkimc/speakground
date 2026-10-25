import { and, asc, desc, eq, lte, sql } from "drizzle-orm";

import type { Database } from "./client";
import { notebookEntries } from "./schema";

export async function listNotebook(db: Database, userId: string) {
  return db
    .select()
    .from(notebookEntries)
    .where(eq(notebookEntries.userId, userId))
    .orderBy(asc(notebookEntries.dueOn), asc(notebookEntries.term));
}

export async function listRecentNotebook(db: Database, userId: string, limit: number) {
  return db
    .select()
    .from(notebookEntries)
    .where(eq(notebookEntries.userId, userId))
    .orderBy(desc(notebookEntries.updatedAt), asc(notebookEntries.term))
    .limit(limit);
}

export async function listDueNotebook(db: Database, userId: string, today: string, limit: number) {
  return db
    .select()
    .from(notebookEntries)
    .where(and(eq(notebookEntries.userId, userId), lte(notebookEntries.dueOn, today)))
    .orderBy(asc(notebookEntries.dueOn), asc(notebookEntries.term))
    .limit(limit);
}

export async function upsertNotebookEntries(
  db: Database,
  rows: {
    id: string;
    userId: string;
    term: string;
    termKey: string;
    meaningKo: string;
    example: string;
    intervalDays: number;
    dueOn: string;
  }[],
) {
  if (rows.length === 0) return;
  await db
    .insert(notebookEntries)
    .values(rows)
    .onConflictDoUpdate({
      target: [notebookEntries.userId, notebookEntries.termKey],
      set: {
        meaningKo: sql`excluded.meaning_ko`,
        example: sql`excluded.example`,
        intervalDays: sql`excluded.interval_days`,
        dueOn: sql`excluded.due_on`,
        updatedAt: new Date(),
      },
    });
}

export async function findNotebookEntry(db: Database, userId: string, id: string) {
  const rows = await db
    .select()
    .from(notebookEntries)
    .where(and(eq(notebookEntries.userId, userId), eq(notebookEntries.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function reviewNotebookEntry(
  db: Database,
  input: { userId: string; id: string; intervalDays: number; dueOn: string },
) {
  const rows = await db
    .update(notebookEntries)
    .set({
      intervalDays: input.intervalDays,
      dueOn: input.dueOn,
      updatedAt: new Date(),
    })
    .where(and(eq(notebookEntries.userId, input.userId), eq(notebookEntries.id, input.id)))
    .returning();
  return rows[0] ?? null;
}
