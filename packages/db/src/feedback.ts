import { and, eq } from "drizzle-orm";

import type { Database } from "./client";
import { itemFeedback } from "./schema";

export async function listItemFeedback(db: Database, userId: string, dailySetId: string) {
  return db
    .select()
    .from(itemFeedback)
    .where(and(eq(itemFeedback.userId, userId), eq(itemFeedback.dailySetId, dailySetId)));
}

/** Stores one flag per question. A later choice replaces the earlier one. */
export async function saveItemFeedback(
  db: Database,
  input: { userId: string; dailySetId: string; itemIndex: number; kind: string },
) {
  await db
    .insert(itemFeedback)
    .values({
      userId: input.userId,
      dailySetId: input.dailySetId,
      itemIndex: input.itemIndex,
      kind: input.kind,
    })
    .onConflictDoUpdate({
      target: [itemFeedback.userId, itemFeedback.dailySetId, itemFeedback.itemIndex],
      set: { kind: input.kind, createdAt: new Date() },
    });
}
