import { type CurriculumNode, curriculumNodes, type Topic, TOPICS } from "./curriculum";
import { bandForRating, type LevelBand } from "./levels";

/** Grammar and vocabulary questions in one daily practice set. */
export const PRACTICE_QUESTION_COUNT = 8;

/** Cap for the daily writing answer. Matches the placement writing limit. */
export const WRITING_MAX_LENGTH = 2000;

const PRACTICE_TIME_ZONE = "Asia/Seoul";

/** Calendar day for the shared set. Learners in Korea share one set per level. */
export function practiceDate(now: Date, timeZone = PRACTICE_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Rotate the adult topics across the month so consecutive days are not the same. */
export function topicForDate(date: string): Topic {
  const day = Number(date.slice(-2));
  const index = Number.isInteger(day) && day > 0 ? (day - 1) % TOPICS.length : 0;
  return TOPICS[index] ?? "daily-life";
}

/**
 * Level for today's questions. With no placement ratings yet, start at B1,
 * the middle of the meetup group.
 */
export function levelForPractice(ratings: readonly number[]): LevelBand {
  if (ratings.length === 0) return "B1";
  const mean = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return bandForRating(mean);
}

/** Grammar points at the band, plus that day's topic vocabulary. */
export function practiceFocus(level: LevelBand, topic: Topic): CurriculumNode[] {
  return [
    ...curriculumNodes({ level, skill: "grammar" }),
    ...curriculumNodes({ level, skill: "vocabulary", topic }),
  ];
}

export function scorePractice(
  answerKey: readonly number[],
  answers: readonly number[],
): { correct: boolean[]; score: number } | null {
  if (answers.length !== answerKey.length || answerKey.length === 0) return null;
  if (answers.some((answer) => !Number.isInteger(answer) || answer < 0 || answer > 3)) return null;
  const correct = answerKey.map((key, index) => answers[index] === key);
  return { correct, score: correct.filter(Boolean).length };
}

/** Trim a writing answer, or say why it cannot be graded. */
export function acceptWriting(
  text: string,
): { ok: true; text: string } | { ok: false; reason: "empty" | "long" } {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, reason: "empty" };
  if (trimmed.length > WRITING_MAX_LENGTH) return { ok: false, reason: "long" };
  return { ok: true, text: trimmed };
}

/** A blank is spoken as the word "blank" so the question can be read aloud. */
export function spokenQuestion(question: string): string {
  return question.replace(/_{2,}/g, "blank");
}

/** Rubric points 0–5 become the 0–1 credit used by the skill rating. */
export function writingCredit(points: number): number | null {
  if (!Number.isInteger(points) || points < 0 || points > 5) return null;
  return points / 5;
}
