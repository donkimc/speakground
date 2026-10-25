import { bandForRating, type LevelBand, type Skill, SKILLS } from "./levels";
import { addDays } from "./notebook";

export type SkillBand = {
  skill: Skill;
  band: LevelBand | null;
};

/**
 * Consecutive finished practice days ending today, or yesterday if today
 * is not finished yet. A gap before that ends the streak.
 */
export function practiceStreak(dates: readonly string[], today: string): number {
  const finished = new Set(dates);
  let cursor = finished.has(today) ? today : addDays(today, -1);
  if (!finished.has(cursor)) return 0;
  let count = 0;
  while (finished.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** One row per skill, in a stable order. Missing ratings stay empty. */
export function skillBands(estimates: readonly { skill: string; rating: number }[]): SkillBand[] {
  const ratings = new Map(estimates.map((estimate) => [estimate.skill, estimate.rating]));
  return SKILLS.map((skill) => {
    const rating = ratings.get(skill);
    return { skill, band: rating === undefined ? null : bandForRating(rating) };
  });
}
