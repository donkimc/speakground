import { type CurriculumNode, LEVEL_BANDS, PRACTICE_QUESTION_COUNT } from "@fluentloop/core";
import { z } from "zod";

import { loadPrompt } from "./prompts";
import { bilingualSchema } from "./schemas";

export const PRACTICE_SET_PROMPT_ID = "practice-set@1";

const generatedMcqSchema = z.object({
  type: z.literal("mcq"),
  level: z.enum(LEVEL_BANDS),
  skill: z.enum(["grammar", "vocabulary"]),
  tags: z.array(z.string().min(1)).min(1).max(3),
  question: z.string().min(1).max(240),
  options: z.array(z.string().min(1).max(80)).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: bilingualSchema,
});

export const practiceWritingSchema = z.object({
  prompt: z.string().min(20).max(400),
  promptKo: z.string().min(1).max(240),
});

export const practiceSetSchema = z.object({
  items: z.array(generatedMcqSchema).length(PRACTICE_QUESTION_COUNT),
  writing: practiceWritingSchema,
});

export type GeneratedPracticeSet = z.infer<typeof practiceSetSchema>;

/** Versioned prompt. Resolved from source, the repo root, or the app directory. */
export function practiceSetSystemPrompt(): string {
  return loadPrompt(PRACTICE_SET_PROMPT_ID);
}

export function practiceSetInput(
  level: string,
  topic: string,
  focus: readonly CurriculumNode[],
): string {
  return JSON.stringify({
    level,
    topic,
    count: PRACTICE_QUESTION_COUNT,
    focus: focus.map((node) => ({
      skill: node.skill,
      title: node.title,
      summary: node.summary,
      headwords: node.headwords,
    })),
  });
}
