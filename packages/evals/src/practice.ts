import type { Item, WritingFeedback } from "@fluentloop/ai";
import { PRACTICE_QUESTION_COUNT } from "@fluentloop/core";

import { checkBannedTerms, checkKorean, checkMcqStructure } from "./checks";

const HANGUL = /[가-힣]/;
const BANNED = /\b(IELTS|TOEIC|TOEFL|OPIc)\b/i;

export type PracticeWritingTask = { prompt: string; promptKo: string };

/** Reasons a generated practice set must not be shown. Empty means it can be stored. */
export function practiceSetProblems(
  level: string,
  items: readonly Item[],
  writing: PracticeWritingTask,
): string[] {
  const problems: string[] = [];
  if (items.length !== PRACTICE_QUESTION_COUNT) {
    problems.push(`expected ${PRACTICE_QUESTION_COUNT} items, got ${items.length}`);
  }
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (item.type !== "mcq") {
      problems.push(`item ${index} is not a multiple-choice question`);
      return;
    }
    if (item.level !== level) problems.push(`item ${index} is ${item.level}, not ${level}`);
    const expectedSkill = index % 2 === 0 ? "grammar" : "vocabulary";
    if (item.skill !== expectedSkill) {
      problems.push(`item ${index} skill is ${item.skill}, expected ${expectedSkill}`);
    }
    if (!/_{2,}/.test(item.question)) {
      problems.push(`item ${index}: question needs a blank`);
    }
    const structure = checkMcqStructure(item);
    if (structure && !structure.passed) problems.push(`item ${index}: ${structure.detail}`);
    const korean = checkKorean(item);
    if (!korean.passed) problems.push(`item ${index}: ${korean.detail}`);
    const banned = checkBannedTerms(item);
    if (!banned.passed) problems.push(`item ${index}: ${banned.detail}`);
    const question = item.question.trim().toLowerCase();
    if (seen.has(question)) problems.push(`item ${index}: duplicate question`);
    seen.add(question);
  });
  if (writing.prompt.trim().length < 20) problems.push("writing prompt is too short");
  if (HANGUL.test(writing.prompt)) problems.push("writing prompt should be English");
  if (!HANGUL.test(writing.promptKo)) problems.push("writing prompt Korean needs Hangul");
  if (BANNED.test(`${writing.prompt}\n${writing.promptKo}`)) {
    problems.push("writing prompt contains a banned term");
  }
  return problems;
}

/** Reasons a writing review must not be shown. */
export function writingFeedbackProblems(feedback: WritingFeedback): string[] {
  const problems: string[] = [];
  if (!HANGUL.test(feedback.summary.ko)) problems.push("summary Korean needs Hangul");
  feedback.corrections.forEach((correction, index) => {
    if (!HANGUL.test(correction.note.ko)) {
      problems.push(`correction ${index} Korean needs Hangul`);
    }
  });
  const english = [
    feedback.better,
    feedback.summary.en,
    ...feedback.corrections.map((c) => c.note.en),
  ];
  if (english.some((text) => BANNED.test(text))) problems.push("feedback contains a banned term");
  return problems;
}
