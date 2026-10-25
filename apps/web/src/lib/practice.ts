import {
  type GeneratedPracticeSet,
  PRACTICE_SET_PROMPT_ID,
  practiceSetInput,
  practiceSetSchema,
  practiceSetSystemPrompt,
  practiceWritingSchema,
  WRITING_FEEDBACK_PROMPT_ID,
  type WritingFeedback,
  writingFeedbackInput,
  writingFeedbackSchema,
  writingFeedbackSystemPrompt,
} from "@fluentloop/ai";
import {
  acceptWriting,
  entriesFromCorrections,
  entriesFromMisses,
  feedbackItemIndex,
  feedbackKind,
  levelForPractice,
  PRACTICE_QUESTION_COUNT,
  practiceDate,
  practiceFocus,
  ratingForBand,
  scorePractice,
  topicForDate,
  updateRating,
  writingCredit,
} from "@fluentloop/core";
import {
  findDailySet,
  findPracticeResponse,
  findSkillEstimate,
  insertDailySet,
  insertPracticeResponse,
  listItemFeedback,
  listSkillRatings,
  saveItemFeedback,
  savePracticeWriting,
  upsertSkillEstimate,
} from "@fluentloop/db";
import { practiceSetProblems, writingFeedbackProblems } from "@fluentloop/evals";
import { z } from "zod";

import { getDb } from "./db";
import { getGroq } from "./groq";
import { loadDueCards, rememberMisses } from "./notebook";
import type { ItemFlag, PracticeView } from "./practice-view";

export const practiceAnswerSchema = z.object({
  answers: z.array(z.number().int().min(0).max(3)).length(PRACTICE_QUESTION_COUNT),
});

const LEARNER_ERRORS = new Set([
  "Practice questions are not available yet.",
  "Could not prepare today's questions. Try again.",
  "Today's questions are not ready yet.",
  "Choose an answer for every question.",
  "Finish the questions before writing.",
  "Write a short answer before continuing.",
  "Keep the answer under 2000 characters.",
  "Could not review today's writing. Try again.",
  "Choose a question flag.",
]);

const WRITING_MESSAGES = {
  empty: "Write a short answer before continuing.",
  long: "Keep the answer under 2000 characters.",
} as const;

/** Learner-facing copy only. Database and model errors stay in the server log. */
export function practiceErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  return LEARNER_ERRORS.has(message) ? message : fallback;
}

function reviewFrom(
  cards: { id: string; term: string; meaningKo: string; example: string }[],
): PracticeView {
  return {
    status: "review",
    level: "B1",
    topic: "",
    showKorean: true,
    cards,
  };
}

function questionsFrom(items: GeneratedPracticeSet["items"], flags: ItemFlag[]): PracticeView {
  return {
    status: "questions",
    level: items[0]?.level ?? "B1",
    topic: "",
    showKorean: true,
    questions: items.map((item) => ({
      skill: item.skill,
      question: item.question,
      options: item.options,
    })),
    flags,
  };
}

function writingTaskFrom(
  score: number,
  total: number,
  task: GeneratedPracticeSet["writing"],
): PracticeView {
  return {
    status: "writing",
    level: "B1",
    topic: "",
    showKorean: true,
    score,
    total,
    prompt: task.prompt,
    promptKo: task.promptKo,
  };
}

function doneFrom(
  items: GeneratedPracticeSet["items"],
  answers: number[],
  score: number,
  task: GeneratedPracticeSet["writing"],
  text: string,
  feedback: WritingFeedback,
  flags: ItemFlag[],
): PracticeView {
  return {
    status: "done",
    level: items[0]?.level ?? "B1",
    topic: "",
    showKorean: true,
    score,
    total: items.length,
    review: items.map((item, index) => ({
      skill: item.skill,
      question: item.question,
      options: item.options,
      chosen: answers[index] ?? -1,
      answerIndex: item.answerIndex,
      correct: answers[index] === item.answerIndex,
      explanation: item.explanation,
    })),
    writing: {
      prompt: task.prompt,
      promptKo: task.promptKo,
      text,
      feedback,
    },
    flags,
  };
}

async function flagsFor(userId: string, dailySetId: string): Promise<ItemFlag[]> {
  try {
    const rows = await listItemFeedback(getDb(), userId, dailySetId);
    return rows.flatMap((row) => {
      const kind = feedbackKind(row.kind);
      return kind ? [{ itemIndex: row.itemIndex, kind }] : [];
    });
  } catch (error) {
    console.error("[practice]", error instanceof Error ? error.message : error);
    return [];
  }
}

