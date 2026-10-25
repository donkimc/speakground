import { practiceDate, practiceStreak, skillBands } from "@fluentloop/core";
import { listCompletedPracticeDates, listRecentNotebook, listSkillEstimates } from "@fluentloop/db";

import { getDb } from "./db";

export type ProgressView = {
  streak: number;
  practicedToday: boolean;
  skills: ReturnType<typeof skillBands>;
  mistakes: { term: string; example: string }[];
};

export async function loadProgress(userId: string): Promise<ProgressView> {
  const db = getDb();
  const today = practiceDate(new Date());
  let dates: string[] = [];
  let skills: ProgressView["skills"] = skillBands([]);
  let mistakes: ProgressView["mistakes"] = [];
  try {
    dates = await listCompletedPracticeDates(db, userId);
    skills = skillBands(await listSkillEstimates(db, userId));
  } catch (error) {
    console.error("[progress]", error instanceof Error ? error.message : error);
  }
  try {
    const rows = await listRecentNotebook(db, userId, 5);
    mistakes = rows.map((row) => ({ term: row.term, example: row.example }));
  } catch (error) {
    console.error("[progress]", error instanceof Error ? error.message : error);
  }
  return {
    streak: practiceStreak(dates, today),
    practicedToday: dates.includes(today),
    skills,
    mistakes,
  };
}
