import { and, eq, isNotNull, isNull } from "drizzle-orm";

import type { Database } from "./client";
import { dailySets, practiceResponses, skillEstimates } from "./schema";

export async function listCompletedPracticeDates(db: Database, userId: string): Promise<string[]> {
  const rows = await db
    .select({ practiceDate: dailySets.practiceDate })
    .from(practiceResponses)
    .innerJoin(dailySets, eq(practiceResponses.dailySetId, dailySets.id))
    .where(and(eq(practiceResponses.userId, userId), isNotNull(practiceResponses.writing)));
  return rows.map((row) => row.practiceDate);
}

export async function listSkillEstimates(db: Database, userId: string) {
  return db
    .select({ skill: skillEstimates.skill, rating: skillEstimates.rating })
    .from(skillEstimates)
    .where(eq(skillEstimates.userId, userId));
}

export async function listSkillRatings(db: Database, userId: string): Promise<number[]> {
  const rows = await db
    .select({ rating: skillEstimates.rating })
    .from(skillEstimates)
    .where(eq(skillEstimates.userId, userId));
  return rows.map((row) => row.rating);
}

export async function findDailySet(db: Database, level: string, practiceDate: string) {
  const rows = await db
    .select()
    .from(dailySets)
    .where(and(eq(dailySets.level, level), eq(dailySets.practiceDate, practiceDate)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertDailySet(
  db: Database,
  input: {
    id: string;
    level: string;
    topic: string;
    practiceDate: string;
    items: unknown;
    writing: unknown;
    promptId: string;
    model: string;
  },
) {
  await db
    .insert(dailySets)
    .values({
      id: input.id,
      level: input.level,
      topic: input.topic,
      practiceDate: input.practiceDate,
      items: input.items,
      writing: input.writing,
      promptId: input.promptId,
      model: input.model,
    })
    .onConflictDoNothing({ target: [dailySets.level, dailySets.practiceDate] });
}

export async function findPracticeResponse(db: Database, userId: string, dailySetId: string) {
  const rows = await db
    .select()
    .from(practiceResponses)
    .where(and(eq(practiceResponses.userId, userId), eq(practiceResponses.dailySetId, dailySetId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertPracticeResponse(
  db: Database,
  input: { userId: string; dailySetId: string; answers: unknown; score: number },
) {
  await db
    .insert(practiceResponses)
    .values({
      userId: input.userId,
      dailySetId: input.dailySetId,
      answers: input.answers,
      score: input.score,
    })
    .onConflictDoNothing();
}

export async function findSkillEstimate(db: Database, userId: string, skill: string) {
  const rows = await db
    .select()
    .from(skillEstimates)
    .where(and(eq(skillEstimates.userId, userId), eq(skillEstimates.skill, skill)))
    .limit(1);
  return rows[0] ?? null;
}

/** Stores the writing review once. A second submit does not overwrite it. */
export async function savePracticeWriting(
  db: Database,
  input: { userId: string; dailySetId: string; writing: string; feedback: unknown },
): Promise<boolean> {
  const rows = await db
    .update(practiceResponses)
    .set({ writing: input.writing, writingFeedback: input.feedback })
    .where(
      and(
        eq(practiceResponses.userId, input.userId),
        eq(practiceResponses.dailySetId, input.dailySetId),
        isNull(practiceResponses.writing),
      ),
    )
    .returning({ userId: practiceResponses.userId });
  return rows.length > 0;
}