function withMeta(
  view: PracticeView,
  level: string,
  topic: string,
  showKorean: boolean,
): PracticeView {
  return { ...view, level, topic, showKorean };
}

function readItems(value: unknown): GeneratedPracticeSet["items"] {
  return practiceSetSchema.shape.items.parse(value);
}

function readWriting(value: unknown): GeneratedPracticeSet["writing"] {
  return practiceWritingSchema.parse(value);
}

function readFeedback(value: unknown): WritingFeedback {
  return writingFeedbackSchema.parse(value);
}

async function generateItems(
  level: ReturnType<typeof levelForPractice>,
  topic: ReturnType<typeof topicForDate>,
) {
  const provider = getGroq();
  if (!provider) throw new Error("Practice questions are not available yet.");
  const focus = practiceFocus(level, topic);
  let lastProblems: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let result;
    try {
      result = await provider.generateStructured({
        tier: "strong",
        promptId: PRACTICE_SET_PROMPT_ID,
        system: practiceSetSystemPrompt(),
        input: practiceSetInput(level, topic, focus),
        schema: practiceSetSchema,
        reasoningEffort: "low",
        temperature: attempt === 0 ? 0.4 : 0.8,
      });
    } catch (error) {
      lastProblems = [error instanceof Error ? error.message : "generation failed"];
      continue;
    }
    const problems = practiceSetProblems(level, result.data.items, result.data.writing);
    console.info(
      JSON.stringify({
        job: "practice-set",
        level,
        topic,
        attempt,
        model: result.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        problems: problems.length,
      }),
    );
    if (problems.length === 0) {
      return { items: result.data.items, writing: result.data.writing, model: result.model };
    }
    lastProblems = problems;
  }
  console.error(JSON.stringify({ job: "practice-set", level, topic, problems: lastProblems }));
  throw new Error("Could not prepare today's questions. Try again.");
}

export async function loadPractice(userId: string, showKorean: boolean): Promise<PracticeView> {
  const db = getDb();
  const now = new Date();
  const date = practiceDate(now);
  const topic = topicForDate(date);
  const level = levelForPractice(await listSkillRatings(db, userId));
  let row = await findDailySet(db, level, date);
  if (!row) {
    const generated = await generateItems(level, topic);
    await insertDailySet(db, {
      id: crypto.randomUUID(),
      level,
      topic,
      practiceDate: date,
      items: generated.items,
      writing: generated.writing,
      promptId: PRACTICE_SET_PROMPT_ID,
      model: generated.model,
    });
    row = await findDailySet(db, level, date);
  }
  if (!row) throw new Error("Could not prepare today's questions. Try again.");
  const items = readItems(row.items);
  const task = readWriting(row.writing);
  const flags = await flagsFor(userId, row.id);
  const saved = await findPracticeResponse(db, userId, row.id);
  if (!saved) {
    const cards = await loadDueCards(userId);
    if (cards.length > 0) return withMeta(reviewFrom(cards), level, topic, showKorean);
    return withMeta(questionsFrom(items, flags), level, topic, showKorean);
  }
  const answers = z.array(z.number()).parse(saved.answers);
  if (!saved.writing || saved.writingFeedback == null) {
    return withMeta(writingTaskFrom(saved.score, items.length, task), level, topic, showKorean);
  }
  return withMeta(
    doneFrom(
      items,
      answers,
      saved.score,
      task,
      saved.writing,
      readFeedback(saved.writingFeedback),
      flags,
    ),
    level,
    topic,
    showKorean,
  );
}

export async function submitPractice(
  userId: string,
  showKorean: boolean,
  answers: number[],
): Promise<PracticeView> {
  const db = getDb();
  const date = practiceDate(new Date());
  const topic = topicForDate(date);
  const level = levelForPractice(await listSkillRatings(db, userId));
  const row = await findDailySet(db, level, date);
  if (!row) throw new Error("Today's questions are not ready yet.");
  const items = readItems(row.items);
  const task = readWriting(row.writing);
  const flags = await flagsFor(userId, row.id);
  const existing = await findPracticeResponse(db, userId, row.id);
  if (existing) {
    const previous = z.array(z.number()).parse(existing.answers);
    if (!existing.writing || existing.writingFeedback == null) {
      return withMeta(
        writingTaskFrom(existing.score, items.length, task),
        level,
        topic,
        showKorean,
      );
    }
    return withMeta(
      doneFrom(
        items,
        previous,
        existing.score,
        task,
        existing.writing,
        readFeedback(existing.writingFeedback),
        flags,
      ),
      level,
      topic,
      showKorean,
    );
  }
  const scored = scorePractice(
    items.map((item) => item.answerIndex),
    answers,
  );
  if (!scored) throw new Error("Choose an answer for every question.");
  await insertPracticeResponse(db, {
    userId,
    dailySetId: row.id,
    answers,
    score: scored.score,
  });
  await rememberMisses(userId, entriesFromMisses(items, scored.correct));
  return withMeta(writingTaskFrom(scored.score, items.length, task), level, topic, showKorean);
}

export async function submitWriting(
  userId: string,
  showKorean: boolean,
  text: string,
): Promise<PracticeView> {
  const accepted = acceptWriting(text);
  if (!accepted.ok) throw new Error(WRITING_MESSAGES[accepted.reason]);

  const db = getDb();
  const date = practiceDate(new Date());
  const topic = topicForDate(date);
  const level = levelForPractice(await listSkillRatings(db, userId));
  const row = await findDailySet(db, level, date);
  if (!row) throw new Error("Today's questions are not ready yet.");
  const items = readItems(row.items);
  const task = readWriting(row.writing);
  const flags = await flagsFor(userId, row.id);
  const saved = await findPracticeResponse(db, userId, row.id);
  if (!saved) throw new Error("Finish the questions before writing.");
  const answers = z.array(z.number()).parse(saved.answers);
  if (saved.writing && saved.writingFeedback != null) {
    return withMeta(
      doneFrom(
        items,
        answers,
        saved.score,
        task,
        saved.writing,
        readFeedback(saved.writingFeedback),
        flags,
      ),
      level,
      topic,
      showKorean,
    );
  }

  const feedback = await reviewWriting(level, topic, task.prompt, accepted.text);
  const stored = await savePracticeWriting(db, {
    userId,
    dailySetId: row.id,
    writing: accepted.text,
    feedback,
  });
  if (!stored) {
    const latest = await findPracticeResponse(db, userId, row.id);
    if (latest?.writing && latest.writingFeedback != null) {
      return withMeta(
        doneFrom(
          items,
          answers,
          latest.score,
          task,
          latest.writing,
          readFeedback(latest.writingFeedback),
          flags,
        ),
        level,
        topic,
        showKorean,
      );
    }
  } else {
    const credit = writingCredit(feedback.score);
    if (credit !== null) {
      const current = await findSkillEstimate(db, userId, "writing");
      const next = updateRating(
        {
          rating: current?.rating ?? ratingForBand(level),
          attempts: current?.attempts ?? 0,
        },
        ratingForBand(level),
        credit,
      );
      await upsertSkillEstimate(db, {
        userId,
        skill: "writing",
        rating: next.rating,
        attempts: next.attempts,
      });
    }
    await rememberMisses(userId, entriesFromCorrections(feedback.corrections));
  }

  return withMeta(
    doneFrom(items, answers, saved.score, task, accepted.text, feedback, flags),
    level,
    topic,
    showKorean,
  );
}

export async function flagQuestion(userId: string, itemIndex: number, kind: string) {
  const index = feedbackItemIndex(itemIndex);
  const parsedKind = feedbackKind(kind);
  if (index === null || !parsedKind) throw new Error("Choose a question flag.");
  const db = getDb();
  const date = practiceDate(new Date());
  const level = levelForPractice(await listSkillRatings(db, userId));
  const row = await findDailySet(db, level, date);
  if (!row) throw new Error("Today's questions are not ready yet.");
  await saveItemFeedback(db, { userId, dailySetId: row.id, itemIndex: index, kind: parsedKind });
}

async function reviewWriting(level: string, topic: string, prompt: string, writing: string) {
  const provider = getGroq();
  if (!provider) throw new Error("Practice questions are not available yet.");
  let lastProblems: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let result;
    try {
      result = await provider.generateStructured({
        tier: "strong",
        promptId: WRITING_FEEDBACK_PROMPT_ID,
        system: writingFeedbackSystemPrompt(),
        input: writingFeedbackInput({ level, topic, prompt, writing }),
        schema: writingFeedbackSchema,
        reasoningEffort: "low",
        temperature: 0,
      });
    } catch (error) {
      lastProblems = [error instanceof Error ? error.message : "generation failed"];
      continue;
    }
    const problems = writingFeedbackProblems(result.data);
    console.info(
      JSON.stringify({
        job: "writing-feedback",
        level,
        topic,
        attempt,
        model: result.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        problems: problems.length,
      }),
    );
    if (problems.length === 0) return result.data;
    lastProblems = problems;
  }
  console.error(JSON.stringify({ job: "writing-feedback", level, topic, problems: lastProblems }));
  throw new Error("Could not review today's writing. Try again.");
}
